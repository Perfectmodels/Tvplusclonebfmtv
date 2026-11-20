import 'server-only';
import { getServerSupabase } from '../supabase/server';
import { DEFAULT_FEEDS, type NormalizedItem, type RssSource } from './feeds';
import { parseFeed } from './parse';

async function getSources(): Promise<RssSource[]> {
  try {
    const db = getServerSupabase();
    const { data, error } = await db
      .from('rss_sources')
      .select('id, name, url, active')
      .eq('active', true)
      .order('name');
    if (!error && data?.length) return data as RssSource[];
  } catch {
    // repli sur la liste par défaut
  }
  return DEFAULT_FEEDS;
}

async function fetchSource(source: RssSource): Promise<NormalizedItem[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(source.url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'TVPlusNews/1.0 (+https://tvplusafrique.com) RSS aggregator',
        Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
      },
      cache: 'no-store',
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const xml = await response.text();
    return parseFeed(xml, source.url.includes('news.google.com'));
  } finally {
    clearTimeout(timeout);
  }
}

export type RefreshResult = {
  sources: number;
  fetched: number;
  stored: number;
  errors: string[];
};

/** Récupère tous les flux actifs, déduplique et enregistre dans news_feed. */
export async function refreshNewsFeed(): Promise<RefreshResult> {
  const sources = await getSources();
  const settled = await Promise.allSettled(sources.map((source) => fetchSource(source)));
  const errors: string[] = [];
  const byGuid = new Map<string, NormalizedItem>();
  let fetched = 0;

  settled.forEach((result, index) => {
    if (result.status === 'rejected') {
      errors.push(`${sources[index].name}: ${result.reason instanceof Error ? result.reason.message : 'erreur'}`);
      return;
    }
    fetched += result.value.length;
    for (const item of result.value) {
      if (!byGuid.has(item.guid)) byGuid.set(item.guid, item);
    }
  });

  const items = Array.from(byGuid.values())
    .sort((a, b) => (b.publishedAt ?? '').localeCompare(a.publishedAt ?? ''))
    .slice(0, 150);

  let stored = 0;
  if (items.length) {
    const db = getServerSupabase();
    for (let i = 0; i < items.length; i += 50) {
      const chunk = items.slice(i, i + 50).map((item) => {
        const id = crypto.randomUUID();
        const slug =
          item.title.toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80) + '-' + id.slice(0, 8);
        return {
          id,
          guid: item.guid,
          slug,
          title: item.title,
          link: item.link,
          description: item.description,
          published_at: item.publishedAt,
        };
      });
      const { error } = await db.from('news_feed').upsert(chunk, { onConflict: 'guid' });
      if (error) {
        errors.push(`enregistrement: ${error.message}`);
      } else {
        stored += chunk.length;
      }
    }
    const cutoff = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
    await db.from('news_feed').delete().lt('published_at', cutoff);
  }

  return { sources: sources.length, fetched, stored, errors };
}
