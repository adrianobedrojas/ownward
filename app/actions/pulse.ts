'use server';

import { createClient } from '@/lib/supabase/server';

export interface PulseResponseInput {
  businessId: string;
  visitorToken: string;
  relationship: string;
  supportIntent: string;
  revealIdentity: boolean;
  visitorName?: string;
  visitorEmail?: string;
}

export async function submitPulseResponse(formData: PulseResponseInput) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('community_pulse_responses')
    .insert({
      business_id: formData.businessId,
      visitor_token: formData.visitorToken,
      relationship: formData.relationship,
      support_intent: formData.supportIntent,
      reveal_identity: formData.revealIdentity,
      visitor_name: formData.revealIdentity ? formData.visitorName : null,
      visitor_email: formData.revealIdentity ? formData.visitorEmail : null,
    });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

export async function getOwnerPulseAnalytics(businessId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }

  const { data: business } = await supabase
    .from('businesses')
    .select('id')
    .eq('id', businessId)
    .eq('owner_id', user.id)
    .maybeSingle();

  if (!business) {
    return { success: false, error: 'Access denied' };
  }

  // 1. Fetch total visit count
  const { count: totalVisits, error: visitsError } = await supabase
    .from('business_visits')
    .select('*', { count: 'exact', head: true })
    .eq('business_id', businessId);

  // 2. Fetch pulse responses
  const { data: responses, error: pulseError } = await supabase
    .from('community_pulse_responses')
    .select(
      'id,relationship,support_intent,reveal_identity,visitor_name,visitor_email,created_at'
    )
    .eq('business_id', businessId)
    .order('created_at', { ascending: false });

  if (visitsError || pulseError) {
    return { success: false, error: visitsError?.message || pulseError?.message };
  }

  return {
    success: true,
    totalVisits: totalVisits || 0,
    totalResponses: responses?.length || 0,
    responses: responses || [],
  };
}