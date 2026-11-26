import 'server-only';
import {legacyVideoEnabled,legacyVideoList} from './legacy-video';
import {unstable_cache} from 'next/cache';
import {getTvplusV2PublicClient} from '../db/v2-public';
import {mediaSource,metaSchema,blankMeta,type StudioMeta} from './studio-types';
export type MediaKind='reel'|'reportage'|'podcast';
export type CatalogItem={id:string;kind:MediaKind;title:string;description:string;category:string;source_url:string;thumbnail_url:string;duration_seconds:number|null;published_at:string|null;studio_meta?:StudioMeta;legacyArticle?:string};
export const validMedia=(kind:MediaKind,url:string)=>mediaSource(kind,url);
function normalizeMedia(m:CatalogItem):CatalogItem {let raw:unknown=m.studio_meta;if(typeof raw==='string'){try{raw=JSON.parse(raw);}catch{raw={};}}const parsed=metaSchema.safeParse(raw??{});return {...m,duration_seconds:m.duration_seconds===null?null:Number(m.duration_seconds),published_at:m.published_at&&!m.published_at.includes('T')?m.published_at.replace(' ','T')+'Z':m.published_at,studio_meta:parsed.success?parsed.data:blankMeta()};}
function fallback(kind:MediaKind|undefined,limit:number,page:number,available:boolean){
 const rows=legacyVideoList(kind),size=Math.max(1,Math.min(100,limit));
 return {items:rows.slice((Math.max(1,page)-1)*size,Math.max(1,page)*size),available:available||rows.length>0,total:rows.length};
}
export const listCatalog=unstable_cache(async(kind?:MediaKind,limit=60,page=1)=>{
 const size=Math.max(1,Math.min(100,limit)),offset=(Math.max(1,page)-1)*size;
 try{
  let q=getTvplusV2PublicClient().from('editorial_media').select('id,kind,title,description,category,source_url,thumbnail_url,duration_seconds,published_at,studio_meta',{count:'exact'}).eq('status','published').lte('published_at',new Date().toISOString()).in('kind',['reel','reportage','podcast']);if(kind)q=q.eq('kind',kind);const {data,count,error}=await q.order('published_at',{ascending:false}).range(offset,offset+size-1);if(error)throw error;const items=(data??[]) as CatalogItem[];return {items:items.map(normalizeMedia),available:true,total:count??items.length};
 }catch{return {items:[] as CatalogItem[],available:false,total:0};}
},['editorial-media-catalog-v2'],{revalidate:120,tags:['editorial-media']});
export async function homeMediaCatalog(){
 const groups=await Promise.all((['reel','reportage','podcast'] as const).map(k=>listCatalog(k,8,1)));
 return {items:groups.flatMap(g=>g.items),available:groups.some(g=>g.available),total:groups.reduce((n,g)=>n+g.total,0)};
}
export const catalogItem=unstable_cache(async(id:string)=>{
 
 if(!/^[a-f0-9-]{36}$/i.test(id))return null;
 const {data,error}=await getTvplusV2PublicClient().from('editorial_media').select('id,kind,title,description,category,source_url,thumbnail_url,duration_seconds,published_at,studio_meta').eq('id',id).eq('status','published').lte('published_at',new Date().toISOString()).in('kind',['reel','reportage','podcast']).maybeSingle();if(error)throw error;
 return data?normalizeMedia(data as CatalogItem):null;
},['editorial-media-detail-v2'],{revalidate:120,tags:['editorial-media']});
