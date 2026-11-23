
import { NextRequest,NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import { getPublicServerSupabase } from '../../../lib/supabase/server';
import { resolveLivePlayback } from '../../../lib/video/live-platforms';

export const dynamic='force-dynamic';
const empty={enabled:false,title:'TV+ Afrique en direct',description:'',hlsUrl:'',platform:'restream',embedUrl:'',playbackUrl:'',standbyMessage:'TV+ Afrique — le direct sera disponible prochainement.'};
// Courte mise en cache CDN : moins de calculs et requêtes Supabase, régie reste la source unique.
const headers={'Cache-Control':'public, max-age=60, s-maxage=300, stale-while-revalidate=300'};

// Même petite configuration publique partagée entre les visiteurs. Le contenu est invalidé
// par la régie quand un lecteur est changé ; Restream gère seul OFFLINE / LIVE.
const getCachedLiveSettings = unstable_cache(async () => {
  const {data,error}=await getPublicServerSupabase().from('site_live_settings')
   .select('title,description,standby_message,playback_url,player_platform,enabled,starts_at,ends_at')
   .eq('id',1).maybeSingle();
  if(error)throw error;
  return data;
},['tvplus-public-live-settings-v1'],{tags:['tvplus-public-live-settings'],revalidate:900});
export async function GET(request:NextRequest){
 try{
  const data=await getCachedLiveSettings();
  const now=Date.now();
  const enabled=Boolean(data?.enabled&&(!data?.starts_at||Date.parse(data.starts_at)<=now)&&(!data?.ends_at||Date.parse(data.ends_at)>now));
  // Restream produit le signal, et le site n'affiche que Restream Embed ou le YouTube Live diffusé par Restream.
  // Aucune source HLS historique n'est autorisée.
  const platform=(data?.player_platform==='youtube'||data?.player_platform==='restream')?data.player_platform:'restream';
  const player=resolveLivePlayback(platform,data?.playback_url||'',request.nextUrl.hostname);
  const onAir=enabled&&player.supported&&Boolean(player.embedUrl);
  return NextResponse.json({success:true,data:{
   enabled:onAir,title:data?.title||empty.title,description:data?.description||'',
   hlsUrl:'',platform,
   embedUrl:onAir?player.embedUrl:'',playbackUrl:onAir?player.externalUrl:'',
   standbyMessage:data?.standby_message||empty.standbyMessage
  }},{headers});
 }catch{return NextResponse.json({success:true,data:empty},{headers:{'Cache-Control':'no-store'}})}
}
