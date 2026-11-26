import 'server-only';
import {unstable_cache} from 'next/cache';
import {getTvplusV2PublicClient} from '../db/v2-public';
export const listRedLine=unstable_cache(async(limit=8,page=1)=>{
 const size=Math.min(100,Math.max(1,limit)),start=(Math.max(1,page)-1)*size;
 const {data,count,error}=await getTvplusV2PublicClient().from('editorial_media').select('id,title,description,thumbnail_url,published_at',{count:'exact'}).eq('kind','ligne-rouge').eq('status','published').lte('published_at',new Date().toISOString()).order('published_at',{ascending:false}).range(start,start+size-1);
 if(error)throw error;
 return {items:data??[],total:count??0};
},['public-red-line'],{revalidate:120,tags:['editorial-media']});
