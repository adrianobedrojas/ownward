'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';

interface ProfileFormProps {
  initialData: {
    full_name: string | null;
    headline: string | null;
    bio: string | null;
    location: string | null;
    timezone: string;
    preferred_locale: string;
    profile_visibility: string;
    role: string | null;
  };
  profileCompletion: number;
}

async function updateProfile(data: Record<string, string | null>) {
  const res = await fetch('/api/profile/update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Update failed');
}

export default function ProfileClient({ initialData, profileCompletion }: ProfileFormProps) {
  const t = useTranslations('Profile');
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    full_name: initialData.full_name ?? '',
    headline: initialData.headline ?? '',
    bio: initialData.bio ?? '',
    location: initialData.location ?? '',
    timezone: initialData.timezone ?? 'UTC',
    preferred_locale: initialData.preferred_locale ?? 'en',
    profile_visibility: initialData.profile_visibility ?? 'private',
    role: initialData.role ?? '',
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setSaved(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      await updateProfile({
        full_name: form.full_name || null,
        headline: form.headline || null,
        bio: form.bio || null,
        location: form.location || null,
        timezone: form.timezone,
        preferred_locale: form.preferred_locale,
        profile_visibility: form.profile_visibility,
        role: form.role || null,
      });
      setSaved(true);
    });
  }

  return (
    <div className="mx-auto max-w-2xl">
      {/* Profile completion bar */}
      <div className="mb-8 rounded-xl border border-slate-800 bg-slate-900 p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-slate-300">{t('profileCompletion')}</p>
          <span className="text-sm font-semibold text-cyan-400">{profileCompletion}%</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-700">
          <div
            className="h-full rounded-full bg-cyan-500 transition-all duration-500"
            style={{ width: `${profileCompletion}%` }}
          />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Full name */}
        <div>
          <label htmlFor="full_name" className="block text-sm font-medium text-slate-300">
            {t('fullName')}
          </label>
          <input
            id="full_name"
            name="full_name"
            type="text"
            value={form.full_name}
            onChange={handleChange}
            maxLength={120}
            className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          />
        </div>

        {/* Headline */}
        <div>
          <label htmlFor="headline" className="block text-sm font-medium text-slate-300">
            {t('headline')}
          </label>
          <input
            id="headline"
            name="headline"
            type="text"
            value={form.headline}
            onChange={handleChange}
            maxLength={160}
            className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          />
        </div>

        {/* Bio */}
        <div>
          <label htmlFor="bio" className="block text-sm font-medium text-slate-300">
            {t('bio')}
          </label>
          <textarea
            id="bio"
            name="bio"
            rows={4}
            value={form.bio}
            onChange={handleChange}
            maxLength={1000}
            className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          />
        </div>

        {/* Location */}
        <div>
          <label htmlFor="location" className="block text-sm font-medium text-slate-300">
            {t('location')}
          </label>
          <input
            id="location"
            name="location"
            type="text"
            value={form.location}
            onChange={handleChange}
            maxLength={120}
            className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          />
        </div>

        {/* Role */}
        <div>
          <label htmlFor="role" className="block text-sm font-medium text-slate-300">
            {t('role')}
          </label>
          <select
            id="role"
            name="role"
            value={form.role}
            onChange={handleChange}
            className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          >
            <option value="">—</option>
            <option value="buyer">{t('role_buyer')}</option>
            <option value="seller">{t('role_seller')}</option>
            <option value="both">{t('role_both')}</option>
          </select>
        </div>

        {/* Profile visibility */}
        <div>
          <label htmlFor="profile_visibility" className="block text-sm font-medium text-slate-300">
            {t('profileVisibility')}
          </label>
          <select
            id="profile_visibility"
            name="profile_visibility"
            value={form.profile_visibility}
            onChange={handleChange}
            className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          >
            <option value="public">{t('visibility_public')}</option>
            <option value="private">{t('visibility_private')}</option>
            <option value="connections">{t('visibility_connections')}</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-cyan-400 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400"
        >
          {saved ? t('saved') : isPending ? '…' : t('saveChanges')}
        </button>
      </form>
    </div>
  );
}
