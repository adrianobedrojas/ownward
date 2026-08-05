import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        '/api/',
        '/auth/',
        '/login',
        '/signup',
        '/check-email',
        '/confirm-email',
        '/forgot-password',
        '/reset-password',
        '/dashboard',
        '/settings',
        '/messages',
        '/documents',
        '/upload',
        '/account/',
        '/onboarding',
        '/es/login',
        '/es/signup',
        '/es/check-email',
        '/es/confirm-email',
        '/es/forgot-password',
        '/es/reset-password',
        '/es/dashboard',
        '/es/settings',
        '/es/messages',
        '/es/documents',
        '/es/upload',
        '/es/account/',
        '/es/onboarding',
      ],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
