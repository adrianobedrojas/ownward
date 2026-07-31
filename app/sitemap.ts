import type { MetadataRoute } from "next";
import { guideArticles } from "@/lib/guide-content";

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const routes = [
    "",
    "/buy",
    "/sell",
    "/guide",
    "/pricing",
    "/privacy",
    "/privacy-choices",
    "/login",
    "/signup",
    "/documents",
    "/upload",
  ];

  const staticRoutes: MetadataRoute.Sitemap = routes.map((route) => ({
    url: `${siteUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: route === "" ? 1 : 0.7,
  }));

  const articleRoutes: MetadataRoute.Sitemap = guideArticles.map((article) => ({
    url: `${siteUrl}/guide/${article.category}/${article.slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [...staticRoutes, ...articleRoutes];
}
