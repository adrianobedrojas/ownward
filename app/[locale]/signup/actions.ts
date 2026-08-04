"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getOnboardingConfirmRedirectUrl } from "@/lib/auth";
import { getSiteUrl } from "@/lib/config";
import { isValidAccountType } from "@/lib/auth/account-types";
import { randomUUID } from "node:crypto";

export async function signup(formData: FormData) {
  const accountType = String(formData.get("accountType") ?? "");
  const fullName = String(formData.get("fullName") ?? "").trim();
  const businessName = String(formData.get("businessName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(
    formData.get("confirmPassword") ?? ""
  );
  const agreementAccepted = formData.get("agreement") === "on";

  if (
    !accountType ||
    !fullName ||
    !email ||
    !password ||
    !confirmPassword ||
    !agreementAccepted
  ) {
    redirect("/error");
  }

  if (!isValidAccountType(accountType)) {
    redirect("/error");
  }

  if (password !== confirmPassword || password.length < 8) {
    redirect("/error");
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
    redirect("/error");
  }

  const signupNonce = randomUUID();
  const cookieStore = await cookies();
  cookieStore.set("ownward_signup_success_nonce", signupNonce, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 900,
    secure: process.env.NODE_ENV === "production",
  });

  redirect(`/check-email?signup=success&nonce=${encodeURIComponent(signupNonce)}`);
}
