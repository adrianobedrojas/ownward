"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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

  if (password !== confirmPassword || password.length < 8) {
    redirect("/error");
  }

  const supabase = await createClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${siteUrl}/auth/confirm?next=/onboarding`,
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

  redirect("/check-email");
}