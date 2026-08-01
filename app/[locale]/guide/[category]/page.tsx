import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { notFound } from 'next/navigation';
import { getGuideArticlesByCategory, getGuideCategory, guideCategoryContent } from '@/lib/guide-content';

interface CategoryPageProps {
  params: Promise<{ locale: string; category: string }>;
}

export async function generateStaticParams() {
  return Object.keys(guideCategoryContent).flatMap((category) => [
    { locale: 'en', category },
    { locale: 'es', category },
  ]);
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { category, locale } = await params;
  const catInfo = getGuideCategory(category);
  const t = await getTranslations({ locale, namespace: 'Guide' });
  if (!catInfo) return {};
  const translated = t.raw(`categories.${category}`) as Record<string, string>;
  return { title: translated?.name ?? catInfo.title, description: translated?.description ?? catInfo.description };
}

export default async function GuideCategoryPage({ params }: CategoryPageProps) {
  const { category } = await params;
  const catInfo = getGuideCategory(category);
  const categoryArticles = getGuideArticlesByCategory(category);
  const t = await getTranslations('Guide');

  if (!catInfo) notFound();

  const translated = t.raw(`categories.${category}`) as Record<string, string>;

  return (
    <main className="mx-auto max-w-7xl px-4 py-12 text-slate-100 sm:px-6">
      <div className="mb-8">
        <Link href="/guide" className="text-sm font-semibold text-cyan-400 hover:underline">{t('backToGuide')}</Link>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">{translated?.name ?? catInfo.title}</h1>
        <p className="mt-2 text-lg text-slate-300">{translated?.description ?? catInfo.description}</p>
      </div>
      {categoryArticles.length > 0 ? (
        <section aria-label={`${catInfo.title} articles`} className="grid gap-6 md:grid-cols-2">
          {categoryArticles.map((article) => (
            <Link key={article.slug} href={`/guide/${article.category}/${article.slug}`} className="group block rounded-2xl border border-slate-800 bg-slate-900/60 p-6 transition hover:border-slate-700 hover:bg-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950">
              <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">{translated?.name ?? catInfo.title}</p>
              <h2 className="mt-3 text-2xl font-semibold text-white group-hover:text-cyan-200">{article.cardTitle ?? article.title}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-300">{article.description}</p>
              <div className="mt-6 flex items-center justify-between border-t border-slate-800 pt-4">
                <span className="text-sm text-slate-400">{article.readingTime}</span>
                <span className="text-sm font-semibold text-cyan-300">{t('readArticle')}</span>
              </div>
            </Link>
          ))}
        </section>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/60 p-12 text-center">
          <h2 className="text-xl font-semibold text-white">{t('articlesComingSoon')}</h2>
          <p className="mt-2 text-sm text-slate-400">{t('articlesComingSoonDescription')}</p>
        </div>
      )}
    </main>
  );
}
