import 'server-only';
import * as v2 from './v2-public';
import {getLwsEpisodes} from './lws-public';
import {listCatalog,type MediaKind} from '../media/catalog';
import {newsroom} from '../admin-v2/lws';
import {getV2Actor} from '../auth/v2-admin';
import {relativeTime} from './format';
import {articlePath} from '../articles/urls';
import type {Story} from '../data';
import {topics,topicLinks} from '../data';
import {channels,witnesses,newsletters,practicalServices} from '../extra';
import type {MediaItem,Program} from '../extra';
import type {DataSource,Paginated,NewsletterRow,ContactRow} from './types';
type Wrapped<T>={data:T;source:DataSource;error?:string};
export type TopicItem={label:string;link:string};
export type PublicArticle = Story & {
  articleId?: string;
  videoUrl?:string|null;
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
  reads?: number;
};


export type PublicEpisode={id:string;programId:string|null;title:string;description:string;videoUrl:string;thumbnail:string;duration:string;publishedAt:string};
export const listArticles=(options:Parameters<typeof v2.listV2Articles>[0]={}):Promise<Paginated<Story>>=>v2.listV2Articles(options);
export const getArticleBySlug=v2.getV2ArticleBySlug;
export const getArticleByShortId=v2.getV2ArticleByShortCode;
export const getCategories=v2.getV2Categories;
export const getFilActu=v2.getV2FilActu;
export const getHeaderTopics=v2.getV2Topics;
export const getSiteTopics=v2.getV2Topics;
export const getPrograms=():Promise<Wrapped<Program[]>>=>v2.getV2Programs();
export const getEpisodes=(limit=24):Promise<Wrapped<PublicEpisode[]>>=>v2.getV2Episodes(limit);
export const getTvSchedule=v2.getV2Schedule;
export async function getEpisodeById(id:string):Promise<PublicEpisode|null>{if(!/^[0-9a-f-]{36}$/i.test(id))return null;const {data}=await getLwsEpisodes(1,id);return data[0]??null;}
async function media(kind:MediaKind):Promise<Wrapped<MediaItem[]>>{const r=await listCatalog(kind);return {source:'mysql',data:r.items.map(m=>({id:m.id,title:m.title,category:m.category,image:m.thumbnail_url,duration:m.duration_seconds==null?'':Math.ceil(Number(m.duration_seconds)/60)+' min',time:relativeTime(m.published_at),description:m.description,href:m.source_url})),...(r.available?{}:{error:'Catalogue indisponible'})};}
export const getVideos=()=>media('reportage');
export const getPodcasts=()=>media('podcast');
export async function getChannels(){return {data:channels,source:'mysql' as const};}
export async function getTestimonials(){return {data:witnesses,source:'mysql' as const};}
export async function getNewsletterFormats(){return {data:newsletters,source:'mysql' as const};}
export async function getPracticalServices(){return {data:practicalServices,source:'mysql' as const};}
export async function searchAll(query:string){return v2.searchV2(query);}
export async function subscribeNewsletter(email:string,newsletter:string){const data=await newsroom<{id:string;created_at:string}>({id:'public',permissions:[]},'forms.newsletter',{data:{email,newsletter}});return {...data,email,newsletter} as NewsletterRow;}
export async function createContact(payload:{name:string;email:string;subject:string;message:string}){return newsroom<Pick<ContactRow,'id'|'created_at'>>({id:'public',permissions:[]},'forms.contact',{data:payload});}
async function admin(){const actor=await getV2Actor();if(!actor?.permissions.includes('articles.read_all'))throw Error('Accès refusé');return actor;}
type Summary={published:number;drafts:number;review:number;scheduled:number;media:number;categories:number;recent:{id:string;title:string;status:string;updated_at:string}[]};
export async function getAdminStats(){const r=await newsroom<Summary>(await admin(),'dashboard');return {articles:r.published+r.drafts+r.review+r.scheduled,categories:r.categories,media:r.media,videos:-1,podcasts:-1,newsletter_subscriptions:-1,contacts:-1,programs:-1};}
export async function getDashboardStats(){const r=await newsroom<Summary>(await admin(),'dashboard');return {...r,archived:0,recent:r.recent.map(a=>({...a,category:'',date:a.updated_at}))};}
export {topics,topicLinks};
