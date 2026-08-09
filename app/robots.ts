import type { MetadataRoute } from 'next';
// Disallow coverage includes '/api/', '/dashboard', '/check-email', and '/es/dashboard' via the shared SEO helper.
import { createRobots } from '@/lib/seo';

export default function robots(): MetadataRoute.Robots {
  return createRobots();
}
