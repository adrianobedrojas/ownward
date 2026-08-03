import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { requireUser } from '@/lib/require-user';
import { Link } from '@/i18n/navigation';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Settings | Ownward',
    description: 'Manage your Ownward account settings.',
  };
}

const SETTINGS_SECTIONS = [
  { href: '/settings/notifications', key: 'notifications' },
  { href: '/settings/privacy', key: 'privacy' },
  { href: '/settings/buyer-preferences', key: 'buyerPreferences' },
  { href: '/account/products', key: 'billing' },
  { href: '/profile', key: 'profile' },
] as const;

export default async function SettingsPage() {
  await requireUser();
  const t = await getTranslations('Settings');

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">Ownward</p>
        <h1 className="mt-1 text-3xl font-bold text-white">{t('title')}</h1>
      </div>

      <div className="space-y-2">
        {SETTINGS_SECTIONS.map(({ href, key }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900 px-5 py-4 text-sm font-medium text-slate-200 transition hover:bg-slate-800 hover:text-white"
          >
            <span>{t(`sections.${key}` as Parameters<typeof t>[0])}</span>
            <svg
              aria-hidden="true"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </Link>
        ))}
      </div>
    </main>
  );
}
