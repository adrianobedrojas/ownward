'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const MAX_MESSAGE_LENGTH = 4000;
const MAX_FIELD_LENGTH = 1000;

const ALLOWED_GOALS = [
  'owner_operator',
  'passive_investment',
  'strategic_add_on',
  'researching',
] as const;

const ALLOWED_FINANCING = [
  'cash',
  'prequalified',
  'seeking_financing',
  'unsure',
  'prefer_not_to_say',
] as const;

const ALLOWED_STATUSES = [
  'new',
  'active',
  'qualified',
  'nda_requested',
  'deal_room',
  'not_a_fit',
  'archived',
] as const;

type Goal = (typeof ALLOWED_GOALS)[number];
type Financing = (typeof ALLOWED_FINANCING)[number];
type ConversationStatus = (typeof ALLOWED_STATUSES)[number];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function isValidUUID(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function trimOrNull(value: FormDataEntryValue | null): string | null {
  if (!value || typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function limitLength(value: string | null, max: number): string | null {
  if (!value) return null;
  return value.slice(0, max);
}

interface ActionResult {
  error?: string;
  data?: unknown;
}

// ─────────────────────────────────────────────────────────────────────────────
// saveListing
// ─────────────────────────────────────────────────────────────────────────────

export async function saveListing(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'You must be signed in to save a listing.' };

  const listingId = trimOrNull(formData.get('listingId'));
  if (!listingId || !isValidUUID(listingId)) return { error: 'Invalid listing.' };

  // Verify listing exists and is published
  const { data: listing } = await supabase
    .from('business_listings')
    .select('id, user_id')
    .eq('id', listingId)
    .eq('is_public', true)
    .eq('status', 'published')
    .maybeSingle();

  if (!listing) return { error: 'Listing not found.' };

  const { error } = await supabase
    .from('saved_listings')
    .insert({ user_id: user.id, listing_id: listingId });

  if (error) {
    if (error.code === '23505') return { data: { alreadySaved: true } }; // unique violation
    return { error: 'Could not save listing. Please try again.' };
  }

  revalidatePath('/saved');
  return { data: { saved: true } };
}

// ─────────────────────────────────────────────────────────────────────────────
// removeSavedListing
// ─────────────────────────────────────────────────────────────────────────────

export async function removeSavedListing(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'You must be signed in.' };

  const listingId = trimOrNull(formData.get('listingId'));
  if (!listingId || !isValidUUID(listingId)) return { error: 'Invalid listing.' };

  const { error } = await supabase
    .from('saved_listings')
    .delete()
    .eq('user_id', user.id)
    .eq('listing_id', listingId);

  if (error) return { error: 'Could not remove saved listing. Please try again.' };

  revalidatePath('/saved');
  return { data: { removed: true } };
}

// ─────────────────────────────────────────────────────────────────────────────
// startConversation
// Returns existing conversation id if one already exists.
// ─────────────────────────────────────────────────────────────────────────────

export async function startConversation(listingId: string): Promise<{ conversationId?: string; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'You must be signed in to contact the seller.' };

  if (!isValidUUID(listingId)) return { error: 'Invalid listing.' };

  // Verify listing is published and get seller id
  const { data: listing } = await supabase
    .from('business_listings')
    .select('id, user_id, business_name')
    .eq('id', listingId)
    .eq('is_public', true)
    .eq('status', 'published')
    .maybeSingle();

  if (!listing) return { error: 'Listing not found or not published.' };

  const sellerId = listing.user_id as string;

  // Prevent self-conversations
  if (sellerId === user.id) {
    return { error: 'You cannot start a conversation on your own listing.' };
  }

  // Reuse existing conversation
  const { data: existing } = await supabase
    .from('conversations')
    .select('id')
    .eq('buyer_id', user.id)
    .eq('listing_id', listingId)
    .maybeSingle();

  if (existing) return { conversationId: existing.id };

  // Create new
  const { data: created, error } = await supabase
    .from('conversations')
    .insert({
      listing_id: listingId,
      buyer_id: user.id,
      seller_id: sellerId,
      status: 'new',
    })
    .select('id')
    .single();

  if (error) return { error: 'Could not start conversation. Please try again.' };
  return { conversationId: created.id };
}

// ─────────────────────────────────────────────────────────────────────────────
// submitListingInterest
// ─────────────────────────────────────────────────────────────────────────────

