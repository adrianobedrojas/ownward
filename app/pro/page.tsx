import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getUserBillingState, checkProFeature } from '@/lib/billing';
import { checkValuationRefreshEligibility } from '@/lib/valuation/refresh';
import { getProNextBestAction, type ProNbaInput } from '@/lib/pro/next-best-action';
import ProCommandCenterClient from './ProCommandCenterClient';

export const metadata = {
  title: 'Pro Deal Command Center | Ownward',
  description: 'Your Pro workspace hub — readiness, valuation, concentration, pipeline, and next best action.',
};

export default async function ProCommandCenterPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?next=/pro');
  }

  const billing = await getUserBillingState(supabase, user.id);
  const proCheck = checkProFeature(billing.entitlements, 'sellerCommandCenter');

  if (proCheck) {
    redirect('/pricing?upgrade=pro-command-center');
  }

  // Fetch businesses
  const { data: businesses } = await supabase
    .from('businesses')
    .select('id, name, profile_completion, annual_revenue')
    .eq('owner_id', user.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  const businessCount = businesses?.length ?? 0;

  // Fetch profile for active business
  const { data: profile } = await supabase
    .from('profiles')
    .select('active_business_id')
    .eq('id', user.id)
    .maybeSingle();

  const activeBusinessId = profile?.active_business_id ?? businesses?.[0]?.id ?? null;

  // Fetch latest readiness assessment
  const { data: latestAssessment } = await supabase
    .from('sale_readiness_assessments')
    .select('id, overall_score, stage, scored_at')
    .eq('user_id', user.id)
    .eq('business_id', activeBusinessId ?? '')
    .is('deleted_at', null)
    .order('scored_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  // Fetch latest valuation refresh
  const { data: latestRefresh } = await supabase
    .from('valuation_refreshes')
    .select('created_at')
    .eq('user_id', user.id)
    .eq('business_id', activeBusinessId ?? '')
    .eq('refresh_type', 'official')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const refreshEligibility = checkValuationRefreshEligibility(
    latestRefresh?.created_at ?? null
  );

  // Fetch concentration snapshot
  const { data: latestConcentration } = await supabase
    .from('customer_concentration_snapshots')
    .select('concentration_risk_level')
    .eq('business_id', activeBusinessId ?? '')
    .order('snapshotted_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  // Fetch pending offers
  const { count: pendingOfferCount } = await supabase
    .from('seller_offers')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('status', 'pending')
    .is('deleted_at', null);

  // Fetch team seats
  const entitlements = billing.entitlements;
  const { count: invitedCount } = await supabase
    .from('business_members')
    .select('id', { count: 'exact', head: true })
    .in('business_id', (businesses ?? []).map((b) => b.id))
    .neq('user_id', user.id)
    .eq('status', 'active');

  const activeBiz = (businesses ?? []).find((b) => b.id === activeBusinessId);

  // Build NBA input
  const nbaInput: ProNbaInput = {
    businessCount,
    activeBusinessId,
    businessCompletion: activeBiz?.profile_completion ?? null,
    hasSaleReadinessAssessment: !!latestAssessment,
    lastReadinessAssessmentAt: latestAssessment?.scored_at ?? null,
    oldestEvidenceDaysAgo: null, // would need evidence query
    concentrationRiskLevel: (latestConcentration?.concentration_risk_level as 'low' | 'moderate' | 'high' | 'critical' | null) ?? null,
    valuationRefreshEligible: refreshEligibility.eligible,
    lastValuationAt: latestRefresh?.created_at ?? null,
    listingCompletion: null,
    hasListing: false,
    unansweredInquiryCount: 0,
    qualifiedBuyersWithoutRoomCount: 0,
    overdueDiligenceRequestCount: 0,
    offersAwaitingReviewCount: pendingOfferCount ?? 0,
    missingCriticalDocCount: 0,
    teamSeatsAvailable: Math.max(0, entitlements.teamMemberLimit - (invitedCount ?? 0)),
    hasUnassignedWork: false,
    overdueTaskCount: 0,
    highestPriorityOverdueTask: null,
  };

  const nextBestAction = getProNextBestAction(nbaInput);

  return (
    <ProCommandCenterClient
      businesses={businesses ?? []}
      activeBusinessId={activeBusinessId}
      nextBestAction={nextBestAction}
      latestAssessment={latestAssessment ?? null}
      refreshEligibility={refreshEligibility}
      latestConcentration={latestConcentration ?? null}
      pendingOfferCount={pendingOfferCount ?? 0}
      entitlements={entitlements}
      invitedCount={invitedCount ?? 0}
    />
  );
}
