import type { MetadataRoute } from 'next';
import { guideArticles } from '@/lib/guide-content';
import { academyCourses } from '@/lib/academy-content';
import { routing } from '@/i18n/routing';

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const routes = [
    '',
    '/buy',
    '/sell',
    '/guide',
    '/academy',
    '/pricing',
    '/privacy',
    '/privacy-choices',
    '/login',
    '/signup',
    '/documents',
    '/upload',
    '/contact',
    '/terms',
  ];

  const localizedRoutes = routing.locales.flatMap((locale) =>
    routes.map((route) => {
      const prefix = locale === routing.defaultLocale ? '' : `/${locale}`;
      return {
        url: `${siteUrl}${prefix}${route}`,
        lastModified: new Date(),
        changeFrequency: 'weekly' as const,
        priority: route === '' ? 1 : 0.7,
      };
    }),
  );

  const articleRoutes = routing.locales.flatMap((locale) =>
    guideArticles.map((article) => ({
      url: `${siteUrl}${locale === routing.defaultLocale ? '' : `/${locale}`}/guide/${article.category}/${article.slug}`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
  );

  const academyCourseRoutes = routing.locales.flatMap((locale) =>
    academyCourses.map((course) => ({
      url: `${siteUrl}${locale === routing.defaultLocale ? '' : `/${locale}`}/academy/${course.slug}`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
  );

  return [...localizedRoutes, ...articleRoutes, ...academyCourseRoutes];
}
