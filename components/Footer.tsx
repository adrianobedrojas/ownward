import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

export default async function Footer() {
  const t = await getTranslations('Footer');

  return (
    <footer className="border-t border-slate-800 bg-slate-950/95">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-400">{t('copyright', { year: new Date().getFullYear() })}</p>
          <nav aria-label="Footer" className="flex flex-wrap items-center gap-4 text-sm">
            <Link href="/guide" className="font-medium text-slate-300 transition hover:text-cyan-300">{t('guide')}</Link>
            <Link href="/academy" className="font-medium text-slate-300 transition hover:text-cyan-300">{t('academy')}</Link>
            <Link href="/privacy" className="font-medium text-slate-300 transition hover:text-cyan-300">{t('privacyPolicy')}</Link>
            <Link href="/privacy-choices" className="font-medium text-slate-300 transition hover:text-cyan-300">{t('privacyChoices')}</Link>
            <Link href="/terms" className="font-medium text-slate-300 transition hover:text-cyan-300">{t('terms')}</Link>
            <Link href="/contact" className="font-medium text-slate-300 transition hover:text-cyan-300">{t('contact')}</Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
