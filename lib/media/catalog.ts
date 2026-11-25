import 'server-only';
import {unstable_cache} from 'next/cache';
import {getPublicServerSupabase} from '../supabase/server';
import {parseVideoUrl} from '../video/providers';
import {isPlayableAudioUrl,isPlayableVideoUrl} from './urls';
export type MediaKind='reel'|'reportage'|'podcast';
export type CatalogItem={id:string;kind:MediaKind;title:string;description:string;category:string;source_url:string;thumbnail_url:string;duration_seconds:number|null;published_at:string|null};
export const validMedia=(kind:MediaKind,url:string)=>kind==='podcast'?isPlayableAudioUrl(url):!!parseVideoUrl(url)||isPlayableVideoUrl(url);
export const listCatalog=unstable_cache(async(kind?:MediaKind,limit=60)=>{
 try{
 let q=getPublicServerSupabase().from('editorial_media').select('id,kind,title,description,category,source_url,thumbnail_url,duration_seconds,published_at').eq('status','published').lte('published_at',new Date().toISOString());
 if(kind)q=q.eq('kind',kind);
 const {data,error}=await q.order('published_at',{ascending:false}).limit(Math.min(100,limit));
 if(error)return {items:[] as CatalogItem[],available:false};
 return {items:((data??[]) as CatalogItem[]).filter(m=>validMedia(m.kind,m.source_url)),available:true};
 }catch{return {items:[] as CatalogItem[],available:false};}
},['editorial-media-catalog'],{revalidate:120,tags:['editorial-media']});
export const catalogItem=unstable_cache(async(id:string)=>{
 if(!/^[a-f0-9-]{36}$/i.test(id))return null;
 const {data,error}=await getPublicServerSupabase().from('editorial_media').select('id,kind,title,description,category,source_url,thumbnail_url,duration_seconds,published_at').eq('id',id).eq('status','published').lte('published_at',new Date().toISOString()).maybeSingle();
 return !error&&data&&validMedia(data.kind,data.source_url)?data as CatalogItem:null;
},['editorial-media-detail'],{revalidate:120,tags:['editorial-media']});
