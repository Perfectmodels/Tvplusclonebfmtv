import 'server-only';
import * as v2 from './v2-public';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  categories as staticCategories,
  filActu as staticFilActu,
  stories as staticStories,
  topics,
  topicLinks,
} from '../data';
import {
  channels as staticChannels,
  newsletters as staticNewsletters,
  podcasts as staticPodcasts,
  practicalServices as staticPracticalServices,
  tvSchedule as staticTvSchedule,
  programs as staticPrograms,
  witnesses as staticWitnesses,
  videos as staticVideos,
} from '../extra';
import { getServerSupabase, getPublicServerSupabase } from '../supabase/server';
import { categoryLabel, mapArticle, mapFilActu } from './mappers';
import { relativeTime } from './format';
import type {
  ArticleRow,
  CategoryRow,
  ChannelRow,
  ContactRow,
  DataSource,
  EpisodeRow,
  FilActuRow,
  NewsletterRow,
  Paginated,
  PodcastRow,
  ProgramRow,
  TestimonialRow,
  TopicRow,
  TvScheduleRow,
  NewsletterFormatRow,
  PracticalServiceRow,
  VideoRow,
} from './types';
import type { Story } from '../data';
import { articlePath } from '../articles/urls';

type QueryResult<T> = { data: T | null; error: { message: string } | null };
type Wrapped<T> = { data: T; source: DataSource; error?: string };

export type TopicItem = { label: string; link: string };

/** Exécute une requête Supabase et replie sur les données statiques en cas d'erreur. */
async function fromSupabase<T>(
  query: (db: SupabaseClient) => unknown,
  fallback: T,
): Promise<Wrapped<T>> {
  try {
    const db = getServerSupabase();
    const { data, error } = (await query(db)) as QueryResult<T>;
    if (error) return { data: fallback, source: 'static', error: error.message };
    return { data: (data ?? fallback) as T, source: 'supabase' };
  } catch (error) {
    return {
      data: fallback,
      source: 'static',
      error: error instanceof Error ? error.message : 'Erreur inconnue',
    };
  }
}

export async function listArticles({
  category,
  country,
  search,
  page = 1,
  pageSize = 12,
}: {
  category?: string;
  country?: string;
  search?: string;
  page?: number;
  pageSize?: number;
} = {}): Promise<Paginated<Story>> {
  if (v2.usesTvplusV2()) return v2.listV2Articles({ category, country, search, page, pageSize });
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const result = await fromSupabase<ArticleRow[]>((db) => {
    let q = db.from('articles').select('*').eq('status', 'published').is('deleted_at', null);
    if (category) q = q.eq('category_slug', category.toLowerCase());
    if (country) q = q.eq('country_code', country);
    if (search) {
      const term = `%${search}%`;
      q = q.or(`title.ilike.${term},summary.ilike.${term},category_slug.ilike.${term}`);
    }
    return q.order('published_at', { ascending: false }).range(from, to);
  }, []);

  const fallback = staticStories
    .filter(s => !country || s.countryCode === country)
    .filter((s) => !category || s.category.toLowerCase() === category.toLowerCase())
    .filter(
      (s) =>
        !search ||
        (s.title + ' ' + s.category + ' ' + s.summary).toLowerCase().includes(search.toLowerCase()),
    )
    .slice(from, from + pageSize);

  if (result.source === 'supabase') {
    let total = result.data.length;
    try {
      const db = getServerSupabase();
      let countQuery = db.from('articles').select('*', { count: 'exact', head: true }).eq('status', 'published').is('deleted_at', null);
      if (category) countQuery = countQuery.eq('category_slug', category.toLowerCase());
      if (country) countQuery = countQuery.eq('country_code', country);
      if (search) {
        const term = `%${search}%`;
        countQuery = countQuery.or(`title.ilike.${term},summary.ilike.${term},category_slug.ilike.${term}`);
      }
      const { count } = await countQuery;
      total = count ?? total;
    } catch {
      // le total reste celui de la page
    }
    return {
      items: result.data.map(mapArticle),
      total,
      page,
      pageSize,
      source: 'supabase',
    };
  }
  return { items: fallback, total: fallback.length, page, pageSize, source: 'static' };
}

