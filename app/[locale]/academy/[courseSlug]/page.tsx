import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { notFound } from 'next/navigation';
import CoursePath from '@/components/academy/CoursePath';
import {
  academyCourses,
  getAcademyCourse,
  getAcademyLessonArticle,
  getLocalizedAcademyText,
} from '@/lib/academy-content';
import { CourseProgressPanel } from './CourseProgressPanel';

interface CoursePageProps {
  params: Promise<{ locale: string; courseSlug: string }>;
}

export async function generateStaticParams() {
  return academyCourses.flatMap((course) => [
    { locale: 'en', courseSlug: course.slug },
    { locale: 'es', courseSlug: course.slug },
  ]);
}

export async function generateMetadata({ params }: CoursePageProps): Promise<Metadata> {
  const { locale, courseSlug } = await params;
  const course = getAcademyCourse(courseSlug);
  if (!course) return {};
  const title = getLocalizedAcademyText(course.title, locale);
  const description = getLocalizedAcademyText(course.description, locale);
  return { title: `${title} | Ownward Academy`, description };
}

export default async function CoursePage({ params }: CoursePageProps) {
  const { locale, courseSlug } = await params;
  const course = getAcademyCourse(courseSlug);
  if (!course) notFound();

  const t = await getTranslations({ locale, namespace: 'Academy' });

  const title = getLocalizedAcademyText(course.title, locale);
  const description = getLocalizedAcademyText(course.description, locale);
  const summary = getLocalizedAcademyText(course.summary, locale);
  const deliverable = getLocalizedAcademyText(course.deliverable, locale);
  const outcomes = locale === 'es' ? course.outcomes.es : course.outcomes.en;
  const prerequisites = locale === 'es' ? course.prerequisites?.es ?? [] : course.prerequisites?.en ?? [];
  const isAvailable = course.status === 'available';

  const levelLabel =
    course.level === 'intermediate'
      ? t('levelIntermediate')
      : course.level === 'advanced'
        ? t('levelAdvanced')
        : t('levelBeginner');

  const statusLabel = isAvailable ? t('statusAvailable') : t('statusComingSoon');

  const lessonsWithArticles = isAvailable
    ? (course.lessons ?? []).flatMap((lesson, index) => {
        const article = getAcademyLessonArticle(lesson);
        if (!article) return [];
        return [{ lesson, article, index }];
      })
    : [];

  const hasPlannedModules = (course.plannedModules ?? []).length > 0;

  return (
    <main className="mx-auto max-w-5xl px-4 py-12 text-slate-100 sm:px-6">
      <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-2 text-sm text-slate-400">
        <Link href="/academy" className="transition hover:text-white">{t('breadcrumbAcademy')}</Link>
        <span aria-hidden="true">›</span>
        <span className="text-slate-200">{title}</span>
      </nav>

      <article>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${isAvailable ? 'bg-cyan-400/10 text-cyan-300' : 'bg-amber-400/10 text-amber-300'}`}>
              {statusLabel}
            </span>
            <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-xs font-medium text-slate-400">
              {levelLabel}
            </span>
          </div>

          <h1 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">{title}</h1>
          <p className="mt-3 text-base leading-7 text-slate-300">{description}</p>
          <p className="mt-3 text-sm leading-6 text-slate-400">{summary}</p>

          {isAvailable && course.estimatedMinutes ? (
            <p className="mt-3 text-sm text-slate-400">
              {t('estimatedTime', { minutes: course.estimatedMinutes })}
              {' · '}
              {t('lessonCount', { count: lessonsWithArticles.length })}
            </p>
          ) : null}

          {!isAvailable && course.plannedModules ? (
            <p className="mt-3 text-sm text-slate-400">{t('moduleCount', { count: course.plannedModules.length })}</p>
          ) : null}
        </div>

        {course.disclosure ? (
          <aside aria-label={t('disclosureLabel')} className="mt-6 rounded-xl border border-slate-700 bg-slate-900/40 p-4 text-sm leading-6 text-slate-400">
            <p className="font-semibold text-slate-300">{t('disclosureLabel')}</p>
            <p className="mt-1">{getLocalizedAcademyText(course.disclosure, locale)}</p>
          </aside>
        ) : null}

        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
            <h2 className="text-xl font-semibold text-white">{t('courseOutcomes')}</h2>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-300">
              {outcomes.map((outcome) => (
                <li key={outcome} className="flex gap-3">
                  <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-cyan-400" aria-hidden="true" />
                  <span>{outcome}</span>
                </li>
              ))}
            </ul>
          </section>
          <section className="space-y-6">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
              <h2 className="text-xl font-semibold text-white">{t('courseDeliverable')}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-300">{deliverable}</p>
            </div>
            {prerequisites.length > 0 ? (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
                <h2 className="text-xl font-semibold text-white">{t('coursePrerequisites')}</h2>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-300">
                  {prerequisites.map((item) => <li key={item}>{item}</li>)}
                </ul>
              </div>
            ) : null}
          </section>
        </div>

        {isAvailable ? (
          <section className="mt-8 space-y-6">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
              <h2 className="text-xl font-semibold text-white">{t('coursePath')}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">{t('coursePathDescription')}</p>
              <div className="mt-4">
                <CoursePath lessons={lessonsWithArticles} />
              </div>
            </div>
            <CourseProgressPanel course={course} lessons={lessonsWithArticles} locale={locale} />
          </section>
        ) : null}

        {isAvailable && hasPlannedModules ? (
          <section aria-labelledby="upcoming-modules-heading" className="mt-8">
            <h2 id="upcoming-modules-heading" className="text-xl font-semibold text-white">{t('upcomingModules')}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">{t('upcomingModulesDescription')}</p>
            <ol className="mt-4 space-y-3">
              {(course.plannedModules ?? []).map((module, i) => (
                <li key={module.id} className="flex items-center gap-4 rounded-xl border border-slate-800 bg-slate-900/40 px-5 py-3 opacity-60">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-800 text-xs font-bold text-slate-500">{i + 1}</span>
                  <span className="text-sm text-slate-400">{getLocalizedAcademyText(module.title, locale)}</span>
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        {!isAvailable ? (
          <div className="mt-8 space-y-6">
            <div className="rounded-2xl border border-amber-900/30 bg-amber-950/10 p-6">
              <h2 className="text-lg font-semibold text-amber-200">{t('comingSoonHeading')}</h2>
              <p className="mt-2 text-sm leading-6 text-amber-100/80">{t('comingSoonDescription')}</p>
            </div>

            {course.plannedModules && course.plannedModules.length > 0 ? (
              <section aria-labelledby="planned-curriculum-heading">
                <h2 id="planned-curriculum-heading" className="text-xl font-semibold text-white">{t('plannedCurriculum')}</h2>
                <ol className="mt-4 space-y-3">
                  {course.plannedModules.map((module, i) => (
                    <li key={module.id} className="flex items-center gap-4 rounded-xl border border-slate-800 bg-slate-900/40 px-5 py-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-800 text-xs font-bold text-slate-500">{i + 1}</span>
                      <span className="text-sm text-slate-300">{getLocalizedAcademyText(module.title, locale)}</span>
                    </li>
                  ))}
                </ol>
              </section>
            ) : null}

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
              <p className="text-sm font-semibold text-white">{t('browseGuideInstead')}</p>
              <Link href="/guide" className="mt-3 inline-flex items-center text-sm font-semibold text-cyan-300 hover:text-cyan-200">
                {t('browseGuideCta')} →
              </Link>
            </div>
          </div>
        ) : null}

        <div className="mt-10 border-t border-slate-800 pt-6">
          <Link href="/academy" className="inline-flex items-center text-sm font-semibold text-cyan-300 hover:text-cyan-200">
            {t('backToAcademy')}
          </Link>
        </div>
      </article>
    </main>
  );
}
