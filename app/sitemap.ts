import type { MetadataRoute } from 'next';
// Static public routes intentionally include '/business-idea-readiness-check'.
import { academyCourses } from '@/lib/academy-content';
import { getCatalogSolutions } from '@/lib/commerce/products';
import { guideArticles } from '@/lib/guide-content';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  PUBLIC_STATIC_PATHS,
  createSitemapAlternates,
  getAbsoluteUrl,
  isSolutionIndexable,
  shouldExposeSpanishListing,
} from '@/lib/seo';

type BlogSitemapRow = {
  slug: string;
  created_at: string | null;
  updated_at: string | null;
};

type ListingSitemapRow = {
  slug: string;
  published_at: string | null;
  headline_es: string | null;
  summary_es: string | null;
  highlights_es: string | null;
  growth_opportunities_es: string | null;
  reason_for_selling_es: string | null;
};

function toDate(value: string | null | undefined) {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

export function buildStaticSitemapEntries(): MetadataRoute.Sitemap {
  return PUBLIC_STATIC_PATHS.flatMap((pathname) => {
    const path = pathname || '';
    return [
      {
        url: getAbsoluteUrl(path, 'en'),
        alternates: createSitemapAlternates(path),
      },
      {
        url: getAbsoluteUrl(path, 'es'),
        alternates: createSitemapAlternates(path),
      },
    ];
  });
}

export function buildGuideSitemapEntries(): MetadataRoute.Sitemap {
  return guideArticles.flatMap((article) => {
    const pathname = `/guide/${article.category}/${article.slug}`;
    const lastModified = toDate(article.lastReviewed ?? article.publishedDate);
    return [
      {
        url: getAbsoluteUrl(pathname, 'en'),
        alternates: createSitemapAlternates(pathname),
        ...(lastModified ? { lastModified } : {}),
      },
      {
        url: getAbsoluteUrl(pathname, 'es'),
        alternates: createSitemapAlternates(pathname),
        ...(lastModified ? { lastModified } : {}),
      },
    ];
  });
}

export function buildAcademySitemapEntries(): MetadataRoute.Sitemap {
  return academyCourses
    .filter((course) => course.status === 'available')
    .flatMap((course) => {
      const pathname = `/academy/${course.slug}`;
      return [
        {
          url: getAbsoluteUrl(pathname, 'en'),
          alternates: createSitemapAlternates(pathname),
        },
        {
          url: getAbsoluteUrl(pathname, 'es'),
          alternates: createSitemapAlternates(pathname),
        },
      ];
    });
}

export function buildSolutionSitemapEntries(): MetadataRoute.Sitemap {
  return getCatalogSolutions()
    .filter((solution) => isSolutionIndexable(solution.status))
    .flatMap((solution) => {
      const pathname = `/solutions/${solution.slug}`;
      return [
        {
          url: getAbsoluteUrl(pathname, 'en'),
          alternates: createSitemapAlternates(pathname),
        },
        {
          url: getAbsoluteUrl(pathname, 'es'),
          alternates: createSitemapAlternates(pathname),
        },
      ];
    });
}

export function buildBlogSitemapEntries(posts: BlogSitemapRow[]): MetadataRoute.Sitemap {
  return posts.flatMap((post) => {
    const pathname = `/blog/${post.slug}`;
    const lastModified = toDate(post.updated_at ?? post.created_at);
    return [
      {
        url: getAbsoluteUrl(pathname, 'en'),
        alternates: createSitemapAlternates(pathname),
        ...(lastModified ? { lastModified } : {}),
      },
      {
        url: getAbsoluteUrl(pathname, 'es'),
        alternates: createSitemapAlternates(pathname),
        ...(lastModified ? { lastModified } : {}),
      },
    ];
  });
}

export function buildListingSitemapEntries(listings: ListingSitemapRow[]): MetadataRoute.Sitemap {
  return listings.flatMap((listing) => {
    const pathname = `/b/${listing.slug}`;
    const lastModified = toDate(listing.published_at);
    const hasSpanishContent = shouldExposeSpanishListing([
      listing.headline_es,
      listing.summary_es,
      listing.highlights_es,
      listing.growth_opportunities_es,
      listing.reason_for_selling_es,
    ]);

    const englishAlternates = {
      languages: hasSpanishContent
        ? {
            en: getAbsoluteUrl(pathname, 'en'),
            es: getAbsoluteUrl(pathname, 'es'),
          }
        : {
            en: getAbsoluteUrl(pathname, 'en'),
          },
    };

    const entries: MetadataRoute.Sitemap = [
      {
        url: getAbsoluteUrl(pathname, 'en'),
        alternates: englishAlternates,
        ...(lastModified ? { lastModified } : {}),
      },
    ];

    if (hasSpanishContent) {
      entries.push({
        url: getAbsoluteUrl(pathname, 'es'),
        alternates: englishAlternates,
        ...(lastModified ? { lastModified } : {}),
      });
    }

    return entries;
  });
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let posts: BlogSitemapRow[] = [];
  let listings: ListingSitemapRow[] = [];

  try {
    const adminClient = createAdminClient();
    const [{ data: postRows }, { data: listingRows }] = await Promise.all([
      adminClient
        .from('posts')
        .select('slug, created_at, updated_at')
        .eq('published', true),
      adminClient
        .from('business_listing_public_detail')
        .select('slug, published_at, headline_es, summary_es, highlights_es, growth_opportunities_es, reason_for_selling_es'),
    ]);

    posts = (postRows ?? []) as BlogSitemapRow[];
    listings = (listingRows ?? []) as ListingSitemapRow[];
  } catch {
    posts = [];
    listings = [];
  }

  return [
    ...buildStaticSitemapEntries(),
    ...buildGuideSitemapEntries(),
    ...buildAcademySitemapEntries(),
    ...buildSolutionSitemapEntries(),
    ...buildBlogSitemapEntries(posts),
    ...buildListingSitemapEntries(listings),
  ];
}
