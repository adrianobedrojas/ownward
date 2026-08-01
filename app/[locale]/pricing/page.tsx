import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { getUserBillingState } from '@/lib/billing';
import PricingCards from './PricingCards';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Metadata' });

  return {
    title: t('pricing.title'),
    description: t('pricing.description'),
  };
}

export default async function PricingPage() {
  const t = await getTranslations('Pricing');
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const billingState = user ? await getUserBillingState(supabase, user.id) : null;

  return (
    <div className="max-w-6xl mx-auto px-4 py-16 text-slate-100">
      <div className="text-center max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold tracking-tight">{t('heroTitle')}</h1>
        <p className="mt-3 text-slate-400 text-lg">{t('heroDescription')}</p>
      </div>
      <PricingCards billingState={billingState} />
    </div>
  );
}
