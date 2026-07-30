"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function updatePassword(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!password || password.length < 8) {
    redirect("/reset-password?error=weak-password");
  }

  if (password !== confirmPassword) {
    redirect("/reset-password?error=password-mismatch");
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    console.error("Ownward password update error:", error.message);
    redirect("/reset-password?error=update-failed");
  }

  redirect("/dashboard?success=password-updated");
}
