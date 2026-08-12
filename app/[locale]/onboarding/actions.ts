"use server";

import { redirect } from "next/navigation";
import { CURRENT_PRIVACY_VERSION, CURRENT_TERMS_VERSION } from "@/lib/auth";
import {
  CURRENT_PARTNER_COMMUNICATIONS_VERSION,
  getPolicyAcceptanceRequirements,
} from "@/lib/policies";
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

  // NEW: optional partner communications consent (onboarding capture path)
  const partnerMarketingConsent = formData.get("partnerMarketingConsent") === "on";

  if (!fullName || !allowedAccountTypes.has(accountType) || !allowedStages.has(currentStage)) {
    redirect("/error");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select(
      "id, terms_accepted_at, privacy_accepted_at, terms_version, privacy_version, partner_marketing_consent, partner_marketing_consent_at, partner_marketing_consent_version"
    )
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    redirect("/error");
  }

  const { needsTermsAcceptance, needsPrivacyAcknowledgment } =
    getPolicyAcceptanceRequirements(profile);

  if ((needsTermsAcceptance && !acceptedTerms) || (needsPrivacyAcknowledgment && !acceptedPrivacy)) {
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

    // NEW: persist current consent state
    partner_marketing_consent: partnerMarketingConsent,
  };

  // NEW: when consenting, stamp timestamp/version if missing.
  // when not consenting, preserve historical audit values (do not erase).
  if (partnerMarketingConsent) {
    profileUpdate.partner_marketing_consent_at =
      profile?.partner_marketing_consent_at ?? now;
    profileUpdate.partner_marketing_consent_version =
      profile?.partner_marketing_consent_version ?? CURRENT_PARTNER_COMMUNICATIONS_VERSION;
  } else {
    profileUpdate.partner_marketing_consent_at =
      profile?.partner_marketing_consent_at ?? null;
    profileUpdate.partner_marketing_consent_version =
      profile?.partner_marketing_consent_version ?? null;
  }

  if (needsTermsAcceptance) {
    profileUpdate.terms_version = CURRENT_TERMS_VERSION;
    if (!profile?.terms_accepted_at) {
      profileUpdate.terms_accepted_at = now;
    }
  }

  if (needsPrivacyAcknowledgment) {
    profileUpdate.privacy_version = CURRENT_PRIVACY_VERSION;
    if (!profile?.privacy_accepted_at) {
      profileUpdate.privacy_accepted_at = now;
    }
  }

  const { error } = await supabase.from("profiles").update(profileUpdate).eq("id", user.id);

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

  if (currentStage === "start") {
    redirect("/start?welcome=1");
  }

  redirect("/dashboard?success=onboarding-complete");
}