import type { MetadataRoute } from 'next';
import { listArticles } from '../lib/db/repository';
import { getSiteUrl } from '../lib/articles/site-url';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = await getSiteUrl();
  const { items } = await listArticles({ pageSize: 48 });
  const staticRoutes = ['', '/news-24-7', '/videos', '/replay-emissions', '/podcasts', '/programme-tv', '/canaux-tv', '/newsletters'].map((route) => ({
    url: `${base}${route}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: route ? 0.6 : 1,
  }));

  return [
    ...staticRoutes,
    ...items.map((article) => ({
      url: `${base}${article.shortId ? '/a/' + article.shortId : '/article/' + article.slug}`,
      lastModified: new Date(article.publishedAt ?? Date.now()),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
  ];
}
