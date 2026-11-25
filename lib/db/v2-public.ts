import 'server-only';
import { getExternalMediaUrl } from '../media-url';
import { unstable_cache } from 'next/cache';
import { createClient } from '@supabase/supabase-js';
import type { Story } from '../data';
import type { PublicArticle, PublicEpisode, TopicItem } from './repository';
import { categorySlug } from '../categories';
import { relativeTime } from './format';
import { videoWatchUrl } from '../video/providers';

/**
 * Adaptateur de LECTURE pour la base existante TV+ V2.
 * Ne jamais utiliser le client publishable pour contourner les politiques RLS.
 * Le back-office du clone exige un adaptateur distinct, non activé ici.
 */
export const usesTvplusV2 = () => process.env.SUPABASE_SCHEMA_MODE === 'tvplus-v2';

function client() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL et SUPABASE_PUBLISHABLE_KEY sont requis.');
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

export function getTvplusV2PublicClient() { return client(); }

type V2Category = { id: string; slug: string; name: string };
type V2Media = { id: string; imgbb_url: string | null; bucket: string; path: string; alt: string; caption: string; credit: string };
type V2Article = {
  id: string; slug: string; short_code: string; title: string; excerpt: string; category_id: string;
  cover_media_id: string | null; content_html?: string; content_json?: unknown;
  video_source_url?:string|null;
  status: string; featured: boolean; is_alert: boolean; is_video_article: boolean;
  tags: string[]; seo_title: string | null; seo_description: string | null;
  published_at: string | null; updated_at: string; created_at: string;
  country_code: string; province_slug: string | null; author_id: string;
};
const SELECT_ARTICLE_LIST = 'id,slug,short_code,title,excerpt,category_id,cover_media_id,status,featured,is_alert,is_video_article,tags,seo_title,seo_description,country_code,province_slug,published_at,updated_at,created_at';
const SELECT_ARTICLE_DETAIL = 'id,slug,short_code,title,excerpt,category_id,cover_media_id,content_html,content_json,status,featured,is_alert,is_video_article,tags,seo_title,seo_description,published_at,updated_at,created_at,country_code,province_slug,author_id,video_source_url';

function imageUrl(media: V2Media | undefined) {
  if (!media) return '';
  const externalUrl = getExternalMediaUrl(media);
  if (externalUrl) return externalUrl;
  if (!media.bucket || !media.path) return '';
  return client().storage.from(media.bucket).getPublicUrl(media.path).data.publicUrl;
}

