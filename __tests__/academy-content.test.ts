import {
  academyCourses,
  getAcademyCourse,
  getAvailableAcademyCourses,
  getLocalizedAcademyText,
  getAcademyLessonArticle,
  type AcademyCourse,
  type AcademyLesson,
} from '@/lib/academy-content';
import { getGuideArticle } from '@/lib/guide-content';

const ACADEMY_PROGRESS_STORAGE_KEY = 'ownward_academy_progress_v1';

interface AcademyProgressData {
  completedLessons: Record<string, string[]>;
  updatedAt: string;
}

function parseAcademyProgress(raw: string | null): AcademyProgressData {
  const empty: AcademyProgressData = { completedLessons: {}, updatedAt: '' };
  if (!raw) return empty;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return empty;
    const completedLessons: Record<string, string[]> = {};
    if (parsed.completedLessons && typeof parsed.completedLessons === 'object') {
      for (const [slug, ids] of Object.entries(parsed.completedLessons)) {
        if (Array.isArray(ids) && ids.every((id) => typeof id === 'string')) {
          completedLessons[slug] = ids;
        }
      }
    }
    return {
      completedLessons,
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : '',
    };
  } catch {
    return empty;
  }
}

function courseProgress(
  data: AcademyProgressData,
  course: AcademyCourse,
): { completed: number; total: number; percent: number } {
  const total = course.lessons?.length ?? 0;
  const completedIds = data.completedLessons[course.slug] ?? [];
  const uniqueCompleted = new Set(
    completedIds.filter((id) =>
      course.lessons?.some((l) => l.id === id),
    ),
  );
  const completed = uniqueCompleted.size;
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
  return { completed, total, percent };
}

