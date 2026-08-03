'use server';

import { createClient } from '@/lib/supabase/server';

/**
 * Record a qualified view of a listing.
 * Server-only; calls the hardened DB function which derives buyer
 * from auth.uid() and deduplicates within 24h.
 *
 * Minimum 20-second dwell time must be enforced on the client before calling.
 */
export async function recordQualifiedView(listingId: string): Promise<{
  ok: boolean;
  status?: string;
  error?: string;
}> {
  if (!listingId?.trim()) return { ok: false, error: 'Missing listing ID' };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('record_qualified_view', {
    p_listing_id: listingId,
  });

  if (error) return { ok: false, error: error.message };
  const result = data as { status: string } | null;
  return { ok: true, status: result?.status };
}

/**
 * Record explicit buyer interest (Yes flow).
 * Creates interested event + conversation + returns conversationId.
 */
export async function recordExplicitInterest(
  listingId: string,
  eventType: 'interested' | 'maybe_interested' | 'requested_information',
  conversationId?: string | null
): Promise<{
  ok: boolean;
  conversationId?: string;
  eventId?: string;
  error?: string;
}> {
  if (!listingId?.trim()) return { ok: false, error: 'Missing listing ID' };
  if (!['interested', 'maybe_interested', 'requested_information'].includes(eventType)) {
    return { ok: false, error: 'Invalid event type' };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('record_explicit_interest', {
    p_listing_id: listingId,
    p_event_type: eventType,
    p_conversation_id: conversationId ?? null,
  });

  if (error) return { ok: false, error: error.message };
  const result = data as {
    status: string;
    event_id: string;
    conversation_id: string | null;
  } | null;

  return {
    ok: true,
    conversationId: result?.conversation_id ?? undefined,
    eventId: result?.event_id,
  };
}

/**
 * Get listing interest events for the seller's own listings.
 * Returns only events for listings owned by the authenticated user.
 */
export async function getSellerInterestActivity(listingId?: string): Promise<{
  ok: boolean;
  events?: Array<{
    id: string;
    listing_id: string;
    event_type: string;
    conversation_id: string | null;
    created_at: string;
  }>;
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: 'Authentication required' };

  let query = supabase
    .from('listing_interest_events')
    .select('id, listing_id, event_type, conversation_id, created_at')
    .eq('seller_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50);

  if (listingId) {
    query = query.eq('listing_id', listingId);
  }

  const { data, error } = await query;
  if (error) return { ok: false, error: error.message };

  return {
    ok: true,
    events: data ?? [],
  };
}
