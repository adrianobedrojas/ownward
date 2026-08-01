import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { notFound } from 'next/navigation';
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
  const isAvailable = course.status === 'available';

  const levelLabel =
    course.level === 'intermediate'
      ? t('levelIntermediate')
      : course.level === 'advanced'
        ? t('levelAdvanced')
        : t('levelBeginner');

  const statusLabel = isAvailable ? t('statusAvailable') : t('statusComingSoon');

  // Resolve lesson articles for available courses
  const lessonsWithArticles = isAvailable
    ? (course.lessons ?? []).flatMap((lesson, index) => {
        const article = getAcademyLessonArticle(lesson);
        if (!article) return [];
        return [{ lesson, article, index }];
      })
    : [];

  return (
    <main className="mx-auto max-w-4xl px-4 py-12 text-slate-100 sm:px-6">
      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-2 text-sm text-slate-400">
        <Link href="/academy" className="hover:text-white transition">{t('breadcrumbAcademy')}</Link>
        <span aria-hidden="true">›</span>
        <span className="text-slate-200">{title}</span>
      </nav>

      <article>
        {/* Header */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                isAvailable
                  ? 'bg-cyan-400/10 text-cyan-300'
                  : 'bg-amber-400/10 text-amber-300'
              }`}
            >
              {statusLabel}
            </span>
            <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-xs font-medium text-slate-400">
              {levelLabel}
            </span>
          </div>

          <h1 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">{title}</h1>
          <p className="mt-3 text-base leading-7 text-slate-300">{description}</p>

          {isAvailable && course.estimatedMinutes ? (
            <p className="mt-3 text-sm text-slate-400">
              {t('estimatedTime', { minutes: course.estimatedMinutes })}
              {' · '}
              {t('lessonCount', { count: lessonsWithArticles.length })}
            </p>
          ) : null}

          {!isAvailable && course.plannedModules ? (
            <p className="mt-3 text-sm text-slate-400">
              {t('moduleCount', { count: course.plannedModules.length })}
            </p>
          ) : null}
        </div>

        {/* Available course: progress + lessons */}
        {isAvailable ? (
          <div className="mt-8">
            <CourseProgressPanel
              course={course}
              lessons={lessonsWithArticles}
              locale={locale}
            />
          </div>
        ) : null}

        {/* Coming-soon course */}
        {!isAvailable ? (
          <div className="mt-8 space-y-6">
            {/* Coming soon notice */}
            <div className="rounded-2xl border border-amber-900/30 bg-amber-950/10 p-6">
              <h2 className="text-lg font-semibold text-amber-200">{t('comingSoonHeading')}</h2>
              <p className="mt-2 text-sm leading-6 text-amber-100/80">{t('comingSoonDescription')}</p>
            </div>

            {/* Planned modules */}
            {course.plannedModules && course.plannedModules.length > 0 ? (
              <section aria-labelledby="planned-curriculum-heading">
                <h2 id="planned-curriculum-heading" className="text-xl font-semibold text-white">
                  {t('plannedCurriculum')}
                </h2>
                <ol className="mt-4 space-y-3">
                  {course.plannedModules.map((module, i) => (
                    <li
                      key={module.id}
                      className="flex items-center gap-4 rounded-xl border border-slate-800 bg-slate-900/40 px-5 py-3"
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-800 text-xs font-bold text-slate-500">
                        {i + 1}
                      </span>
                      <span className="text-sm text-slate-300">{module.title}</span>
                    </li>
                  ))}
                </ol>
              </section>
            ) : null}

            {/* Disclosure */}
            {course.disclosure ? (
              <aside
                aria-label={t('disclosureLabel')}
                className="rounded-xl border border-slate-700 bg-slate-900/40 p-4 text-sm leading-6 text-slate-400"
              >
                <p className="font-semibold text-slate-300">{t('disclosureLabel')}</p>
                <p className="mt-1">{getLocalizedAcademyText(course.disclosure, locale)}</p>
              </aside>
            ) : null}

            {/* Guide CTA */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
              <p className="text-sm font-semibold text-white">{t('browseGuideInstead')}</p>
              <Link href="/guide" className="mt-3 inline-flex items-center text-sm font-semibold text-cyan-300 hover:text-cyan-200">
                {t('browseGuideCta')} →
              </Link>
            </div>
          </div>
        ) : null}

        {/* Back link */}
        <div className="mt-10 border-t border-slate-800 pt-6">
          <Link href="/academy" className="inline-flex items-center text-sm font-semibold text-cyan-300 hover:text-cyan-200">
            {t('backToAcademy')}
          </Link>
        </div>
      </article>
    </main>
  );
}
