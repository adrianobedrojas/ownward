'use server';

import { createServerClient } from '@/lib/supabase/server'; // Adjust if your Supabase client helper is elsewhere

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
  const supabase = await createServerClient();

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