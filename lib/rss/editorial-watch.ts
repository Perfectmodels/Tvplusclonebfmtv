import 'server-only';
import { createHash } from 'node:crypto';
import { unstable_cache } from 'next/cache';
import sourceCatalog from '../../data/rss-sources.json';
import type { WatchItem, WatchRegion } from '../editorial/veille-types';
import { readSource } from './news';

const gabon = /gabon|libreville|port-gentil/i;
const africanSources = /^(Actualite\.cd|BBC News|France 24 — Afrique|RFI — Afrique|Google Actualités — (Afrique centrale|Cameroun|Centrafrique|Congo|Économie CEMAC|Guinée équatoriale|RD Congo|RDC|Tchad))/;
const regionalSearches = ['Afrique', 'Afrique de l’Ouest', 'Afrique de l’Est', 'Afrique australe', 'Afrique du Nord'];

const activeSources = sourceCatalog.filter((source) => source.active && source.url.startsWith('https://'));
const sources = {
  gabon: activeSources.filter((source) => gabon.test(source.name)),
  afrique: [
    ...activeSources.filter((source) => africanSources.test(source.name)),
    ...regionalSearches.map((name) => ({
      name: 'Google Actualités — ' + name,
      url: 'https://news.google.com/rss/search?' + new URLSearchParams({ q: name, hl: 'fr', gl: 'GA', ceid: 'GA:fr' }),
    })),
  ],
};

function titleKey(title: string) {
  return title.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/[^a-z0-9]+/g, ' ').trim();
}

async function collect(region: WatchRegion): Promise<WatchItem[]> {
  const feeds = sources[region];
  const results = [];
  const now = Date.now();
  for (let start = 0; start < feeds.length; start += 10) {
    const batch = feeds.slice(start, start + 10);
    results.push(...await Promise.all(batch.map(async (feed) =>
      (await readSource(feed, 30, 1600)).map((item) => ({ ...item, feed: feed.name })))));
  }

  const unique = new Map<string, WatchItem>();
  for (const item of results.flat()) {
    let url: URL;
    try { url = new URL(item.link); } catch { continue; }
    if (!/^https?:$/.test(url.protocol) || url.username || url.password || url.href.length > 2400) continue;
    url.hash = '';
    for (const key of [...url.searchParams.keys()]) {
      if (key.startsWith('utm_') || key === 'fbclid') url.searchParams.delete(key);
    }
    const date = item.publishedAt ? Date.parse(item.publishedAt) : null;
    if (date !== null && (date < now - 14 * 86_400_000 || date > now + 2 * 3_600_000)) continue;
    const key = titleKey(item.title);
    const previous = unique.get(key);
    if (!key || (previous && (url.hostname === 'news.google.com' || previous.summary.length >= item.description.length))) continue;
    unique.set(key, {
      id: createHash('sha256').update(region + ':' + key).digest('hex').slice(0, 24),
      title: item.title,
      href: url.href,
      summary: item.description,
      source: item.publisher || item.feed,
      publishedAt: item.publishedAt,
      region,
    });
  }
  if (!unique.size) throw new Error('Aucun flux de veille exploitable.');
  return [...unique.values()].sort((a, b) => (b.publishedAt ?? '').localeCompare(a.publishedAt ?? '')).slice(0, 250);
}

export const getEditorialWatch = unstable_cache(collect, ['editorial-watch-v1'], { revalidate: 600 });
