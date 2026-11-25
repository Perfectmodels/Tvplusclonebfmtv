import 'server-only';
import {unstable_cache} from 'next/cache';
import {readLwsResource} from '../db/lws-public';
import {parseVideoUrl} from '../video/providers';
import {isPlayableAudioUrl,isPlayableVideoUrl} from './urls';
export type MediaKind='reel'|'reportage'|'podcast';
export type CatalogItem={id:string;kind:MediaKind;title:string;description:string;category:string;source_url:string;thumbnail_url:string;duration_seconds:number|null;published_at:string|null};
export const validMedia=(kind:MediaKind,url:string)=>kind==='podcast'?isPlayableAudioUrl(url):!!parseVideoUrl(url)||isPlayableVideoUrl(url);
export const listCatalog=unstable_cache(async(kind?:MediaKind,limit=60)=>{
 try{
 const filters:Record<string,string>={limit:String(Math.min(100,limit))};if(kind)filters.kind=kind;
 const {items}=await readLwsResource<{items:CatalogItem[]}>('media_catalog',filters,['editorial-media']);
 return {items:items.filter(m=>validMedia(m.kind,m.source_url)),available:true};
 }catch{return {items:[] as CatalogItem[],available:false};}
},['editorial-media-catalog'],{revalidate:120,tags:['editorial-media']});
export const catalogItem=unstable_cache(async(id:string)=>{
 if(!/^[a-f0-9-]{36}$/i.test(id))return null;
 const {items}=await readLwsResource<{items:CatalogItem[]}>('media_detail',{id},['editorial-media']);const data=items[0];
 return data&&validMedia(data.kind,data.source_url)?data:null;
},['editorial-media-detail'],{revalidate:120,tags:['editorial-media']});
