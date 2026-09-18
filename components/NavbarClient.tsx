'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useRef } from 'react';
import { Link, usePathname } from '@/i18n/navigation';
import LanguageSwitcher from './LanguageSwitcher';
import PersonalControlCenter, { type ControlCenterData } from './control-center/PersonalControlCenter';

interface NavbarClientProps {
  signedIn: boolean;
  controlCenterData: ControlCenterData | null;
  showAdminConsole: boolean;
}

export default function NavbarClient({ signedIn, controlCenterData, showAdminConsole }: NavbarClientProps) {
  const pathname = usePathname();
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const t = useTranslations('Navigation');

  const isSpanish = pathname.startsWith('/es');
  const labels = isSpanish
    ? {
        tagline: 'Soporte de TI para pequeñas empresas',
        services: 'Servicios',
        pricing: 'Precios',
        about: 'Cómo funciona',
        contact: 'Contacto',
        request: 'Solicitar soporte',
        menu: 'Menú',
        account: 'Mi cuenta',
        admin: 'Administración',
        logout: 'Salir',
      }
    : {
        tagline: 'Small business IT support',
        services: 'Services',
        pricing: 'Pricing',
        about: 'How it works',
        contact: 'Contact',
        request: 'Request support',
        menu: 'Menu',
        account: 'My account',
        admin: 'Admin',
        logout: 'Log out',
      };

  function closeMobileMenu() {
    if (detailsRef.current) detailsRef.current.open = false;
  }

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#07111f]/95 backdrop-blur">
      <nav aria-label={t('main')} className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-3">
          <Image src="/ownward-icon.png" alt="Ownward" width={36} height={36} priority />
          <span>
            <span className="block font-bold text-white">Ownward IT</span>
            <span className="block text-xs text-slate-400">{labels.tagline}</span>
          </span>
        </Link>

        <div className="hidden items-center gap-1 lg:flex">
          <a href="#services" className="rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/5 hover:text-white">
            {labels.services}
          </a>
          <a href="#pricing" className="rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/5 hover:text-white">
            {labels.pricing}
          </a>
          <Link href="/contact" className="rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/5 hover:text-white">
            {labels.contact}
          </Link>
        </div>

        <div className="hidden items-center gap-3 lg:flex">
          {showAdminConsole ? (
            <Link href="/admin" className="rounded-lg border border-emerald-500/40 px-3 py-2 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-500/10">
              {labels.admin}
            </Link>
          ) : null}
          <LanguageSwitcher />
          {signedIn && controlCenterData ? (
            <PersonalControlCenter data={controlCenterData} />
          ) : signedIn ? (
            <form action="/auth/signout" method="post">
              <button type="submit" className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-white/5 hover:text-white">
                {labels.logout}
              </button>
            </form>
          ) : null}
          <Link href="/contact?service=it-support" className="rounded-xl bg-cyan-300 px-4 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-cyan-200">
            {labels.request}
          </Link>
        </div>

        <details ref={detailsRef} className="relative lg:hidden" suppressHydrationWarning>
          <summary className="cursor-pointer list-none rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white">
            {labels.menu}
          </summary>
          <div className="absolute right-0 mt-3 w-72 rounded-2xl border border-white/10 bg-slate-950 p-3 shadow-2xl">
            <div className="grid gap-1">
              <a href="#services" onClick={closeMobileMenu} className="rounded-lg px-3 py-3 text-sm font-medium text-slate-300 hover:bg-white/5 hover:text-white">
                {labels.services}
              </a>
              <a href="#pricing" onClick={closeMobileMenu} className="rounded-lg px-3 py-3 text-sm font-medium text-slate-300 hover:bg-white/5 hover:text-white">
                {labels.pricing}
              </a>
              <Link href="/contact" onClick={closeMobileMenu} className="rounded-lg px-3 py-3 text-sm font-medium text-slate-300 hover:bg-white/5 hover:text-white">
                {labels.contact}
              </Link>
            </div>
            <div className="mt-3 border-t border-white/10 pt-3">
              <LanguageSwitcher onSelect={closeMobileMenu} />
            </div>
            {signedIn ? (
              <div className="mt-3 grid gap-2 border-t border-white/10 pt-3">
                <Link href="/dashboard" onClick={closeMobileMenu} className="rounded-lg border border-white/10 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-white/5">
                  {labels.account}
                </Link>
                {showAdminConsole ? (
                  <Link href="/admin" onClick={closeMobileMenu} className="rounded-lg border border-emerald-500/40 px-4 py-3 text-center text-sm font-semibold text-emerald-200 hover:bg-emerald-500/10">
                    {labels.admin}
                  </Link>
                ) : null}
              </div>
            ) : null}
            <Link href="/contact?service=it-support" onClick={closeMobileMenu} className="mt-3 block rounded-xl bg-cyan-300 px-4 py-3 text-center text-sm font-bold text-slate-950 hover:bg-cyan-200">
              {labels.request}
            </Link>
          </div>
        </details>
      </nav>
    </header>
  );
}