export type PublicArticle = Story & {
  articleId?: string;
  body?: string | null;
  chapter?: string | null;
  contentHtml?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  canonicalUrl?: string | null;
  robots?: string | null;
  keywords?: string[];
  tags?: string[];
  countryCode?: string;
  province?: string | null;
  author?: string | null;
  coverAlt?: string | null;
  coverCredit?: string | null;
  coverCaption?: string | null;
  readingTime?: number;
};

function toPublicArticle(a: ArticleRow): PublicArticle {
  return {
    ...mapArticle(a),
    body: a.body ?? undefined,
    chapter: (a as any).chapter ?? null,
    contentHtml: (a as any).content_html ?? null,
    seoTitle: (a as any).seo_title ?? null,
    seoDescription: (a as any).seo_description ?? null,
    canonicalUrl: (a as any).canonical_url ?? null,
    robots: (a as any).robots ?? null,
    keywords: (a as any).keywords ?? [],
    tags: (a as any).tags ?? [],
    countryCode: (a as any).country_code ?? 'GA',
    province: (a as any).province ?? null,
    author: a.author ?? null,
    coverAlt: (a as any).cover_alt ?? null,
    coverCredit: (a as any).cover_credit ?? null,
    coverCaption: (a as any).cover_caption ?? null,
    readingTime: (a as any).reading_time ?? 1,
  };
}

export async function getArticleBySlug(
  slug: string,
): Promise<{ item: PublicArticle | null; source: DataSource; error?: string }> {
  if (v2.usesTvplusV2()) return v2.getV2ArticleBySlug(slug);
  const result = await fromSupabase<ArticleRow | null>(
    (db) => db.from('articles').select('*').eq('slug', slug).eq('status', 'published').is('deleted_at', null).maybeSingle(),
    null,
  );
  if (result.source === 'supabase' && result.data) {
    return { item: toPublicArticle(result.data), source: 'supabase' };
  }
  const story = staticStories.find((s) => s.slug === slug);
  return { item: story ?? null, source: 'static', error: result.error };
}

/** Lecture publique via l'identifiant court : l'URL courte EST la page de l'article. */
export async function getArticleByShortId(
  shortId: string,
): Promise<{ item: PublicArticle | null; source: DataSource; error?: string }> {
  if (v2.usesTvplusV2()) return v2.getV2ArticleByShortCode(shortId);
  const result = await fromSupabase<ArticleRow | null>(
    (db) => db.from('articles').select('*').eq('short_id', shortId).eq('status', 'published').is('deleted_at', null).maybeSingle(),
    null,
  );
  if (result.source === 'supabase' && result.data) {
    return { item: toPublicArticle(result.data), source: 'supabase' };
  }
  return { item: null, source: 'static', error: result.error };
}

export async function getCategories(): Promise<Wrapped<string[]>> {
  if (v2.usesTvplusV2()) return v2.getV2Categories();
  const result = await fromSupabase<CategoryRow[]>(
    (db) => db.from('categories').select('name').order('name'),
    [],
  );
  if (result.source === 'supabase' && result.data.length) {
    return { data: result.data.map((r) => r.name), source: 'supabase' };
  }
  return { data: staticCategories, source: 'static', error: result.error };
}

