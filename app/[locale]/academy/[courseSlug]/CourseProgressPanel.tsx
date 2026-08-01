'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import {
  useAcademyProgress,
  AcademyProgressBar,
  AcademyNoConsentNotice,
  LessonCompletionButton,
  ResetProgressControl,
} from '@/components/AcademyProgress';
import type { AcademyCourse, AcademyLesson } from '@/lib/academy-content';
import type { GuideArticle } from '@/lib/guide-content';

interface LessonWithArticle {
  lesson: AcademyLesson;
  article: GuideArticle;
  index: number;
}

interface CourseProgressPanelProps {
  course: AcademyCourse;
  lessons: LessonWithArticle[];
  locale: string;
}

function LessonCtaLabel(t: ReturnType<typeof useTranslations<'Academy'>>, completed: number, total: number) {
  if (completed === 0) return t('startLesson');
  if (completed < total) return t('continueLesson');
  return t('reviewLesson');
}

export function CourseProgressPanel({ course, lessons, locale }: CourseProgressPanelProps) {
  const t = useTranslations('Academy');
  const {
    hasFunctionalConsent,
    isReady,
    completed,
    total,
    percent,
    isLessonComplete,
    toggleLesson,
    confirming,
    startReset,
    confirmReset,
    cancelReset,
  } = useAcademyProgress(course);

  const isSpanish = locale === 'es';

  return (
    <div className="space-y-6">
      {/* Progress summary */}
      {hasFunctionalConsent ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm font-semibold text-white">
              {LessonCtaLabel(t, completed, total)}
            </span>
            {isReady && (
              <ResetProgressControl
                confirming={confirming}
                onStart={startReset}
                onConfirm={confirmReset}
                onCancel={cancelReset}
                hasFunctionalConsent={hasFunctionalConsent}
                isReady={isReady}
              />
            )}
          </div>
          {isReady && (
            <div className="mt-3">
              <AcademyProgressBar completed={completed} total={total} percent={percent} />
            </div>
          )}
        </div>
      ) : (
        <AcademyNoConsentNotice />
      )}

      {/* Spanish article notice */}
      {isSpanish && (
        <div className="rounded-xl border border-slate-700 bg-slate-900/40 p-4 text-sm text-slate-300">
          <p>{t('spanishArticleNotice')}</p>
          <Link href="/guide" locale="en" className="mt-2 inline-block text-xs font-semibold text-cyan-300 hover:text-cyan-200">
            {t('spanishArticleNoticeCta')} →
          </Link>
        </div>
      )}

      {/* Lessons list */}
      <ol className="space-y-4" aria-label="Course lessons">
        {lessons.map(({ lesson, article, index }) => {
          const isComplete = isLessonComplete(lesson.id);

          return (
            <li
              key={lesson.id}
              className={`rounded-2xl border p-5 transition ${
                isComplete
                  ? 'border-cyan-800/40 bg-cyan-950/20'
                  : 'border-slate-800 bg-slate-900/60'
              }`}
            >
              <div className="flex items-start gap-4">
                <span
                  className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    isComplete
                      ? 'bg-cyan-400 text-slate-950'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                  aria-hidden="true"
                >
                  {isComplete ? '✓' : index + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
                      {lesson.guideCategory}
                    </span>
                    {isComplete && (
                      <span className="rounded-full bg-cyan-400/10 px-2 py-0.5 text-xs font-semibold text-cyan-300">
                        {t('lessonCompleted')}
                      </span>
                    )}
                  </div>
                  <h3 className="mt-1 text-base font-semibold text-white">{article.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-300">{article.description}</p>
                  <p className="mt-1 text-xs text-slate-500">{article.readingTime}</p>

                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <Link
                      href={`/guide/${lesson.guideCategory}/${lesson.guideArticleSlug}`}
                      className="inline-flex items-center rounded-lg bg-cyan-400/10 px-3 py-1.5 text-xs font-semibold text-cyan-300 transition hover:bg-cyan-400/20 hover:text-cyan-200"
                      aria-label={`${t('lessonLinkLabel')}: ${article.title}`}
                    >
                      {t('lessonLinkLabel')} →
                    </Link>
                    <LessonCompletionButton
                      lessonId={lesson.id}
                      isComplete={isComplete}
                      onToggle={toggleLesson}
                      hasFunctionalConsent={hasFunctionalConsent}
                    />
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
