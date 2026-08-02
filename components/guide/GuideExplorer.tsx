'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import type { GuideArticle, GuideCategorySlug } from '@/lib/guide-content';
import { searchGuideArticles } from '@/lib/guide-discovery';

interface GuideExplorerProps {
  articles: GuideArticle[];
  categories: Array<{ value: GuideCategorySlug; label: string }>;
  allCategoriesLabel: string;
  searchLabel: string;
  searchPlaceholder: string;
  noResultsTitle: string;
  noResultsBody: string;
  clearFiltersLabel: string;
}

export default function GuideExplorer({
  articles,
  categories,
  allCategoriesLabel,
  searchLabel,
  searchPlaceholder,
  noResultsTitle,
  noResultsBody,
  clearFiltersLabel,
}: GuideExplorerProps) {
  const t = useTranslations('Guide');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<GuideCategorySlug | 'all'>('all');

  const results = useMemo(
    () => searchGuideArticles(articles, query, category),
    [articles, category, query],
  );

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8 print:hidden">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">{searchLabel}</h2>
          <p className="mt-1 text-sm text-slate-400">{t('resultCount', { count: results.length })}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setQuery('');
            setCategory('all');
          }}
          className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-500 hover:text-white"
        >
          {clearFiltersLabel}
        </button>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(200px,1fr)]">
        <label className="space-y-2 text-sm">
          <span className="font-medium text-slate-300">{searchLabel}</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={searchPlaceholder}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
          />
        </label>
        <label className="space-y-2 text-sm">
          <span className="font-medium text-slate-300">{allCategoriesLabel}</span>
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value as GuideCategorySlug | 'all')}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 focus:border-cyan-400 focus:outline-none"
          >
            <option value="all">{allCategoriesLabel}</option>
            {categories.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {results.length > 0 ? (
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {results.map((article) => (
            <article key={`${article.category}-${article.slug}`} className="rounded-2xl border border-slate-800 bg-slate-950/40 p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">{article.articleType ?? article.category}</p>
              <h3 className="mt-2 text-lg font-semibold text-white">{article.cardTitle ?? article.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-300">{article.description}</p>
              {article.learningOutcome ? (
                <p className="mt-3 text-sm leading-6 text-slate-400">{article.learningOutcome}</p>
              ) : null}
              <div className="mt-4 flex items-center justify-between border-t border-slate-800 pt-3 text-sm text-slate-400">
                <span>{article.readingTime}</span>
                <Link href={`/guide/${article.category}/${article.slug}`} className="font-semibold text-cyan-300 hover:text-cyan-200">
                  {t('readArticleInline')}
                </Link>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-700 bg-slate-950/40 p-8 text-center">
          <h3 className="text-lg font-semibold text-white">{noResultsTitle}</h3>
          <p className="mt-2 text-sm text-slate-400">{noResultsBody}</p>
        </div>
      )}
    </section>
  );
}
