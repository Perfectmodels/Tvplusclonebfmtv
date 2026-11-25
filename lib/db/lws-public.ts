import 'server-only';
import { editorialAuthorName } from '../articles/author-names';
import { canonicalCategoryLabel, categorySlug } from '../categories';
import { relativeTime } from './format';
import { videoWatchUrl } from '../video/providers';
import {legacyShows,legacyEpisodes,legacyEnabled} from './legacy-programming';
import type { programs } from '../extra';
import type { PublicEpisode, PublicArticle } from './repository';

export const usesLwsCatalog = () => true; // MySQL est désormais la seule source.

async function read<T>(resource: string, filters: Record<string, string>, tags: string[]) {
  // Pendant `next build`, le catalogue peut être absent (variable non définie en local,
  // API LWS non encore déployée). On renvoie un résultat vide pour ne pas bloquer la
  // compilation : avec `revalidate`, les données sont récupérées au premier accès.
  const buildPhase = process.env.NEXT_PHASE === 'phase-production-build';
  const empty = () => ({ items: [], total: 0 }) as T;
  const endpoint=process.env.LWS_EDITORIAL_API_URL;
  if(!endpoint){
    if(buildPhase) return empty();
    throw new Error('LWS_EDITORIAL_API_URL manquante.');
  }
  const url=new URL(endpoint);if(url.protocol!=='https:'||url.username||url.password)throw new Error('API LWS HTTPS requise.');
  url.search = new URLSearchParams({ resource, ...filters }).toString();
  let response: Response;
  try {
    response = await fetch(url, { next: { revalidate: 60, tags }, redirect:'error', signal: AbortSignal.timeout(8000) });
  } catch (error) {
    if(buildPhase) return empty();
    throw error;
  }
  if (!response.ok) {
    if(buildPhase) return empty();
    throw new Error('Catalogue MySQL indisponible.');
  }
  return await response.json() as T;
}

/** Lecture publique générique : aucun appel Supabase quand LWS est configuré. */
export const readLwsResource = <T>(resource: string, filters: Record<string, string> = {}, tags: string[] = []) =>
  read<T>(resource, filters, tags);

type Article = {
  id: string; slug: string; short_code: string; title: string; excerpt: string | null;
  category: string | null; cover_url: string | null; published_at: string; updated_at: string | null;
  featured: number; is_alert: number; is_video_article: number; tags_json: string | null;
  seo_title: string | null; seo_description: string | null; country_code: string;
  author_name?: string | null; article_reads?: number;
  video_source_url?:string|null;content_html?: string; cover_alt?: string; cover_credit?: string; cover_caption?: string; province_slug?: string;
};

function mapArticle(row: Article): PublicArticle {
  const publishedAt = new Date(row.published_at.includes('T')?row.published_at:row.published_at.replace(' ','T')+'Z').toISOString();
  let tags:string[]=[];try{const parsed=JSON.parse(row.tags_json||'[]');if(Array.isArray(parsed))tags=parsed.filter((t:unknown):t is string=>typeof t==='string');}catch{}
  const wordCount = row.content_html?.replace(/<[^>]*>/g, ' ').trim().split(/\s+/).filter(Boolean).length;
  return {
    articleId: row.id, shortId: row.short_code, slug: row.slug, title: row.title,
    category: canonicalCategoryLabel(row.category || 'Actualité'), summary: row.excerpt || '', chapter: row.excerpt,
    image: row.cover_url || '', coverAlt: row.cover_alt, coverCredit: row.cover_credit, coverCaption: row.cover_caption,
    featured: Boolean(Number(row.featured)), kind: Number(row.is_alert) ? 'alert' : Number(row.is_video_article) ? 'video' : undefined,
    time: relativeTime(publishedAt), publishedAt, updatedAt: row.updated_at?.replace(' ', 'T').concat('Z'),
    countryCode: row.country_code, province: row.province_slug, tags, keywords: tags,
    seoTitle: row.seo_title, seoDescription: row.seo_description, contentHtml: row.content_html,videoUrl:row.video_source_url??null,
    wordCount, readingTime: wordCount ? Math.ceil(wordCount / 220) : undefined,
    author: editorialAuthorName(row.author_name) || 'La rédaction TV+', reads: Number(row.article_reads) || 0,
  };
}

export async function listLwsArticles({ category, country, province, excludeSlugs=[], videoOnly=false, search, page = 1, pageSize = 12 }: {
  category?: string; country?: string; province?:string; excludeSlugs?:string[];videoOnly?:boolean;search?: string; page?: number; pageSize?: number;
}) {
  const filters: Record<string, string> = { offset: String((page - 1) * pageSize), limit: String(pageSize) };
  if (category) filters.category = categorySlug(category);
  if (country) filters.country = country;
  if(province)filters.province=province;
  if(videoOnly)filters.video='1';
  if(excludeSlugs.length)filters.exclude=excludeSlugs.slice(0,2).join(',');
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
  const names = [...new Set(result.items.map(row => canonicalCategoryLabel(row.name)))];
  return { data: names, source: 'mysql' as const };
}

type Program = (typeof programs)[number];
export async function getLwsPrograms() {
  try {const {items}=await read<{items:Program[]}>('programs',{},['public-programs']);return {data:items.length||!legacyEnabled()?items:legacyShows,source:'mysql' as const};}
  catch {return {data:legacyEnabled()?legacyShows:[] as Program[],source:'mysql' as const,...(legacyEnabled()?{}:{error:'Le catalogue des émissions est en cours de configuration.'})};}
}
type Episode = {id:string;show_id:string;title:string;description:string;platform:string|null;external_id:string|null;source_url:string;thumbnail_url:string;duration_seconds:number|null;aired_at:string};
export async function getLwsEpisodes(limit=24,id?:string) {
  try {
    const {items}=await read<{items:Episode[]}>('episodes',{limit:String(limit),...(id?{id}:{})},['public-episodes']);
    if(!id&&!items.length&&legacyEnabled())return {data:legacyEpisodes.slice(0,limit),source:'mysql' as const};
    return {source:'mysql' as const,data:items.map((e):PublicEpisode=>({id:e.id,programId:e.show_id,title:e.title,description:e.description||'',videoUrl:videoWatchUrl(e.platform,e.external_id,e.source_url),thumbnail:e.thumbnail_url||(e.platform==='youtube'&&/^[a-zA-Z0-9_-]{11}$/.test(e.external_id||'')?'https://i.ytimg.com/vi/'+e.external_id+'/hqdefault.jpg':''),duration:e.duration_seconds==null?'':Math.ceil(Number(e.duration_seconds)/60)+' min',publishedAt:e.aired_at.replace(' ','T')+'Z'}))};
  } catch {return {data:!id&&legacyEnabled()?legacyEpisodes.slice(0,limit):[] as PublicEpisode[],source:'mysql' as const,...(!id&&legacyEnabled()?{}:{error:'Le catalogue des replays est en cours de configuration.'})};}
}
export async function getLwsVideoArticles() {
 const {items}=await read<{items:Article[]}>('articles',{video:'1',limit:'100'},['public-articles']);
 return items.map(mapArticle);
}
export async function getLwsTopics() {
 const {items}=await read<{items:Article[]}>('articles',{highlights:'1',limit:'5'},['public-articles']);
 return {data:items.map(a=>({label:a.title.length>58?a.title.slice(0,55).trimEnd()+'…':a.title,link:'/a/'+a.short_code})),source:'mysql' as const};
}
