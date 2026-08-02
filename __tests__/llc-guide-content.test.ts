import { getGuideArticle } from '@/lib/guide-content';
import { getAcademyCourse } from '@/lib/academy-content';

const ARTICLE_CATEGORY = 'start';
const ARTICLE_SLUG = 'how-to-start-an-llc';
const LESSON_ID = 'form-an-llc';
const COURSE_SLUG = 'start-a-business-foundations';

describe('how-to-start-an-llc guide article', () => {
  it('resolves successfully via getGuideArticle', () => {
    const article = getGuideArticle(ARTICLE_CATEGORY, ARTICLE_SLUG);
    expect(article).toBeDefined();
  });

  it('has the correct category and slug', () => {
    const article = getGuideArticle(ARTICLE_CATEGORY, ARTICLE_SLUG);
    expect(article?.category).toBe('start');
    expect(article?.slug).toBe('how-to-start-an-llc');
  });

  it('has the correct title', () => {
    const article = getGuideArticle(ARTICLE_CATEGORY, ARTICLE_SLUG);
    expect(article?.title).toBe(
      'How to Start an LLC Without Mistaking Paperwork for a Business',
    );
  });

  it('has the correct cardTitle', () => {
    const article = getGuideArticle(ARTICLE_CATEGORY, ARTICLE_SLUG);
    expect(article?.cardTitle).toBe('How to Start an LLC');
  });

  it('has the correct publishedDate and lastReviewed', () => {
    const article = getGuideArticle(ARTICLE_CATEGORY, ARTICLE_SLUG);
    expect(article?.publishedDate).toBe('August 1, 2026');
    expect(article?.lastReviewed).toBe('August 1, 2026');
  });

  it('has a metadataDescription containing required SEO terms', () => {
    const article = getGuideArticle(ARTICLE_CATEGORY, ARTICLE_SLUG);
    const meta = article?.metadataDescription ?? '';
    expect(meta.toLowerCase()).toContain('how to start an llc');
    expect(meta.toLowerCase()).toContain('registered agent');
    expect(meta.toLowerCase()).toContain('articles of organization');
    expect(meta.toLowerCase()).toContain('operating agreement');
    expect(meta.toLowerCase()).toContain('ein');
    expect(meta.toLowerCase()).toContain('business bank account');
    expect(meta.length).toBeGreaterThan(0);
  });

  it('has a contentNotice that is educational and non-promotional', () => {
    const article = getGuideArticle(ARTICLE_CATEGORY, ARTICLE_SLUG);
    const notice = article?.contentNotice ?? '';
    expect(notice.length).toBeGreaterThan(0);
    expect(notice.toLowerCase()).toContain('general educational information');
    expect(notice.toLowerCase()).toContain('not legal');
  });

  it('has the correct CTA values', () => {
    const article = getGuideArticle(ARTICLE_CATEGORY, ARTICLE_SLUG);
    expect(article?.categoryCtaHref).toBe('/guide/start');
    expect(article?.categoryCtaLabel).toBe('Back to Start a Business');
    expect(article?.ownwardCtaHref).toBe('/start');
    expect(article?.ownwardCtaLabel).toBe('Build your startup plan');
  });

  it('has the correct checklistTitle', () => {
    const article = getGuideArticle(ARTICLE_CATEGORY, ARTICLE_SLUG);
    expect(article?.checklistTitle).toBe('LLC formation and activation checklist');
  });

  it('has a substantive introduction (at least 2 paragraphs)', () => {
    const article = getGuideArticle(ARTICLE_CATEGORY, ARTICLE_SLUG);
    expect(Array.isArray(article?.introduction)).toBe(true);
    expect((article?.introduction ?? []).length).toBeGreaterThanOrEqual(2);
    for (const para of article?.introduction ?? []) {
      expect(para.trim().length).toBeGreaterThan(0);
    }
  });

  it('has learning objectives (at least 3)', () => {
    const article = getGuideArticle(ARTICLE_CATEGORY, ARTICLE_SLUG);
    expect(Array.isArray(article?.learningObjectives)).toBe(true);
    expect((article?.learningObjectives ?? []).length).toBeGreaterThanOrEqual(3);
    for (const obj of article?.learningObjectives ?? []) {
      expect(obj.trim().length).toBeGreaterThan(0);
    }
  });

  it('has substantive sections (at least 10)', () => {
    const article = getGuideArticle(ARTICLE_CATEGORY, ARTICLE_SLUG);
    expect(Array.isArray(article?.sections)).toBe(true);
    expect((article?.sections ?? []).length).toBeGreaterThanOrEqual(10);
  });

  it('every section has a nonempty title and at least one paragraph', () => {
    const article = getGuideArticle(ARTICLE_CATEGORY, ARTICLE_SLUG);
    for (const section of article?.sections ?? []) {
      expect(section.title.trim().length).toBeGreaterThan(0);
      expect(Array.isArray(section.paragraphs)).toBe(true);
      expect(section.paragraphs.length).toBeGreaterThanOrEqual(1);
      for (const para of section.paragraphs) {
        expect(para.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('has a checklist with at least 10 items', () => {
    const article = getGuideArticle(ARTICLE_CATEGORY, ARTICLE_SLUG);
    expect(Array.isArray(article?.checklist)).toBe(true);
    expect((article?.checklist ?? []).length).toBeGreaterThanOrEqual(10);
    for (const item of article?.checklist ?? []) {
      expect(item.trim().length).toBeGreaterThan(0);
    }
  });

  it('has at least 6 official sources with unique URLs', () => {
    const article = getGuideArticle(ARTICLE_CATEGORY, ARTICLE_SLUG);
    const sources = article?.sources ?? [];
    expect(sources.length).toBeGreaterThanOrEqual(6);
    const urls = sources.map((s) => s.href);
    expect(new Set(urls).size).toBe(urls.length);
  });

  it('all source URLs use official government domains', () => {
    const article = getGuideArticle(ARTICLE_CATEGORY, ARTICLE_SLUG);
    const officialDomains = ['sba.gov', 'irs.gov', 'uspto.gov', 'fincen.gov'];
    for (const source of article?.sources ?? []) {
      const isOfficial = officialDomains.some((domain) =>
        source.href.includes(domain),
      );
      expect(isOfficial).toBe(true);
    }
  });

  it('sources include IRS, SBA, USPTO, and FinCEN', () => {
    const article = getGuideArticle(ARTICLE_CATEGORY, ARTICLE_SLUG);
    const hrefs = (article?.sources ?? []).map((s) => s.href);
    expect(hrefs.some((h) => h.includes('irs.gov'))).toBe(true);
    expect(hrefs.some((h) => h.includes('sba.gov'))).toBe(true);
    expect(hrefs.some((h) => h.includes('uspto.gov'))).toBe(true);
    expect(hrefs.some((h) => h.includes('fincen.gov'))).toBe(true);
  });

  it('contains the current domestic-entity BOI exemption language', () => {
    const article = getGuideArticle(ARTICLE_CATEGORY, ARTICLE_SLUG);
    const fullText = JSON.stringify(article);
    expect(fullText.toLowerCase()).toContain('exempt from federal boi reporting');
    expect(fullText.toLowerCase()).toContain('march 2025 interim final rule');
  });

  it('warns readers to verify current FinCEN guidance', () => {
    const article = getGuideArticle(ARTICLE_CATEGORY, ARTICLE_SLUG);
    const fullText = JSON.stringify(article);
    expect(fullText.toLowerCase()).toContain('verify the current fincen guidance');
  });
});

describe('how-to-start-an-llc academy integration', () => {
  it('the Academy lesson resolves to the new guide article', () => {
    const course = getAcademyCourse(COURSE_SLUG);
    const lesson = (course?.lessons ?? []).find((l) => l.id === LESSON_ID);
    expect(lesson).toBeDefined();
    const article = getGuideArticle(lesson!.guideCategory, lesson!.guideArticleSlug);
    expect(article).toBeDefined();
    expect(article?.slug).toBe(ARTICLE_SLUG);
  });

  it('the form-an-llc lesson appears after startup-costs', () => {
    const course = getAcademyCourse(COURSE_SLUG);
    const lessons = course?.lessons ?? [];
    const startupCostsIdx = lessons.findIndex((l) => l.id === 'startup-costs');
    const formLlcIdx = lessons.findIndex((l) => l.id === LESSON_ID);
    expect(startupCostsIdx).toBeGreaterThanOrEqual(0);
    expect(formLlcIdx).toBeGreaterThan(startupCostsIdx);
  });

  it('the form-an-llc lesson appears before launch-checklist', () => {
    const course = getAcademyCourse(COURSE_SLUG);
    const lessons = course?.lessons ?? [];
    const formLlcIdx = lessons.findIndex((l) => l.id === LESSON_ID);
    const launchIdx = lessons.findIndex((l) => l.id === 'launch-checklist');
    expect(formLlcIdx).toBeGreaterThanOrEqual(0);
    expect(launchIdx).toBeGreaterThan(formLlcIdx);
  });

  it('the course has the updated estimatedMinutes of 56', () => {
    const course = getAcademyCourse(COURSE_SLUG);
    expect(course?.estimatedMinutes).toBe(56);
  });

  it('the course description mentions formation', () => {
    const course = getAcademyCourse(COURSE_SLUG);
    expect(course?.description.en.toLowerCase()).toContain('formation');
    expect(course?.description.es.toLowerCase()).toContain('formación');
  });
});

describe('no duplicate lesson IDs or article slugs in start-a-business-foundations', () => {
  it('lesson IDs within the course are unique', () => {
    const course = getAcademyCourse(COURSE_SLUG);
    const ids = (course?.lessons ?? []).map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('article slugs within the course are unique', () => {
    const course = getAcademyCourse(COURSE_SLUG);
    const slugs = (course?.lessons ?? []).map(
      (l) => `${l.guideCategory}/${l.guideArticleSlug}`,
    );
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});