describe('academy-content', () => {
  it('has unique course slugs', () => {
    const slugs = academyCourses.map((c) => c.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('has unique lesson IDs within each available course', () => {
    const available = academyCourses.filter((c) => c.status === 'available');
    for (const course of available) {
      const ids = (course.lessons ?? []).map((l) => l.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it('all available courses have at least 2 lessons', () => {
    const available = academyCourses.filter((c) => c.status === 'available');
    for (const course of available) {
      expect((course.lessons ?? []).length).toBeGreaterThanOrEqual(2);
    }
  });

  it('every available lesson references an existing Guide article', () => {
    const available = academyCourses.filter((c) => c.status === 'available');
    for (const course of available) {
      for (const lesson of course.lessons ?? []) {
        const article = getGuideArticle(lesson.guideCategory, lesson.guideArticleSlug);
        expect(article).toBeDefined();
      }
    }
  });

  it('no available course reuses the same Guide article twice', () => {
    const available = academyCourses.filter((c) => c.status === 'available');
    for (const course of available) {
      const keys = (course.lessons ?? []).map(
        (l) => `${l.guideCategory}/${l.guideArticleSlug}`,
      );
      expect(new Set(keys).size).toBe(keys.length);
    }
  });

  it('every course has EN and ES titles', () => {
    for (const course of academyCourses) {
      expect(typeof course.title.en).toBe('string');
      expect(course.title.en.length).toBeGreaterThan(0);
      expect(typeof course.title.es).toBe('string');
      expect(course.title.es.length).toBeGreaterThan(0);
    }
  });

  it('every course has EN and ES descriptions', () => {
    for (const course of academyCourses) {
      expect(typeof course.description.en).toBe('string');
      expect(course.description.en.length).toBeGreaterThan(0);
      expect(typeof course.description.es).toBe('string');
      expect(course.description.es.length).toBeGreaterThan(0);
    }
  });

  it('all coming-soon courses include plannedModules', () => {
    const comingSoon = academyCourses.filter((c) => c.status === 'coming-soon');
    expect(comingSoon.length).toBeGreaterThan(0);
    for (const course of comingSoon) {
      expect(Array.isArray(course.plannedModules)).toBe(true);
      expect((course.plannedModules ?? []).length).toBeGreaterThan(0);
    }
  });

  it('markets-foundations has an educational disclosure in EN and ES', () => {
    const course = getAcademyCourse('markets-foundations');
    expect(course).toBeDefined();
    expect(course?.disclosure?.en).toContain('Educational information only');
    expect(course?.disclosure?.es).toBeTruthy();
    expect((course?.disclosure?.es ?? '').length).toBeGreaterThan(0);
  });

  it('owner-life has a wellbeing disclosure in EN and ES', () => {
    const course = getAcademyCourse('owner-life');
    expect(course).toBeDefined();
    expect(course?.disclosure?.en).toContain('mental-health');
    expect(course?.disclosure?.es).toBeTruthy();
    expect((course?.disclosure?.es ?? '').length).toBeGreaterThan(0);
  });

  it('all courses have valid statuses and levels', () => {
    const validStatuses = new Set(['available', 'coming-soon']);
    const validLevels = new Set(['beginner', 'intermediate', 'advanced']);
    for (const course of academyCourses) {
      expect(validStatuses.has(course.status)).toBe(true);
      expect(validLevels.has(course.level)).toBe(true);
    }
  });

  it('getAcademyCourse returns the expected course for known slugs', () => {
    const sab = getAcademyCourse('start-a-business-foundations');
    expect(sab).toBeDefined();
    expect(sab?.slug).toBe('start-a-business-foundations');
    expect(sab?.status).toBe('available');

    const bf = getAcademyCourse('business-foundations');
    expect(bf).toBeDefined();
    expect(bf?.slug).toBe('business-foundations');
    expect(bf?.status).toBe('available');

    const bs = getAcademyCourse('buying-and-selling-a-business');
    expect(bs).toBeDefined();
    expect(bs?.slug).toBe('buying-and-selling-a-business');

    const ol = getAcademyCourse('owner-life');
    expect(ol).toBeDefined();
    expect(ol?.status).toBe('available');

    const mf = getAcademyCourse('markets-foundations');
    expect(mf).toBeDefined();
    expect(mf?.status).toBe('coming-soon');
  });

  it('getAcademyCourse returns undefined for an unknown slug', () => {
    expect(getAcademyCourse('not-a-real-course')).toBeUndefined();
    expect(getAcademyCourse('')).toBeUndefined();
  });

  // 14. start-a-business-foundations course exists and is available
  it('start-a-business-foundations is available and has the correct slug', () => {
    const course = getAcademyCourse('start-a-business-foundations');
    expect(course).toBeDefined();
    expect(course?.status).toBe('available');
    expect(course?.slug).toBe('start-a-business-foundations');
  });

  it('start-a-business-foundations has EN and ES title', () => {
    const course = getAcademyCourse('start-a-business-foundations');
    expect(course?.title.en.length).toBeGreaterThan(0);
    expect(course?.title.es.length).toBeGreaterThan(0);
  });

  it('start-a-business-foundations every lesson resolves to a real Guide article', () => {
    const course = getAcademyCourse('start-a-business-foundations');
    expect(course).toBeDefined();
    for (const lesson of course?.lessons ?? []) {
      const article = getGuideArticle(lesson.guideCategory, lesson.guideArticleSlug);
      expect(article).toBeDefined();
    }
  });

  it('start-a-business-foundations lesson IDs are unique', () => {
    const course = getAcademyCourse('start-a-business-foundations');
    const ids = (course?.lessons ?? []).map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  // getAvailableAcademyCourses
  it('getAvailableAcademyCourses returns only available courses', () => {
    const available = getAvailableAcademyCourses();
    for (const c of available) {
      expect(c.status).toBe('available');
    }
  });

  it('getLocalizedAcademyText returns EN text for "en" locale', () => {
    const text = { en: 'Hello', es: 'Hola' };
    expect(getLocalizedAcademyText(text, 'en')).toBe('Hello');
  });

  it('getLocalizedAcademyText returns ES text for "es" locale', () => {
    const text = { en: 'Hello', es: 'Hola' };
    expect(getLocalizedAcademyText(text, 'es')).toBe('Hola');
  });

  it('getLocalizedAcademyText defaults to EN for unknown locale', () => {
    const text = { en: 'Hello', es: 'Hola' };
    expect(getLocalizedAcademyText(text, 'fr')).toBe('Hello');
  });

  it('planned modules now use localized titles', () => {
    const ownerLife = getAcademyCourse('owner-life');
    const markets = getAcademyCourse('markets-foundations');

    expect(ownerLife?.plannedModules?.[0]?.title.en).toBe('Working With Family Without Losing the Relationship');
    expect(ownerLife?.plannedModules?.[0]?.title.es).toBe('Trabajar con la familia sin perder la relación');
    expect(markets?.plannedModules?.[0]?.title.en).toBe('What a Stock Represents');
    expect(markets?.plannedModules?.[0]?.title.es).toBe('Qué representa una acción');
  });

  it('getAcademyLessonArticle returns the correct article', () => {
    const lesson: AcademyLesson = {
      id: 'business-operations',
      guideCategory: 'run',
      guideArticleSlug: 'business-operations-basics',
    };
    const article = getAcademyLessonArticle(lesson);
    expect(article).toBeDefined();
    expect(article?.slug).toBe('business-operations-basics');
  });

  it('getAcademyLessonArticle returns undefined for nonexistent article', () => {
    const lesson: AcademyLesson = {
      id: 'fake',
      guideCategory: 'run',
      guideArticleSlug: 'does-not-exist',
    };
    expect(getAcademyLessonArticle(lesson)).toBeUndefined();
  });
});

describe('academy progress parsing helpers', () => {
  it('storage key constant is correct', () => {
    expect(ACADEMY_PROGRESS_STORAGE_KEY).toBe('ownward_academy_progress_v1');
  });

  it('returns empty progress for null input (empty storage)', () => {
    const data = parseAcademyProgress(null);
    expect(data.completedLessons).toEqual({});
    expect(data.updatedAt).toBe('');
  });

  it('returns empty progress for empty string', () => {
    const data = parseAcademyProgress('');
    expect(data.completedLessons).toEqual({});
  });

  it('returns empty progress for malformed JSON', () => {
    const data = parseAcademyProgress('{ not json }');
    expect(data.completedLessons).toEqual({});
    expect(data.updatedAt).toBe('');
  });

  it('parses valid progress data correctly', () => {
    const raw = JSON.stringify({
      completedLessons: { 'business-foundations': ['business-operations', 'standard-operating-procedures'] },
      updatedAt: '2024-01-01T00:00:00.000Z',
    });
    const data = parseAcademyProgress(raw);
    expect(data.completedLessons['business-foundations']).toEqual([
      'business-operations',
      'standard-operating-procedures',
    ]);
    expect(data.updatedAt).toBe('2024-01-01T00:00:00.000Z');
  });

  it('ignores arrays with non-string elements', () => {
    const raw = JSON.stringify({
      completedLessons: { 'business-foundations': [1, 2, 3] },
      updatedAt: '',
    });
    const data = parseAcademyProgress(raw);
    expect(data.completedLessons['business-foundations']).toBeUndefined();
  });

  it('returns empty for unknown course slug in progress', () => {
    const raw = JSON.stringify({
      completedLessons: { 'not-a-course': ['some-lesson'] },
      updatedAt: '',
    });
    const data = parseAcademyProgress(raw);
    expect(data.completedLessons['not-a-course']).toEqual(['some-lesson']);
  });

  it('ignores unknown lesson IDs when calculating progress', () => {
    const raw = JSON.stringify({
      completedLessons: { 'business-foundations': ['unknown-lesson-id'] },
      updatedAt: '',
    });
    const data = parseAcademyProgress(raw);
    const course = getAcademyCourse('business-foundations')!;
    const progress = courseProgress(data, course);
    expect(progress.completed).toBe(0);
    expect(progress.total).toBe(4);
    expect(progress.percent).toBe(0);
  });

  it('calculates correct percentage', () => {
    const course = getAcademyCourse('business-foundations')!;
    const raw = JSON.stringify({
      completedLessons: {
        'business-foundations': ['business-operations', 'standard-operating-procedures'],
      },
      updatedAt: '',
    });
    const data = parseAcademyProgress(raw);
    const progress = courseProgress(data, course);
    expect(progress.completed).toBe(2);
    expect(progress.total).toBe(4);
    expect(progress.percent).toBe(50);
  });
});
