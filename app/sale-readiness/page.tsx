import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getUserBillingState, checkProFeature } from '@/lib/billing';
import SaleReadinessClient from './SaleReadinessClient';

export const metadata = {
  title: 'Sale-Readiness Assessment | Ownward',
  description: 'Understand your business sale readiness across 10 key categories.',
};

export default async function SaleReadinessPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?next=/sale-readiness');
  }

  const billing = await getUserBillingState(supabase, user.id);
  const proCheck = checkProFeature(billing.entitlements, 'saleReadiness');

  if (proCheck) {
    redirect('/pricing?upgrade=sale-readiness');
  }

  // Fetch the user's businesses
  const { data: businesses } = await supabase
    .from('businesses')
    .select('id, name, profile_completion')
    .eq('owner_id', user.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  // Fetch most recent assessment for each business
  const { data: recentAssessments } = await supabase
    .from('sale_readiness_assessments')
    .select('id, business_id, overall_score, stage, scored_at')
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .order('scored_at', { ascending: false })
    .limit(20);

  return (
    <SaleReadinessClient
      businesses={businesses ?? []}
      recentAssessments={recentAssessments ?? []}
      userId={user.id}
    />
  );
}
