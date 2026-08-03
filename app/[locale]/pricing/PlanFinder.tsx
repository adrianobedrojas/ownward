'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import type { BillingPlan } from '@/lib/billing';
import { PLAN_FINDER_GOALS, type PlanRecommendationGoal } from '@/lib/pricing';

interface PlanFinderProps {
  recommendedPlan: BillingPlan | null;
  selectedGoal: PlanRecommendationGoal | null;
}

export default function PlanFinder({
  recommendedPlan,
  selectedGoal,
}: PlanFinderProps) {
  const t = useTranslations('Pricing');

  return (
    <section
      id="plan-finder"
      aria-labelledby="plan-finder-heading"
      className="mt-10 rounded-2xl border border-slate-800 bg-slate-900/70 p-6"
    >
      <div className="max-w-3xl">
        <h2 id="plan-finder-heading" className="text-2xl font-semibold text-white">
          {t('planFinder.title')}
        </h2>
        <p className="mt-2 text-sm text-slate-400">{t('planFinder.description')}</p>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {PLAN_FINDER_GOALS.map((goal) => {
          const isSelected = selectedGoal === goal.key;

          return (
            <Link
              key={goal.key}
              href={`/pricing?goal=${goal.key}#plan-finder`}
              className={`rounded-xl border px-4 py-4 text-left transition ${
                isSelected
                  ? 'border-cyan-400 bg-cyan-400/10 text-cyan-100'
                  : 'border-slate-800 bg-slate-950/70 text-slate-200 hover:border-slate-700'
              }`}
            >
              <p className="text-sm font-semibold">{t(`planFinder.goals.${goal.key}.title`)}</p>
              <p className="mt-1 text-xs text-slate-400">
                {t(`planFinder.goals.${goal.key}.description`)}
              </p>
            </Link>
          );
        })}
      </div>

      {recommendedPlan ? (
        <div className="mt-5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-4 text-sm text-emerald-100">
          <p className="font-semibold">
            {t('planFinder.recommendationLabel', {
              plan: t(`plans.${recommendedPlan}.name`),
            })}
          </p>
          <p className="mt-1 text-emerald-200/80">
            {selectedGoal
              ? t(`planFinder.goals.${selectedGoal}.recommendation`)
              : t('planFinder.genericRecommendation')}
          </p>
        </div>
      ) : null}
    </section>
  );
}
