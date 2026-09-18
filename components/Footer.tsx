import { getLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

export default async function Footer() {
  const locale = await getLocale();
  const year = new Date().getFullYear();
  const isSpanish = locale === 'es';
  const labels = isSpanish
    ? {
        description: 'Soporte de TI local y remoto para pequeñas empresas en San Antonio.',
        rights: 'Todos los derechos reservados.',
        contact: 'Contacto',
        privacy: 'Privacidad',
        terms: 'Términos',
      }
    : {
        description: 'Local and remote IT support for small businesses in San Antonio.',
        rights: 'All rights reserved.',
        contact: 'Contact',
        privacy: 'Privacy',
        terms: 'Terms',
      };

  return (
    <footer className="border-t border-white/10 bg-[#050b14]">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <p className="text-lg font-bold text-white">Ownward IT</p>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">{labels.description}</p>
          <p className="mt-5 text-xs text-slate-600">© {year} Ownward. {labels.rights}</p>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-5 gap-y-3 text-sm">
          <Link href="/contact" className="font-medium text-slate-300 transition hover:text-cyan-300">{labels.contact}</Link>
          <Link href="/privacy" className="font-medium text-slate-300 transition hover:text-cyan-300">{labels.privacy}</Link>
          <Link href="/terms" className="font-medium text-slate-300 transition hover:text-cyan-300">{labels.terms}</Link>
        </nav>
      </div>
    </footer>
  );
}
