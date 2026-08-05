import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getUserBillingState, checkProFeature } from '@/lib/billing';
import ContextualSolutionModule from '@/components/solutions/ContextualSolutionModule';
import PortfolioClient from './PortfolioClient';

export const metadata = {
  title: 'Portfolio | Ownward Pro',
  description: 'Multi-business portfolio view with risk comparison and performance metrics.',
};

export default async function PortfolioPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?next=/portfolio');
  }

  const billing = await getUserBillingState(supabase, user.id);
  const proCheck = checkProFeature(billing.entitlements, 'sellerCommandCenter');

  if (proCheck) {
    redirect('/pricing?upgrade=portfolio');
  }

  const { data: businesses } = await supabase
    .from('businesses')
    .select('id, name, profile_completion, annual_revenue, industry, business_stage, employee_count, updated_at')
    .eq('owner_id', user.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  const { data: assessments } = await supabase
    .from('sale_readiness_assessments')
    .select('business_id, overall_score, stage, scored_at')
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .order('scored_at', { ascending: false });

  const { data: dealRooms } = await supabase
    .from('deal_rooms')
    .select('id, business_id, status')
    .eq('owner_user_id', user.id)
    .not('status', 'in', '("closed","withdrawn")');

  return (
    <>
      <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6">
        <ContextualSolutionModule
          placement="portfolio"
          locale={locale === 'es' ? 'es' : 'en'}
          userId={user.id}
          currentPlan={billing.plan}
        />
      </div>
      <PortfolioClient
        businesses={businesses ?? []}
        assessments={assessments ?? []}
        dealRooms={dealRooms ?? []}
      />
    </>
  );
}
