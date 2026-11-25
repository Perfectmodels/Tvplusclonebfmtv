import 'server-only';
import {legacyVideoEnabled,legacyVideoList} from './legacy-video';
import {unstable_cache} from 'next/cache';
import {readLwsResource} from '../db/lws-public';
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
  const filters:Record<string,string>={limit:String(size),offset:String(offset)};if(kind)filters.kind=kind;
  const {items,total}=await readLwsResource<{items:CatalogItem[];total?:number}>('media_catalog',filters,['editorial-media']);
  if(legacyVideoEnabled()&&!items.length&&(total===0||(page===1&&total===undefined)))return fallback(kind,size,page,true);
  if(legacyVideoEnabled()&&!items.length&&total===undefined&&page>1){
   const first=await readLwsResource<{items:CatalogItem[];total?:number}>('media_catalog',{...filters,offset:'0'},['editorial-media']);
   if(!first.items.length)return fallback(kind,size,page,true);
  }
  return {items:items.map(normalizeMedia),available:true,total:total??items.length};
 }catch{return fallback(kind,size,page,false);}
},['editorial-media-catalog-v2'],{revalidate:120,tags:['editorial-media']});
export async function homeMediaCatalog(){
 const groups=await Promise.all((['reel','reportage','podcast'] as const).map(k=>listCatalog(k,8,1)));
 return {items:groups.flatMap(g=>g.items),available:groups.some(g=>g.available),total:groups.reduce((n,g)=>n+g.total,0)};
}
export const catalogItem=unstable_cache(async(id:string)=>{
 if(id.startsWith('legacy-'))return legacyVideoList().find(m=>m.id===id)??null;
 if(!/^[a-f0-9-]{36}$/i.test(id))return null;
 const {items}=await readLwsResource<{items:CatalogItem[]}>('media_detail',{id},['editorial-media']);const data=items[0];
 return data?normalizeMedia(data):null;
},['editorial-media-detail-v2'],{revalidate:120,tags:['editorial-media']});
