import 'server-only';
import { unstable_cache } from 'next/cache';
import { listArticles } from '../db/repository';
import { articlePath } from '../articles/urls';

export const escapeXml = (value: string) => value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c] ?? c));
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
  const { items, source } = await listArticles({ pageSize: 200 });
  if (source === 'static') throw new Error('Source éditoriale indisponible');
  const unique = new Map(items.map(item => [articlePath(item), item]));
  return Array.from(unique.values()).filter(item => item.title && validDate(item.publishedAt) && new Date(item.publishedAt!).getTime() <= Date.now());
}, ['seo-recent-editorial-articles-v1'], { revalidate: 300, tags: ['public-articles'] });

export function xmlResponse(body: string, contentType = 'application/xml') {
  return new Response('<?xml version="1.0" encoding="UTF-8"?>\n' + body, {
    headers: {'Content-Type': contentType + '; charset=utf-8', 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60'},
  });
}
export function unavailableFeed() {
  return new Response('Flux éditorial temporairement indisponible.', {status:503, headers:{'Retry-After':'300','Cache-Control':'no-store'}});
}
