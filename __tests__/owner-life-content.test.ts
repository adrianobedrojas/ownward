import {
  getGuideArticle,
  getGuideArticlesByCategory,
  getGuideCategory,
  guideArticles,
  guideCategoryContent,
} from '@/lib/guide-content';
import { getAcademyCourse } from '@/lib/academy-content';

describe('owner-life guide content', () => {
  it('adds the owner-life category in guide content', () => {
    expect(guideCategoryContent['owner-life']).toBeDefined();
    expect(guideCategoryContent['owner-life'].title).toBe('Owner Life');
    expect(guideCategoryContent['owner-life'].description).toContain('pressure');
    expect(Object.keys(guideCategoryContent)).toEqual([
      'run',
      'grow',
      'value',
      'sell',
      'buy',
      'owner-life',
      'stories',
      'resources',
    ]);
  });

  it('returns owner-life category metadata through helper', () => {
    const category = getGuideCategory('owner-life');
    expect(category).not.toBeNull();
    expect(category?.title).toBe('Owner Life');
    expect(category?.description).toContain('relationships');
  });

  it('includes the two published owner-life articles', () => {
    const articles = getGuideArticlesByCategory('owner-life');
    expect(articles).toHaveLength(2);
    expect(articles.map((article) => article.slug)).toEqual([
      'when-everything-feels-urgent',
      'love-is-not-governance',
    ]);
  });

  it('configures the urgency article with rich content and tool metadata', () => {
    const article = getGuideArticle('owner-life', 'when-everything-feels-urgent');
    expect(article).toBeDefined();
    expect(article?.category).toBe('owner-life');
    expect(article?.cardTitle).toBe('When Everything Feels Urgent');
    expect(article?.readingTime).toBe('9 min read');
    expect(article?.publishedDate).toBe('July 31, 2026');
    expect(article?.lastReviewed).toBe('July 31, 2026');
    expect(article?.interactiveTool).toBe('urgency-triage');
    expect(article?.contentNotice).toContain('not a substitute');
    expect(article?.learningObjectives).toHaveLength(4);
    expect(article?.reflectionPrompts).toHaveLength(3);
    expect(article?.checklist).toHaveLength(6);
    expect(article?.sections).toHaveLength(5);
    expect(article?.sections[1]?.bullets).toHaveLength(5);
    expect(article?.sections[2]?.steps).toHaveLength(4);
    expect(article?.sources).toHaveLength(2);
    expect(article?.sourceNotice).toBe('Review the original sources below and verify time-sensitive information before relying on it.');
    expect(article?.categoryCtaHref).toBe('/guide/owner-life');
    expect(article?.ownwardCtaHref).toBe('/academy/owner-life');
  });

  it('configures the governance article with family-business learning structure', () => {
    const article = getGuideArticle('owner-life', 'love-is-not-governance');
    expect(article).toBeDefined();
    expect(article?.category).toBe('owner-life');
    expect(article?.cardTitle).toBe('Love Is Not Governance');
    expect(article?.readingTime).toBe('10 min read');
    expect(article?.publishedDate).toBe('July 31, 2026');
    expect(article?.lastReviewed).toBe('July 31, 2026');
    expect(article?.contentNotice).toContain('family counseling');
    expect(article?.learningObjectives).toHaveLength(4);
    expect(article?.reflectionPrompts).toHaveLength(3);
    expect(article?.checklist).toHaveLength(7);
    expect(article?.sections).toHaveLength(5);
    expect(article?.sections[1]?.bullets).toHaveLength(7);
    expect(article?.sections[2]?.bullets).toHaveLength(5);
    expect(article?.interactiveTool).toBeUndefined();
    expect(article?.categoryCtaLabel).toBe('Back to Owner Life');
    expect(article?.ownwardCtaLabel).toBe('Continue in Owner Life course');
  });

  it('adds the SBA source notice directly on the article', () => {
    const article = getGuideArticle('buy', 'sba-loan-qualification');
    expect(article).toBeDefined();
    expect(article?.interactiveTool).toBe('sba-readiness');
    expect(article?.sourceNotice).toBe('SBA policy and lender requirements can change. Verify the applicable rules with an SBA-participating lender before making a financial or relocation decision.');
  });

  it('publishes owner-life as an available academy course with matching lessons', () => {
    const course = getAcademyCourse('owner-life');
    expect(course).toBeDefined();
    expect(course?.status).toBe('available');
    expect(course?.estimatedMinutes).toBe(24);
    expect(course?.lessons).toHaveLength(2);
    expect(course?.lessons?.[0]).toEqual({
      id: 'everything-feels-urgent',
      guideCategory: 'owner-life',
      guideArticleSlug: 'when-everything-feels-urgent',
    });
    expect(course?.lessons?.[1]).toEqual({
      id: 'love-is-not-governance',
      guideCategory: 'owner-life',
      guideArticleSlug: 'love-is-not-governance',
    });
    expect(course?.plannedModules).toHaveLength(4);
    expect(course?.plannedModules?.map((module) => module.id)).toEqual([
      'working-with-family',
      'business-not-identity',
      'learning-in-public',
      'decisions-under-uncertainty',
    ]);
  });

  it('keeps new owner-life articles in the global article registry', () => {
    const slugs = guideArticles.map((article) => article.slug);
    expect(slugs).toContain('when-everything-feels-urgent');
    expect(slugs).toContain('love-is-not-governance');
    expect(slugs.indexOf('when-everything-feels-urgent')).toBeLessThan(slugs.indexOf('love-is-not-governance'));
  });
});
