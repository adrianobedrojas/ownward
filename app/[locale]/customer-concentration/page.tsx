import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createMetadata } from '@/lib/seo';
import { createClient } from '@/lib/supabase/server';
import CustomerConcentrationClient from './CustomerConcentrationClient';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return createMetadata({
    locale,
    pathname: '/customer-concentration',
    title: locale === 'es' ? 'Laboratorio de concentración de clientes' : 'Customer Concentration Lab',
    description:
      locale === 'es'
        ? 'Analiza la concentración de ingresos por cliente y modela escenarios de diversificación.'
        : 'Analyze customer revenue concentration and model diversification scenarios.',
  });
}

export default async function CustomerConcentrationPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?next=/customer-concentration');
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
