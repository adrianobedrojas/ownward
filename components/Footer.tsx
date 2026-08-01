import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

export default async function Footer() {
  const t = await getTranslations('Footer');

  return (
    <footer className="border-t border-slate-800 bg-slate-950/95">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-6 text-sm text-slate-400 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>{t('copyright', { year: new Date().getFullYear() })}</p>
        <nav aria-label="Footer" className="flex flex-wrap items-center gap-4">
          <Link href="/privacy" className="font-medium text-slate-300 transition hover:text-cyan-300">{t('privacyPolicy')}</Link>
          <Link href="/privacy-choices" className="font-medium text-slate-300 transition hover:text-cyan-300">{t('privacyChoices')}</Link>
          <Link href="/terms" className="font-medium text-slate-300 transition hover:text-cyan-300">{t('terms')}</Link>
          <Link href="/contact" className="font-medium text-slate-300 transition hover:text-cyan-300">{t('contact')}</Link>
        </nav>
      </div>
    </footer>
  );
}
