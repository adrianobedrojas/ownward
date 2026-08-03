import type { Metadata } from 'next';
import { requireUser } from '@/lib/require-user';
import NotificationSettingsClient from './NotificationSettingsClient';

export const metadata: Metadata = {
  title: 'Notification Settings | Ownward',
};

export default async function NotificationSettingsPage() {
  const { supabase, user } = await requireUser();

  const { data: prefs } = await supabase
    .from('user_preferences')
    .select('notification_preferences, quiet_hours_enabled, quiet_hours_start, quiet_hours_end')
    .eq('user_id', user.id)
    .maybeSingle();

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">Settings</p>
        <h1 className="mt-1 text-3xl font-bold text-white">Notification Settings</h1>
      </div>
      <NotificationSettingsClient
        initialPrefs={(prefs?.notification_preferences as Record<string, unknown>) ?? {}}
        quietHoursEnabled={prefs?.quiet_hours_enabled ?? false}
      />
    </main>
  );
}
