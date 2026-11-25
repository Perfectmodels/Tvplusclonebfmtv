import type { MetadataRoute } from 'next';
import { listArticles, getCategories, getPrograms } from '../lib/db/repository';
import { getSiteUrl } from '../lib/articles/site-url';
import { categoryHref } from '../lib/categories';
import { articlePath } from '../lib/articles/urls';
import { absoluteUrl, validDate, isIndexable } from '../lib/seo/public-feeds';
import { GABON_PROVINCES } from '../lib/editor/countries';
import { unstable_cache } from 'next/cache';

export const revalidate = 3600;
const PAGE_SIZE = 200;
const cachedArticles = unstable_cache(async () => {
  const articles: Awaited<ReturnType<typeof listArticles>>['items'] = [];
  for (let page = 1; page <= 245; page++) {
    const result = await listArticles({page,pageSize:PAGE_SIZE});
    if (result.source === 'static') throw new Error('Source éditoriale indisponible');
    articles.push(...result.items);
    if (result.items.length < PAGE_SIZE || page * PAGE_SIZE >= result.total) break;
  }
  return articles;
}, ['seo-general-sitemap-v1'], {revalidate:3600,tags:['public-articles']});

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = await getSiteUrl();
  const [{ data: categories }, { data: programs }] = await Promise.all([
    getCategories(), getPrograms(),
  ]);

  const articles = await cachedArticles();

  const staticRoutes = [
    '', '/actualites', '/rubriques', '/direct', '/videos', '/replay-emissions', '/replays',
    '/podcasts', '/programme-tv', '/newsletters', '/reels', '/ligne-rouge', '/articles-video',
  ].map((route) => ({
    url: `${base}${route}`,
    changeFrequency: 'daily' as const,
    priority: route ? 0.6 : 1,
  }));

  const entries: MetadataRoute.Sitemap = [
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
    ...Array.from(new Set(articles.map(a=>a.countryCode).filter((code):code is string=>!!code&&/^[A-Z]{2}$/.test(code)))).map(code=>({url:base+'/pays/'+code.toLowerCase(),changeFrequency:'daily' as const})),
    ...GABON_PROVINCES.filter(p=>articles.some(a=>a.countryCode==='GA'&&a.province===p.value)).map(p=>({url:base+'/provinces/'+p.value,changeFrequency:'daily' as const})),
    ...articles.filter(article => isIndexable(article) && (!article.publishedAt || (validDate(article.publishedAt)?.getTime() ?? Infinity) <= Date.now())).map((article) => ({
      url: `${base}${articlePath(article)}`,
      lastModified: validDate(article.updatedAt ?? article.publishedAt),
      images: article.image ? [absoluteUrl(article.image, base)].filter((url): url is string => Boolean(url)) : undefined,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
  ];
  return Array.from(new Map(entries.map(entry => [entry.url, entry])).values()).slice(0, 50000);
}
