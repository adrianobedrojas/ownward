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

  return (
    <SellerClient
      businesses={businesses ?? []}
      opportunities={opportunities ?? []}
      pendingOffers={offers ?? []}
      recentAssessments={recentAssessments ?? []}
    />
  );
}