export async function getFilActu(limit = 20): Promise<Wrapped<typeof staticFilActu>> {
  if (v2.usesTvplusV2()) return v2.getV2FilActu(limit);
  const result = await fromSupabase<FilActuRow[]>(
    (db) => db.from('fil_actu').select('*').order('position').limit(limit),
    [],
  );
  if (result.source === 'supabase' && result.data.length) {
    const slugs = result.data.map((r) => r.article_slug);
    const articles = await fromSupabase<ArticleRow[]>(
      (db) => db.from('articles').select('*').in('slug', slugs),
      [],
    );
    if (articles.source === 'supabase') {
      const bySlug = new Map(articles.data.map((a) => [a.slug, a]));
      const mapped = result.data
        .filter((r) => bySlug.has(r.article_slug))
        .map((r) => mapFilActu(r, bySlug.get(r.article_slug)!));
      if (mapped.length) return { data: mapped, source: 'supabase' };
    }
  }
  return { data: staticFilActu.slice(0, limit), source: 'static', error: result.error };
}

export async function getVideos(): Promise<Wrapped<typeof staticVideos>> {
  if (v2.usesTvplusV2()) return { data: [], source: 'supabase' as const };
  const result = await fromSupabase<VideoRow[]>(
    (db) => db.from('videos').select('*').order('published_at', { ascending: false }),
    [],
  );
  if (result.source === 'supabase' && result.data.length) {
    return {
      data: result.data.map((v) => ({
        id: v.id,
        title: v.title,
        category: categoryLabel(v.category_slug),
        image: v.image_url ?? '',
        duration: v.duration,
        time: relativeTime(v.published_at),
        description: v.description ?? '',
        href: v.source_url ?? undefined,
      })),
      source: 'supabase',
    };
  }
  return { data: staticVideos, source: 'static', error: result.error };
}

export async function getPrograms(): Promise<Wrapped<typeof staticPrograms>> {
  if (v2.usesTvplusV2()) return v2.getV2Programs();
  const result = await fromSupabase<ProgramRow[]>(
    (db) => db.from('programs').select('*').order('slot'),
    [],
  );
  if (result.source === 'supabase' && result.data.length) {
    return {
      data: result.data.map((p) => ({
        id: p.id,
        slug: p.slug,
        name: p.name,
        host: p.host ?? '',
        slot: p.slot,
        category: p.category,
        image: p.image_url ?? '',
        description: p.description ?? '',
      })),
      source: 'supabase',
    };
  }
  return { data: staticPrograms, source: 'static', error: result.error };
}

export async function getPodcasts(): Promise<Wrapped<typeof staticPodcasts>> {
  if (v2.usesTvplusV2()) return { data: [], source: 'supabase' as const };
  const result = await fromSupabase<PodcastRow[]>(
    (db) => db.from('podcasts').select('*').order('published_at', { ascending: false }),
    [],
  );
  if (result.source === 'supabase' && result.data.length) {
    return {
      data: result.data.map((p) => ({
        id: p.id,
        title: p.title,
        category: categoryLabel(p.category_slug),
        image: p.image_url ?? '',
        duration: p.duration,
        time: relativeTime(p.published_at),
        description: p.description ?? '',
        href: p.source_url ?? undefined,
      })),
      source: 'supabase',
    };
  }
  return { data: staticPodcasts, source: 'static', error: result.error };
}

export async function getChannels(): Promise<Wrapped<typeof staticChannels>> {
  if (v2.usesTvplusV2()) return { data: [], source: 'supabase' as const };
  const result = await fromSupabase<ChannelRow[]>(
    (db) => db.from('channels').select('*').order('name'),
    [],
  );
  if (result.source === 'supabase' && result.data.length) {
    return {
      data: result.data.map((c) => ({
        name: c.name,
        tagline: c.tagline ?? '',
        image: c.image_url ?? '',
        kind: c.kind,
      })),
      source: 'supabase',
    };
  }
  return { data: staticChannels, source: 'static', error: result.error };
}

export async function getTestimonials(): Promise<Wrapped<typeof staticWitnesses>> {
  if (v2.usesTvplusV2()) return { data: [], source: 'supabase' as const };
  const result = await fromSupabase<TestimonialRow[]>(
    (db) => db.from('testimonials').select('*').eq('published', true).order('created_at', { ascending: false }),
    [],
  );
  if (result.source === 'supabase' && result.data.length) {
    return {
      data: result.data.map((w) => ({
        id: w.id,
        title: w.title,
        place: w.place,
        category: 'Témoignage',
        image: w.image_url ?? '',
      })),
      source: 'supabase',
    };
  }
  return { data: staticWitnesses, source: 'static', error: result.error };
}

