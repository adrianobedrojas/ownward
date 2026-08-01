'use client';

import { useLocale, useTranslations } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/navigation';

export default function LanguageSwitcher({ onSelect }: { onSelect?: () => void }) {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations('Navigation');

  function switchLocale(newLocale: string) {
    router.replace(pathname, { locale: newLocale });
    document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
    onSelect?.();
  }

  return (
    <div role="group" aria-label={t('selectLanguage')} className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => switchLocale('en')}
        className={`rounded px-2 py-1 text-xs font-semibold transition ${
          locale === 'en' ? 'text-cyan-300' : 'text-slate-400 hover:text-white'
        }`}
        aria-pressed={locale === 'en'}
      >
        EN
      </button>
      <span className="text-slate-600">|</span>
      <button
        type="button"
        onClick={() => switchLocale('es')}
        className={`rounded px-2 py-1 text-xs font-semibold transition ${
          locale === 'es' ? 'text-cyan-300' : 'text-slate-400 hover:text-white'
        }`}
        aria-pressed={locale === 'es'}
      >
        ES
      </button>
    </div>
  );
}
