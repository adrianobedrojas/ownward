import { createClient } from "@/lib/supabase/server";
import { getOnboardingConfirmRedirectUrl } from "@/lib/auth";
import { getSiteUrl } from "@/lib/config";
import { isValidAccountType } from "@/lib/auth/account-types";
import { randomUUID } from "node:crypto";

function redirectTo(path: string, setCookie?: string) {
  const headers: Record<string, string> = {
    Location: path,
  };

  if (setCookie) {
    headers["Set-Cookie"] = setCookie;
  }

  return new Response(null, {
    status: 303,
    headers,
  });
}

function buildSignupSuccessCookie(nonce: string): string {
  const parts = [
    `ownward_signup_success_nonce=${encodeURIComponent(nonce)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=900",
  ];

  if (process.env.NODE_ENV === "production") {
    parts.push("Secure");
  }

  return parts.join("; ");
}

export async function POST(request: Request) {
  const formData = await request.formData();

  const accountType = String(formData.get("accountType") ?? "");
  const fullName = String(formData.get("fullName") ?? "").trim();
  const businessName = String(
    formData.get("businessName") ?? ""
  ).trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(
    formData.get("confirmPassword") ?? ""
  );
  const agreementAccepted =
    formData.get("agreement") === "on";

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

  // Reject unsupported account types with a controlled 400
  if (!isValidAccountType(accountType)) {
    return new Response(
      JSON.stringify({ error: "Invalid account type" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  if (
    password !== confirmPassword ||
    password.length < 8
  ) {
    return redirectTo("/error");
  }

  const supabase = await createClient();
  const siteUrl = getSiteUrl();

  const { error } = await supabase.auth.signUp({
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
    console.error(
      "Ownward Hub signup error:",
      error.message
    );

    return redirectTo("/error");
  }

  const signupNonce = randomUUID();
  const signupCookie = buildSignupSuccessCookie(signupNonce);

  return redirectTo(
    `/check-email?signup=success&nonce=${encodeURIComponent(signupNonce)}`,
    signupCookie,
  );
}
