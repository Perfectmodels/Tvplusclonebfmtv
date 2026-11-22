import 'server-only';
import { unstable_cache } from 'next/cache';
import placements from '../../data/homepage-ads.json';
import { getPublicServerSupabase } from '../supabase/server';
import { usesTvplusV2 } from '../db/v2-public';

export type Ad = {id:string;imageUrl:string;href:string;alt:string;advertiser:string};
export type Placement = keyof typeof placements;
type Ads = Record<Placement,Ad[]>;
const names: Placement[]=['after-hero','after-feed','after-live','after-selection','before-newsletter'];
const empty=():Ads=>Object.fromEntries(names.map(name=>[name,[]])) as Ads;

/** Ne montrer que les campagnes réellement actives et disposant d'un visuel. */
const cached=unstable_cache(async ():Promise<Ads>=>{
  if(!usesTvplusV2())return empty();
  const {data,error}=await getPublicServerSupabase().from('homepage_ad_slots')
    .select('banner,slot,advertiser,image_url,target_url,alt,active,starts_at,ends_at').eq('active',true).order('banner').order('slot');
  if(error)throw Error('Ads temporarily unavailable');
  const output=empty();
  const now=Date.now();
  for(const row of data??[]){
    if((row.starts_at&&Date.parse(row.starts_at)>now)||(row.ends_at&&Date.parse(row.ends_at)<=now))continue;
    if(row.banner<1||row.banner>5||row.slot<1||row.slot>5||!row.image_url||!row.alt)continue;
    const name=names[row.banner-1];
    output[name].push({
      id:'homepage-'+row.banner+'-'+row.slot,
      imageUrl:row.image_url||'',href:row.target_url||'',
      alt:row.alt||'',advertiser:row.advertiser||''
    });
  }
  return output;
},['tvplus-v2-homepage-ads'],{revalidate:60,tags:['homepage-ads']});
export async function getHomepageAds():Promise<Ads>{
  try{return await cached()}catch{return empty()}
}
