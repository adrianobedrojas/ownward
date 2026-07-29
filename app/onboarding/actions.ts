"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function completeOnboarding(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const currentStage = String(formData.get("currentStage") ?? "run");
  const businessName = String(formData.get("businessName") ?? "").trim();

  const { error } = await supabase
    .from("profiles")
    .upsert({
      id: user.id,
      current_stage: currentStage,
      business_name: businessName || null,
      onboarding_complete: true,
      onboarding_completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

  if (error) {
    redirect("/error");
  }

  redirect("/dashboard?success=onboarding-complete");
}
