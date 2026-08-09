import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { notFound } from 'next/navigation';
import GuideShareControls from '@/components/GuideShareControls';
import SbaLoanReadinessCheck from '@/components/SbaLoanReadinessCheck';
import UrgencyTriage from '@/components/UrgencyTriage';
import ArticleChecklist from '@/components/guide/ArticleChecklist';
import ArticleReadingProgress from '@/components/guide/ArticleReadingProgress';
import ArticleTableOfContents from '@/components/guide/ArticleTableOfContents';
import ArticleVisual from '@/components/guide/ArticleVisual';
import {
  getAcademyCoursesForArticle,
  getCourseLessonContext,
  getLocalizedAcademyText,
  type AcademyLesson,
  type AcademyCourse,
} from '@/lib/academy-content';
import {
  getGuideArticle,
  getGuideCategory,
  getGuideArticlesByCategory,
  guideArticles,
} from '@/lib/guide-content';
import { getArticleTableOfContents } from '@/lib/guide-discovery';
import { createMetadata, getAbsoluteUrl, serializeJsonLd } from '@/lib/seo';

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
  const { locale, category, slug } = await params;
  const article = getGuideArticle(category, slug);
  if (!article) return {};
  return createMetadata({ locale, pathname: `/guide/${article.category}/${article.slug}`, title: article.title, description: article.metadataDescription, type: 'article' });
}

