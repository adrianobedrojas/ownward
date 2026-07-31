'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getUserBillingState } from '@/lib/billing';
import { sanitizeDocumentFilename } from '@/lib/documents';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const DEAL_ROOM_STAGES = [
  'information_review',
  'due_diligence',
  'offer_review',
  'closing',
  'completed',
] as const;

const DEAL_ROOM_STATUSES = ['active', 'paused', 'closed', 'withdrawn'] as const;

const MEMBER_ROLES = ['seller', 'buyer', 'advisor', 'accountant', 'attorney'] as const;

const REQUEST_PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const;

const REQUEST_STATUSES = ['open', 'in_progress', 'completed', 'cancelled'] as const;

const ACTIVITY_EVENTS = [
  'deal_room_created',
  'stage_changed',
  'status_changed',
  'member_invited',
  'member_removed',
  'document_uploaded',
  'document_deleted',
  'request_created',
  'request_updated',
  'request_completed',
] as const;

/** Maximum deal-room document size: 50 MB */
const MAX_FILE_BYTES = 50 * 1024 * 1024;

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'text/csv',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/msword',
  'image/png',
  'image/jpeg',
]);

const ALLOWED_EXTENSIONS = new Set([
  'pdf', 'csv', 'xlsx', 'xls', 'docx', 'doc', 'png', 'jpg', 'jpeg',
]);

type DealRoomStage = (typeof DEAL_ROOM_STAGES)[number];
type DealRoomStatus = (typeof DEAL_ROOM_STATUSES)[number];
type MemberRole = (typeof MEMBER_ROLES)[number];
type RequestPriority = (typeof REQUEST_PRIORITIES)[number];
type RequestStatus = (typeof REQUEST_STATUSES)[number];
type ActivityEvent = (typeof ACTIVITY_EVENTS)[number];

