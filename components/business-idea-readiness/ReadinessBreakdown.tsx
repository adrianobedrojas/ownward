'use client';

import { useTranslations } from 'next-intl';
import type { DimensionScore, DimensionId } from '@/lib/business-idea-readiness/types';

interface ReadinessBreakdownProps {
  dimensions: DimensionScore[];
  strongestDimension: DimensionId;
  weakestDimension: DimensionId;
}

function scoreColor(pct: number): string {
  if (pct >= 75) return 'text-emerald-400';
  if (pct >= 50) return 'text-cyan-400';
  if (pct >= 25) return 'text-amber-400';
  return 'text-rose-400';
}

function barColor(pct: number): string {
  if (pct >= 75) return 'bg-emerald-400';
  if (pct >= 50) return 'bg-cyan-400';
  if (pct >= 25) return 'bg-amber-400';
  return 'bg-rose-400';
}

export default function ReadinessBreakdown({
  dimensions,
  strongestDimension,
  weakestDimension,
}: ReadinessBreakdownProps) {
  const t = useTranslations('BusinessIdeaReadiness');

  return (
    <div>
      <h3 className="text-lg font-semibold text-white mb-4">
        {t('results.dimensionsHeading')}
      </h3>
      <div className="space-y-4">
        {dimensions.map((dim) => {
          const labelKey = `dimensions.${dim.id}` as Parameters<typeof t>[0];
          const label = t(labelKey);
          const isStrongest = dim.id === strongestDimension;
          const isWeakest = dim.id === weakestDimension;

          return (
            <div key={dim.id} className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-200">{label}</span>
                  {isStrongest && (
                    <span className="rounded-full bg-emerald-400/10 px-2 py-0.5 text-xs font-semibold text-emerald-400">
                      {t('results.strongest')}
                    </span>
                  )}
                  {isWeakest && (
                    <span className="rounded-full bg-rose-400/10 px-2 py-0.5 text-xs font-semibold text-rose-400">
                      {t('results.weakest')}
                    </span>
                  )}
                </div>
                <span
                  className={`text-sm font-bold tabular-nums ${scoreColor(dim.pct)}`}
                  aria-label={t('results.scoreAria', { score: dim.pct })}
                >
                  {dim.pct}%
                </span>
              </div>
              {/* Visual bar — text equivalent provided via aria-label above */}
              <div
                className="h-2 w-full overflow-hidden rounded-full bg-slate-800"
                aria-hidden="true"
              >
                <div
                  className={`h-full rounded-full transition-all duration-500 motion-reduce:transition-none ${barColor(dim.pct)}`}
                  style={{ width: `${dim.pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
