"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePlatformAdmin } from "@/lib/admin/access";
import {
  SUPPORT_MESSAGE_MAX,
  canTransitionSupportStatus,
  isSupportPriority,
  isSupportStatus,
} from "@/lib/support";

async function recordSupportEvent(params: {
  requestId: string;
  actorAdminId: string;
  eventType:
    | "status_changed"
    | "priority_changed"
    | "administrator_assigned"
    | "public_reply_sent"
    | "internal_note_added"
    | "request_resolved"
    | "request_reopened"
    | "request_archived";
  metadata?: Record<string, unknown>;
}) {
  const admin = createAdminClient();
  await admin.from("support_request_events").insert({
    request_id: params.requestId,
    actor_admin_id: params.actorAdminId,
    event_type: params.eventType,
    metadata: params.metadata ?? {},
  });
}

export async function assignSupportRequest(formData: FormData) {
  const adminContext = await requirePlatformAdmin("canAssign");
  const requestId = String(formData.get("request_id") ?? "").trim();
  const assignedAdminId = String(formData.get("assigned_admin_id") ?? "").trim() || null;

  if (!requestId) return;

  const admin = createAdminClient();
  await admin
    .from("support_requests")
    .update({ assigned_admin_id: assignedAdminId, last_activity_at: new Date().toISOString() })
    .eq("id", requestId);

  await recordSupportEvent({
    requestId,
    actorAdminId: adminContext.userId,
    eventType: "administrator_assigned",
    metadata: { assignedAdminId },
  });

  revalidatePath("/admin/support");
}

export async function updateSupportPriority(formData: FormData) {
  const adminContext = await requirePlatformAdmin("canChangePriority");
  const requestId = String(formData.get("request_id") ?? "").trim();
  const priority = String(formData.get("priority") ?? "").trim();

  if (!requestId || !isSupportPriority(priority)) return;

  const admin = createAdminClient();
  await admin
    .from("support_requests")
    .update({ priority, last_activity_at: new Date().toISOString() })
    .eq("id", requestId);

  await recordSupportEvent({
    requestId,
    actorAdminId: adminContext.userId,
    eventType: "priority_changed",
    metadata: { priority },
  });

  revalidatePath("/admin/support");
}

export async function updateSupportStatus(formData: FormData) {
  const adminContext = await requirePlatformAdmin("canChangeStatus");
  const requestId = String(formData.get("request_id") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();

  if (!requestId || !isSupportStatus(status)) return;

  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("support_requests")
    .select("id, status")
    .eq("id", requestId)
    .maybeSingle();

  if (!existing || !isSupportStatus(existing.status)) return;
  if (!canTransitionSupportStatus(existing.status, status)) return;

  const updatePatch: Record<string, unknown> = {
    status,
    last_activity_at: new Date().toISOString(),
  };

  if (status === "resolved") updatePatch.resolved_at = new Date().toISOString();
  if (status === "closed") updatePatch.closed_at = new Date().toISOString();
  if (status === "archived") updatePatch.archived_at = new Date().toISOString();

  await admin.from("support_requests").update(updatePatch).eq("id", requestId);

  await recordSupportEvent({
    requestId,
    actorAdminId: adminContext.userId,
    eventType:
      status === "resolved"
        ? "request_resolved"
        : status === "archived"
          ? "request_archived"
          : status === "in_progress" && existing.status === "resolved"
            ? "request_reopened"
            : "status_changed",
    metadata: { from: existing.status, to: status },
  });

  revalidatePath("/admin/support");
}

export async function addSupportMessage(formData: FormData) {
  const messageType = String(formData.get("message_type") ?? "").trim();
  const permission = messageType === "internal_note" ? "canWriteInternalNotes" : "canReplyPublic";
  const adminContext = await requirePlatformAdmin(permission as never);

  const requestId = String(formData.get("request_id") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();

  if (!requestId || !body || body.length > SUPPORT_MESSAGE_MAX) return;

  const isInternal = messageType === "internal_note";
  const normalizedMessageType = isInternal ? "internal_note" : "admin_reply";

  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("support_requests")
    .select("id, first_response_at")
    .eq("id", requestId)
    .maybeSingle();

  if (!existing) return;

  await admin.from("support_request_messages").insert({
    request_id: requestId,
    author_admin_id: adminContext.userId,
    message_type: normalizedMessageType,
    is_internal: isInternal,
    body,
  });

  const now = new Date().toISOString();
  const patch: Record<string, unknown> = { last_activity_at: now };
  if (!isInternal && !existing.first_response_at) {
    patch.first_response_at = now;
  }

  await admin.from("support_requests").update(patch).eq("id", requestId);

  await recordSupportEvent({
    requestId,
    actorAdminId: adminContext.userId,
    eventType: isInternal ? "internal_note_added" : "public_reply_sent",
    metadata: { messageType: normalizedMessageType },
  });

  revalidatePath(`/admin/support/${requestId}`);
  revalidatePath("/admin/support");
}