/**
 * Sujets du header : uniquement les articles publiés marqués
 * « alerte info » ou « à la une ». Aucun sujet saisi manuellement.
 */
export async function getHeaderTopics(): Promise<Wrapped<TopicItem[]>> {
  if (v2.usesTvplusV2()) return v2.getV2Topics();
  const result = await fromSupabase<{ title: string; short_id: string | null; slug: string }[]>(
    (db) => db
      .from('articles')
      .select('title, short_id, slug')
      .eq('status', 'published')
      .is('deleted_at', null)
      .or('is_alert.eq.true,featured.eq.true')
      .order('published_at', { ascending: false })
      .limit(5),
    [],
  );
  if (result.source === 'supabase' && result.data.length) {
    return {
      data: result.data.map((row) => ({
        label: row.title.length > 58 ? row.title.slice(0, 55).trimEnd() + '…' : row.title,
        link: row.short_id ? `/a/${row.short_id}` : `/article/${row.slug}`,
      })),
      source: 'supabase',
    };
  }
  return { data: [], source: 'static', error: result.error };
}

export async function getNewsletterFormats(): Promise<Wrapped<typeof staticNewsletters>> {
  if (v2.usesTvplusV2()) return { data: [{
    id:'tvplus-recap-actu',name:'Récap Actu',frequency:'Inscription ouverte',
    description:'Enregistrez votre adresse pour être informé lors de l’activation des envois de la rédaction.',
  }],source:'supabase' as const };
  const result = await fromSupabase<NewsletterFormatRow[]>(
    (db) => db.from('newsletter_formats').select('id, name, frequency, description').order('id'),
    [],
  );
  if (result.source === 'supabase' && result.data.length) {
    return {
      data: result.data.map((r) => ({ id: r.id, name: r.name, frequency: r.frequency, description: r.description })),
      source: 'supabase',
    };
  }
  return { data: staticNewsletters, source: 'static', error: result.error };
}

export async function getPracticalServices(): Promise<Wrapped<typeof staticPracticalServices>> {
  if (v2.usesTvplusV2()) return { data: [], source: 'supabase' as const };
  const result = await fromSupabase<PracticalServiceRow[]>(
    (db) => db.from('practical_services').select('id, name, description, href, icon').order('id'),
    [],
  );
  if (result.source === 'supabase' && result.data.length) {
    return {
      data: result.data.map((r) => ({ name: r.name, description: r.description, href: r.href, icon: r.icon })),
      source: 'supabase',
    };
  }
  return { data: staticPracticalServices, source: 'static', error: result.error };
}

export async function getTvSchedule(): Promise<Wrapped<typeof staticTvSchedule>> {
  if (v2.usesTvplusV2()) return v2.getV2Schedule();
  const result = await fromSupabase<TvScheduleRow[]>(
    (db) => db.from('tv_schedule').select('id, time_label, title, category, is_live').order('time_label'),
    [],
  );
  if (result.source === 'supabase' && result.data.length) {
    return {
      data: result.data.map((r) => ({ time: r.time_label, title: r.title, category: r.category, live: r.is_live })),
      source: 'supabase',
    };
  }
  return { data: staticTvSchedule, source: 'static', error: result.error };
}

export async function getSiteTopics(): Promise<Wrapped<TopicItem[]>> {
  if (v2.usesTvplusV2()) return v2.getV2Topics();
  const result = await fromSupabase<TopicRow[]>(
    (db) => db.from('site_topics').select('id, label, link').order('id'),
    [],
  );
  if (result.source === 'supabase' && result.data.length) {
    return { data: result.data.map((r) => ({ label: r.label, link: r.link })), source: 'supabase' };
  }
  return {
    data: topics.map((label: string) => ({ label, link: topicLinks[label] ?? '/news-24-7' })),
    source: 'static',
    error: result.error,
  };
}

