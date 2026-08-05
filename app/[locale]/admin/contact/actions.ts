"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePlatformAdmin } from "@/lib/admin/access";
import { getUserBillingState } from "@/lib/billing";

async function recordContactEvent(params: {
  contactMessageId: string;
  actorAdminId: string;
  eventType:
    | "marked_reviewed"
    | "converted_to_support"
    | "assigned"
    | "internal_note_added"
    | "resolved"
    | "archived"
    | "linked_account";
  note?: string;
  metadata?: Record<string, unknown>;
}) {
  const admin = createAdminClient();
  await admin.from("contact_message_events").insert({
    contact_message_id: params.contactMessageId,
    actor_admin_id: params.actorAdminId,
    event_type: params.eventType,
    note: params.note ?? null,
    metadata: params.metadata ?? {},
  });
}

export async function assignContactMessage(formData: FormData) {
  const adminContext = await requirePlatformAdmin("canAssign");
  const messageId = String(formData.get("message_id") ?? "").trim();
  const assignedAdminId = String(formData.get("assigned_admin_id") ?? "").trim() || null;
  if (!messageId) return;

  const admin = createAdminClient();
  await admin
    .from("contact_messages")
    .update({ assigned_admin_id: assignedAdminId, updated_at: new Date().toISOString() })
    .eq("id", messageId);

  await recordContactEvent({
    contactMessageId: messageId,
    actorAdminId: adminContext.userId,
    eventType: "assigned",
    metadata: { assignedAdminId },
  });

  revalidatePath("/admin/contact");
}

export async function markContactReviewed(formData: FormData) {
  const adminContext = await requirePlatformAdmin("canChangeStatus");
  const messageId = String(formData.get("message_id") ?? "").trim();
  if (!messageId) return;

  const admin = createAdminClient();
  await admin
    .from("contact_messages")
    .update({
      status: "reviewed",
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", messageId);

  await recordContactEvent({
    contactMessageId: messageId,
    actorAdminId: adminContext.userId,
    eventType: "marked_reviewed",
  });

  revalidatePath("/admin/contact");
}

export async function resolveContactMessage(formData: FormData) {
  const adminContext = await requirePlatformAdmin("canChangeStatus");
  const messageId = String(formData.get("message_id") ?? "").trim();
  if (!messageId) return;

  const admin = createAdminClient();
  await admin
    .from("contact_messages")
    .update({
      status: "resolved",
      resolved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", messageId);

  await recordContactEvent({
    contactMessageId: messageId,
    actorAdminId: adminContext.userId,
    eventType: "resolved",
  });

  revalidatePath("/admin/contact");
}

export async function archiveContactMessage(formData: FormData) {
  const adminContext = await requirePlatformAdmin("canArchive");
  const messageId = String(formData.get("message_id") ?? "").trim();
  if (!messageId) return;

  const admin = createAdminClient();
  await admin
    .from("contact_messages")
    .update({
      status: "archived",
      archived_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", messageId);

  await recordContactEvent({
    contactMessageId: messageId,
    actorAdminId: adminContext.userId,
    eventType: "archived",
  });

  revalidatePath("/admin/contact");
}

export async function addContactInternalNote(formData: FormData) {
  const adminContext = await requirePlatformAdmin("canWriteInternalNotes");
  const messageId = String(formData.get("message_id") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  if (!messageId || !note) return;

  await recordContactEvent({
    contactMessageId: messageId,
    actorAdminId: adminContext.userId,
    eventType: "internal_note_added",
    note: note.slice(0, 2000),
  });

  revalidatePath("/admin/contact");
}

export async function convertContactToSupportRequest(formData: FormData) {
  const adminContext = await requirePlatformAdmin("canConvertContact");
  const messageId = String(formData.get("message_id") ?? "").trim();
  if (!messageId) return;

  const admin = createAdminClient();
  const { data: contact } = await admin
    .from("contact_messages")
    .select("id, user_id, name, email, subject, message")
    .eq("id", messageId)
    .maybeSingle();

  if (!contact) return;

  let linkedUserId: string | null = contact.user_id;
  if (!linkedUserId) {
    const { data: listedUsers } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });
    linkedUserId =
      listedUsers?.users?.find(
        (candidate) => candidate.email?.toLowerCase() === contact.email.toLowerCase()
      )?.id ?? null;
  }

  if (!linkedUserId) {
    await recordContactEvent({
      contactMessageId: messageId,
      actorAdminId: adminContext.userId,
      eventType: "linked_account",
      metadata: { linked: false },
    });
    return;
  }

  const billing = await getUserBillingState(admin as never, linkedUserId);

  const { data: support } = await admin
    .from("support_requests")
    .insert({
      user_id: linkedUserId,
      category: "other",
      subject: contact.subject ?? `Contact from ${contact.name}`,
      message: contact.message,
      plan_at_submission: billing.plan,
      status: "open",
      priority: billing.plan === "pro" ? "high" : "normal",
      assigned_admin_id: adminContext.userId,
      last_activity_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (!support?.id) return;

  await admin.from("support_request_messages").insert({
    request_id: support.id,
    author_user_id: linkedUserId,
    message_type: "customer_reply",
    is_internal: false,
    body: contact.message,
  });

  await admin.from("support_request_events").insert({
    request_id: support.id,
    actor_admin_id: adminContext.userId,
    event_type: "request_created",
    metadata: { source: "contact_conversion", contactMessageId: messageId },
  });

  await admin
    .from("contact_messages")
    .update({
      user_id: linkedUserId,
      converted_support_request_id: support.id,
      status: "converted_to_support",
      updated_at: new Date().toISOString(),
    })
    .eq("id", messageId);

  await recordContactEvent({
    contactMessageId: messageId,
    actorAdminId: adminContext.userId,
    eventType: "converted_to_support",
    metadata: { supportRequestId: support.id, linkedUserId },
  });

  revalidatePath("/admin/contact");
  revalidatePath("/admin/support");
}
