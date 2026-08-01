"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  getUserBillingState,
  checkMilestoneMonthlyLimit,
} from "@/lib/billing";

export type MilestoneResult =
  | { success: true; milestoneId: string }
  | { success: false; message: string };

async function getAuth() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return { authenticated: false as const };
  return { authenticated: true as const, supabase, user };
}

// ─── createMilestone ──────────────────────────────────────────────────────────

export async function createMilestone(
  formData: FormData
): Promise<MilestoneResult> {
  const auth = await getAuth();
  if (!auth.authenticated)
    return { success: false, message: "You must be signed in." };
  const { supabase, user } = auth;

  const billing = await getUserBillingState(supabase, user.id);

  // Monthly limit: count all milestones created this calendar month (including soft-deleted)
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { count: countThisMonth } = await supabase
    .from("business_milestones")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", startOfMonth.toISOString());

  const limitError = checkMilestoneMonthlyLimit(
    billing.entitlements,
    countThisMonth ?? 0
  );
  if (limitError) {
    return { success: false, message: limitError.message };
  }

  const businessId = String(formData.get("business_id") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const category = String(formData.get("category") ?? "custom").trim();
  const status = String(formData.get("status") ?? "planned").trim();
  const targetDate = String(formData.get("target_date") ?? "").trim() || null;

  if (!businessId || !title) {
    return { success: false, message: "Business and title are required." };
  }

  // Verify ownership of the business
  const { data: biz } = await supabase
    .from("businesses")
    .select("id")
    .eq("id", businessId)
    .eq("owner_id", user.id)
    .is("deleted_at", null)
    .maybeSingle();

  if (!biz) {
    return { success: false, message: "Business not found or access denied." };
  }

  const { data, error: insertError } = await supabase
    .from("business_milestones")
    .insert({
      user_id: user.id,
      business_id: businessId,
      title,
      description,
      category,
      status,
      target_date: targetDate,
    })
    .select("id")
    .single();

  if (insertError || !data) {
    return { success: false, message: "Failed to create milestone." };
  }

  revalidatePath("/milestones");
  return { success: true, milestoneId: data.id };
}

// ─── updateMilestone ──────────────────────────────────────────────────────────

export async function updateMilestone(
  formData: FormData
): Promise<MilestoneResult> {
  const auth = await getAuth();
  if (!auth.authenticated)
    return { success: false, message: "You must be signed in." };
  const { supabase, user } = auth;

  const milestoneId = String(formData.get("milestone_id") ?? "").trim();
  if (!milestoneId)
    return { success: false, message: "Missing milestone ID." };

  const { data: existing } = await supabase
    .from("business_milestones")
    .select("id")
    .eq("id", milestoneId)
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .maybeSingle();

  if (!existing)
    return { success: false, message: "Milestone not found or access denied." };

  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { success: false, message: "Title is required." };

  const description = String(formData.get("description") ?? "").trim() || null;
  const category = String(formData.get("category") ?? "custom").trim();
  const status = String(formData.get("status") ?? "planned").trim();
  const targetDate = String(formData.get("target_date") ?? "").trim() || null;
  const milestoneDate = String(formData.get("milestone_date") ?? "").trim() || null;

  const completedAt =
    status === "completed" ? new Date().toISOString() : null;

  const { error } = await supabase
    .from("business_milestones")
    .update({
      title,
      description,
      category,
      status,
      target_date: targetDate,
      milestone_date: milestoneDate,
      completed_at: completedAt,
    })
    .eq("id", milestoneId)
    .eq("user_id", user.id);

  if (error) return { success: false, message: "Failed to update milestone." };

  revalidatePath("/milestones");
  return { success: true, milestoneId };
}

// ─── completeMilestone ────────────────────────────────────────────────────────

export async function completeMilestone(
  milestoneId: string
): Promise<MilestoneResult> {
  const auth = await getAuth();
  if (!auth.authenticated)
    return { success: false, message: "You must be signed in." };
  const { supabase, user } = auth;

  const { error } = await supabase
    .from("business_milestones")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", milestoneId)
    .eq("user_id", user.id)
    .is("deleted_at", null);

  if (error) return { success: false, message: "Failed to complete milestone." };
  revalidatePath("/milestones");
  return { success: true, milestoneId };
}

// ─── reopenMilestone ──────────────────────────────────────────────────────────

export async function reopenMilestone(
  milestoneId: string
): Promise<MilestoneResult> {
  const auth = await getAuth();
  if (!auth.authenticated)
    return { success: false, message: "You must be signed in." };
  const { supabase, user } = auth;

  const { error } = await supabase
    .from("business_milestones")
    .update({ status: "in_progress", completed_at: null })
    .eq("id", milestoneId)
    .eq("user_id", user.id)
    .is("deleted_at", null);

  if (error) return { success: false, message: "Failed to reopen milestone." };
  revalidatePath("/milestones");
  return { success: true, milestoneId };
}

// ─── deleteMilestone (soft-delete) ────────────────────────────────────────────

export async function deleteMilestone(
  milestoneId: string
): Promise<{ success: boolean; message?: string }> {
  const auth = await getAuth();
  if (!auth.authenticated)
    return { success: false, message: "You must be signed in." };
  const { supabase, user } = auth;

  const { error } = await supabase
    .from("business_milestones")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", milestoneId)
    .eq("user_id", user.id);

  if (error) return { success: false, message: "Failed to delete milestone." };
  revalidatePath("/milestones");
  return { success: true };
}
