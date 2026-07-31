import type { Metadata } from 'next';
import Link from 'next/link';
import { OpenPrivacyChoicesButton } from '@/components/PrivacyConsent';

export const metadata: Metadata = {
  title: 'Privacy Choices | Ownward Hub',
  description: 'Review and manage optional privacy choices stored locally in your browser on Ownward.',
};

export default function PrivacyChoicesPage() {
  return (
    <main className="mx-auto flex min-h-[calc(100vh-73px)] max-w-4xl items-center px-4 py-12 sm:px-6">
      <section className="w-full rounded-2xl border border-slate-800 bg-slate-900/70 p-8 shadow-2xl shadow-slate-950">
        <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">
          Privacy choices
        </p>

        <h1 className="mt-3 text-3xl font-bold text-white sm:text-4xl">
          Manage optional storage on Ownward
        </h1>

        <p className="mt-4 max-w-3xl leading-7 text-slate-300">
          Ownward stores your privacy choices locally in this browser using the key{' '}
          <code className="rounded bg-slate-950 px-2 py-1 text-sm text-cyan-300">
            ownward_privacy_consent_v1
          </code>
          . Necessary storage remains active so the site can function, while functionality,
          analytics, and marketing stay off unless you enable them.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <article className="rounded-xl border border-slate-800 bg-slate-950/80 p-4">
            <h2 className="font-semibold text-white">Necessary</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Required for essential site behavior and always enabled.
            </p>
          </article>
          <article className="rounded-xl border border-slate-800 bg-slate-950/80 p-4">
            <h2 className="font-semibold text-white">Functionality</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Enables optional local features such as the anonymous community response token.
            </p>
          </article>
          <article className="rounded-xl border border-slate-800 bg-slate-950/80 p-4">
            <h2 className="font-semibold text-white">Analytics & marketing</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Reserved for optional measurement or promotional storage if those features are used.
            </p>
          </article>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <OpenPrivacyChoicesButton className="rounded-lg bg-cyan-400 px-5 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300">
            Open privacy panel
          </OpenPrivacyChoicesButton>
          <Link
            href="/privacy"
            className="rounded-lg border border-slate-700 px-5 py-3 font-semibold text-cyan-300 transition hover:border-cyan-400 hover:text-cyan-200"
          >
            Privacy Policy
          </Link>
          <Link
            href="mailto:ownwardhub@gmail.com"
            className="rounded-lg border border-slate-700 px-5 py-3 font-semibold text-cyan-300 transition hover:border-cyan-400 hover:text-cyan-200"
          >
            ownwardhub@gmail.com
          </Link>
        </div>

        <p className="mt-6 text-sm leading-6 text-slate-400">
          You can revisit these choices at any time from the persistent <span className="font-semibold text-slate-200">Privacy choices</span> button after saving a selection.
        </p>
      </section>
    </main>
  );
}
