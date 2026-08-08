import fs from 'fs';
import path from 'path';
import {
  getGuideArticle,
  guideArticles,
  type GuideArticle,
  type GuideArticleVisualKind,
} from '@/lib/guide-content';
import {
  getAcademyCourse,
  getAcademyCoursesForArticle,
  getCourseLessonContext,
} from '@/lib/academy-content';
import {
  getArticleTableOfContents,
  searchGuideArticles,
} from '@/lib/guide-discovery';
import enMessages from '@/messages/en.json';
import esMessages from '@/messages/es.json';
const supportedVisualKinds = new Set<GuideArticleVisualKind>([
  'process',
  'timeline',
  'comparison',
  'decision-map',
  'matrix',
  'formula',
  'evidence-ladder',
  'scorecard',
]);

const highStakesSlugs = [
  'how-to-evaluate-a-business-before-you-buy',
  'how-much-is-my-business-worth',
  'sba-loan-qualification',
  'how-to-prepare-your-business-for-sale',
  'how-to-start-an-llc',
  'when-everything-feels-urgent',
  'love-is-not-governance',
];

function getArticleBySlug(slug: string) {
  const article = guideArticles.find((item) => item.slug === slug);
  expect(article).toBeDefined();
  return article as GuideArticle;
}

describe('guide learning experience data integrity', () => {
  it('keeps every category and slug combination unique', () => {
    const keys = guideArticles.map((article) => `${article.category}/${article.slug}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('keeps the published article inventory at 16 entries', () => {
    expect(guideArticles).toHaveLength(16);
  });
  
it('keeps Guide category numbering sequential in both locales', () => {
  const categoryOrder = [
    'start',
    'run',
    'grow',
    'value',
    'sell',
    'buy',
    'owner-life',
    'stories',
    'resources',
  ] as const;

  categoryOrder.forEach((category, index) => {
    const expectedPrefix = `${index + 1}. `;

    expect(enMessages.Guide.categories[category].name.startsWith(expectedPrefix)).toBe(true);
    expect(esMessages.Guide.categories[category].name.startsWith(expectedPrefix)).toBe(true);
  });
});
  
  it('every related article reference resolves', () => {
    for (const article of guideArticles) {
      for (const related of article.relatedArticles ?? []) {
        expect(getGuideArticle(related.category, related.slug)).toBeDefined();
      }
    }
  });

  it('every instructional and owner-life article has key takeaways and a visual', () => {
    for (const article of guideArticles) {
      if (article.articleKind === 'story') continue;
      expect(article.keyTakeaways?.length ?? 0).toBeGreaterThanOrEqual(3);
      expect(article.visuals?.length ?? 0).toBeGreaterThanOrEqual(1);
    }
  });

  it('story articles keep narrative-specific structure while gaining learning aids', () => {
    const story = getArticleBySlug('the-day-my-side-project-asked-for-paperwork');
    expect(story.articleKind).toBe('story');
    expect(story.introduction.length).toBeGreaterThanOrEqual(2);
    expect(story.keyTakeaways?.length ?? 0).toBeGreaterThanOrEqual(3);
    expect(story.visuals?.[0]?.kind).toBe('timeline');
  });

  it('visuals use supported kinds and include accessible labels', () => {
    for (const article of guideArticles) {
      for (const visual of article.visuals ?? []) {
        expect(supportedVisualKinds.has(visual.kind)).toBe(true);
        expect(visual.title.trim().length).toBeGreaterThan(0);
        expect(visual.caption.trim().length).toBeGreaterThan(0);
        expect(visual.accessibleLabel.trim().length).toBeGreaterThan(0);
        expect(visual.accessibleDescription.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('all external sources use HTTPS', () => {
    for (const article of guideArticles) {
      for (const source of article.sources ?? []) {
        expect(source.href.startsWith('https://')).toBe(true);
      }
    }
  });

  it('regulated or high-stakes articles contain an appropriate notice', () => {
    for (const slug of highStakesSlugs) {
      const article = getArticleBySlug(slug);
      const noticeCount = (article.importantNotices?.length ?? 0) + (article.contentNotice ? 1 : 0);
      expect(noticeCount).toBeGreaterThan(0);
    }
  });

  it('table-of-contents anchors are unique per article', () => {
    for (const article of guideArticles) {
      const ids = getArticleTableOfContents(article).map((item) => item.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it('guide search and filtering helpers return correct results', () => {
    expect(searchGuideArticles(guideArticles, 'llc', 'all').map((article) => article.slug)).toContain('how-to-start-an-llc');
    expect(searchGuideArticles(guideArticles, 'owner', 'owner-life').every((article) => article.category === 'owner-life')).toBe(true);
    expect(searchGuideArticles(guideArticles, 'not-a-real-topic', 'all')).toHaveLength(0);
  });

  it('academy course lookups resolve for guide article membership', () => {
    const llcCourses = getAcademyCoursesForArticle('start', 'how-to-start-an-llc');
    expect(llcCourses.map((course) => course.slug)).toContain('start-a-business-foundations');
    const context = getCourseLessonContext('owner-life', 'owner-life', 'when-everything-feels-urgent');
    expect(context?.nextLesson?.guideArticleSlug).toBe('love-is-not-governance');
  });

  it('markets foundations stays coming soon and owner life keeps exactly two published lessons and four upcoming modules', () => {
    const markets = getAcademyCourse('markets-foundations');
    const ownerLife = getAcademyCourse('owner-life');
    expect(markets?.status).toBe('coming-soon');
    expect(ownerLife?.lessons).toHaveLength(2);
    expect(ownerLife?.plannedModules).toHaveLength(4);
  });
});

describe('privacy boundaries stay in-memory for new guide interactions', () => {
  it('article checklist state is not persisted to localStorage or cookies', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'components/guide/ArticleChecklist.tsx'), 'utf8');
    expect(source).not.toContain('localStorage');
    expect(source).not.toContain('document.cookie');
    expect(source).not.toContain('navigator.sendBeacon');
  });

  it('guide explorer does not store or track search queries', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'components/guide/GuideExplorer.tsx'), 'utf8');
    expect(source).not.toContain('localStorage');
    expect(source).not.toContain('sessionStorage');
    expect(source).not.toContain('trackSearch');
    expect(source).not.toContain('analytics');
  });
});
