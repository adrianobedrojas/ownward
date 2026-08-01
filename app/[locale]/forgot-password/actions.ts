"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getRecoveryConfirmRedirectUrl } from "@/lib/auth";

export async function requestPasswordReset(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!email) {
    redirect("/forgot-password?error=missing-email");
  }

  const supabase = await createClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: getRecoveryConfirmRedirectUrl(siteUrl),
  });

  if (error) {
    console.error("Ownward password reset error:", error.message);
    redirect("/forgot-password?error=request-failed");
  }

  redirect("/forgot-password?sent=1");
}
