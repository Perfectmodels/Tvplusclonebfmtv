import type { MetadataRoute } from 'next';
import { listArticles, getCategories, getPrograms } from '../lib/db/repository';
import { getSiteUrl } from '../lib/articles/site-url';
import { categoryHref } from '../lib/categories';
import { articlePath } from '../lib/articles/urls';

export const revalidate = 3600;
const PAGE_SIZE = 200;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = await getSiteUrl();
  const [{ data: categories }, { data: programs }] = await Promise.all([
    getCategories(), getPrograms(),
  ]);

  // Ne pas limiter le sitemap aux 48 premiers articles.
  const articles: Awaited<ReturnType<typeof listArticles>>['items'] = [];
  for (let page = 1; page <= 250; page++) {
    const { items } = await listArticles({ page, pageSize: PAGE_SIZE });
    articles.push(...items);
    if (items.length < PAGE_SIZE) break;
  }

  const staticRoutes = [
    '', '/news-24-7', '/direct', '/videos', '/replay-emissions', '/replays',
    '/podcasts', '/programme-tv', '/newsletters',
  ].map((route) => ({
    url: `${base}${route}`,
    changeFrequency: 'daily' as const,
    priority: route ? 0.6 : 1,
  }));

  return [
    ...staticRoutes,
    ...categories.map((name) => ({
      url: `${base}${categoryHref(name)}`,
      changeFrequency: 'daily' as const,
      priority: 0.7,
    })),
    ...programs.filter((program) => program.slug).map((program) => ({
      url: `${base}/emissions/${program.slug}`,
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    })),
    ...articles.map((article) => ({
      url: `${base}${articlePath(article)}`,
      lastModified: article.updatedAt || article.publishedAt ? new Date(article.updatedAt ?? article.publishedAt!) : undefined,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
  ];
}
