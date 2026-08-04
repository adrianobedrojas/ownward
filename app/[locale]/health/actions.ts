"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUserBillingState } from "@/lib/billing";
import { calculateHealthScores, HEALTH_QUESTIONS } from "@/lib/health/scoring";
import { canEditBusiness } from "@/lib/business-access";

export type HealthCheckResult =
  | { success: true; assessmentId: string; overallScore: number }
  | { success: false; message: string };

// ─── saveHealthAssessment ─────────────────────────────────────────────────────

export async function saveHealthAssessment(
  formData: FormData
): Promise<HealthCheckResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr || !user)
    return { success: false, message: "You must be signed in." };

  const billing = await getUserBillingState(supabase, user.id);
  if (billing.entitlements.healthLevel === "none") {
    return {
      success: false,
      message: "A paid plan is required to use the Health Check.",
    };
  }

  const businessId = String(formData.get("business_id") ?? "").trim();
  if (!businessId)
    return { success: false, message: "Missing business ID." };

  const canEdit = await canEditBusiness(user.id, businessId);
  if (!canEdit) return { success: false, message: "Business not found." };

  // Build answers map from form data
  const answers: Record<string, string> = {};
  for (const q of HEALTH_QUESTIONS) {
    const val = String(formData.get(q.id) ?? "not_yet");
    answers[q.id] = val;
  }

  const { overallScore, categoryScores, topActions } = calculateHealthScores(answers);

  const { data, error } = await supabase
    .from("business_health_assessments")
    .insert({
      user_id: user.id,
      business_id: businessId,
      assessment_version: "1",
      answers,
      category_scores: categoryScores,
      overall_score: overallScore,
      recommendations: topActions,
      completed_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error || !data)
    return { success: false, message: "Failed to save assessment." };

  revalidatePath("/health");
  return { success: true, assessmentId: data.id, overallScore };
}

