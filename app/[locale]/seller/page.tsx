import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getUserBillingState, checkProFeature } from '@/lib/billing';
import SellerClient from './SellerClient';

export const metadata = {
  title: 'Seller Area | Ownward Pro',
  description: 'Manage your sale process, pipeline, inquiries, deal rooms, and offers.',
};

export default async function SellerPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?next=/seller');
  }

  const billing = await getUserBillingState(supabase, user.id);
  const proCheck = checkProFeature(billing.entitlements, 'sellerCommandCenter');

  if (proCheck) {
    redirect('/pricing?upgrade=seller');
  }

  const { data: businesses } = await supabase
    .from('businesses')
    .select('id, name, profile_completion, annual_revenue')
    .eq('owner_id', user.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  const { data: opportunities } = await supabase
    .from('seller_pipeline_opportunities')
    .select('*')
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .order('updated_at', { ascending: false });

  const { data: offers } = await supabase
    .from('seller_offers')
    .select('*')
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .in('status', ['pending'])
    .order('created_at', { ascending: false })
    .limit(10);

  const { data: recentAssessments } = await supabase
    .from('sale_readiness_assessments')
    .select('id, business_id, overall_score, stage, scored_at')
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .order('scored_at', { ascending: false })
    .limit(5);

  // Buyer interest events for listings owned by this seller
  const { data: interestEvents } = await supabase
    .from('listing_interest_events')
    .select('id, listing_id, event_type, conversation_id, created_at, business_listings(business_name)')
    .eq('seller_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20);

  // Flatten listing name
  const flatEvents = (interestEvents ?? []).map((ev: Record<string, unknown>) => {
    const listing = ev.business_listings as { business_name: string } | null;
    return {
      id: ev.id as string,
      listing_id: ev.listing_id as string,
      event_type: ev.event_type as string,
      conversation_id: ev.conversation_id as string | null,
      created_at: ev.created_at as string,
      listing_name: listing?.business_name,
    };
  });

  return (
    <SellerClient
      businesses={businesses ?? []}
      opportunities={opportunities ?? []}
      pendingOffers={offers ?? []}
      recentAssessments={recentAssessments ?? []}
      interestEvents={flatEvents}
    />
  );
}
