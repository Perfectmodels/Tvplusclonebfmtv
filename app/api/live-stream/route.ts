
import { NextRequest,NextResponse } from 'next/server';
import { getPublicServerSupabase } from '../../../lib/supabase/server';
import { resolveLivePlayback } from '../../../lib/video/live-platforms';

export const dynamic='force-dynamic';
const empty={enabled:false,title:'TV+ Afrique en direct',description:'',hlsUrl:'',platform:'restream',embedUrl:'',playbackUrl:'',standbyMessage:'TV+ Afrique — le direct sera disponible prochainement.'};
// Courte mise en cache CDN : moins de calculs et requêtes Supabase, régie reste la source unique.
const headers={'Cache-Control':'public, s-maxage=15, stale-while-revalidate=15'};
export async function GET(request:NextRequest){
 try{
  const {data,error}=await getPublicServerSupabase().from('site_live_settings')
   .select('title,description,standby_message,hls_url,playback_url,player_platform,enabled,starts_at,ends_at')
   .eq('id',1).maybeSingle();
  if(error)throw error;
  const now=Date.now();
  const enabled=Boolean(data?.enabled&&(!data?.starts_at||Date.parse(data.starts_at)<=now)&&(!data?.ends_at||Date.parse(data.ends_at)>now));
  // La chaîne TV+ utilise uniquement Restream : aucune ancienne URL HLS ne peut être servie en secours.
  const platform='restream';
  const player=resolveLivePlayback(platform,data?.player_platform==='restream' ? (data?.playback_url||'') : '',request.nextUrl.hostname);
  const onAir=enabled&&player.supported&&Boolean(player.embedUrl);
  return NextResponse.json({success:true,data:{
   enabled:onAir,title:data?.title||empty.title,description:data?.description||'',
   hlsUrl:'',platform,
   embedUrl:onAir?player.embedUrl:'',playbackUrl:onAir?player.externalUrl:'',
   standbyMessage:data?.standby_message||empty.standbyMessage
  }},{headers});
 }catch{return NextResponse.json({success:true,data:empty},{headers})}
}
