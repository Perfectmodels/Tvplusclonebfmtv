import 'server-only';
import {unstable_cache} from 'next/cache';
import {readLwsResource} from '../db/lws-public';
import {parseVideoUrl} from '../video/providers';
import {isPlayableAudioUrl,isPlayableVideoUrl} from './urls';
import {mediaSource,metaSchema,blankMeta,type StudioMeta} from './studio-types';
export type MediaKind='reel'|'reportage'|'podcast';
export type CatalogItem={id:string;kind:MediaKind;title:string;description:string;category:string;source_url:string;thumbnail_url:string;duration_seconds:number|null;published_at:string|null;studio_meta?:StudioMeta};
export const validMedia=(kind:MediaKind,url:string)=>mediaSource(kind,url);
function normalizeMedia(m:CatalogItem):CatalogItem {let raw:unknown=m.studio_meta;if(typeof raw==='string'){try{raw=JSON.parse(raw);}catch{raw={};}}return {...m,studio_meta:metaSchema.safeParse(raw??{}).data??blankMeta()};}
export const listCatalog=unstable_cache(async(kind?:MediaKind,limit=60,page=1)=>{
 try{
 const filters:Record<string,string>={limit:String(Math.max(1,Math.min(100,limit))),offset:String((Math.max(1,page)-1)*Math.max(1,Math.min(100,limit)))};if(kind)filters.kind=kind;
 const {items,total}=await readLwsResource<{items:CatalogItem[];total?:number}>('media_catalog',filters,['editorial-media']);
 return {items:items.filter(m=>validMedia(m.kind,m.source_url)).map(normalizeMedia),available:true,total:total??items.length};
 }catch{return {items:[] as CatalogItem[],available:false,total:0};}
},['editorial-media-catalog'],{revalidate:120,tags:['editorial-media']});
export const catalogItem=unstable_cache(async(id:string)=>{
 if(!/^[a-f0-9-]{36}$/i.test(id))return null;
 const {items}=await readLwsResource<{items:CatalogItem[]}>('media_detail',{id},['editorial-media']);const data=items[0];
 return data&&validMedia(data.kind,data.source_url)?normalizeMedia(data):null;
},['editorial-media-detail'],{revalidate:120,tags:['editorial-media']});
