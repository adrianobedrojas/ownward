import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { notFound } from 'next/navigation';
import GuideShareControls from '@/components/GuideShareControls';
import SbaLoanReadinessCheck from '@/components/SbaLoanReadinessCheck';
import UrgencyTriage from '@/components/UrgencyTriage';
import { getGuideArticle, getGuideCategory, guideArticles } from '@/lib/guide-content';

interface GuideArticlePageProps {
  params: Promise<{ locale: string; category: string; slug: string }>;
}

export async function generateStaticParams() {
  return guideArticles.flatMap((article) => [
    { locale: 'en', category: article.category, slug: article.slug },
    { locale: 'es', category: article.category, slug: article.slug },
  ]);
}

export async function generateMetadata({ params }: GuideArticlePageProps): Promise<Metadata> {
  const { category, slug } = await params;
  const article = getGuideArticle(category, slug);
  if (!article) return {};
  return { title: article.title, description: article.metadataDescription };
}

export default async function GuideArticlePage({ params }: GuideArticlePageProps) {
  const { locale, category, slug } = await params;
  const article = getGuideArticle(category, slug);
  const catInfo = getGuideCategory(category);
  const t = await getTranslations('Guide');

  if (!article || !catInfo) notFound();

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://ownwardhub.com';
  const canonicalUrl = new URL(`/guide/${article.category}/${article.slug}`, siteUrl).toString();
  const guideLabel = article.articleType ?? t('ownwardGuideLabel');
  const introTitle = article.introductionTitle ?? t('introduction');
  const actionPlanTitle = article.actionPlanTitle ?? t('actionPlan');
  const checklistTitle = article.checklistTitle ?? t('checklist');
  const hasActionPlan = Array.isArray(article.actionPlan) && article.actionPlan.length > 0;
  const hasChecklist = Array.isArray(article.checklist) && article.checklist.length > 0;
  const hasLearningObjectives = Array.isArray(article.learningObjectives) && article.learningObjectives.length > 0;
  const hasContentNotice = typeof article.contentNotice === 'string' && article.contentNotice.length > 0;
  const hasReflectionPrompts = Array.isArray(article.reflectionPrompts) && article.reflectionPrompts.length > 0;

  const learningObjectivesHeading = locale === 'es' ? 'Lo que aprenderás' : 'What you will learn';
  const contentNoticeHeading = locale === 'es' ? 'Contexto importante' : 'Important context';
  const reflectionPromptsHeading = locale === 'es' ? 'Preguntas que vale la pena considerar' : 'Questions worth sitting with';

  const sourcesDesc = article.sourceNotice ?? t('sourcesDescription');

  return (
    <main className="mx-auto max-w-4xl px-4 py-12 text-slate-100 sm:px-6">
      <article className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">{guideLabel} · {catInfo.title}</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">{article.title}</h1>
        <p className="mt-3 text-base leading-7 text-slate-300">{article.description}</p>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-400">
          {article.publishedDate ? <span>{article.publishedDate} · {article.readingTime}</span> : <span>{article.readingTime}</span>}
          {article.lastReviewed ? <span>{t('lastReviewed', { date: article.lastReviewed })}</span> : null}
        </div>
        <div className="mt-5"><GuideShareControls title={article.title} description={article.description} canonicalUrl={canonicalUrl} /></div>

        {hasLearningObjectives ? (
          <section className="mt-8 rounded-xl border border-slate-700 bg-slate-950/40 p-5">
            <h2 className="text-lg font-semibold text-white">{learningObjectivesHeading}</h2>
            <ul className="mt-3 space-y-2">
              {article.learningObjectives!.map((objective) => (
                <li key={objective} className="flex items-start gap-2 text-sm leading-6 text-slate-300">
                  <span className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-cyan-400/20 text-xs text-cyan-400">✓</span>
                  {objective}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <hr className="my-8 border-slate-800" />

        {hasContentNotice ? (
          <aside
            aria-label={contentNoticeHeading}
            className="mb-8 rounded-xl border border-amber-700/40 bg-amber-950/20 p-4"
          >
            <p className="text-sm font-semibold text-amber-300">{contentNoticeHeading}</p>
            <p className="mt-1 text-sm leading-6 text-amber-100/80">{article.contentNotice}</p>
          </aside>
        ) : null}

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-white">{introTitle}</h2>
          {article.introduction.map((paragraph) => <p key={paragraph} className="text-sm leading-7 text-slate-300 sm:text-base">{paragraph}</p>)}
        </section>
        {article.interactiveTool === 'sba-readiness' ? <SbaLoanReadinessCheck /> : null}
        {article.interactiveTool === 'urgency-triage' ? <UrgencyTriage /> : null}
        <div className="mt-10 space-y-10">
          {article.sections.map((section) => (
            <section key={section.title} className="space-y-4">
              <h2 className="text-2xl font-semibold text-white">{section.title}</h2>
              {section.paragraphs.map((paragraph) => <p key={paragraph} className="text-sm leading-7 text-slate-300 sm:text-base">{paragraph}</p>)}
              {section.bullets ? <ul className="list-disc space-y-2 pl-6 text-sm leading-7 text-slate-300 sm:text-base">{section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul> : null}
              {section.steps ? <ol className="list-decimal space-y-2 pl-6 text-sm leading-7 text-slate-300 sm:text-base">{section.steps.map((step) => <li key={step}>{step}</li>)}</ol> : null}
              {section.quote ? <blockquote className="my-4 border-l-4 border-cyan-400 py-2 pl-5"><p className="text-base font-medium italic leading-8 text-slate-200 sm:text-lg">&ldquo;{section.quote}&rdquo;</p></blockquote> : null}
            </section>
          ))}
        </div>
        {hasActionPlan ? <section className="mt-10 rounded-xl border border-slate-800 bg-slate-950/50 p-5 sm:p-6"><h2 className="text-2xl font-semibold text-white">{actionPlanTitle}</h2><ul className="mt-4 space-y-3 text-sm leading-7 text-slate-300 sm:text-base">{article.actionPlan!.map((item) => <li key={item.week} className="rounded-lg border border-slate-800 px-4 py-3"><span className="font-semibold text-white">{item.week}:</span> {item.focus}</li>)}</ul></section> : null}

        {hasReflectionPrompts ? (
          <section className="mt-10">
            <h2 className="text-2xl font-semibold text-white">{reflectionPromptsHeading}</h2>
            <ol className="mt-4 space-y-3">
              {article.reflectionPrompts!.map((prompt, i) => (
                <li key={prompt} className="rounded-xl border border-slate-800 bg-slate-950/40 px-5 py-4">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">{i + 1}</span>
                  <p className="text-sm leading-6 text-slate-300">{prompt}</p>
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        {hasChecklist ? <section className="mt-10"><h2 className="text-2xl font-semibold text-white">{checklistTitle}</h2><ul className="mt-4 space-y-3" aria-label="Article checklist">{article.checklist!.map((item) => <li key={item}><label className="flex items-start gap-3 rounded-lg border border-slate-800 px-4 py-3 text-sm leading-6 text-slate-300 sm:text-base"><input type="checkbox" disabled aria-label={item} className="mt-1 h-4 w-4 accent-cyan-400" /><span>{item}</span></label></li>)}</ul></section> : null}
        {article.sources?.length ? <section className="mt-10"><h2 className="text-2xl font-semibold text-white">{t('officialSources')}</h2><p className="mt-2 text-sm leading-6 text-slate-400">{sourcesDesc}</p><ul className="mt-4 space-y-2">{article.sources.map((source) => <li key={source.href}><a href={source.href} target="_blank" rel="noreferrer noopener" className="text-sm text-cyan-300 hover:text-cyan-200 hover:underline">{source.label}</a></li>)}</ul></section> : null}
        <div className="mt-10 border-t border-slate-800 pt-6"><GuideShareControls title={article.title} description={article.description} canonicalUrl={canonicalUrl} /></div>
        <section className="mt-10 flex flex-col gap-3 border-t border-slate-800 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <Link href={article.categoryCtaHref} className="inline-flex items-center text-sm font-semibold text-cyan-300 hover:text-cyan-200">← {article.categoryCtaLabel}</Link>
          <Link href={article.ownwardCtaHref} className="inline-flex items-center justify-center rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300">{article.ownwardCtaLabel}</Link>
        </section>
      </article>
    </main>
  );
}
