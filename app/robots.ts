import type { MetadataRoute } from 'next';
import { getSiteUrl } from '../lib/articles/site-url';

export default async function robots(): Promise<MetadataRoute.Robots> {
  const base = await getSiteUrl();
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/api/', '/compte/', '/connexion', '/inscription'],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
