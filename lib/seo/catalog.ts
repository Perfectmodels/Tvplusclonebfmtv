import 'server-only';
import { unstable_cache } from 'next/cache';
import { listArticles } from '../db/repository';

export const sitemapPageSize = 200;
export const seoArticles = unstable_cache(
  async (page: number) => listArticles({ page, pageSize: sitemapPageSize }),
  ['seo-public-catalog-v1'], { revalidate: 120, tags: ['public-articles'] },
);

export async function recentSeoArticles() {
  const { items } = await seoArticles(1);
  return items;
}
