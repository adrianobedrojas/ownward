'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';

interface ArticleChecklistProps {
  items: string[];
}

export default function ArticleChecklist({ items }: ArticleChecklistProps) {
  const t = useTranslations('Guide');
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  const completed = useMemo(
    () => items.filter((item) => checked[item]).length,
    [checked, items],
  );

  return (
    <section className="mt-10 print:hidden">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-white">{t('checklist')}</h2>
          <p className="mt-1 text-sm text-slate-400">
            {t('articleChecklistStatus', { completed, total: items.length })}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setChecked({})}
          className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-500 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
        >
          {t('resetChecklist')}
        </button>
      </div>
      <ul className="mt-4 space-y-3" aria-label={t('articleChecklistAriaLabel')}>
        {items.map((item) => (
          <li key={item}>
            <label className="flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-3 text-sm leading-6 text-slate-300">
              <input
                type="checkbox"
                checked={Boolean(checked[item])}
                onChange={() =>
                  setChecked((current) => ({
                    ...current,
                    [item]: !current[item],
                  }))
                }
                aria-label={item}
                className="mt-1 h-4 w-4 accent-cyan-400"
              />
              <span>{item}</span>
            </label>
          </li>
        ))}
      </ul>
    </section>
  );
}