export async function submitListingInterest(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'You must be signed in to submit interest.' };

  const listingId = trimOrNull(formData.get('listingId'));
  if (!listingId || !isValidUUID(listingId)) return { error: 'Invalid listing.' };

  // Validate listing
  const { data: listing } = await supabase
    .from('business_listings')
    .select('id, user_id, business_name')
    .eq('id', listingId)
    .eq('is_public', true)
    .eq('status', 'published')
    .maybeSingle();

  if (!listing) return { error: 'Listing not found.' };
  if (listing.user_id === user.id) return { error: 'You cannot submit interest in your own listing.' };

  const goal = trimOrNull(formData.get('goal')) as Goal | null;
  if (!goal || !(ALLOWED_GOALS as readonly string[]).includes(goal)) {
    return { error: 'Please select a valid acquisition goal.' };
  }

  const budgetMinRaw = trimOrNull(formData.get('budget_min'));
  const budgetMaxRaw = trimOrNull(formData.get('budget_max'));
  const budgetMin = budgetMinRaw ? parseFloat(budgetMinRaw) : null;
  const budgetMax = budgetMaxRaw ? parseFloat(budgetMaxRaw) : null;

  if (budgetMin !== null && isNaN(budgetMin)) return { error: 'Invalid minimum budget.' };
  if (budgetMax !== null && isNaN(budgetMax)) return { error: 'Invalid maximum budget.' };
  if (budgetMin !== null && budgetMax !== null && budgetMin > budgetMax) {
    return { error: 'Minimum budget cannot exceed maximum budget.' };
  }

  const financingStatus = trimOrNull(formData.get('financing_status')) as Financing | null;
  if (financingStatus && !(ALLOWED_FINANCING as readonly string[]).includes(financingStatus)) {
    return { error: 'Invalid financing status.' };
  }

  const timeline = limitLength(trimOrNull(formData.get('timeline')), MAX_FIELD_LENGTH);
  const experience = limitLength(trimOrNull(formData.get('experience')), MAX_FIELD_LENGTH);
  const initialQuestion = limitLength(trimOrNull(formData.get('initial_question')), MAX_MESSAGE_LENGTH);

  // Get buyer display name from profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .maybeSingle();

  const buyerName: string = (profile as { full_name?: string } | null)?.full_name?.trim() || 'A buyer';

  // Get or create conversation
  const convResult = await startConversation(listingId);
  if (convResult.error || !convResult.conversationId) {
    return { error: convResult.error || 'Could not start conversation.' };
  }
  const conversationId = convResult.conversationId;

  // Build interest-summary message
  const goalLabels: Record<Goal, string> = {
    owner_operator: 'an owner-operated business',
    passive_investment: 'a passive investment',
    strategic_add_on: 'a strategic add-on',
    researching: 'options',
  };

  const budgetText = budgetMin != null && budgetMax != null
    ? ` with a budget of $${budgetMin.toLocaleString()}–$${budgetMax.toLocaleString()}`
    : budgetMin != null
    ? ` with a minimum budget of $${budgetMin.toLocaleString()}`
    : budgetMax != null
    ? ` with a maximum budget of $${budgetMax.toLocaleString()}`
    : '';

  const timelineText = timeline ? ` and hopes to acquire ${timeline}` : '';
  const questionText = initialQuestion ? ` Main question: ${initialQuestion}` : '';

  const summaryBody = `${buyerName} shared interest in ${listing.business_name}. ${buyerName} is looking for ${goalLabels[goal]}${budgetText}${timelineText}.${questionText}`;

  const { error: submissionError } = await supabase.rpc(
    'create_listing_interest_submission',
    {
      p_listing_id: listingId,
      p_buyer_id: user.id,
      p_goal: goal,
      p_budget_min: budgetMin,
      p_budget_max: budgetMax,
      p_timeline: timeline,
      p_financing_status: financingStatus,
      p_experience: experience,
      p_initial_question: initialQuestion,
      p_conversation_id: conversationId,
      p_message_body: summaryBody,
    }
  );

  if (submissionError) {
    if (submissionError.code === '23505') {
      return { error: 'You already submitted interest for this listing.' };
    }
    return { error: 'Could not save your submission. Please try again.' };
  }

  revalidatePath(`/messages/${conversationId}`);
  revalidatePath('/messages');

  return { data: { conversationId } };
}

// ─────────────────────────────────────────────────────────────────────────────
// sendMessage
// ─────────────────────────────────────────────────────────────────────────────

export async function sendMessage(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'You must be signed in to send messages.' };

  const conversationId = trimOrNull(formData.get('conversationId'));
  if (!conversationId || !isValidUUID(conversationId)) return { error: 'Invalid conversation.' };

  const body = trimOrNull(formData.get('body'));
  if (!body) return { error: 'Message cannot be empty.' };
  if (body.length > MAX_MESSAGE_LENGTH) {
    return { error: `Message is too long (max ${MAX_MESSAGE_LENGTH} characters).` };
  }

  // Verify participation
  const { data: conversation } = await supabase
    .from('conversations')
    .select('id, buyer_id, seller_id, status')
    .eq('id', conversationId)
    .maybeSingle();

  if (!conversation) return { error: 'Conversation not found.' };

  const isParticipant = conversation.buyer_id === user.id || conversation.seller_id === user.id;
  if (!isParticipant) return { error: 'You are not a participant in this conversation.' };

  if (['not_a_fit', 'archived'].includes(conversation.status)) {
    return { error: 'This conversation is closed.' };
  }

  const { error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id: user.id,
      message_type: 'user',
      body,
    });

  if (error) return { error: 'Could not send message. Please try again.' };

  // Update conversation status from new to active on first user message
  if (conversation.status === 'new') {
    await supabase
      .from('conversations')
      .update({ status: 'active', updated_at: new Date().toISOString() })
      .eq('id', conversationId);
  }

  revalidatePath(`/messages/${conversationId}`);
  revalidatePath('/messages');
  return { data: { sent: true } };
}

