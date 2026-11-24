import 'server-only';
import { categorySlug } from '../categories';
import { relativeTime } from './format';
import type { PublicArticle } from './repository';

export const usesLwsCatalog = () => Boolean(process.env.LWS_EDITORIAL_API_URL);

async function read<T>(resource: string, filters: Record<string, string>, tags: string[]) {
  const url = new URL(process.env.LWS_EDITORIAL_API_URL!);
  url.search = new URLSearchParams({ resource, ...filters }).toString();
  const response = await fetch(url, { next: { revalidate: 60, tags }, signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error('Catalogue MySQL indisponible.');
  return await response.json() as T;
}

type Article = {
  id: string; slug: string; short_code: string; title: string; excerpt: string | null;
  category: string | null; cover_url: string | null; published_at: string; updated_at: string | null;
  featured: number; is_alert: number; is_video_article: number; tags_json: string | null;
  seo_title: string | null; seo_description: string | null; country_code: string;
  content_html?: string; cover_alt?: string; cover_credit?: string; cover_caption?: string; province_slug?: string;
};

function mapArticle(row: Article): PublicArticle {
  const publishedAt = row.published_at.replace(' ', 'T') + 'Z';
  const tags = row.tags_json ? JSON.parse(row.tags_json) as string[] : [];
  const wordCount = row.content_html?.replace(/<[^>]*>/g, ' ').trim().split(/\s+/).filter(Boolean).length;
  return {
    articleId: row.id, shortId: row.short_code, slug: row.slug, title: row.title,
    category: row.category || 'Actualité', summary: row.excerpt || '', chapter: row.excerpt,
    image: row.cover_url || '', coverAlt: row.cover_alt, coverCredit: row.cover_credit, coverCaption: row.cover_caption,
    featured: Boolean(Number(row.featured)), kind: Number(row.is_alert) ? 'alert' : Number(row.is_video_article) ? 'video' : undefined,
    time: relativeTime(publishedAt), publishedAt, updatedAt: row.updated_at?.replace(' ', 'T').concat('Z'),
    countryCode: row.country_code, province: row.province_slug, tags, keywords: tags,
    seoTitle: row.seo_title, seoDescription: row.seo_description, contentHtml: row.content_html,
    wordCount, readingTime: wordCount ? Math.ceil(wordCount / 220) : undefined, author: 'La rédaction TV+',
  };
}

export async function listLwsArticles({ category, country, search, page = 1, pageSize = 12 }: {
  category?: string; country?: string; search?: string; page?: number; pageSize?: number;
}) {
  const filters: Record<string, string> = { offset: String((page - 1) * pageSize), limit: String(pageSize) };
  if (category) filters.category = categorySlug(category);
  if (country) filters.country = country;
  if (search?.trim()) filters.search = search.trim().slice(0,120);
  const result = await read<{ items: Article[]; total: number }>('articles', filters, ['public-articles']);
  return { items: result.items.map(mapArticle), total: result.total, page, pageSize, source: 'mysql' as const };
}

export async function getLwsArticle(filters: { code: string } | { slug: string }) {
  const result = await read<{ items: Article[] }>('articles', filters, ['public-articles']);
  return { item: result.items.length ? mapArticle(result.items[0]) : null, source: 'mysql' as const };
}

export async function getLwsCategories() {
  const result = await read<{ items: { name: string }[] }>('categories', {}, ['public-categories']);
  return { data: result.items.map(row => row.name), source: 'mysql' as const };
}
