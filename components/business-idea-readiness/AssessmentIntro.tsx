'use client';

import { useTranslations } from 'next-intl';
import { openPrivacyChoicesPanel } from '@/lib/privacy-consent';

interface AssessmentIntroProps {
  onStart: () => void;
}

export default function AssessmentIntro({ onStart }: AssessmentIntroProps) {
  const t = useTranslations('BusinessIdeaReadiness');

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
        {t('intro.title')}
      </h1>
      <p className="mt-4 text-lg leading-7 text-slate-300">
        {t('intro.description')}
      </p>

      <ul className="mt-6 space-y-2 text-sm text-slate-400">
        <li className="flex items-center gap-2">
          <span className="text-cyan-400" aria-hidden="true">✓</span>
          {t('intro.timeEstimate')}
        </li>
        <li className="flex items-center gap-2">
          <span className="text-cyan-400" aria-hidden="true">✓</span>
          {t('intro.noExperienceRequired')}
        </li>
      </ul>

      <button
        type="button"
        onClick={onStart}
        className="mt-8 rounded-lg bg-cyan-400 px-6 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
      >
        {t('intro.startButton')}
      </button>

      <div className="mt-8 rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-xs text-slate-400">
        <p>{t('intro.privacyStatement')}</p>
        <button
          type="button"
          onClick={() => openPrivacyChoicesPanel()}
          className="mt-2 font-semibold text-cyan-400 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
        >
          {t('intro.privacyChoicesLink')}
        </button>
      </div>
    </div>
  );
}
