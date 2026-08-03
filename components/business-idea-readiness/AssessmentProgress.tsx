'use client';

import { useTranslations } from 'next-intl';

interface AssessmentProgressProps {
  currentIndex: number;
  totalQuestions: number;
  dimensionKey: string;
}

export default function AssessmentProgress({
  currentIndex,
  totalQuestions,
  dimensionKey,
}: AssessmentProgressProps) {
  const t = useTranslations('BusinessIdeaReadiness');
  const current = currentIndex + 1;
  const pct = Math.round((current / totalQuestions) * 100);

  const dimensionLabel = t(`dimensions.${dimensionKey}` as Parameters<typeof t>[0]);

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
        <span>{t('progress.questionLabel', { current, total: totalQuestions })}</span>
        <span>{dimensionLabel}</span>
      </div>
      {/* Visual progress bar */}
      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800"
        role="progressbar"
        aria-valuenow={current}
        aria-valuemin={1}
        aria-valuemax={totalQuestions}
        aria-label={t('progress.srLabel', { current, total: totalQuestions })}
      >
        <div
          className="h-full rounded-full bg-cyan-400 transition-all duration-300 motion-reduce:transition-none"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
