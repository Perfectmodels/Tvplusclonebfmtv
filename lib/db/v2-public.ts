import 'server-only';
import {unstable_cache} from 'next/cache';
import {listLwsArticles,getLwsArticle,getLwsCategories,getLwsTopics,getLwsPrograms,getLwsEpisodes,readLwsResource} from './lws-public';
import {newsroom} from '../admin-v2/lws';
import {getPublicServerSupabase} from '../supabase/server';
// Nom historique du mode de présentation, indépendant de tout fournisseur de données.
export const usesTvplusV2=()=>true;
export const getTvplusV2PublicClient=getPublicServerSupabase; // anciennes routes non portées : échec fermé
export const listV2Articles=unstable_cache(listLwsArticles,['mysql-public-articles-v1'],{revalidate:60,tags:['public-articles']});
export const getV2ArticleBySlug=unstable_cache((slug:string)=>getLwsArticle({slug}),['mysql-public-slug'],{revalidate:60,tags:['public-articles']});
export const getV2ArticleByShortCode=unstable_cache((code:string)=>getLwsArticle({code}),['mysql-public-code'],{revalidate:60,tags:['public-articles']});
export const getV2Categories=unstable_cache(getLwsCategories,['mysql-public-categories'],{revalidate:300,tags:['public-categories']});
export async function getV2FilActu(limit=20){const {items}=await listV2Articles({pageSize:limit});return {data:items.map(a=>({time:a.time,category:a.category,title:a.title,summary:a.summary,slug:a.slug,image:a.image,shortId:a.shortId,publishedAt:a.publishedAt})),source:'mysql' as const};}
export const getV2Topics=getLwsTopics;
export const getV2Programs=getLwsPrograms;
export const getV2Episodes=getLwsEpisodes;
export async function getV2Schedule(){const {items}=await readLwsResource<{items:{weekday:number;time:string;title:string;category:string;live:boolean}[]}>('schedule',{},['public-schedule']);return {data:items,source:'mysql' as const};}
export async function searchV2(query:string){const {items}=await listV2Articles({search:query,pageSize:40});return {items:items.map(s=>({title:s.title,category:s.category,description:s.summary,href:s.shortId?'/a/'+s.shortId:'/article/'+s.slug,type:'Article'})),source:'mysql' as const};}
export const getV2ArticleReadCount=unstable_cache(async(id:string):Promise<number>=>{if(!/^[0-9a-f-]{36}$/i.test(id))return 0;try{const {reads}=await newsroom<{reads:number}>({id:'public',permissions:[]},'reads.get',{data:{id}});return Math.max(0,Number(reads)||0);}catch{return 0;}},['mysql-read-count'],{revalidate:120});
