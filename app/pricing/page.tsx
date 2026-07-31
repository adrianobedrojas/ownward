import { createClient } from '@/lib/supabase/server';
import { getUserBillingState } from '@/lib/billing';
import PricingCards from './PricingCards';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Plans & Pricing | Ownward',
  description: 'Simple, scalable tools to build, manage, and increase your business value.',
};

export default async function PricingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const billingState = user
    ? await getUserBillingState(supabase, user.id)
    : null;

  return (
    <main className="max-w-6xl mx-auto px-4 py-16 text-slate-100">
      <div className="text-center max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold tracking-tight">Ownward Plans &amp; Pricing</h1>
        <p className="mt-3 text-slate-400 text-lg">
          Simple, scalable tools to build, manage, and increase your business value. Plans start at $5/month.
        </p>
      </div>

      <PricingCards billingState={billingState} />
    </main>
  );
}
