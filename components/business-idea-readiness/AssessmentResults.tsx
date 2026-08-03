'use client';

import { useRef, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { ScoreResult, RecommendationResult, DimensionId } from '@/lib/business-idea-readiness/types';
import ReadinessBreakdown from './ReadinessBreakdown';
import SevenDayPlan from './SevenDayPlan';

interface AssessmentResultsProps {
  scores: ScoreResult;
  recommendations: RecommendationResult;
  sevenDayPlanKey: string;
  onRestart: () => void;
}

function scoreColor(pct: number): string {
  if (pct >= 75) return 'text-emerald-400';
  if (pct >= 50) return 'text-cyan-400';
  if (pct >= 25) return 'text-amber-400';
  return 'text-rose-400';
}

export default function AssessmentResults({
  scores,
  recommendations,
  sevenDayPlanKey,
  onRestart,
}: AssessmentResultsProps) {
  const t = useTranslations('BusinessIdeaReadiness');
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');

  // Focus heading on mount for keyboard users
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const levelKey = `results.levels.${scores.level}` as Parameters<typeof t>[0];
  const levelDescKey = `results.levelDescriptions.${scores.level}` as Parameters<typeof t>[0];
  const summaryKey = `results.summary.${scores.level}` as Parameters<typeof t>[0];
  const clearKey = `results.whatIsClearItems.${scores.strongestDimension}` as Parameters<typeof t>[0];
  const missingKey = `results.whatIsMissingItems.${scores.weakestDimension}` as Parameters<typeof t>[0];

  const handlePrint = () => {
    window.print();
  };

  const handleCopy = async () => {
    const lines: string[] = [
      t('results.heading'),
      '',
      `${t('results.overallLabel')}: ${scores.overall}/100`,
      `${t('results.levelLabel')}: ${t(levelKey)}`,
      '',
      t(summaryKey),
      '',
      t('results.dimensionsHeading'),
      ...scores.dimensions.map((d) => {
        const dimLabel = t(`dimensions.${d.id}` as Parameters<typeof t>[0]);
        return `${dimLabel}: ${d.pct}%`;
      }),
      '',
      t('results.actionsHeading'),
      ...recommendations.actions.map((a, i) => {
        const actionKey = `recommendations.${a.key}` as Parameters<typeof t>[0];
        return `${i + 1}. ${t(actionKey)}`;
      }),
      '',
      t('results.disclaimer'),
    ];

    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setCopyState('copied');
    } catch {
      setCopyState('failed');
    }
    setTimeout(() => setCopyState('idle'), 2500);
  };

  const copyLabel =
    copyState === 'copied'
      ? t('controls.copied')
      : copyState === 'failed'
        ? t('controls.copyFailed')
        : t('controls.copy');

  return (
    <div className="mx-auto max-w-2xl space-y-10">
      {/* Heading */}
      <div>
        <h2
          ref={headingRef}
          tabIndex={-1}
          className="text-2xl font-bold text-white outline-none"
        >
          {t('results.heading')}
        </h2>
      </div>

      {/* Overall score */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        <p className="text-sm font-semibold uppercase tracking-wider text-slate-400">
          {t('results.overallLabel')}
        </p>
        <p
          className={`mt-2 text-5xl font-bold tabular-nums ${scoreColor(scores.overall)}`}
          aria-label={t('results.scoreAria', { score: scores.overall })}
        >
          {scores.overall}
          <span className="text-2xl text-slate-500">/100</span>
        </p>
        <p className="mt-3 text-sm font-semibold uppercase tracking-wider text-slate-400">
          {t('results.levelLabel')}
        </p>
        <p className="mt-1 text-lg font-bold text-white">{t(levelKey)}</p>
        <p className="mt-2 text-sm leading-6 text-slate-300">{t(levelDescKey)}</p>
      </div>

      {/* Personalized summary */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        <p className="text-sm leading-7 text-slate-300">{t(summaryKey)}</p>
      </div>

      {/* Dimension breakdown */}
      <ReadinessBreakdown
        dimensions={scores.dimensions}
        strongestDimension={scores.strongestDimension as DimensionId}
        weakestDimension={scores.weakestDimension as DimensionId}
      />

      {/* What is clear / what is missing */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-emerald-800/40 bg-emerald-900/10 p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-emerald-400">
            {t('results.whatIsClear')}
          </p>
          <p className="text-sm leading-6 text-slate-300">{t(clearKey)}</p>
        </div>
        <div className="rounded-xl border border-rose-800/40 bg-rose-900/10 p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-rose-400">
            {t('results.whatIsMissing')}
          </p>
          <p className="text-sm leading-6 text-slate-300">{t(missingKey)}</p>
        </div>
      </div>

      {/* Prioritized actions */}
      <div>
        <h3 className="mb-4 text-lg font-semibold text-white">{t('results.actionsHeading')}</h3>
        <ol className="space-y-3">
          {recommendations.actions.map((action, idx) => {
            const actionKey = `recommendations.${action.key}` as Parameters<typeof t>[0];
            return (
              <li
                key={action.key}
                className="flex gap-4 rounded-xl border border-slate-800 bg-slate-900/60 p-4"
              >
                <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cyan-400/10 text-xs font-bold text-cyan-300">
                  {idx + 1}
                </span>
                <p className="text-sm leading-6 text-slate-300">{t(actionKey)}</p>
              </li>
            );
          })}
        </ol>
      </div>

      {/* Immediate action */}
      <div className="rounded-xl border border-cyan-800/40 bg-cyan-900/10 p-5">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-cyan-400">
          {t('results.immediateActionHeading')}
        </p>
        <p className="text-sm leading-6 text-slate-300">
          {t(`immediateActions.${recommendations.immediateAction.key}` as Parameters<typeof t>[0])}
        </p>
      </div>

      {/* Seven-day plan */}
      <SevenDayPlan planKey={sevenDayPlanKey} />

      {/* Disclaimer */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
        <p className="text-xs leading-5 text-slate-500">{t('results.disclaimer')}</p>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onRestart}
          className="rounded-lg border border-slate-700 bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:border-slate-600 hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
        >
          {t('results.restartLabel')}
        </button>
        <button
          type="button"
          onClick={handleCopy}
          className="rounded-lg border border-slate-700 bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:border-slate-600 hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
        >
          {copyLabel}
        </button>
        <button
          type="button"
          onClick={handlePrint}
          className="rounded-lg border border-slate-700 bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:border-slate-600 hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
        >
          {t('controls.print')}
        </button>
      </div>
    </div>
  );
}
