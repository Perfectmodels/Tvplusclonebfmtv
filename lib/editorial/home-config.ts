import 'server-only';
import {unstable_cache} from 'next/cache';
import {readLwsResource} from '../db/lws-public';
export const defaultHomeOrder=['reels','ligne-rouge','replays','reportages','podcasts'] as const;
export type HomeBlock=typeof defaultHomeOrder[number];
export const readHomeConfig=unstable_cache(async()=>{
 try{const data=await readLwsResource<{order:unknown;hidden:unknown}>('home_layout',{},['home-editorial-settings']);
 const order=(Array.isArray(data.order)?data.order:[]).filter((v:unknown):v is HomeBlock=>defaultHomeOrder.includes(v as HomeBlock));
 const hidden=(Array.isArray(data.hidden)?data.hidden:[]).filter((v:unknown):v is HomeBlock=>defaultHomeOrder.includes(v as HomeBlock));
 return {order:[...new Set<HomeBlock>([...order,...defaultHomeOrder])],hidden};
 }catch{return {order:[...defaultHomeOrder],hidden:[] as HomeBlock[]};}
},['home-editorial-settings'],{revalidate:300,tags:['home-editorial-settings']});
