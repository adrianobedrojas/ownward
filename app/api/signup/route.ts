import { createClient } from "@/lib/supabase/server";
import { getOnboardingConfirmRedirectUrl } from "@/lib/auth";
import { getSiteUrl } from "@/lib/config";
import { isValidAccountType } from "@/lib/auth/account-types";
import { randomUUID } from "node:crypto";

const MARKETING_CONSENT_VERSION = "2026-08-10.1";

function redirectTo(path: string, setCookie?: string) {
  const headers: Record<string, string> = { Location: path };
  if (setCookie) headers["Set-Cookie"] = setCookie;
  return new Response(null, { status: 303, headers });
}

function buildSignupSuccessCookie(nonce: string): string {
  const parts = [
    `ownward_signup_success_nonce=${encodeURIComponent(nonce)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=900",
  ];
  if (process.env.NODE_ENV === "production") parts.push("Secure");
  return parts.join("; ");
}

export async function POST(request: Request) {
  const formData = await request.formData();

  const accountType = String(formData.get("accountType") ?? "");
  const fullName = String(formData.get("fullName") ?? "").trim();
  const businessName = String(formData.get("businessName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");
  const agreementAccepted = formData.get("agreement") === "on";

  const marketingOptIn = formData.get("marketingOptIn") === "on";
  const thirdPartyMarketingOptIn = formData.get("thirdPartyMarketingOptIn") === "on";

  if (
    !accountType ||
    !fullName ||
    !email ||
    !password ||
    !confirmPassword ||
    !agreementAccepted
  ) {
    return redirectTo("/error");
  }

  if (!isValidAccountType(accountType)) {
    return new Response(JSON.stringify({ error: "Invalid account type" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (password !== confirmPassword || password.length < 8) {
    return redirectTo("/error");
  }

  const supabase = await createClient();
  const siteUrl = getSiteUrl();

  const { data: signUpData, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: getOnboardingConfirmRedirectUrl(siteUrl),
      data: {
        account_type: accountType,
        full_name: fullName,
        business_name: businessName || null,
      },
    },
  });

  if (error) {
    console.error("Ownward Hub signup error:", error.message);
    return redirectTo("/error");
  }

  const userId = signUpData.user?.id;
  if (userId) {
    const now = new Date().toISOString();
    const consentPayload = {
      id: userId,
      marketing_opt_in: marketingOptIn,
      marketing_opt_in_at: marketingOptIn ? now : null,
      marketing_opt_in_source: marketingOptIn ? "signup_form" : null,
      third_party_marketing_opt_in: thirdPartyMarketingOptIn,
      third_party_marketing_opt_in_at: thirdPartyMarketingOptIn ? now : null,
      third_party_marketing_opt_in_source: thirdPartyMarketingOptIn ? "signup_form" : null,
      marketing_consent_version: MARKETING_CONSENT_VERSION,
      updated_at: now,
    };

    const { error: profileConsentError } = await supabase
      .from("profiles")
      .upsert(consentPayload, { onConflict: "id" });

    if (profileConsentError) {
      console.error("Ownward Hub signup consent write error:", profileConsentError.message);
    }
  }

  const signupNonce = randomUUID();
  const signupCookie = buildSignupSuccessCookie(signupNonce);

  return redirectTo(
    `/check-email?signup=success&nonce=${encodeURIComponent(signupNonce)}`,
    signupCookie,
  );
}