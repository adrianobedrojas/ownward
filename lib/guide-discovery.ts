import type { GuideArticle, GuideCategorySlug } from './guide-content';

export interface GuideSectionAnchor {
  id: string;
  title: string;
}

const CATEGORY_ORDER: GuideCategorySlug[] = [
  'start',
  'run',
  'grow',
  'value',
  'buy',
  'sell',
  'owner-life',
  'stories',
  'resources',
];

const ARTICLE_ORDER: Record<GuideCategorySlug, string[]> = {
  start: [
    'validate-a-business-idea',
    'choose-a-business-model-and-first-offer',
    'write-a-one-page-business-plan',
    'estimate-startup-costs-and-pricing',
    'how-to-start-an-llc',
    'business-launch-checklist',
  ],
  run: ['business-operations-basics', 'how-to-create-standard-operating-procedures'],
  grow: ['identify-most-profitable-customers'],
  value: ['how-much-is-my-business-worth'],
  buy: ['how-to-evaluate-a-business-before-you-buy', 'sba-loan-qualification'],
  sell: ['how-to-prepare-your-business-for-sale'],
  'owner-life': ['when-everything-feels-urgent', 'love-is-not-governance'],
  stories: ['the-day-my-side-project-asked-for-paperwork'],
  resources: [],
};

export function getGuideHref(article: Pick<GuideArticle, 'category' | 'slug'>) {
  return `/guide/${article.category}/${article.slug}`;
}

export function slugifyGuideHeading(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function getArticleTableOfContents(article: Pick<GuideArticle, 'sections'>): GuideSectionAnchor[] {
  const seen = new Map<string, number>();
  return article.sections.map((section) => {
    const base = slugifyGuideHeading(section.title) || 'section';
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    return {
      id: count === 0 ? base : `${base}-${count + 1}`,
      title: section.title,
    };
  });
}

export function orderGuideArticles<T extends GuideArticle>(articles: T[]) {
  return [...articles].sort((a, b) => {
    const categoryDifference = CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category);
    if (categoryDifference !== 0) return categoryDifference;
    const order = ARTICLE_ORDER[a.category];
    return order.indexOf(a.slug) - order.indexOf(b.slug);
  });
}

export function searchGuideArticles<T extends GuideArticle>(
  articles: T[],
  query: string,
  category: GuideCategorySlug | 'all' = 'all',
) {
  const normalized = query.trim().toLowerCase();
  return orderGuideArticles(
    articles.filter((article) => {
      if (category !== 'all' && article.category !== category) return false;
      if (!normalized) return true;
      const haystack = [article.title, article.cardTitle, article.description, article.learningOutcome]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(normalized);
    }),
  );
}

export function getRecommendedStartingArticle<T extends GuideArticle>(articles: T[], category: GuideCategorySlug) {
  return orderGuideArticles(articles.filter((article) => article.category === category))[0];
}
