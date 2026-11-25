import 'server-only';
import { unstable_cache } from 'next/cache';
import { parseFeed } from './parse';
import sourceCatalog from '../../data/rss-sources.json';
import type { FeedItem, NormalizedItem } from './feeds';

/**
 * News 24/7 : agrégation RSS exclusivement externe.
 * Aucune lecture ni écriture Supabase, même si le site utilise la base TV+ V2.
 * La liste des sources est exportée du tableau de bord dans data/rss-sources.json.
 */
type Source = { name: string; url: string; active: boolean; priority: boolean };

const SOURCES = (sourceCatalog as Source[]).filter(
  (source) => source.active && /^https:\/\//i.test(source.url),
);
const PRIMARY_SOURCES = SOURCES.filter((source) => source.priority);
const ROTATING_SOURCES = SOURCES.filter((source) => !source.priority);
const MAX_ROTATING = 6;
const TIMEOUT_MS = 3500;
const MAX_ITEMS_PER_SOURCE = 15;
const MAX_OUTPUT = 120;
const CACHE_SECONDS = 180;

function selectSources(): Source[] {
  // Les sources nationales prioritaires sont toujours interrogées.
  // Les autres passent par lots, pour ne jamais interroger 41 flux simultanément.
  if (!ROTATING_SOURCES.length) return PRIMARY_SOURCES;
  const start = (Math.floor(Date.now() / (CACHE_SECONDS * 1000)) * MAX_ROTATING) % ROTATING_SOURCES.length;
  const rotating = Array.from({ length: Math.min(MAX_ROTATING, ROTATING_SOURCES.length) },
    (_, i) => ROTATING_SOURCES[(start + i) % ROTATING_SOURCES.length]);
  return [...PRIMARY_SOURCES, ...rotating];
}

export async function readSource(source: Pick<Source, 'url'>, limit = MAX_ITEMS_PER_SOURCE, summaryLimit = 320): Promise<NormalizedItem[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(source.url, {
      signal: controller.signal,
      next: { revalidate: 600 },
      headers: {
        Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml',
        'User-Agent': 'TVPlusAfrique/1.0 (RSS reader)',
      },
    });
    if (!response.ok) return [];
    const xml = await response.text();
    // Refuser les documents hors normes plutôt que de charger un flux énorme.
    if (xml.length > 1_500_000) return [];
    return parseFeed(xml, new URL(source.url).hostname === 'news.google.com', summaryLimit).slice(0, limit);
  } catch {
    // Une source en panne ne rend pas le site indisponible.
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

async function collectSources(): Promise<FeedItem[]> {
  const sources = selectSources();
  const fetched: NormalizedItem[][] = Array.from({ length: sources.length }, () => []);
  let cursor = 0;

  // Concurrence bornée : 9 téléchargements au maximum, indépendamment du trafic.
  await Promise.all(Array.from({ length: Math.min(9, sources.length) }, async () => {
    while (cursor < sources.length) {
      const index = cursor++;
      fetched[index] = await readSource(sources[index]);
    }
  }));

  const unique = new Map<string, NormalizedItem>();
  const now = Date.now();
  for (const item of fetched.flat()) {
    try {
      const url = new URL(item.link);
      if (!['https:', 'http:'].includes(url.protocol)) continue;
      const date = item.publishedAt ? Date.parse(item.publishedAt) : NaN;
      if (Number.isNaN(date) || date < now - 7 * 86_400_000 || date > now + 2 * 3_600_000) continue;
      const key = item.title.toLowerCase().normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
      if (key && !unique.has(key)) unique.set(key, item);
    } catch {
      // Lien malformé : ignorer l'entrée plutôt que de planter le rendu.
    }
  }

  const items = Array.from(unique.values())
    .sort((a, b) => (b.publishedAt ?? '').localeCompare(a.publishedAt ?? ''))
    .slice(0, MAX_OUTPUT)
    .map((item, index) => ({
      id: `rss-${index}-${item.guid.slice(0, 70)}`,
      title: item.title,
      href: item.link,
      time: new Date(item.publishedAt!).toLocaleTimeString('fr-FR', {
        hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Libreville',
      }),
      summary: item.description,
    }));

  // Si tous les flux échouent durant la revalidation, ne pas mettre en cache
  // un résultat vide à la place d'un snapshot éventuellement encore valide.
  if (!items.length) throw new Error('Flux RSS temporaires indisponibles.');
  return items;
}

/** Cache partagé Next.js : les visites ne relancent pas les requêtes RSS. */
const cachedSnapshot = unstable_cache(collectSources, ['news24-external-rss-v1'], {
  revalidate: CACHE_SECONDS,
  tags: ['news24-external-rss'],
});

export async function getNewsFeed(limit = 30): Promise<{
  items: FeedItem[];
  source: 'rss' | 'local';
}> {
  try {
    const snapshot = await cachedSnapshot();
    return { items: snapshot.slice(0, Math.max(1, Math.min(100, limit))), source: 'rss' };
  } catch {
    // Le fil devient vide provisoirement ; les autres blocs restent disponibles.
    return { items: [], source: 'local' };
  }
}
