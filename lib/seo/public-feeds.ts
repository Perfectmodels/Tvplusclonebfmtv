import 'server-only';
import { unstable_cache } from 'next/cache';
import { listArticles } from '../db/repository';
import { articlePath } from '../articles/urls';

const entities: Record<string, string> = {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'};
export const escapeXml = (value: string) => value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').replace(/[&<>"']/g, c => entities[c] ?? c);
export const isIndexable = (item: {robots?:string|null}) => !/(?:^|[\s,])(?:noindex|none)(?:$|[\s,])/i.test(item.robots??'');
export const plainText = (value: string) => value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
export const absoluteUrl = (value: string, base: string) => {
  try { const url = new URL(value, base); return /^https?:$/.test(url.protocol) ? url.href : undefined; } catch { return undefined; }
};
export const validDate = (value?: string) => {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : undefined;
};

// Cache shared by RSS and Google News; only the public repository is queried.
export const recentEditorialArticles = unstable_cache(async () => {
  const items: Awaited<ReturnType<typeof listArticles>>['items'] = [];
  const cutoff = Date.now() - 48 * 60 * 60 * 1000;
  for (let page = 1; page <= 5; page++) {
    const result = await listArticles({page, pageSize:200});
    if (result.source === 'static') throw new Error('Source éditoriale indisponible');
    items.push(...result.items);
    if (result.items.length < 200 || page * 200 >= result.total || result.items.some(item => (validDate(item.publishedAt)?.getTime() ?? Infinity) < cutoff)) break;
  }
  const unique = new Map(items.map(item => [articlePath(item), item]));
  return Array.from(unique.values()).filter(item => isIndexable(item) && item.title && validDate(item.publishedAt) && new Date(item.publishedAt!).getTime() <= Date.now());
}, ['seo-recent-editorial-articles-v1'], { revalidate: 300, tags: ['public-articles'] });

export function xmlResponse(body: string, contentType = 'application/xml') {
  return new Response('<?xml version="1.0" encoding="UTF-8"?>\n' + body, {
    headers: {'Content-Type': contentType + '; charset=utf-8', 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60'},
  });
}
export function unavailableFeed() {
  return new Response('Flux éditorial temporairement indisponible.', {status:503, headers:{'Retry-After':'300','Cache-Control':'no-store'}});
}
