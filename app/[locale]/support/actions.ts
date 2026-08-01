"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUserBillingState } from "@/lib/billing";

export type SupportResult =
  | { success: true; requestId: string }
  | { success: false; message: string };

export async function submitSupportRequest(
  formData: FormData
): Promise<SupportResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr || !user) {
    return { success: false, message: "You must be signed in." };
  }

  const subject = String(formData.get("subject") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim() || null;

  if (!subject) return { success: false, message: "Subject is required." };
  if (!message) return { success: false, message: "Message is required." };

  const billing = await getUserBillingState(supabase, user.id);

  const { data, error } = await supabase
    .from("support_requests")
    .insert({
      user_id: user.id,
      subject,
      message,
      category,
      plan_at_submission: billing.plan,
      status: "submitted",
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("submitSupportRequest error:", error?.message);
    return { success: false, message: "Failed to submit request. Please try again." };
  }

  revalidatePath("/support");
  return { success: true, requestId: data.id };
}
