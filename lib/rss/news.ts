import 'server-only';
import { usesTvplusV2, getTvplusV2PublicClient } from '../db/v2-public';
import { getServerSupabase } from '../supabase/server';
import { stories } from '../data';
import { refreshNewsFeed } from './ingest';
import type { FeedItem } from './feeds';

type FeedRow = {
  id: string;
  title: string;
  link: string;
  description: string | null;
  published_at: string | null;
  created_at: string;
};

function toFeedItem(row: FeedRow): FeedItem {
  const date = row.published_at ?? row.created_at;
  const time = new Date(date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  return {
    id: row.id,
    title: row.title,
    // Dépêche News 24/7 : lien vers la source, jamais une page article du site.
    href: row.link,
    time,
    summary: row.description ?? '',
  };
}

function fallbackItems(limit: number): FeedItem[] {
  // Repli exceptionnel : uniquement si le fil RSS est indisponible.
  return stories.slice(0, limit).map((story) => ({
    id: 'local-' + story.slug,
    title: story.title,
    href: '/article/' + story.slug,
    time: story.publishedAt
      ? new Date(story.publishedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
      : 'À l’instant',
    summary: story.summary,
  }));
}

async function readRows(limit: number): Promise<FeedRow[]> {
  const db = getServerSupabase();
  const { data, error } = await db
    .from('news_feed')
    .select('id, title, link, description, published_at, created_at')
    .order('published_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as FeedRow[];
}

/** Lit le fil News 24/7. Ce flux reste distinct des articles publiés sur le site. */
export async function getNewsFeed(limit = 30): Promise<{ items: FeedItem[]; source: 'rss' | 'local' }> {
  if (usesTvplusV2()) {
    const { data, error } = await getTvplusV2PublicClient().from('news24_items')
      .select('id,title,original_url,summary,published_at')
      .eq('status', 'published').order('published_at', { ascending: false }).limit(limit);
    if (error) throw new Error(error.message);
    return { items: (data ?? []).map((row) => ({
      id: row.id, title: row.title, href: row.original_url,
      summary: row.summary ?? '',
      time: new Date(row.published_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Libreville' }),
    })), source: 'rss' };
  }
  try {
    let rows = await readRows(limit);
    if (rows.length === 0) {
      await refreshNewsFeed();
      rows = await readRows(limit);
    }
    if (rows.length) return { items: rows.map(toFeedItem), source: 'rss' };
  } catch {
    // repli sur les articles internes
  }
  return { items: fallbackItems(limit), source: 'local' };
}
