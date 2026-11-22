
import { NextRequest,NextResponse } from 'next/server';
import { getPublicServerSupabase } from '../../../lib/supabase/server';
import { resolveLivePlayback } from '../../../lib/video/live-platforms';

export const dynamic='force-dynamic';
const empty={enabled:false,title:'TV+ Afrique',description:'',hlsUrl:'',platform:'hls',embedUrl:'',playbackUrl:'',standbyMessage:'Le direct reprendra prochainement.'};
const headers={'Cache-Control':'no-store'};
export async function GET(request:NextRequest){
 try{
  const {data,error}=await getPublicServerSupabase().from('site_live_settings')
   .select('title,description,standby_message,hls_url,playback_url,player_platform,enabled,starts_at,ends_at')
   .eq('id',1).maybeSingle();
  if(error)throw error;
  const now=Date.now();
  const enabled=Boolean(data?.enabled&&(!data?.starts_at||Date.parse(data.starts_at)<=now)&&(!data?.ends_at||Date.parse(data.ends_at)>now));
  const platform=data?.player_platform||'hls';
  const player=resolveLivePlayback(platform,data?.playback_url||data?.hls_url||'',request.nextUrl.hostname);
  const onAir=enabled&&player.supported&&Boolean(player.hlsUrl||player.embedUrl);
  return NextResponse.json({success:true,data:{
   enabled:onAir,title:data?.title||empty.title,description:data?.description||'',
   hlsUrl:onAir?player.hlsUrl:'',platform,
   embedUrl:onAir?player.embedUrl:'',playbackUrl:onAir?player.externalUrl:'',
   standbyMessage:data?.standby_message||empty.standbyMessage
  }},{headers});
 }catch{return NextResponse.json({success:true,data:empty},{headers})}
}
