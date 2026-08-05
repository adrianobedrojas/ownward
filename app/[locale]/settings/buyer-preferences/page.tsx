import type { Metadata } from 'next';
import ContextualSolutionModule from '@/components/solutions/ContextualSolutionModule';
import { requireUser } from '@/lib/require-user';
import BuyerPreferencesClient from './BuyerPreferencesClient';

export const metadata: Metadata = {
  title: 'Buyer Preferences | Ownward',
};

export default async function BuyerPreferencesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { supabase, user } = await requireUser();

  const { data: profile } = await supabase
    .from('buyer_purchase_profiles')
    .select('*')
    .eq('buyer_id', user.id)
    .maybeSingle();

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">Settings</p>
        <h1 className="mt-1 text-3xl font-bold text-white">Buyer Preferences</h1>
        <p className="mt-2 text-sm text-slate-400">
          Find the right business faster — share your acquisition goals to get better recommendations.
        </p>
      </div>
      <ContextualSolutionModule
        placement="buyer_preferences"
        locale={locale === 'es' ? 'es' : 'en'}
        userId={user.id}
      />
      <BuyerPreferencesClient initialData={profile ?? null} />
    </main>
  );
}