// ─────────────────────────────────────────────────────────────────────────────
// markConversationRead
// ─────────────────────────────────────────────────────────────────────────────

export async function markConversationRead(conversationId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated.' };

  if (!isValidUUID(conversationId)) return { error: 'Invalid conversation.' };

  const { data: conversation } = await supabase
    .from('conversations')
    .select('id, buyer_id, seller_id')
    .eq('id', conversationId)
    .maybeSingle();

  if (!conversation) return { error: 'Conversation not found.' };

  const isBuyer = conversation.buyer_id === user.id;
  const isSeller = conversation.seller_id === user.id;
  if (!isBuyer && !isSeller) return { error: 'Access denied.' };

  const updateField = isBuyer ? 'buyer_last_read_at' : 'seller_last_read_at';
  await supabase
    .from('conversations')
    .update({ [updateField]: new Date().toISOString() })
    .eq('id', conversationId);

  return { data: { marked: true } };
}

// ─────────────────────────────────────────────────────────────────────────────
// updateConversationStatus
// Only seller may change status.
// ─────────────────────────────────────────────────────────────────────────────

export async function updateConversationStatus(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated.' };

  const conversationId = trimOrNull(formData.get('conversationId'));
  if (!conversationId || !isValidUUID(conversationId)) return { error: 'Invalid conversation.' };

  const status = trimOrNull(formData.get('status')) as ConversationStatus | null;
  if (!status || !(ALLOWED_STATUSES as readonly string[]).includes(status)) {
    return { error: 'Invalid status.' };
  }

  const { data: conversation } = await supabase
    .from('conversations')
    .select('id, seller_id')
    .eq('id', conversationId)
    .maybeSingle();

  if (!conversation) return { error: 'Conversation not found.' };
  if (conversation.seller_id !== user.id) return { error: 'Only the seller can update conversation status.' };

  const { error } = await supabase
    .from('conversations')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', conversationId);

  if (error) return { error: 'Could not update status. Please try again.' };

  revalidatePath(`/messages/${conversationId}`);
  revalidatePath('/messages');
  return { data: { updated: true } };
}

// ─────────────────────────────────────────────────────────────────────────────
// blockUser
// ─────────────────────────────────────────────────────────────────────────────

export async function blockUser(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated.' };

  const blockedId = trimOrNull(formData.get('blockedUserId'));
  if (!blockedId || !isValidUUID(blockedId)) return { error: 'Invalid user.' };
  if (blockedId === user.id) return { error: 'You cannot block yourself.' };

  const { error } = await supabase
    .from('blocked_users')
    .insert({ blocker_id: user.id, blocked_id: blockedId });

  if (error) {
    if (error.code === '23505') return { data: { alreadyBlocked: true } };
    return { error: 'Could not block user. Please try again.' };
  }

  return { data: { blocked: true } };
}

// ─────────────────────────────────────────────────────────────────────────────
// reportMessage
// ─────────────────────────────────────────────────────────────────────────────

export async function reportMessage(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated.' };

  const messageId = trimOrNull(formData.get('messageId'));
  if (!messageId || !isValidUUID(messageId)) return { error: 'Invalid message.' };

  const reason = trimOrNull(formData.get('reason'));
  if (!reason) return { error: 'Please provide a reason for the report.' };

  // Verify user can see the message (i.e., is a participant in the conversation)
  const { data: message } = await supabase
    .from('messages')
    .select('id, conversation_id')
    .eq('id', messageId)
    .maybeSingle();

  if (!message) return { error: 'Message not found.' };

  const { data: conversation } = await supabase
    .from('conversations')
    .select('buyer_id, seller_id')
    .eq('id', message.conversation_id)
    .maybeSingle();

  if (!conversation) return { error: 'Conversation not found.' };
  const isParticipant = conversation.buyer_id === user.id || conversation.seller_id === user.id;
  if (!isParticipant) return { error: 'Access denied.' };

  const { error } = await supabase
    .from('message_reports')
    .insert({ reporter_id: user.id, message_id: messageId, reason });

  if (error) {
    if (error.code === '23505') return { data: { alreadyReported: true } };
    return { error: 'Could not submit report. Please try again.' };
  }

  return { data: { reported: true } };
}
