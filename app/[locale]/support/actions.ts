"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserBillingState } from "@/lib/billing";
import {
  SUPPORT_CATEGORY_VALUES,
  SUPPORT_MESSAGE_MAX,
  SUPPORT_SUBJECT_MAX,
  isSupportCategory,
} from "@/lib/support";

const SUPPORT_WINDOW_HOURS = 24;
const SUPPORT_MAX_PER_USER_PER_WINDOW = 8;
const SUPPORT_DUPLICATE_MINUTES = 30;

export type SupportResult =
  | { success: true; requestId: string }
  | { success: false; message: string };

export async function submitSupportRequest(
  formData: FormData
): Promise<SupportResult> {
  const supabase = await createClient();
  const admin = createAdminClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  const rawLocale = String(formData.get("locale") ?? "en").trim().toLowerCase();
  const locale = rawLocale === "es" ? "es" : "en";
  const t = await getTranslations({ locale, namespace: "Support" });

  if (authErr || !user) {
    return { success: false, message: t("errors.authRequired") };
  }

  const subject = String(formData.get("subject") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();
  const rawCategory = String(formData.get("category") ?? "").trim().toLowerCase();
  const category = rawCategory ? rawCategory : null;

  if (!subject) return { success: false, message: t("errors.subjectRequired") };
  if (!message) return { success: false, message: t("errors.messageRequired") };
  if (subject.length > SUPPORT_SUBJECT_MAX) {
    return {
      success: false,
      message: t("errors.subjectTooLong", { max: SUPPORT_SUBJECT_MAX }),
    };
  }
  if (message.length > SUPPORT_MESSAGE_MAX) {
    return {
      success: false,
      message: t("errors.messageTooLong", { max: SUPPORT_MESSAGE_MAX }),
    };
  }
  if (category && !isSupportCategory(category)) {
    return {
      success: false,
      message: t("errors.invalidCategory", {
        categories: SUPPORT_CATEGORY_VALUES.join(", "),
      }),
    };
  }

  const now = Date.now();
  const windowStart = new Date(now - SUPPORT_WINDOW_HOURS * 60 * 60 * 1000).toISOString();
  const duplicateWindowStart = new Date(now - SUPPORT_DUPLICATE_MINUTES * 60 * 1000).toISOString();

  const { count: userSubmissionCount } = await admin
    .from("support_requests")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", windowStart);

  if ((userSubmissionCount ?? 0) >= SUPPORT_MAX_PER_USER_PER_WINDOW) {
    await admin.from("request_security_events").insert({
      channel: "support",
      event_type: "rate_limited",
      user_id: user.id,
      metadata: {
        userSubmissionCount: userSubmissionCount ?? 0,
        windowHours: SUPPORT_WINDOW_HOURS,
      },
    });
    return {
      success: false,
      message: t("errors.rateLimited"),
    };
  }

  const { count: duplicateCount } = await admin
    .from("support_requests")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("subject", subject)
    .eq("message", message)
    .gte("created_at", duplicateWindowStart);

  if ((duplicateCount ?? 0) > 0) {
    await admin.from("request_security_events").insert({
      channel: "support",
      event_type: "duplicate_submission",
      user_id: user.id,
      metadata: { duplicateWindowMinutes: SUPPORT_DUPLICATE_MINUTES },
    });
    return {
      success: false,
      message: t("errors.duplicate"),
    };
  }

  const billing = await getUserBillingState(supabase, user.id);

  const { data, error } = await supabase
    .from("support_requests")
    .insert({
      user_id: user.id,
      subject,
      message,
      category,
      plan_at_submission: billing.plan,
      status: "open",
      priority: billing.plan === "pro" ? "high" : "normal",
      last_activity_at: new Date().toISOString(),
    })
    .select("id, status, priority")
    .single();

  if (error || !data) {
    console.error("submitSupportRequest error:", error?.message);
    return { success: false, message: t("errors.submitFailed") };
  }

  await admin.from("support_request_messages").insert({
    request_id: data.id,
    author_user_id: user.id,
    message_type: "customer_reply",
    is_internal: false,
    body: message,
  });

  await admin.from("support_request_events").insert([
    {
      request_id: data.id,
      actor_user_id: user.id,
      event_type: "request_created",
      metadata: {
        category,
        status: data.status,
        priority: data.priority,
      },
    },
    {
      request_id: data.id,
      actor_user_id: user.id,
      event_type: "public_reply_sent",
      metadata: {
        source: "initial_message",
      },
    },
  ]);

  revalidatePath("/support");
  return { success: true, requestId: data.id };
}

export async function submitSupportReply(formData: FormData): Promise<SupportResult> {
  const supabase = await createClient();
  const admin = createAdminClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  const rawLocale = String(formData.get("locale") ?? "en").trim().toLowerCase();
  const locale = rawLocale === "es" ? "es" : "en";
  const t = await getTranslations({ locale, namespace: "Support" });

  if (authErr || !user) {
    return { success: false, message: t("errors.authRequired") };
  }

  const requestId = String(formData.get("request_id") ?? "").trim();
  const body = String(formData.get("message") ?? "").trim();

  if (!requestId) {
    return { success: false, message: t("errors.requestMissing") };
  }
  if (!body) {
    return { success: false, message: t("errors.messageRequired") };
  }
  if (body.length > SUPPORT_MESSAGE_MAX) {
    return {
      success: false,
      message: t("errors.messageTooLong", { max: SUPPORT_MESSAGE_MAX }),
    };
  }

  const { data: request } = await admin
    .from("support_requests")
    .select("id, user_id, status")
    .eq("id", requestId)
    .maybeSingle();

  if (!request || request.user_id !== user.id) {
    return { success: false, message: t("errors.notFound") };
  }
  if (request.status !== "waiting_on_user") {
    return { success: false, message: t("errors.notWaitingOnUser") };
  }

  const now = new Date().toISOString();
  const { error: messageError } = await admin.from("support_request_messages").insert({
    request_id: requestId,
    author_user_id: user.id,
    message_type: "customer_reply",
    is_internal: false,
    body,
  });

  if (messageError) {
    console.error("submitSupportReply message error:", messageError.message);
    return { success: false, message: t("errors.replyFailed") };
  }

  await admin
    .from("support_requests")
    .update({ status: "in_progress", last_activity_at: now })
    .eq("id", requestId)
    .eq("user_id", user.id);

  await admin.from("support_request_events").insert([
    {
      request_id: requestId,
      actor_user_id: user.id,
      event_type: "public_reply_sent",
      metadata: { source: "customer_reply" },
    },
    {
      request_id: requestId,
      actor_user_id: user.id,
      event_type: "request_reopened",
      metadata: { from: "waiting_on_user", to: "in_progress" },
    },
  ]);

  revalidatePath("/support");
  return { success: true, requestId };
}
