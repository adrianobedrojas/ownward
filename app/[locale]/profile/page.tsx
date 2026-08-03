import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { requireUser } from '@/lib/require-user';
import ProfileClient from './ProfileClient';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Profile');
  return {
    title: t('pageTitle'),
    description: t('pageDescription'),
  };
}

export default async function ProfilePage() {
  const { supabase, user } = await requireUser();
  const t = await getTranslations('Profile');

  const { data: profile } = await supabase
    .from('profiles')
    .select(
      'full_name, headline, bio, location, timezone, preferred_locale, profile_visibility, role, avatar_path'
    )
    .eq('id', user.id)
    .maybeSingle();

  const completionFields = [
    profile?.full_name,
    (profile as Record<string, unknown> | null)?.headline,
    (profile as Record<string, unknown> | null)?.bio,
    (profile as Record<string, unknown> | null)?.location,
    (profile as Record<string, unknown> | null)?.role,
  ];
  const filled = completionFields.filter(Boolean).length;
  const profileCompletion = Math.round((filled / completionFields.length) * 100);

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">
          Ownward
        </p>
        <h1 className="mt-1 text-3xl font-bold text-white">{t('title')}</h1>
      </div>

      <ProfileClient
        initialData={{
          full_name: profile?.full_name ?? null,
          headline: (profile as Record<string, unknown> | null)?.headline as string | null ?? null,
          bio: (profile as Record<string, unknown> | null)?.bio as string | null ?? null,
          location: (profile as Record<string, unknown> | null)?.location as string | null ?? null,
          timezone: ((profile as Record<string, unknown> | null)?.timezone as string) ?? 'UTC',
          preferred_locale: ((profile as Record<string, unknown> | null)?.preferred_locale as string) ?? 'en',
          profile_visibility: ((profile as Record<string, unknown> | null)?.profile_visibility as string) ?? 'private',
          role: (profile as Record<string, unknown> | null)?.role as string | null ?? null,
        }}
        profileCompletion={profileCompletion}
      />
    </main>
  );
}
