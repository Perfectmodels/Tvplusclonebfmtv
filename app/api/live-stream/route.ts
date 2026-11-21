import { NextResponse } from 'next/server';
import { getPublicServerSupabase } from '../../../lib/supabase/server';
import { usesTvplusV2 } from '../../../lib/db/v2-public';
export const dynamic='force-dynamic';
export async function GET(){
  if(!usesTvplusV2())return NextResponse.json({success:true,data:{enabled:false,title:'TV+ Afrique',hlsUrl:''}},
    {headers:{'Cache-Control':'public, s-maxage=30, stale-while-revalidate=90'}});
  try{
    const {data,error}=await getPublicServerSupabase().from('site_live_settings')
      .select('title,hls_url,enabled').eq('id',1).maybeSingle();
    if(error)throw error;
    return NextResponse.json({success:true,data:{enabled:Boolean(data?.enabled),
      title:data?.title??'TV+ Afrique',hlsUrl:data?.enabled?data?.hls_url??'':''}},
      {headers:{'Cache-Control':'public, s-maxage=30, stale-while-revalidate=90'}});
  }catch{return NextResponse.json({success:true,data:{enabled:false,title:'TV+ Afrique',hlsUrl:''}},
    {headers:{'Cache-Control':'public, s-maxage=15'}});}
}