interface ActionResult<T = Record<string, unknown>> {
  data?: T;
  error?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function isValidUUID(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function trimOrNull(value: FormDataEntryValue | null): string | null {
  if (!value || typeof value !== 'string') return null;
  const t = value.trim();
  return t.length > 0 ? t : null;
}

function getFileExtension(filename: string): string {
  const idx = filename.lastIndexOf('.');
  if (idx < 0) return '';
  return filename.slice(idx + 1).toLowerCase();
}

/**
 * Insert a deal-room activity record.  Errors here are non-fatal – we log
 * them but do not surface them to the caller.
 */
async function logActivity(
  supabase: Awaited<ReturnType<typeof createClient>>,
  dealRoomId: string,
  actorId: string,
  eventType: ActivityEvent,
  metadata?: Record<string, unknown>,
): Promise<void> {
  const { error } = await supabase.from('deal_room_activity').insert({
    deal_room_id: dealRoomId,
    actor_id: actorId,
    event_type: eventType,
    metadata: metadata ?? null,
  });
  if (error) {
    console.error('[deal-room-activity]', error.message);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// createDealRoom
// Only the seller may create; Pro entitlement required.
// ─────────────────────────────────────────────────────────────────────────────
export async function createDealRoom(
  formData: FormData,
): Promise<ActionResult<{ dealRoomId: string }>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'You must be signed in.' };

  const conversationId = trimOrNull(formData.get('conversationId'));
  if (!conversationId || !isValidUUID(conversationId))
    return { error: 'Invalid conversation.' };

  // ── Pro entitlement check ────────────────────────────────────────────────
  const billing = await getUserBillingState(supabase, user.id);
  if (!billing.entitlements.dealRooms) {
    return {
      error:
        'Deal Rooms are a Pro plan feature. Please upgrade your subscription.',
    };
  }

  // ── Verify conversation and seller role ──────────────────────────────────
  const { data: conversation } = await supabase
    .from('conversations')
    .select('id, listing_id, buyer_id, seller_id, status')
    .eq('id', conversationId)
    .maybeSingle();

  if (!conversation) return { error: 'Conversation not found.' };
  if (conversation.seller_id !== user.id)
    return { error: 'Only the seller may create a Deal Room.' };
  if (!['active', 'qualified', 'nda_requested'].includes(conversation.status))
    return { error: 'The conversation must be active, qualified, or NDA-requested before creating a Deal Room.' };

  // ── Check for existing deal room ─────────────────────────────────────────
  const { data: existing } = await supabase
    .from('deal_rooms')
    .select('id')
    .eq('conversation_id', conversationId)
    .maybeSingle();

  if (existing) return { data: { dealRoomId: existing.id } };

  // ── Validate listing ownership ───────────────────────────────────────────
  const { data: listing } = await supabase
    .from('business_listings')
    .select('id, business_name, user_id')
    .eq('id', conversation.listing_id)
    .maybeSingle();

  if (!listing || listing.user_id !== user.id)
    return { error: 'Listing not found or you are not the owner.' };

  const title = `Deal Room – ${listing.business_name}`;

  // ── Create the deal room ─────────────────────────────────────────────────
  const { data: dealRoom, error: drError } = await supabase
    .from('deal_rooms')
    .insert({
      conversation_id: conversationId,
      listing_id: conversation.listing_id,
      buyer_id: conversation.buyer_id,
      seller_id: user.id,
      created_by: user.id,
      title,
      stage: 'information_review',
      status: 'active',
    })
    .select('id')
    .single();

  if (drError || !dealRoom)
    return { error: 'Could not create Deal Room. Please try again.' };

  const dealRoomId = dealRoom.id as string;

  // ── Add seller as active member ──────────────────────────────────────────
  await supabase.from('deal_room_members').insert({
    deal_room_id: dealRoomId,
    user_id: user.id,
    role: 'seller',
    membership_status: 'active',
    invited_by: user.id,
    joined_at: new Date().toISOString(),
  });

  // ── Add buyer as active member ───────────────────────────────────────────
  await supabase.from('deal_room_members').insert({
    deal_room_id: dealRoomId,
    user_id: conversation.buyer_id,
    role: 'buyer',
    membership_status: 'active',
    invited_by: user.id,
    joined_at: new Date().toISOString(),
  });

  // ── Advance conversation status ──────────────────────────────────────────
  await supabase
    .from('conversations')
    .update({ status: 'deal_room', updated_at: new Date().toISOString() })
    .eq('id', conversationId);

  // ── System message in existing conversation ──────────────────────────────
  await supabase.from('messages').insert({
    conversation_id: conversationId,
    sender_id: user.id,
    message_type: 'system',
    body: `A Deal Room has been created for this conversation. Open it at /deals/${dealRoomId}`,
  });

  // ── Activity log ─────────────────────────────────────────────────────────
  await logActivity(supabase, dealRoomId, user.id, 'deal_room_created', {
    title,
    listing_id: conversation.listing_id,
  });

  revalidatePath(`/messages/${conversationId}`);
  revalidatePath('/messages');
  revalidatePath('/deals');

  return { data: { dealRoomId } };
}

// ─────────────────────────────────────────────────────────────────────────────
// updateDealRoomStage
// ─────────────────────────────────────────────────────────────────────────────
export async function updateDealRoomStage(
  formData: FormData,
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated.' };

  const dealRoomId = trimOrNull(formData.get('dealRoomId'));
  if (!dealRoomId || !isValidUUID(dealRoomId)) return { error: 'Invalid Deal Room.' };

  const stage = trimOrNull(formData.get('stage')) as DealRoomStage | null;
  if (!stage || !(DEAL_ROOM_STAGES as readonly string[]).includes(stage))
    return { error: 'Invalid stage value.' };

  // Verify seller membership
  const { data: member } = await supabase
    .from('deal_room_members')
    .select('id')
    .eq('deal_room_id', dealRoomId)
    .eq('user_id', user.id)
    .eq('role', 'seller')
    .eq('membership_status', 'active')
    .maybeSingle();

  if (!member) return { error: 'Only the seller may update the stage.' };

  const { data: dealRoom } = await supabase
    .from('deal_rooms')
    .select('id, stage, status')
    .eq('id', dealRoomId)
    .maybeSingle();

  if (!dealRoom) return { error: 'Deal Room not found.' };
  if (dealRoom.status === 'closed') return { error: 'Cannot update a closed Deal Room.' };

  const oldStage = dealRoom.stage as string;

  const { error } = await supabase
    .from('deal_rooms')
    .update({ stage })
    .eq('id', dealRoomId);

  if (error) return { error: 'Could not update stage. Please try again.' };

  await logActivity(supabase, dealRoomId, user.id, 'stage_changed', {
    from: oldStage,
    to: stage,
  });

  revalidatePath(`/deals/${dealRoomId}`);
  revalidatePath('/deals');
  return { data: { updated: true } };
}

// ─────────────────────────────────────────────────────────────────────────────
// closeDealRoom
// ─────────────────────────────────────────────────────────────────────────────
export async function closeDealRoom(
  formData: FormData,
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated.' };

  const dealRoomId = trimOrNull(formData.get('dealRoomId'));
  if (!dealRoomId || !isValidUUID(dealRoomId)) return { error: 'Invalid Deal Room.' };

  const newStatus = (trimOrNull(formData.get('status')) ?? 'closed') as DealRoomStatus;
  if (!(DEAL_ROOM_STATUSES as readonly string[]).includes(newStatus))
    return { error: 'Invalid status value.' };

  const { data: member } = await supabase
    .from('deal_room_members')
    .select('id')
    .eq('deal_room_id', dealRoomId)
    .eq('user_id', user.id)
    .eq('role', 'seller')
    .eq('membership_status', 'active')
    .maybeSingle();

  if (!member) return { error: 'Only the seller may close a Deal Room.' };

  const { data: dealRoom } = await supabase
    .from('deal_rooms')
    .select('id, status')
    .eq('id', dealRoomId)
    .maybeSingle();

  if (!dealRoom) return { error: 'Deal Room not found.' };

  const updatePayload: Record<string, unknown> = { status: newStatus };
  if (newStatus === 'closed' || newStatus === 'withdrawn') {
    updatePayload.closed_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from('deal_rooms')
    .update(updatePayload)
    .eq('id', dealRoomId);

  if (error) return { error: 'Could not update Deal Room status.' };

  await logActivity(supabase, dealRoomId, user.id, 'status_changed', {
    from: dealRoom.status,
    to: newStatus,
  });

  revalidatePath(`/deals/${dealRoomId}`);
  revalidatePath('/deals');
  return { data: { updated: true } };
}

// ─────────────────────────────────────────────────────────────────────────────
// inviteDealRoomMember
// ─────────────────────────────────────────────────────────────────────────────
export async function inviteDealRoomMember(
  formData: FormData,
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated.' };

  const dealRoomId = trimOrNull(formData.get('dealRoomId'));
  if (!dealRoomId || !isValidUUID(dealRoomId)) return { error: 'Invalid Deal Room.' };

  const role = trimOrNull(formData.get('role')) as MemberRole | null;
  if (!role || !(MEMBER_ROLES as readonly string[]).includes(role))
    return { error: 'Invalid member role.' };

  if (role === 'seller' || role === 'buyer')
    return { error: 'Cannot manually invite additional sellers or buyers.' };

  // Verify caller is seller
  const { data: sellerMember } = await supabase
    .from('deal_room_members')
    .select('id')
    .eq('deal_room_id', dealRoomId)
    .eq('user_id', user.id)
    .eq('role', 'seller')
    .eq('membership_status', 'active')
    .maybeSingle();

  if (!sellerMember) return { error: 'Only the seller may invite members.' };

  const { data: dealRoom } = await supabase
    .from('deal_rooms')
    .select('id, status')
    .eq('id', dealRoomId)
    .maybeSingle();

  if (!dealRoom) return { error: 'Deal Room not found.' };
  if (dealRoom.status === 'closed') return { error: 'Cannot invite to a closed Deal Room.' };

  const invitedUserId = trimOrNull(formData.get('userId'));
  const invitedEmail = trimOrNull(formData.get('email'));

  if (!invitedUserId && !invitedEmail)
    return { error: 'Provide a user ID or email address.' };
  if (invitedUserId && !isValidUUID(invitedUserId))
    return { error: 'Invalid user ID.' };

  // Prevent duplicate invite
  if (invitedUserId) {
    const { data: existing } = await supabase
      .from('deal_room_members')
      .select('id, membership_status')
      .eq('deal_room_id', dealRoomId)
      .eq('user_id', invitedUserId)
      .maybeSingle();

    if (existing) {
      if (existing.membership_status === 'active')
        return { error: 'This person is already an active member.' };
      // Re-invite by resetting status
      const { error } = await supabase
        .from('deal_room_members')
        .update({ membership_status: 'invited', role, invited_by: user.id })
        .eq('id', existing.id);
      if (error) return { error: 'Could not re-invite member.' };
      await logActivity(supabase, dealRoomId, user.id, 'member_invited', {
        user_id: invitedUserId,
        role,
      });
      revalidatePath(`/deals/${dealRoomId}`);
      return { data: { invited: true } };
    }
  }

  const { error } = await supabase.from('deal_room_members').insert({
    deal_room_id: dealRoomId,
    user_id: invitedUserId ?? null,
    invited_email: invitedEmail ?? null,
    role,
    membership_status: 'invited',
    invited_by: user.id,
  });

  if (error) return { error: 'Could not invite member. Please try again.' };

  await logActivity(supabase, dealRoomId, user.id, 'member_invited', {
    user_id: invitedUserId,
    email: invitedEmail,
    role,
  });

  revalidatePath(`/deals/${dealRoomId}`);
  return { data: { invited: true } };
}

// ─────────────────────────────────────────────────────────────────────────────
// removeDealRoomMember
// ─────────────────────────────────────────────────────────────────────────────
export async function removeDealRoomMember(
  formData: FormData,
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated.' };

  const dealRoomId = trimOrNull(formData.get('dealRoomId'));
  if (!dealRoomId || !isValidUUID(dealRoomId)) return { error: 'Invalid Deal Room.' };

  const memberId = trimOrNull(formData.get('memberId'));
  if (!memberId || !isValidUUID(memberId)) return { error: 'Invalid member ID.' };

  const { data: sellerMember } = await supabase
    .from('deal_room_members')
    .select('id')
    .eq('deal_room_id', dealRoomId)
    .eq('user_id', user.id)
    .eq('role', 'seller')
    .eq('membership_status', 'active')
    .maybeSingle();

  if (!sellerMember) return { error: 'Only the seller may remove members.' };

  const { data: target } = await supabase
    .from('deal_room_members')
    .select('id, user_id, role')
    .eq('id', memberId)
    .eq('deal_room_id', dealRoomId)
    .maybeSingle();

  if (!target) return { error: 'Member not found.' };
  if (target.role === 'seller')
    return { error: 'The seller cannot be removed from the Deal Room.' };

  const { error } = await supabase
    .from('deal_room_members')
    .update({ membership_status: 'removed' })
    .eq('id', memberId);

  if (error) return { error: 'Could not remove member. Please try again.' };

  await logActivity(supabase, dealRoomId, user.id, 'member_removed', {
    removed_user_id: target.user_id,
    role: target.role,
  });

  revalidatePath(`/deals/${dealRoomId}`);
  return { data: { removed: true } };
}

// ─────────────────────────────────────────────────────────────────────────────
// uploadDealRoomDocument
// ─────────────────────────────────────────────────────────────────────────────
export async function uploadDealRoomDocument(
  formData: FormData,
): Promise<ActionResult<{ documentId: string }>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated.' };

  const dealRoomId = trimOrNull(formData.get('dealRoomId'));
  if (!dealRoomId || !isValidUUID(dealRoomId)) return { error: 'Invalid Deal Room.' };

  // Verify active membership
  const { data: member } = await supabase
    .from('deal_room_members')
    .select('id')
    .eq('deal_room_id', dealRoomId)
    .eq('user_id', user.id)
    .eq('membership_status', 'active')
    .maybeSingle();

  if (!member) return { error: 'You are not an active member of this Deal Room.' };

  const { data: dealRoom } = await supabase
    .from('deal_rooms')
    .select('id, status')
    .eq('id', dealRoomId)
    .maybeSingle();

  if (!dealRoom) return { error: 'Deal Room not found.' };
  if (dealRoom.status === 'closed')
    return { error: 'Cannot upload to a closed Deal Room.' };

  // ── File validation ──────────────────────────────────────────────────────
  const file = formData.get('file') as File | null;
  if (!file || file.size === 0) return { error: 'No file selected.' };
  if (file.size > MAX_FILE_BYTES)
    return { error: 'File exceeds the 50 MB size limit.' };

  const ext = getFileExtension(file.name);
  if (!ALLOWED_EXTENSIONS.has(ext))
    return {
      error:
        'File type not allowed. Upload PDF, CSV, XLSX, DOCX, PNG, or JPG files only.',
    };

  if (file.type && !ALLOWED_MIME_TYPES.has(file.type))
    return { error: 'File MIME type not allowed.' };

  if (
    file.name.includes('..') ||
    file.name.includes('/') ||
    file.name.includes('\\')
  )
    return { error: 'Invalid filename.' };

  const category = trimOrNull(formData.get('category'));
  const description = trimOrNull(formData.get('description'));

  // ── Sanitize and upload ──────────────────────────────────────────────────
  const sanitizedName = sanitizeDocumentFilename(file.name);
  const objectName = `${dealRoomId}/${Date.now()}-${sanitizedName}`;

  const { error: storageError } = await supabase.storage
    .from('deal-room-files')
    .upload(objectName, file, { cacheControl: '3600', upsert: false });

  if (storageError)
    return { error: 'Upload failed. Please try again.' };

  // ── Insert metadata record ───────────────────────────────────────────────
  const { data: doc, error: dbError } = await supabase
    .from('deal_room_documents')
    .insert({
      deal_room_id: dealRoomId,
      uploaded_by: user.id,
      storage_path: objectName,
      filename: file.name,
      filetype: file.type || 'application/octet-stream',
      filesize: file.size,
      category: category ?? null,
      description: description ?? null,
    })
    .select('id')
    .single();

  if (dbError) {
    await supabase.storage.from('deal-room-files').remove([objectName]);
    return { error: 'Could not save document record. Please try again.' };
  }

  await logActivity(supabase, dealRoomId, user.id, 'document_uploaded', {
    document_id: doc.id,
    filename: file.name,
  });

  revalidatePath(`/deals/${dealRoomId}`);
  return { data: { documentId: doc.id as string } };
}

// ─────────────────────────────────────────────────────────────────────────────
// deleteDealRoomDocument  (soft delete)
// ─────────────────────────────────────────────────────────────────────────────
export async function deleteDealRoomDocument(
  formData: FormData,
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated.' };

  const documentId = trimOrNull(formData.get('documentId'));
  if (!documentId || !isValidUUID(documentId)) return { error: 'Invalid document.' };

  const { data: doc } = await supabase
    .from('deal_room_documents')
    .select('id, deal_room_id, uploaded_by, deleted_at')
    .eq('id', documentId)
    .maybeSingle();

  if (!doc || doc.deleted_at) return { error: 'Document not found.' };

  // Must be active member AND (seller OR uploader)
  const { data: member } = await supabase
    .from('deal_room_members')
    .select('id, role')
    .eq('deal_room_id', doc.deal_room_id as string)
    .eq('user_id', user.id)
    .eq('membership_status', 'active')
    .maybeSingle();

  if (!member) return { error: 'Access denied.' };
  if (member.role !== 'seller' && doc.uploaded_by !== user.id)
    return { error: 'Only the seller or the uploader may delete this document.' };

  const { error } = await supabase
    .from('deal_room_documents')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', documentId);

  if (error) return { error: 'Could not delete document. Please try again.' };

  await logActivity(supabase, doc.deal_room_id as string, user.id, 'document_deleted', {
    document_id: documentId,
  });

  revalidatePath(`/deals/${doc.deal_room_id}`);
  return { data: { deleted: true } };
}

// ─────────────────────────────────────────────────────────────────────────────
// createDocumentRequest
// ─────────────────────────────────────────────────────────────────────────────
export async function createDocumentRequest(
  formData: FormData,
): Promise<ActionResult<{ requestId: string }>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated.' };

  const dealRoomId = trimOrNull(formData.get('dealRoomId'));
  if (!dealRoomId || !isValidUUID(dealRoomId)) return { error: 'Invalid Deal Room.' };

  const title = trimOrNull(formData.get('title'));
  if (!title) return { error: 'Request title is required.' };
  if (title.length > 500) return { error: 'Title is too long.' };

  const priority = (trimOrNull(formData.get('priority')) ?? 'normal') as RequestPriority;
  if (!(REQUEST_PRIORITIES as readonly string[]).includes(priority))
    return { error: 'Invalid priority.' };

  // Verify active membership
  const { data: member } = await supabase
    .from('deal_room_members')
    .select('id')
    .eq('deal_room_id', dealRoomId)
    .eq('user_id', user.id)
    .eq('membership_status', 'active')
    .maybeSingle();

  if (!member) return { error: 'You are not an active member of this Deal Room.' };

  const { data: dealRoom } = await supabase
    .from('deal_rooms')
    .select('id, status')
    .eq('id', dealRoomId)
    .maybeSingle();

  if (!dealRoom) return { error: 'Deal Room not found.' };
  if (dealRoom.status === 'closed')
    return { error: 'Cannot add requests to a closed Deal Room.' };

  const description = trimOrNull(formData.get('description'));
  const category = trimOrNull(formData.get('category'));
  const assignedTo = trimOrNull(formData.get('assignedTo'));
  if (assignedTo && !isValidUUID(assignedTo)) return { error: 'Invalid assignee.' };

  const dueDateRaw = trimOrNull(formData.get('dueDate'));
  const dueDate = dueDateRaw ? new Date(dueDateRaw).toISOString() : null;

  const { data: req, error } = await supabase
    .from('deal_room_requests')
    .insert({
      deal_room_id: dealRoomId,
      created_by: user.id,
      assigned_to: assignedTo ?? null,
      title,
      description: description ?? null,
      category: category ?? null,
      priority,
      status: 'open',
      due_date: dueDate,
    })
    .select('id')
    .single();

  if (error) return { error: 'Could not create request. Please try again.' };

  await logActivity(supabase, dealRoomId, user.id, 'request_created', {
    request_id: req.id,
    title,
  });

  revalidatePath(`/deals/${dealRoomId}`);
  return { data: { requestId: req.id as string } };
}

// ─────────────────────────────────────────────────────────────────────────────
// updateDocumentRequest
// ─────────────────────────────────────────────────────────────────────────────
export async function updateDocumentRequest(
  formData: FormData,
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated.' };

  const requestId = trimOrNull(formData.get('requestId'));
  if (!requestId || !isValidUUID(requestId)) return { error: 'Invalid request.' };

  const { data: req } = await supabase
    .from('deal_room_requests')
    .select('id, deal_room_id, status')
    .eq('id', requestId)
    .maybeSingle();

  if (!req) return { error: 'Request not found.' };

  const { data: member } = await supabase
    .from('deal_room_members')
    .select('id')
    .eq('deal_room_id', req.deal_room_id as string)
    .eq('user_id', user.id)
    .eq('membership_status', 'active')
    .maybeSingle();

  if (!member) return { error: 'Access denied.' };
  if (req.status === 'completed') return { error: 'Cannot edit a completed request.' };

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  const title = trimOrNull(formData.get('title'));
  if (title) updates.title = title;

  const description = trimOrNull(formData.get('description'));
  if (description !== undefined) updates.description = description;

  const priority = trimOrNull(formData.get('priority')) as RequestPriority | null;
  if (priority) {
    if (!(REQUEST_PRIORITIES as readonly string[]).includes(priority))
      return { error: 'Invalid priority.' };
    updates.priority = priority;
  }

  const status = trimOrNull(formData.get('status')) as RequestStatus | null;
  if (status) {
    if (!(REQUEST_STATUSES as readonly string[]).includes(status))
      return { error: 'Invalid status.' };
    updates.status = status;
  }

  const { error } = await supabase
    .from('deal_room_requests')
    .update(updates)
    .eq('id', requestId);

  if (error) return { error: 'Could not update request. Please try again.' };

  await logActivity(supabase, req.deal_room_id as string, user.id, 'request_updated', {
    request_id: requestId,
  });

  revalidatePath(`/deals/${req.deal_room_id}`);
  return { data: { updated: true } };
}

// ─────────────────────────────────────────────────────────────────────────────
// completeDocumentRequest
// ─────────────────────────────────────────────────────────────────────────────
export async function completeDocumentRequest(
  formData: FormData,
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated.' };

  const requestId = trimOrNull(formData.get('requestId'));
  if (!requestId || !isValidUUID(requestId)) return { error: 'Invalid request.' };

  const { data: req } = await supabase
    .from('deal_room_requests')
    .select('id, deal_room_id, status')
    .eq('id', requestId)
    .maybeSingle();

  if (!req) return { error: 'Request not found.' };
  if (req.status === 'completed') return { error: 'Request is already completed.' };

  const { data: member } = await supabase
    .from('deal_room_members')
    .select('id')
    .eq('deal_room_id', req.deal_room_id as string)
    .eq('user_id', user.id)
    .eq('membership_status', 'active')
    .maybeSingle();

  if (!member) return { error: 'Access denied.' };

  const now = new Date().toISOString();
  const { error } = await supabase
    .from('deal_room_requests')
    .update({ status: 'completed', completed_at: now, updated_at: now })
    .eq('id', requestId);

  if (error) return { error: 'Could not complete request. Please try again.' };

  await logActivity(supabase, req.deal_room_id as string, user.id, 'request_completed', {
    request_id: requestId,
  });

  revalidatePath(`/deals/${req.deal_room_id}`);
  return { data: { completed: true } };
}
