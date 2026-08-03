'use client';

import { useTranslations } from 'next-intl';

interface SevenDayPlanProps {
  planKey: string;
}

const DAY_NUMBERS = [1, 2, 3, 4, 5, 6, 7] as const;

export default function SevenDayPlan({ planKey }: SevenDayPlanProps) {
  const t = useTranslations('BusinessIdeaReadiness');

  return (
    <div>
      <h3 className="text-lg font-semibold text-white mb-4">
        {t('results.sevenDayPlanHeading')}
      </h3>
      <ol className="space-y-3">
        {DAY_NUMBERS.map((day) => {
          const key = `sevenDayPlan.${planKey}.day${day}` as Parameters<typeof t>[0];
          let actionText: string;
          try {
            actionText = t(key);
          } catch {
            // Plan key variant not found — fall back to base dimension plan
            const basePlanKey = planKey.split('_').slice(0, 2).join('_');
            const fallbackKey = `sevenDayPlan.${basePlanKey}.day${day}` as Parameters<typeof t>[0];
            actionText = t(fallbackKey);
          }

          return (
            <li
              key={day}
              className="flex gap-4 rounded-xl border border-slate-800 bg-slate-900/60 p-4"
            >
              <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cyan-400/10 text-xs font-bold text-cyan-300">
                {day}
              </span>
              <p className="text-sm leading-6 text-slate-300">{actionText}</p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