export async function searchAll(query: string) {
  if (v2.usesTvplusV2()) return v2.searchV2(query);
  const q = query.toLowerCase();
  const term = `%${q}%`;
  let items: { title: string; category: string; description: string; href: string; type: string }[] = [];

  try {
    const db = getServerSupabase();
    const [articles, videos, programs, podcasts] = await Promise.all([
      db.from('articles').select('title, summary, category_slug, source_url, slug, short_id').eq('status', 'published').or(`title.ilike.${term},summary.ilike.${term}`).limit(30),
      db.from('videos').select('title, description, category_slug, source_url').or(`title.ilike.${term},description.ilike.${term}`).limit(20),
      db.from('programs').select('name, description, category').or(`name.ilike.${term},description.ilike.${term}`).limit(20),
      db.from('podcasts').select('title, description, category_slug, source_url').or(`title.ilike.${term},description.ilike.${term}`).limit(20),
    ]);

    items = [
      ...(articles.data ?? []).map((r) => ({
        title: r.title, category: categoryLabel(r.category_slug), description: r.summary,
        href: r.short_id ? '/a/' + r.short_id : '/article/' + r.slug, type: 'Article',
      })),
      ...(videos.data ?? []).map((r) => ({
        title: r.title, category: categoryLabel(r.category_slug), description: r.description ?? '',
        href: r.source_url ?? '/videos', type: 'Vidéo',
      })),
      ...(programs.data ?? []).map((r) => ({
        title: r.name, category: r.category, description: r.description ?? '', href: '/replay-emissions', type: 'Émission',
      })),
      ...(podcasts.data ?? []).map((r) => ({
        title: r.title, category: categoryLabel(r.category_slug), description: r.description ?? '',
        href: r.source_url ?? '/podcasts', type: 'Podcast',
      })),
    ];
    if (items.length) return { items, source: 'supabase' as DataSource };
  } catch {
    // repli sur les données locales
  }

  items = [
    ...staticStories
      .filter((s) => (s.title + ' ' + s.category + ' ' + s.summary).toLowerCase().includes(q))
      .map((s) => ({ title: s.title, category: s.category, description: s.summary, href: articlePath(s), type: 'Article' })),
    ...staticVideos
      .filter((v) => (v.title + ' ' + v.category).toLowerCase().includes(q))
      .map((v) => ({ title: v.title, category: v.category, description: v.description, href: v.href ?? '/videos', type: 'Vidéo' })),
    ...staticPrograms
      .filter((p) => (p.name + ' ' + p.category).toLowerCase().includes(q))
      .map((p) => ({ title: p.name, category: p.category, description: p.description, href: '/replay-emissions', type: 'Émission' })),
  ];
  return { items, source: 'static' as DataSource };
}

export async function subscribeNewsletter(email: string, newsletter: string) {
  if (v2.usesTvplusV2()) {
    const {error} = await getPublicServerSupabase().from('tvplus_reader_inbox').insert({
      kind:'newsletter',email:email.toLowerCase().trim(),newsletter,
    });
    if(error && error.code!=='23505')throw new Error('Inscription indisponible. Veuillez réessayer.');
    return {ok:true};
  }
  const db = getServerSupabase();
  const { data, error } = await db
    .from('newsletter_subscriptions')
    .insert({ email, newsletter })
    .select('id, email, newsletter, created_at')
    .single();
  if (error) throw new Error(error.message);
  return data as NewsletterRow;
}

