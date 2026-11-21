import { NextResponse } from 'next/server';
import { getPublicServerSupabase } from '../../../lib/supabase/server';
import { usesTvplusV2 } from '../../../lib/db/v2-public';
import { videoEmbedUrl } from '../../../lib/video/providers';
export const dynamic='force-dynamic';
const empty={enabled:false,title:'TV+ Afrique',description:'',hlsUrl:'',platform:'hls',embedUrl:'',playbackUrl:'',standbyMessage:'Le direct reprendra prochainement.'};
const headers={'Cache-Control':'public, s-maxage=15, stale-while-revalidate=30'};
export async function GET(){
  if(!usesTvplusV2())return NextResponse.json({success:true,data:empty},{headers});
  try{
    const {data,error}=await getPublicServerSupabase().from('site_live_settings')
      .select('title,description,standby_message,hls_url,playback_url,player_platform,enabled,starts_at,ends_at')
      .eq('id',1).maybeSingle();
    if(error)throw error;
    const now=Date.now();
    const onAir=Boolean(data?.enabled&&(!data?.starts_at||Date.parse(data.starts_at)<=now)&&(!data?.ends_at||Date.parse(data.ends_at)>now));
    const platform=data?.player_platform||'hls';
    const url=data?.playback_url||data?.hls_url||'';
    const embedUrl=onAir&&platform!=='hls'?videoEmbedUrl(platform,null,url):'';
    return NextResponse.json({success:true,data:{
      enabled:onAir,title:data?.title||empty.title,description:data?.description||'',
      hlsUrl:onAir&&platform==='hls'?url:'',platform,
      embedUrl,playbackUrl:onAir?url:'',standbyMessage:data?.standby_message||empty.standbyMessage
    }},{headers});
  }catch{return NextResponse.json({success:true,data:empty},{headers:{'Cache-Control':'public, s-maxage=5'}})}
}
