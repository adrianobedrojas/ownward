'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import type { AcademyLesson } from '@/lib/academy-content';
import type { GuideArticle } from '@/lib/guide-content';

interface CoursePathProps {
  lessons: Array<{ lesson: AcademyLesson; article: GuideArticle; index: number; complete?: boolean }>;
  currentLessonId?: string;
}

export default function CoursePath({ lessons, currentLessonId }: CoursePathProps) {
  const t = useTranslations('Academy');
  return (
    <ol className="grid gap-3 md:grid-cols-2">
      {lessons.map(({ lesson, article, index, complete }) => (
        <li key={lesson.id} className={`rounded-2xl border p-4 ${complete ? 'border-cyan-800/40 bg-cyan-950/20' : 'border-slate-800 bg-slate-900/50'}`}>
          <div className="flex gap-3">
            <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${lesson.id === currentLessonId ? 'bg-cyan-400 text-slate-950' : complete ? 'bg-cyan-400/20 text-cyan-300' : 'bg-slate-800 text-slate-400'}`}>
              {index + 1}
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{article.readingTime}</p>
              <h3 className="mt-1 text-sm font-semibold text-white">{article.cardTitle ?? article.title}</h3>
              {article.learningOutcome ? (
                <p className="mt-1 text-sm leading-6 text-slate-300">{article.learningOutcome}</p>
              ) : null}
              <Link href={`/guide/${lesson.guideCategory}/${lesson.guideArticleSlug}`} className="mt-3 inline-flex text-sm font-semibold text-cyan-300 hover:text-cyan-200">
                {t('openLessonInline')}
              </Link>
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
