import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getUserBillingState, checkProFeature } from '@/lib/billing';
import CustomerConcentrationClient from './CustomerConcentrationClient';

export const metadata = {
  title: 'Customer Concentration Lab | Ownward Pro',
  description: 'Analyze customer revenue concentration and model diversification scenarios.',
};

export default async function CustomerConcentrationPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?next=/customer-concentration');
  }

  const billing = await getUserBillingState(supabase, user.id);
  const proCheck = checkProFeature(billing.entitlements, 'customerConcentration');

  if (proCheck) {
    redirect('/pricing?upgrade=customer-concentration');
  }

  const { data: businesses } = await supabase
    .from('businesses')
    .select('id, name')
    .eq('owner_id', user.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  const { data: records } = await supabase
    .from('customer_revenue_records')
    .select('*')
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .order('annual_revenue', { ascending: false });

  return (
    <CustomerConcentrationClient
      businesses={businesses ?? []}
      initialRecords={records ?? []}
      userId={user.id}
    />
  );
}
