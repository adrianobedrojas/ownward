import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import {
  academyCourses,
  getLocalizedAcademyText,
  type AcademyCourse,
} from '@/lib/academy-content';

interface AcademyPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: AcademyPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Metadata' });
  return { title: t('academy.title'), description: t('academy.description') };
}

function levelLabel(level: AcademyCourse['level'], t: ReturnType<typeof getTranslations> extends Promise<infer U> ? U : never) {
  if (level === 'intermediate') return t('levelIntermediate');
  if (level === 'advanced') return t('levelAdvanced');
  return t('levelBeginner');
}

export default async function AcademyPage({ params }: AcademyPageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Academy' });

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 text-slate-100 sm:px-6">
      <div className="max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">{t('heroBadge')}</p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-white sm:text-5xl">{t('heroTitle')}</h1>
        <p className="mt-4 text-lg leading-7 text-slate-300">{t('heroDescription')}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <a href="#courses" className="inline-flex items-center rounded-lg bg-cyan-400 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300">
            {t('explorePathsCta')}
          </a>
          <Link href="/guide" className="inline-flex items-center rounded-lg border border-slate-700 px-5 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-slate-600 hover:text-white">
            {t('browseGuideCta')}
          </Link>
        </div>
      </div>

      <section className="mt-16" aria-labelledby="guide-vs-academy-heading">
        <h2 id="guide-vs-academy-heading" className="text-2xl font-bold text-white">{t('guideVsAcademyTitle')}</h2>
        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <div className="flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
            <div>
              <h3 className="text-lg font-semibold text-white">{t('guideCardTitle')}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-300">{t('guideCardDescription')}</p>
            </div>
            <div className="mt-6">
              <Link href="/guide" className="inline-flex items-center text-sm font-semibold text-cyan-300 hover:text-cyan-200">
                {t('guideCardCta')} →
              </Link>
            </div>
          </div>
          <div className="flex flex-col justify-between rounded-2xl border border-cyan-800/40 bg-cyan-950/20 p-6">
            <div>
              <h3 className="text-lg font-semibold text-white">{t('academyCardTitle')}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-300">{t('academyCardDescription')}</p>
            </div>
            <div className="mt-6">
              <span className="text-sm font-semibold text-cyan-400">{t('academyCardCta')}</span>
            </div>
          </div>
        </div>
      </section>

      <section id="courses" className="mt-16" aria-labelledby="courses-heading">
        <h2 id="courses-heading" className="text-2xl font-bold text-white">{t('coursesTitle')}</h2>
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          {academyCourses.map((course) => {
            const title = getLocalizedAcademyText(course.title, locale);
            const description = getLocalizedAcademyText(course.description, locale);
            const isAvailable = course.status === 'available';
            const statusLabel = isAvailable ? t('statusAvailable') : t('statusComingSoon');
            const lessonCount = course.lessons?.length ?? 0;
            const moduleCount = course.plannedModules?.length ?? 0;
            const cta = isAvailable ? t('viewPath') : t('previewCurriculum');

            return (
              <article
                key={course.slug}
                className={`flex flex-col justify-between rounded-2xl border p-6 transition ${
                  isAvailable
                    ? 'border-slate-800 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-900'
                    : 'border-amber-900/30 bg-amber-950/10 opacity-90'
                }`}
              >
                <div>
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
                      {levelLabel(course.level, t)}
                    </span>
                  </div>
                  <h3 className="mt-3 text-lg font-semibold text-white">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{description}</p>

                  <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
                    {isAvailable ? (
                      <>
                        <span>{t('lessonCount', { count: lessonCount })}</span>
                        {course.estimatedMinutes ? (
                          <span>{t('estimatedTime', { minutes: course.estimatedMinutes })}</span>
                        ) : null}
                        {moduleCount > 0 ? (
                          <span>{t('upcomingModuleCount', { count: moduleCount })}</span>
                        ) : null}
                      </>
                    ) : (
                      <span>{t('moduleCount', { count: moduleCount })}</span>
                    )}
                  </div>
                </div>

                <div className="mt-6 border-t border-slate-800/60 pt-4">
                  <Link
                    href={`/academy/${course.slug}`}
                    className={`inline-flex items-center text-sm font-semibold transition ${
                      isAvailable
                        ? 'text-cyan-300 hover:text-cyan-200'
                        : 'text-amber-300 hover:text-amber-200'
                    }`}
                  >
                    {cta} →
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