export async function createContact(payload: {
  name: string;
  email: string;
  subject: string;
  message: string;
}) {
  if (v2.usesTvplusV2()) {
    const {error} = await getPublicServerSupabase().from('tvplus_reader_inbox').insert({
      kind:'contact',name:payload.name,email:payload.email.toLowerCase().trim(),
      subject:payload.subject,body:payload.message,
    });
    if(error)throw new Error('Le message n’a pas pu être enregistré. Veuillez réessayer.');
    return {ok:true};
  }
  const db = getServerSupabase();
  const { data, error } = await db.from('contacts').insert(payload).select('id, created_at').single();
  if (error) throw new Error(error.message);
  return data as Pick<ContactRow, 'id' | 'created_at'>;
}

export async function getAdminStats() {
  const db = getServerSupabase();
  const tables = ['articles', 'categories', 'videos', 'podcasts', 'newsletter_subscriptions', 'contacts', 'media', 'programs'] as const;
  const stats: Record<string, number> = {};
  await Promise.all(
    tables.map(async (table) => {
      const { count, error } = await db.from(table).select('*', { count: 'exact', head: true });
      stats[table] = error ? -1 : (count ?? 0);
    }),
  );
  return stats;
}

export async function getDashboardStats() {
  const db = getServerSupabase();
  const [published, drafts, review, scheduled, archived, recent, categories] = await Promise.all([
    db.from('articles').select('*', { count: 'exact', head: true }).eq('status', 'published'),
    db.from('articles').select('*', { count: 'exact', head: true }).eq('status', 'draft'),
    db.from('articles').select('*', { count: 'exact', head: true }).eq('status', 'review'),
    db.from('articles').select('*', { count: 'exact', head: true }).eq('status', 'scheduled'),
    db.from('articles').select('*', { count: 'exact', head: true }).eq('status', 'archived'),
    db.from('articles').select('id, title, status, category_slug, published_at, created_at').order('created_at', { ascending: false }).limit(6),
    db.from('categories').select('*', { count: 'exact', head: true }),
  ]);
  return {
    published: published.count ?? 0,
    drafts: drafts.count ?? 0,
    review: review.count ?? 0,
    scheduled: scheduled.count ?? 0,
    archived: archived.count ?? 0,
    categories: categories.count ?? 0,
    recent: (recent.data ?? []).map((r) => ({
      id: r.id,
      title: r.title,
      status: r.status,
      category: categoryLabel(r.category_slug),
      date: r.published_at ?? r.created_at,
    })),
  };
}

export type PublicEpisode = {
  id: string; programId: string | null; title: string; description: string; videoUrl: string;
  thumbnail: string; duration: string; publishedAt: string;
};

export async function getEpisodes(limit = 24): Promise<Wrapped<PublicEpisode[]>> {
  if (v2.usesTvplusV2()) return v2.getV2Episodes(limit);
  const result = await fromSupabase<EpisodeRow[]>(
    (db) => db.from('episodes').select('*').eq('status', 'published').order('published_at', { ascending: false }).limit(limit),
    [],
  );
  if (result.source === 'supabase' && result.data.length) {
    return {
      data: result.data.map((e) => ({
        id: e.id,
        programId: e.program_id ?? null,
        title: e.title,
        description: e.description ?? '',
        videoUrl: e.video_url ?? '',
        thumbnail: e.thumbnail_url ?? '',
        duration: e.duration,
        publishedAt: e.published_at ?? e.created_at,
      })),
      source: 'supabase',
    };
  }
  return { data: [], source: 'static', error: result.error };
}

export async function getEpisodeById(id: string): Promise<PublicEpisode | null> {
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(id)) return null;
  if (v2.usesTvplusV2()) return v2.getV2EpisodeById(id);
  const result = await fromSupabase<EpisodeRow|null>(db=>db.from('episodes').select('*').eq('status','published').eq('id',id).maybeSingle(),null);
  const e=result.data;
  return e ? {id:e.id,programId:e.program_id??null,title:e.title,description:e.description??'',videoUrl:e.video_url??'',thumbnail:e.thumbnail_url??'',duration:e.duration,publishedAt:e.published_at??e.created_at} : null;
}
export { topics, topicLinks };
