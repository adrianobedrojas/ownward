'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';

const PRIVACY_TOGGLES = [
  { key: 'identityAfterInterest', defaultValue: true },
  { key: 'avatarVisibility', defaultValue: false },
  { key: 'buyerGoalsVisibility', defaultValue: false },
  { key: 'budgetRange', defaultValue: false },
  { key: 'purchaseTimeline', defaultValue: false },
  { key: 'preferredIndustries', defaultValue: false },
  { key: 'financingReadiness', defaultValue: false },
  { key: 'identityOnViews', defaultValue: false },
];

interface Props {
  initialPrefs: Record<string, unknown>;
}

export default function PrivacySettingsClient({ initialPrefs }: Props) {
  const t = useTranslations('Settings');
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  const [prefs, setPrefs] = useState<Record<string, boolean>>(() => {
    const defaults: Record<string, boolean> = {};
    for (const tog of PRIVACY_TOGGLES) {
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
        p_privacy_preferences: prefs as never,
      });
      setSaved(true);
    });
  }

  return (
    <div className="space-y-6">
      {/* Conservative defaults notice */}
      <div className="rounded-xl border border-slate-700 bg-slate-900 p-4 text-sm text-slate-400">
        {t('privacySection.conservativeDefaultsNotice')}
      </div>

      <div className="space-y-3">
        {PRIVACY_TOGGLES.map((tog) => (
          <div key={tog.key} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900 px-4 py-3">
            <span className="text-sm text-slate-200">
              {t(`privacySection.${tog.key}` as Parameters<typeof t>[0])}
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
