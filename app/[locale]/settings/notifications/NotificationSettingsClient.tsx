'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';

interface NotificationToggle {
  key: string;
  labelKey: string;
  defaultValue: boolean;
}

const TOGGLES: NotificationToggle[] = [
  { key: 'inApp', labelKey: 'inApp', defaultValue: true },
  { key: 'buyerViews', labelKey: 'buyerViews', defaultValue: true },
  { key: 'repeatViews', labelKey: 'repeatViews', defaultValue: true },
  { key: 'explicitInterest', labelKey: 'explicitInterest', defaultValue: true },
  { key: 'infoRequests', labelKey: 'infoRequests', defaultValue: true },
  { key: 'newMessages', labelKey: 'newMessages', defaultValue: true },
  { key: 'dealRoomActivity', labelKey: 'dealRoomActivity', defaultValue: true },
  { key: 'documentActivity', labelKey: 'documentActivity', defaultValue: false },
  { key: 'taskReminders', labelKey: 'taskReminders', defaultValue: true },
  { key: 'billingNotices', labelKey: 'billingNotices', defaultValue: true },
  { key: 'securityNotices', labelKey: 'securityNotices', defaultValue: true },
  { key: 'productAnnouncements', labelKey: 'productAnnouncements', defaultValue: false },
];

interface Props {
  initialPrefs: Record<string, unknown>;
  quietHoursEnabled: boolean;
}

export default function NotificationSettingsClient({ initialPrefs, quietHoursEnabled: initialQH }: Props) {
  const t = useTranslations('Settings');
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [quietHours, setQuietHours] = useState(initialQH);

  const [prefs, setPrefs] = useState<Record<string, boolean>>(() => {
    const defaults: Record<string, boolean> = {};
    for (const tog of TOGGLES) {
      defaults[tog.key] =
        tog.key in initialPrefs
          ? Boolean(initialPrefs[tog.key])
          : tog.defaultValue;
    }
    return defaults;
  });

  function handleToggle(key: string) {
    setPrefs((p) => ({ ...p, [key]: !p[key] }));
    setSaved(false);
  }

  function handleSave() {
    startTransition(async () => {
      const supabase = createClient();
      await supabase.rpc('upsert_user_preferences', {
        p_notification_preferences: prefs as never,
        p_quiet_hours_enabled: quietHours,
      });
      setSaved(true);
    });
  }

  return (
    <div className="space-y-6">
      {/* Email notice */}
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-300">
        {t('notificationsSection.emailUnavailable')}
      </div>

      {/* Toggles */}
      <div className="space-y-3">
        {TOGGLES.map((tog) => (
          <div key={tog.key} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900 px-4 py-3">
            <span className="text-sm text-slate-200">
              {t(`notificationsSection.${tog.labelKey}` as Parameters<typeof t>[0])}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={prefs[tog.key]}
              onClick={() => handleToggle(tog.key)}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400 ${
                prefs[tog.key] ? 'bg-cyan-500' : 'bg-slate-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  prefs[tog.key] ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        ))}
      </div>

      {/* Quiet hours */}
      <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900 px-4 py-3">
        <span className="text-sm text-slate-200">Quiet hours</span>
        <button
          type="button"
          role="switch"
          aria-checked={quietHours}
          onClick={() => { setQuietHours((q) => !q); setSaved(false); }}
          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400 ${
            quietHours ? 'bg-cyan-500' : 'bg-slate-600'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
              quietHours ? 'translate-x-4' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      <button
        type="button"
        disabled={isPending}
        onClick={handleSave}
        className="rounded-lg bg-cyan-400 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400"
      >
        {saved ? t('saved') : isPending ? '…' : t('save')}
      </button>
    </div>
  );
}
