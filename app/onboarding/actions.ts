"use server";

import { redirect } from "next/navigation";
import { CURRENT_POLICY_VERSION } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const allowedStages = new Set(["start", "run", "sell", "buy"]);
const allowedAccountTypes = new Set([
  "owner",
  "buyer",
  "owner-buyer",
  "advisor",
]);

export async function completeOnboarding(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const fullName = String(formData.get("fullName") ?? "").trim();
  const accountType = String(formData.get("accountType") ?? "").trim();
  const currentStage = String(formData.get("currentStage") ?? "run");
  const businessName = String(formData.get("businessName") ?? "").trim();
  const acceptedTerms = formData.get("acceptTerms") === "on";
  const acceptedPrivacy = formData.get("acceptPrivacy") === "on";

  if (
    !fullName ||
    !allowedAccountTypes.has(accountType) ||
    !allowedStages.has(currentStage)
  ) {
    redirect("/error");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, terms_accepted_at, privacy_accepted_at")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    redirect("/error");
  }

  const needsPolicyConsent =
    !profile?.terms_accepted_at || !profile?.privacy_accepted_at;

  if (needsPolicyConsent && (!acceptedTerms || !acceptedPrivacy)) {
    redirect("/error");
  }

  const now = new Date().toISOString();
  const profileUpdate: Record<string, string | boolean | null> = {
    full_name: fullName,
    account_type: accountType,
    current_stage: currentStage,
    business_name: businessName || null,
    onboarding_complete: true,
    onboarding_completed_at: now,
    updated_at: now,
  };

  if (needsPolicyConsent) {
    profileUpdate.terms_accepted_at = now;
    profileUpdate.privacy_accepted_at = now;
    profileUpdate.terms_version = CURRENT_POLICY_VERSION;
    profileUpdate.privacy_version = CURRENT_POLICY_VERSION;
  }

  const { error } = await supabase
    .from("profiles")
    .update(profileUpdate)
    .eq("id", user.id);

  if (error) {
    redirect("/error");
  }

  if (!profile) {
    const { error: insertError } = await supabase.from("profiles").insert({
      id: user.id,
      ...profileUpdate,
    });

    if (insertError) {
      redirect("/error");
    }
  }

  redirect("/dashboard?success=onboarding-complete");
}