async function lookups(mediaIds: (string | null)[]) {
  const db = client();
  const unique = Array.from(new Set(mediaIds.filter((id): id is string => Boolean(id))));
  const [categories, media] = await Promise.all([
    db.from('categories').select('id,slug,name').order('position'),
    unique.length
      ? db.from('media').select('id,imgbb_url,bucket,path,alt,caption,credit').in('id', unique)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (categories.error) throw new Error(categories.error.message);
  if (media.error) throw new Error(media.error.message);
  return {
    categories: new Map(((categories.data ?? []) as V2Category[]).map((c) => [c.id, c])),
    media: new Map(((media.data ?? []) as V2Media[]).map((m) => [m.id, m])),
  };
}

function mapStory(a: V2Article, index: Awaited<ReturnType<typeof lookups>>): Story {
  const category = index.categories.get(a.category_id);
  const media = a.cover_media_id ? index.media.get(a.cover_media_id) : undefined;
  const words = a.content_html ? a.content_html.replace(/<[^>]*>/g, ' ').split(/\s+/).filter(Boolean).length : 0;
  return {
    slug: a.slug,
    shortId: a.short_code,
    category: category?.name ?? 'Actualité',
    title: a.title,
    summary: a.excerpt,
    image: imageUrl(media),
    time: relativeTime(a.published_at ?? a.created_at),
    publishedAt: a.published_at ?? undefined,
    updatedAt: a.updated_at,
    featured: a.featured,
    kind: a.is_alert ? 'alert' : a.is_video_article ? 'video' : undefined,
    wordCount: words,
    readingTime: words ? Math.max(1, Math.ceil(words / 220)) : undefined,
    tags: a.tags || [],seoTitle:a.seo_title,seoDescription:a.seo_description,
    countryCode:a.country_code||'GA',province:a.province_slug,
  };
}

function mapFull(a: V2Article, index: Awaited<ReturnType<typeof lookups>>): PublicArticle {
  const basic = mapStory(a, index);
  const media = a.cover_media_id ? index.media.get(a.cover_media_id) : undefined;
  return {
    ...basic,
    articleId: a.id,
    videoUrl:a.video_source_url??null,
    chapter: a.excerpt,
    contentHtml: a.content_html ?? null,
    seoTitle: a.seo_title,
    seoDescription: a.seo_description,
    tags: a.tags ?? [],
    keywords: a.tags ?? [],
    countryCode: a.country_code ?? 'GA',
    province: a.province_slug,
    coverAlt: media?.alt,
    coverCredit: media?.credit,
    coverCaption: media?.caption,
    author: 'La rédaction TV+',
  };
}

export const listV2Articles = unstable_cache(async ({
  category, country, province, excludeSlugs = [], videoOnly = false, search, page = 1, pageSize = 12,
}: {category?: string; country?: string; province?: string; excludeSlugs?: string[]; videoOnly?: boolean; search?: string; page?: number; pageSize?: number} = {}) => {
  const db = client();
  let q = db.from('articles').select(SELECT_ARTICLE_LIST, { count: 'exact' }).eq('status', 'published');
  if(country) q=q.eq('country_code',country);
  if(province) q=q.eq('province_slug',province);
  for(const slug of excludeSlugs)q=q.neq('slug',slug);
  if(videoOnly)q=q.eq('is_video_article',true);
  if (category) {
    const { data: cat, error } = await db.from('categories').select('id').eq('slug', categorySlug(category)).maybeSingle();
    if (error) throw new Error(error.message);
    if (!cat) return { items: [] as Story[], total: 0, page, pageSize, source: 'supabase' as const };
    q = q.eq('category_id', cat.id);
  }
  if (search?.trim()) {
    const safe = search.trim().slice(0, 120).replace(/[(),%_]/g, ' ');
    q = q.or(`title.ilike.%${safe}%,excerpt.ilike.%${safe}%`);
  }
  const start = (page - 1) * pageSize;
  const { data, count, error } = await q.order('published_at', { ascending: false }).order('id',{ascending:false}).range(start, start + pageSize - 1);
  if (error) throw new Error(error.message);
  const articles = (data ?? []) as V2Article[];
  const index = await lookups(articles.map((a) => a.cover_media_id));
  return { items: articles.map((a) => mapStory(a, index)), total: count ?? articles.length, page, pageSize, source: 'supabase' as const };
}, ['v2-public-article-list'], { revalidate: 60, tags: ['public-articles'] });

export const getV2ArticleBySlug = unstable_cache(async (slug: string) => {
  const { data, error } = await client().from('articles').select(SELECT_ARTICLE_DETAIL)
    .eq('status', 'published').eq('slug', slug).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return { item: null as PublicArticle | null, source: 'supabase' as const };
  const article = data as V2Article;
  const index = await lookups([article.cover_media_id]);
  return { item: mapFull(article, index), source: 'supabase' as const };
}, ['v2-public-article-detail'], { revalidate: 90, tags: ['public-articles'] });

export const getV2ArticleByShortCode = unstable_cache(async (shortCode: string) => {
  if (!/^[A-Za-z0-9_-]{8}$/.test(shortCode)) return { item: null as PublicArticle | null, source: 'supabase' as const };
  const { data, error } = await client().from('articles').select(SELECT_ARTICLE_DETAIL)
    .eq('status', 'published').eq('short_code', shortCode).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return { item: null as PublicArticle | null, source: 'supabase' as const };
  const article = data as V2Article;
  const index = await lookups([article.cover_media_id]);
  return { item: mapFull(article, index), source: 'supabase' as const };
}, ['v2-public-article-short-code'], { revalidate: 90, tags: ['public-articles'] });

export const getV2Categories = unstable_cache(async () => {
  const { data, error } = await client().from('categories').select('name').order('position');
  if (error) throw new Error(error.message);
  return { data: (data ?? []).map((c) => c.name), source: 'supabase' as const };
}, ['v2-public-categories'], { revalidate: 600, tags: ['public-categories'] });

export async function getV2FilActu(limit = 20) {
  const { items } = await listV2Articles({ pageSize: limit });
  return { data: items.map((a) => ({
    time: a.time, category: a.category, title: a.title, summary: a.summary,
    slug: a.slug, image: a.image, shortId: a.shortId,
  })), source: 'supabase' as const };
}

export const getV2Topics = unstable_cache(async (): Promise<{data: TopicItem[]; source: 'supabase'}> => {
  const { data, error } = await client().from('articles')
    .select('slug,short_code,title,featured,is_alert').eq('status', 'published')
    .or('featured.eq.true,is_alert.eq.true').order('published_at', { ascending: false }).limit(5);
  if (error) throw new Error(error.message);
  return { data: (data ?? []).map((a) => ({
    label: a.title.length > 58 ? a.title.slice(0, 55).trimEnd() + '…' : a.title,
    link: '/a/' + a.short_code,
  })), source: 'supabase' };
}, ['v2-header-topics'], { revalidate: 120, tags: ['public-articles'] });

export const getV2Programs = unstable_cache(async () => {
  const { data, error } = await client().from('shows')
    .select('id,slug,title,description,tagline,schedule_label,host_name,category_id,cover_media_id,intro_video_url')
    .eq('is_active', true).order('position');
  if (error) throw new Error(error.message);
  const index = await lookups((data ?? []).map((p) => p.cover_media_id));
  return {
    data: (data ?? []).map((p) => ({
      id: p.id, slug: p.slug, name: p.title, host: p.host_name||'',
      slot: p.schedule_label, category: index.categories.get(p.category_id)?.name ?? 'Émission',
      image: imageUrl(index.media.get(p.cover_media_id)), description: p.description || p.tagline,introVideoUrl:p.intro_video_url??null,
    })),
    source: 'supabase' as const,
  };
}, ['v2-public-programs'], { revalidate: 300, tags: ['public-programs'] });

function playUrl(platform: string | null, externalId: string | null) {
  if (!externalId || !platform) return '';
  if (platform === 'youtube') return 'https://www.youtube.com/watch?v=' + encodeURIComponent(externalId);
  if (platform === 'dailymotion') return 'https://www.dailymotion.com/video/' + encodeURIComponent(externalId);
  return '';
}

export const getV2Episodes = unstable_cache(async (limit = 24): Promise<{data: PublicEpisode[];source:'supabase'}> => {
  const { data, error } = await client().from('episodes')
    .select('id,show_id,title,description,platform,external_id,source_url,thumbnail_url,duration_seconds,aired_at,created_at')
    .eq('status', 'published').order('aired_at', { ascending: false }).limit(limit);
  if (error) throw new Error(error.message);
  return { data: (data ?? []).map((e) => ({
    id: e.id, programId: e.show_id, title: e.title, description: e.description ?? '',
    videoUrl: videoWatchUrl(e.platform, e.external_id, e.source_url), thumbnail: e.thumbnail_url || (e.platform==='youtube' && /^[a-zA-Z0-9_-]{11}$/.test(e.external_id||'') ? 'https://i.ytimg.com/vi/'+e.external_id+'/hqdefault.jpg' : ''),
    duration: e.duration_seconds != null ? Math.ceil(e.duration_seconds / 60) + ' min' : '',
    publishedAt: e.aired_at ?? e.created_at,
  })), source: 'supabase' };
}, ['v2-public-episodes'], { revalidate: 120, tags: ['public-episodes'] });

export const getV2Schedule = unstable_cache(async () => {
  const { data, error } = await client().from('program_slots')
    .select('weekday,start_time,title,kind').order('weekday').order('start_time').limit(300);
  if (error) throw new Error(error.message);
  return { data: (data ?? []).map((p) => ({
    weekday: p.weekday==null?undefined:Number(p.weekday), time: String(p.start_time).slice(0, 5), title: p.title,
    category: p.kind, live: false,
  })), source: 'supabase' as const };
}, ['v2-public-schedule'], { revalidate: 600, tags: ['public-schedule'] });

export async function searchV2(query: string) {
  const { items } = await listV2Articles({ search: query, pageSize: 40 });
  return { items: items.map((s) => ({
    title: s.title, category: s.category, description: s.summary,
    href: s.shortId ? '/a/' + s.shortId : '/article/' + s.slug, type: 'Article',
  })), source: 'supabase' as const };
}

/** Requête d'agrégat en cache : une seule ligne par article. */
export const getV2ArticleReadCount = unstable_cache(async (articleId:string):Promise<number> => {
  if(!/^[0-9a-f-]{36}$/i.test(articleId))return 0;
  const {data,error}=await client().from('article_read_stats').select('reads').eq('article_id',articleId).maybeSingle();
  if(error)return 0;
  return Math.max(0,Number(data?.reads)||0);
},['tvplus-v2-read-count'],{revalidate:120});

export const getV2EpisodeById = unstable_cache(async (id:string):Promise<PublicEpisode|null> => {
 const {data:e,error}=await client().from('episodes').select('id,show_id,title,description,platform,external_id,source_url,thumbnail_url,duration_seconds,aired_at,created_at').eq('status','published').eq('id',id).maybeSingle();
 if(error) throw new Error(error.message);
 if(!e)return null;
 return {id:e.id,programId:e.show_id,title:e.title,description:e.description??'',videoUrl:videoWatchUrl(e.platform,e.external_id,e.source_url),thumbnail:e.thumbnail_url||(e.platform==='youtube'&&/^[a-zA-Z0-9_-]{11}$/.test(e.external_id||'')?'https://i.ytimg.com/vi/'+e.external_id+'/hqdefault.jpg':''),duration:e.duration_seconds!=null?Math.ceil(e.duration_seconds/60)+' min':'',publishedAt:e.aired_at??e.created_at};
},['seo-public-episode-detail'],{revalidate:120,tags:['public-episodes']});
