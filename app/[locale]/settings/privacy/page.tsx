import type { Metadata } from 'next';
import { requireUser } from '@/lib/require-user';
import PrivacySettingsClient from './PrivacySettingsClient';

export const metadata: Metadata = {
  title: 'Privacy Settings | Ownward',
};

export default async function PrivacySettingsPage() {
  const { supabase, user } = await requireUser();

  const { data: prefs } = await supabase
    .from('user_preferences')
    .select('privacy_preferences')
    .eq('user_id', user.id)
    .maybeSingle();

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">Settings</p>
        <h1 className="mt-1 text-3xl font-bold text-white">Privacy</h1>
      </div>
      <PrivacySettingsClient
        initialPrefs={(prefs?.privacy_preferences as Record<string, unknown>) ?? {}}
      />
    </main>
  );
}
