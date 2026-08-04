'use client';

import Image from 'next/image';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import InstagramLink from '@/components/InstagramLink';
import { trackGoogleAnalyticsConversion } from '@/lib/google-analytics';


export default function ContactPage() {
  const t = useTranslations('Contact');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus('loading');
    setErrorMessage('');

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || t('sendFailed'));
      }

      setStatus('success');
      setName('');
      setEmail('');
      setMessage('');
      trackGoogleAnalyticsConversion('generate_lead', {
        lead_type: 'contact_form',
        source: 'contact_page',
      });
    } catch (error: unknown) {
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : t('error'));
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 text-white">
      <h1 className="mb-6 text-4xl font-bold">{t('title')}</h1>
      <div className="mb-12 flex flex-col items-center gap-8 md:flex-row">
        <div className="relative h-48 w-48 flex-shrink-0 overflow-hidden rounded-full border-2 border-cyan-500">
          <Image src="/profile.jpg" alt={t('founderImageAlt')} fill className="object-cover object-top translate-y-1 scale-115" />
        </div>
        <div>
          <h2 className="mb-2 text-2xl font-semibold">{t('founderTitle')}</h2>
          <p className="leading-relaxed text-slate-300">{t('founderDescription')}</p>
          <p className="mt-4 text-sm font-medium uppercase tracking-[0.18em] text-cyan-400">{t('instagramHeading')}</p>
          <InstagramLink
            text={t('instagramCta')}
            ariaLabel={t('instagramAriaLabel')}
            className="mt-3 font-semibold text-cyan-300 hover:text-cyan-200"
          />
        </div>
      </div>
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
        <h3 className="mb-2 text-2xl font-bold text-white">{t('cardTitle')}</h3>
        <p className="mb-6 text-slate-400">{t('cardDescription')} <Link href="/privacy" className="font-semibold text-cyan-300 hover:text-cyan-200">{t('privacyPolicy')}</Link>.</p>
        {status === 'success' ? (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-emerald-400"><h4 className="mb-1 text-lg font-semibold">{t('successTitle')}</h4><p className="text-sm text-emerald-300">{t('successDescription')}</p><button type="button" onClick={() => setStatus('idle')} className="mt-4 inline-block rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-emerald-500">{t('sendAnother')}</button></div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div><label className="mb-2 block text-sm font-medium text-slate-300">{t('nameLabel')}</label><input type="text" required value={name} onChange={(event) => setName(event.target.value)} className="w-full rounded-lg border border-slate-800 bg-slate-950 px-4 py-3 text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none" placeholder={t('namePlaceholder')} /></div>
            <div><label className="mb-2 block text-sm font-medium text-slate-300">{t('emailLabel')}</label><input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-lg border border-slate-800 bg-slate-950 px-4 py-3 text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none" placeholder={t('emailPlaceholder')} /><p className="mt-1 text-xs text-slate-500">{t('emailHint')}</p></div>
            <div><label className="mb-2 block text-sm font-medium text-slate-300">Message</label><textarea required rows={5} value={message} onChange={(event) => setMessage(event.target.value)} className="w-full rounded-lg border border-slate-800 bg-slate-950 px-4 py-3 text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none" placeholder={t('messagePlaceholder')} /></div>
            {status === 'error' ? <p className="text-sm text-rose-400">{errorMessage || t('error')}</p> : null}
            <button type="submit" disabled={status === 'loading'} className="w-full rounded-lg bg-cyan-400 px-6 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:opacity-50 sm:w-auto">{status === 'loading' ? t('sending') : t('send')}</button>
          </form>
        )}
      </div>
    </div>
  );
}
