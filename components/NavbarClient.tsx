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
}

export default function NavbarClient({ signedIn, controlCenterData }: NavbarClientProps) {
  const pathname = usePathname();
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const learnMenuRef = useRef<HTMLDetailsElement>(null);
  const toolsMenuRef = useRef<HTMLDetailsElement>(null);
  const t = useTranslations('Navigation');
  const navigation = [
    { name: t('start'), href: '/start' },
    { name: t('buy'), href: '/buy' },
    { name: t('sell'), href: '/sell' },
    { name: t('features'), href: '/#features' },
    { name: t('pricing'), href: '/pricing' },
    { name: t('solutions'), href: '/solutions' },
  ];

  function isActive(href: string) {
    if (href.startsWith('/#')) return false;
    if (href === '/') return pathname === '/';
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  const isLearnActive = isActive('/guide') || isActive('/academy');
  const isToolsActive =
    isActive('/valuation') ||
    isActive('/sale-readiness') ||
    isActive('/grow') ||
    isActive('/customer-concentration');

  function closeMobileMenu() {
    if (detailsRef.current) {
      detailsRef.current.open = false;
    }
  }

  function closeLearnMenu() {
    if (learnMenuRef.current) {
      learnMenuRef.current.open = false;
    }
  }

  function closeToolsMenu() {
    if (toolsMenuRef.current) {
      toolsMenuRef.current.open = false;
    }
  }

  return (
    <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/95 backdrop-blur">
      <nav
        aria-label={t('main')}
        className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6"
      >
        <Link href="/" className="flex shrink-0 items-center gap-3">
          <Image src="/ownward-icon.png" alt="Ownward Hub" width={36} height={36} priority />
          <span>
            <span className="block font-bold text-white">Ownward</span>
            <span className="block text-xs text-slate-400">{t('tagline')}</span>
          </span>
        </Link>

        <div className="hidden items-center gap-1 lg:flex">
          {navigation.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                  active
                    ? 'bg-cyan-400/10 text-cyan-300'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                {item.name}
              </Link>
            );
          })}

          {/* Learn dropdown (Guide + Academy) */}
          <details ref={learnMenuRef} className="relative" suppressHydrationWarning>
            <summary
              className={`cursor-pointer list-none rounded-lg px-3 py-2 text-sm font-medium transition select-none ${
                isLearnActive
                  ? 'bg-cyan-400/10 text-cyan-300'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
              aria-haspopup="menu"
            >
              {t('learn')} <span aria-hidden="true">▾</span>
            </summary>
            <div
              role="menu"
              className="absolute left-0 mt-2 w-56 rounded-xl border border-slate-700 bg-slate-900 p-2 shadow-2xl"
            >
              <Link
                href="/guide"
                role="menuitem"
                onClick={closeLearnMenu}
                aria-current={isActive('/guide') ? 'page' : undefined}
                className={`block rounded-lg px-3 py-2.5 text-sm transition ${
                  isActive('/guide')
                    ? 'bg-cyan-400/10 text-cyan-300'
                    : 'text-slate-200 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <span className="font-semibold">{t('guide')}</span>
                <span className="mt-0.5 block text-xs text-slate-400">{t('learnMenuGuideDescription')}</span>
              </Link>
              <Link
                href="/academy"
                role="menuitem"
                onClick={closeLearnMenu}
                aria-current={isActive('/academy') ? 'page' : undefined}
                className={`block rounded-lg px-3 py-2.5 text-sm transition ${
                  isActive('/academy')
                    ? 'bg-cyan-400/10 text-cyan-300'
                    : 'text-slate-200 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <span className="font-semibold">{t('academy')}</span>
                <span className="mt-0.5 block text-xs text-slate-400">{t('learnMenuAcademyDescription')}</span>
              </Link>
            </div>
          </details>

          {/* Tools dropdown */}
          <details ref={toolsMenuRef} className="relative" suppressHydrationWarning>
            <summary
              className={`cursor-pointer list-none rounded-lg px-3 py-2 text-sm font-medium transition select-none ${
                isToolsActive
                  ? 'bg-cyan-400/10 text-cyan-300'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
              aria-haspopup="menu"
            >
              {t('tools')} <span aria-hidden="true">▾</span>
            </summary>
            <div
              role="menu"
              className="absolute left-0 mt-2 w-64 rounded-xl border border-slate-700 bg-slate-900 p-2 shadow-2xl"
            >
              <Link
                href="/valuation"
                role="menuitem"
                onClick={closeToolsMenu}
                aria-current={isActive('/valuation') ? 'page' : undefined}
                className={`block rounded-lg px-3 py-2.5 text-sm transition ${
                  isActive('/valuation')
                    ? 'bg-cyan-400/10 text-cyan-300'
                    : 'text-slate-200 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <span className="font-semibold">{t('toolsMenuValueMyBusinessLabel')}</span>
                <span className="mt-0.5 block text-xs text-slate-400">{t('toolsMenuValueMyBusinessDescription')}</span>
              </Link>
              <Link
                href="/sale-readiness"
                role="menuitem"
                onClick={closeToolsMenu}
                aria-current={isActive('/sale-readiness') ? 'page' : undefined}
                className={`block rounded-lg px-3 py-2.5 text-sm transition ${
                  isActive('/sale-readiness')
                    ? 'bg-cyan-400/10 text-cyan-300'
                    : 'text-slate-200 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <span className="font-semibold">{t('toolsMenuSaleReadinessLabel')}</span>
                <span className="mt-0.5 block text-xs text-slate-400">{t('toolsMenuSaleReadinessDescription')}</span>
              </Link>
              <Link
                href="/grow"
                role="menuitem"
                onClick={closeToolsMenu}
                aria-current={isActive('/grow') ? 'page' : undefined}
                className={`block rounded-lg px-3 py-2.5 text-sm transition ${
                  isActive('/grow')
                    ? 'bg-cyan-400/10 text-cyan-300'
                    : 'text-slate-200 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <span className="font-semibold">{t('toolsMenuGrowthPlannerLabel')}</span>
                <span className="mt-0.5 block text-xs text-slate-400">{t('toolsMenuGrowthPlannerDescription')}</span>
              </Link>
              <Link
                href="/customer-concentration"
                role="menuitem"
                onClick={closeToolsMenu}
                aria-current={isActive('/customer-concentration') ? 'page' : undefined}
                className={`block rounded-lg px-3 py-2.5 text-sm transition ${
                  isActive('/customer-concentration')
                    ? 'bg-cyan-400/10 text-cyan-300'
                    : 'text-slate-200 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <span className="font-semibold">{t('toolsMenuCustomerConcentrationLabel')}</span>
                <span className="mt-0.5 block text-xs text-slate-400">{t('toolsMenuCustomerConcentrationDescription')}</span>
              </Link>
            </div>
          </details>
        </div>

        <div className="hidden items-center gap-3 lg:flex">
          <LanguageSwitcher />
          {signedIn && controlCenterData ? (
            <PersonalControlCenter data={controlCenterData} />
          ) : signedIn ? (
            <form action="/auth/signout" method="post">
              <button type="submit" className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-white">{t('logOut')}</button>
            </form>
          ) : (
            <>
              <Link href="/login" className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-white">{t('logIn')}</Link>
              <Link href="/signup" className="rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300">{t('createAccount')}</Link>
            </>
          )}
        </div>

        <details ref={detailsRef} className="relative lg:hidden" suppressHydrationWarning>
          <summary className="cursor-pointer rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-white">{t('menu')}</summary>
          <div className="absolute right-0 mt-3 w-72 rounded-xl border border-slate-700 bg-slate-900 p-3 shadow-2xl">
            <div className="space-y-1">
              {navigation.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={closeMobileMenu}
                    aria-current={active ? 'page' : undefined}
                    className={`block rounded-lg px-3 py-3 text-sm font-medium transition ${
                      active
                        ? 'bg-cyan-400/10 text-cyan-300'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    {item.name}
                  </Link>
                );
              })}
            </div>
            {/* Mobile Learn section */}
            <div className="mt-3 border-t border-slate-800 pt-3">
              <p className="mb-1 px-3 text-xs font-semibold uppercase tracking-wider text-slate-500">{t('learn')}</p>
              <Link
                href="/guide"
                onClick={closeMobileMenu}
                aria-current={isActive('/guide') ? 'page' : undefined}
                className={`block rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  isActive('/guide')
                    ? 'bg-cyan-400/10 text-cyan-300'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                {t('guide')}
              </Link>
              <Link
                href="/academy"
                onClick={closeMobileMenu}
                aria-current={isActive('/academy') ? 'page' : undefined}
                className={`block rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  isActive('/academy')
                    ? 'bg-cyan-400/10 text-cyan-300'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                {t('academy')}
              </Link>
            </div>
            {/* Mobile Tools section */}
            <div className="mt-3 border-t border-slate-800 pt-3">
              <p className="mb-1 px-3 text-xs font-semibold uppercase tracking-wider text-slate-500">{t('tools')}</p>
              <Link
                href="/valuation"
                onClick={closeMobileMenu}
                aria-current={isActive('/valuation') ? 'page' : undefined}
                className={`block rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  isActive('/valuation')
                    ? 'bg-cyan-400/10 text-cyan-300'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                {t('toolsMenuValueMyBusinessLabel')}
              </Link>
              <Link
                href="/sale-readiness"
                onClick={closeMobileMenu}
                aria-current={isActive('/sale-readiness') ? 'page' : undefined}
                className={`block rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  isActive('/sale-readiness')
                    ? 'bg-cyan-400/10 text-cyan-300'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                {t('toolsMenuSaleReadinessLabel')}
              </Link>
              <Link
                href="/grow"
                onClick={closeMobileMenu}
                aria-current={isActive('/grow') ? 'page' : undefined}
                className={`block rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  isActive('/grow')
                    ? 'bg-cyan-400/10 text-cyan-300'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                {t('toolsMenuGrowthPlannerLabel')}
              </Link>
              <Link
                href="/customer-concentration"
                onClick={closeMobileMenu}
                aria-current={isActive('/customer-concentration') ? 'page' : undefined}
                className={`block rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  isActive('/customer-concentration')
                    ? 'bg-cyan-400/10 text-cyan-300'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                {t('toolsMenuCustomerConcentrationLabel')}
              </Link>
            </div>
            <div className="mt-3 border-t border-slate-800 pt-3">
              <LanguageSwitcher onSelect={closeMobileMenu} />
            </div>
            <div className="mt-3 grid gap-2">
              {signedIn ? (
                <>
                  <Link href="/dashboard" onClick={closeMobileMenu} className="block rounded-lg border border-slate-700 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-slate-800">{t('dashboard')}</Link>
                  <Link href="/messages" onClick={closeMobileMenu} className="block rounded-lg border border-slate-700 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-slate-800">{t('messages')}</Link>
                  <Link href="/profile" onClick={closeMobileMenu} className="block rounded-lg border border-slate-700 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-slate-800">{t('profile')}</Link>
                  <Link href="/settings" onClick={closeMobileMenu} className="block rounded-lg border border-slate-700 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-slate-800">{t('settings')}</Link>
                  <form action="/auth/signout" method="post">
                    <button type="submit" onClick={closeMobileMenu} className="block w-full rounded-lg border border-slate-700 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-slate-800">{t('logOut')}</button>
                  </form>
                </>
              ) : (
                <>
                  <Link href="/login" onClick={closeMobileMenu} className="block rounded-lg border border-slate-700 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-slate-800">{t('logIn')}</Link>
                  <Link href="/signup" onClick={closeMobileMenu} className="block rounded-lg bg-cyan-400 px-4 py-3 text-center text-sm font-semibold text-slate-950 transition hover:bg-cyan-300">{t('createAccount')}</Link>
                </>
              )}
            </div>
          </div>
        </details>
      </nav>
    </header>
  );
}