function toIsoDate(value?: string) {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

function getLessonHref(lesson: AcademyLesson) {
  return `/guide/${lesson.guideCategory}/${lesson.guideArticleSlug}`;
}

function getPrimaryCourseContext(courses: AcademyCourse[], category: string, slug: string) {
  for (const course of courses) {
    const context = getCourseLessonContext(course.slug, category, slug);
    if (context) return context;
  }
  return null;
}

export default async function GuideArticlePage({ params }: GuideArticlePageProps) {
  const { locale, category, slug } = await params;
  const article = getGuideArticle(category, slug);
  const catInfo = getGuideCategory(category);
  const t = await getTranslations('Guide');
  const academyT = await getTranslations('Academy');

  if (!article || !catInfo) notFound();

  const canonicalUrl = getAbsoluteUrl(`/guide/${article.category}/${article.slug}`, locale === 'es' ? 'es' : 'en');
  const guideLabel = article.articleType ?? t('ownwardGuideLabel');
  const categoryLabel = ((t.raw(`categories.${article.category}`) as Record<string, string> | undefined)?.name) ?? catInfo.title;
  const introTitle = article.introductionTitle ?? t('introduction');
  const actionPlanTitle = article.actionPlanTitle ?? t('actionPlan');
  const hasActionPlan = Array.isArray(article.actionPlan) && article.actionPlan.length > 0;
  const hasChecklist = Array.isArray(article.checklist) && article.checklist.length > 0;
  const hasLearningObjectives = Array.isArray(article.learningObjectives) && article.learningObjectives.length > 0;
  const hasContentNotice = typeof article.contentNotice === 'string' && article.contentNotice.length > 0;
  const hasReflectionPrompts = Array.isArray(article.reflectionPrompts) && article.reflectionPrompts.length > 0;
  const hasTakeaways = Array.isArray(article.keyTakeaways) && article.keyTakeaways.length > 0;
  const tableOfContents = getArticleTableOfContents(article);
  const relatedArticles = (article.relatedArticles ?? [])
    .map((item) => ({ ...item, article: getGuideArticle(item.category, item.slug) }))
    .filter((item) => item.article);
  const academyCourses = getAcademyCoursesForArticle(article.category, article.slug).filter((course) => course.status === 'available');
  const primaryCourseContext = getPrimaryCourseContext(academyCourses, article.category, article.slug);
  const previousArticle = primaryCourseContext?.previousLesson
    ? getGuideArticle(primaryCourseContext.previousLesson.guideCategory, primaryCourseContext.previousLesson.guideArticleSlug)
    : null;
  const nextArticle = primaryCourseContext?.nextLesson
    ? getGuideArticle(primaryCourseContext.nextLesson.guideCategory, primaryCourseContext.nextLesson.guideArticleSlug)
    : null;
  const additionalCategoryArticles = getGuideArticlesByCategory(article.category)
    .filter((candidate) => candidate.slug !== article.slug)
    .slice(0, 2);
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: t('ownwardGuideLabel'), item: getAbsoluteUrl('/guide', locale === 'es' ? 'es' : 'en') },
      { '@type': 'ListItem', position: 2, name: categoryLabel, item: getAbsoluteUrl(`/guide/${article.category}`, locale === 'es' ? 'es' : 'en') },
      { '@type': 'ListItem', position: 3, name: article.title, item: canonicalUrl },
    ],
  };
  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.metadataDescription,
    url: canonicalUrl,
    mainEntityOfPage: canonicalUrl,
    datePublished: toIsoDate(article.publishedDate),
    dateModified: toIsoDate(article.lastReviewed),
    inLanguage: locale === 'es' ? 'es' : 'en',
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-12 text-slate-100 sm:px-6 print:max-w-none print:px-0 print:py-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(articleJsonLd) }} />
      <ArticleReadingProgress />
      <div className="grid gap-8 xl:grid-cols-[16rem_minmax(0,72ch)]">
        <ArticleTableOfContents title={t('tableOfContents')} items={tableOfContents} />

        <article className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8 print:rounded-none print:border-none print:bg-white print:p-0">
          <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400 print:text-slate-700">{guideLabel} · {catInfo.title}</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-white print:text-slate-950 sm:text-4xl">{article.title}</h1>
          <p className="mt-3 text-base leading-7 text-slate-300 print:text-slate-700">{article.description}</p>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-400 print:text-slate-600">
            {article.publishedDate ? <span>{article.publishedDate} · {article.readingTime}</span> : <span>{article.readingTime}</span>}
            {article.lastReviewed ? <span>{t('lastReviewed', { date: article.lastReviewed })}</span> : null}
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 print:hidden">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{t('whoItsFor')}</p>
              <p className="mt-2 text-sm leading-6 text-slate-300">{article.targetAudience ?? article.description}</p>
            </div>
            {article.learningOutcome ? (
              <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{t('practicalOutcome')}</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">{article.learningOutcome}</p>
              </div>
            ) : null}
          </div>

          <div className="mt-5 print:hidden"><GuideShareControls title={article.title} description={article.description} canonicalUrl={canonicalUrl} /></div>

          {academyCourses.length > 0 ? (
            <section className="mt-8 rounded-2xl border border-cyan-800/30 bg-cyan-950/20 p-5 print:border-slate-300 print:bg-slate-50">
              <p className="text-xs font-semibold uppercase tracking-wider text-cyan-300 print:text-slate-700">{t('academyCourseContext')}</p>
              <div className="mt-2 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-white print:text-slate-900">
                    {getLocalizedAcademyText(academyCourses[0].title, locale)}
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-slate-300 print:text-slate-700">
                    {getLocalizedAcademyText(academyCourses[0].summary, locale)}
                  </p>
                </div>
                <Link href={`/academy/${academyCourses[0].slug}`} className="inline-flex items-center text-sm font-semibold text-cyan-300 hover:text-cyan-200 print:text-slate-800">
                  {t('viewCourse')} →
                </Link>
              </div>
            </section>
          ) : null}

          {hasTakeaways ? (
            <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-950/40 p-5 print:border-slate-300 print:bg-slate-50">
              <h2 className="text-xl font-semibold text-white print:text-slate-900">{t('keyTakeaways')}</h2>
              <ul className="mt-4 space-y-3">
                {article.keyTakeaways!.map((takeaway) => (
                  <li key={takeaway} className="flex gap-3 text-sm leading-6 text-slate-300 print:text-slate-700">
                    <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-cyan-400" aria-hidden="true" />
                    <span>{takeaway}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {hasLearningObjectives ? (
            <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-950/40 p-5 print:border-slate-300 print:bg-slate-50">
              <h2 className="text-lg font-semibold text-white print:text-slate-900">{t('learningObjectives')}</h2>
              <ul className="mt-3 space-y-2">
                {article.learningObjectives!.map((objective) => (
                  <li key={objective} className="flex items-start gap-2 text-sm leading-6 text-slate-300 print:text-slate-700">
                    <span className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-cyan-400/20 text-xs text-cyan-400 print:border print:border-slate-400 print:bg-white print:text-slate-900">✓</span>
                    {objective}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {hasContentNotice ? (
            <aside aria-label={t('importantContext')} className="mt-8 rounded-2xl border border-amber-700/40 bg-amber-950/20 p-4 print:border-slate-300 print:bg-slate-50">
              <p className="text-sm font-semibold text-amber-300 print:text-slate-900">{t('importantContext')}</p>
              <p className="mt-1 text-sm leading-6 text-amber-100/80 print:text-slate-700">{article.contentNotice}</p>
            </aside>
          ) : null}

          {(article.importantNotices ?? []).map((notice) => (
            <aside key={notice.title} className="mt-4 rounded-2xl border border-slate-700 bg-slate-950/40 p-4 print:border-slate-300 print:bg-slate-50">
              <p className="text-sm font-semibold text-white print:text-slate-900">{notice.title}</p>
              <p className="mt-1 text-sm leading-6 text-slate-300 print:text-slate-700">{notice.body}</p>
            </aside>
          ))}

          {article.visuals?.[0] ? <ArticleVisual visual={article.visuals[0]} /> : null}

          {article.terms?.length ? (
            <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-950/40 p-5 print:border-slate-300 print:bg-slate-50">
              <h2 className="text-lg font-semibold text-white print:text-slate-900">{t('plainLanguageTerms')}</h2>
              <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                {article.terms.map((term) => (
                  <div key={term.term}>
                    <dt className="text-sm font-semibold text-white print:text-slate-900">{term.term}</dt>
                    <dd className="mt-1 text-sm leading-6 text-slate-300 print:text-slate-700">{term.definition}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ) : null}

          <hr className="my-8 border-slate-800 print:border-slate-300" />

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-white print:text-slate-950">{introTitle}</h2>
            {article.introduction.map((paragraph) => (
              <p key={paragraph} className="text-sm leading-7 text-slate-300 print:text-slate-700 sm:text-base">{paragraph}</p>
            ))}
          </section>

          {article.interactiveTool === 'sba-readiness' ? <SbaLoanReadinessCheck /> : null}
          {article.interactiveTool === 'urgency-triage' ? <UrgencyTriage /> : null}

          <div className="mt-10 space-y-10">
            {article.sections.map((section, index) => {
              const anchor = tableOfContents[index];
              return (
                <section key={section.title} id={anchor?.id} className="scroll-mt-28 space-y-4">
                  <h2 className="text-2xl font-semibold text-white print:text-slate-950">{section.title}</h2>
                  {section.paragraphs.map((paragraph) => (
                    <p key={paragraph} className="text-sm leading-7 text-slate-300 print:text-slate-700 sm:text-base">{paragraph}</p>
                  ))}
                  {section.bullets ? <ul className="list-disc space-y-2 pl-6 text-sm leading-7 text-slate-300 print:text-slate-700 sm:text-base">{section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul> : null}
                  {section.steps ? <ol className="list-decimal space-y-2 pl-6 text-sm leading-7 text-slate-300 print:text-slate-700 sm:text-base">{section.steps.map((step) => <li key={step}>{step}</li>)}</ol> : null}
                  {section.quote ? <blockquote className="my-4 border-l-4 border-cyan-400 py-2 pl-5 print:border-slate-500"><p className="text-base font-medium italic leading-8 text-slate-200 print:text-slate-800 sm:text-lg">&ldquo;{section.quote}&rdquo;</p></blockquote> : null}
                </section>
              );
            })}
          </div>

          {article.workedExample ? (
            <section className="mt-10 rounded-2xl border border-slate-800 bg-slate-950/40 p-5 print:border-slate-300 print:bg-slate-50">
              <h2 className="text-2xl font-semibold text-white print:text-slate-950">{t('workedExample')}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-300 print:text-slate-700">{article.workedExample.summary}</p>
              <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
                <div>
                  <h3 className="text-base font-semibold text-white print:text-slate-900">{article.workedExample.title}</h3>
                  <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-slate-300 print:text-slate-700">
                    {article.workedExample.assumptions.map((assumption) => <li key={assumption}>{assumption}</li>)}
                  </ul>
                </div>
                <ol className="space-y-3">
                  {article.workedExample.steps.map((step) => (
                    <li key={step.label} className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3 print:border-slate-300 print:bg-white">
                      <p className="text-sm font-semibold text-white print:text-slate-900">{step.label}</p>
                      <p className="mt-1 text-sm leading-6 text-slate-300 print:text-slate-700">{step.detail}</p>
                    </li>
                  ))}
                </ol>
              </div>
              <p className="mt-4 text-sm leading-6 text-slate-300 print:text-slate-700"><span className="font-semibold text-white print:text-slate-900">{t('workedExampleTakeaway')}:</span> {article.workedExample.takeaway}</p>
            </section>
          ) : null}

          {hasActionPlan ? (
            <section className="mt-10 rounded-2xl border border-slate-800 bg-slate-950/50 p-5 sm:p-6 print:border-slate-300 print:bg-slate-50">
              <h2 className="text-2xl font-semibold text-white print:text-slate-950">{actionPlanTitle}</h2>
              <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-300 print:text-slate-700 sm:text-base">
                {article.actionPlan!.map((item) => (
                  <li key={item.week} className="rounded-lg border border-slate-800 px-4 py-3 print:border-slate-300">
                    <span className="font-semibold text-white print:text-slate-900">{item.week}:</span> {item.focus}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {hasReflectionPrompts ? (
            <section className="mt-10">
              <h2 className="text-2xl font-semibold text-white print:text-slate-950">{t('reflectionPrompts')}</h2>
              <ol className="mt-4 space-y-3">
                {article.reflectionPrompts!.map((prompt, i) => (
                  <li key={prompt} className="rounded-xl border border-slate-800 bg-slate-950/40 px-5 py-4 print:border-slate-300 print:bg-white">
                    <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500 print:text-slate-600">{i + 1}</span>
                    <p className="text-sm leading-6 text-slate-300 print:text-slate-700">{prompt}</p>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}

          {hasChecklist ? <ArticleChecklist items={article.checklist!} /> : null}

          {article.nextAction ? (
            <section className="mt-10 rounded-2xl border border-cyan-800/30 bg-cyan-950/20 p-5 print:border-slate-300 print:bg-slate-50">
              <p className="text-xs font-semibold uppercase tracking-wider text-cyan-300 print:text-slate-700">{t('nextAction')}</p>
              <h2 className="mt-2 text-xl font-semibold text-white print:text-slate-950">{article.nextAction.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-300 print:text-slate-700">{article.nextAction.description}</p>
              <Link href={article.nextAction.href} className="mt-4 inline-flex items-center rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 print:border print:border-slate-400 print:bg-white print:text-slate-900">
                {article.nextAction.label}
              </Link>
            </section>
          ) : null}

          {article.sources?.length ? (
            <section className="mt-10">
              <h2 className="text-2xl font-semibold text-white print:text-slate-950">{t('officialSources')}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400 print:text-slate-700">{article.sourceNotice ?? t('sourcesDescription')}</p>
              <ul className="mt-4 space-y-2">
                {article.sources.map((source) => (
                  <li key={source.href}>
                    <a href={source.href} target="_blank" rel="noreferrer noopener" className="text-sm text-cyan-300 hover:text-cyan-200 hover:underline print:text-slate-800">
                      {source.label}
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {(relatedArticles.length > 0 || additionalCategoryArticles.length > 0) ? (
            <section className="mt-10 border-t border-slate-800 pt-6 print:border-slate-300">
              <h2 className="text-2xl font-semibold text-white print:text-slate-950">{t('relatedArticles')}</h2>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {relatedArticles.map((item) => (
                  <Link key={`${item.category}-${item.slug}`} href={`/guide/${item.category}/${item.slug}`} className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4 transition hover:border-slate-700 print:border-slate-300 print:bg-white">
                    <p className="text-sm font-semibold text-white print:text-slate-900">{item.article?.cardTitle ?? item.article?.title}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-300 print:text-slate-700">{item.reason}</p>
                  </Link>
                ))}
                {relatedArticles.length === 0
                  ? additionalCategoryArticles.map((candidate) => (
                      <Link key={candidate.slug} href={`/guide/${candidate.category}/${candidate.slug}`} className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4 transition hover:border-slate-700 print:border-slate-300 print:bg-white">
                        <p className="text-sm font-semibold text-white print:text-slate-900">{candidate.cardTitle ?? candidate.title}</p>
                        <p className="mt-2 text-sm leading-6 text-slate-300 print:text-slate-700">{candidate.learningOutcome ?? candidate.description}</p>
                      </Link>
                    ))
                  : null}
              </div>
            </section>
          ) : null}

          <div className="mt-10 border-t border-slate-800 pt-6 print:hidden"><GuideShareControls title={article.title} description={article.description} canonicalUrl={canonicalUrl} /></div>

          {primaryCourseContext ? (
            <section className="mt-10 border-t border-slate-800 pt-6 print:border-slate-300">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{t('courseLessonSequence')}</p>
                  <p className="mt-1 text-sm text-slate-300">{academyT('lessonCount', { count: primaryCourseContext.course.lessons?.length ?? 0 })}</p>
                </div>
                <Link href={`/academy/${primaryCourseContext.course.slug}`} className="text-sm font-semibold text-cyan-300 hover:text-cyan-200">
                  {t('backToCourse')}
                </Link>
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {previousArticle ? (
                  <Link href={getLessonHref(primaryCourseContext.previousLesson!)} className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4 hover:border-slate-700 print:border-slate-300 print:bg-white">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{t('previousLesson')}</p>
                    <p className="mt-2 text-sm font-semibold text-white print:text-slate-900">{previousArticle.cardTitle ?? previousArticle.title}</p>
                  </Link>
                ) : <div className="rounded-2xl border border-dashed border-slate-800 p-4 text-sm text-slate-500 print:border-slate-300">{t('noPreviousLesson')}</div>}
                {nextArticle ? (
                  <Link href={getLessonHref(primaryCourseContext.nextLesson!)} className="rounded-2xl border border-cyan-800/40 bg-cyan-950/20 p-4 hover:border-cyan-700/50 print:border-slate-300 print:bg-white">
                    <p className="text-xs font-semibold uppercase tracking-wider text-cyan-300 print:text-slate-600">{t('nextLesson')}</p>
                    <p className="mt-2 text-sm font-semibold text-white print:text-slate-900">{nextArticle.cardTitle ?? nextArticle.title}</p>
                  </Link>
                ) : <div className="rounded-2xl border border-dashed border-slate-800 p-4 text-sm text-slate-500 print:border-slate-300">{t('finalLesson')}</div>}
              </div>
            </section>
          ) : null}

          <section className="mt-10 flex flex-col gap-3 border-t border-slate-800 pt-6 sm:flex-row sm:items-center sm:justify-between print:hidden">
            <Link href={article.categoryCtaHref} className="inline-flex items-center text-sm font-semibold text-cyan-300 hover:text-cyan-200">← {article.categoryCtaLabel}</Link>
            <Link href={article.ownwardCtaHref} className="inline-flex items-center justify-center rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300">{article.ownwardCtaLabel}</Link>
          </section>
        </article>
      </div>
    </main>
  );
}
