
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireV2Api } from '../../../../lib/auth/v2-admin';
import { handleRoute,ok,ApiError } from '../../../../lib/api/response';
import { extractLiveUrl,resolveLivePlayback,isVercelOrSitePlaybackUrl } from '../../../../lib/video/live-platforms';
import { revalidatePath } from 'next/cache';

export const dynamic='force-dynamic';
const date=z.string().datetime({offset:true}).nullable();
const schema=z.object({
  title:z.string().trim().min(3).max(120),
  description:z.string().trim().max(1200).default(''),
  standby_message:z.string().trim().max(350).default('Le direct reprendra prochainement.'),
  player_platform:z.literal('restream'),
  playback_url:z.string().trim().max(3500),
  enabled:z.boolean(),
  starts_at:date.default(null),ends_at:date.default(null),
}).superRefine((v,ctx)=>{
  const playback=resolveLivePlayback(v.player_platform,v.playback_url);
  if(v.playback_url && isVercelOrSitePlaybackUrl(v.playback_url)){
    ctx.addIssue({code:'custom',path:['playback_url'],message:'URL refusée : utilisez un CDN vidéo ou un lecteur externe, jamais un domaine Vercel pour la vidéo.'});
  } else if(v.playback_url && !playback.playbackUrl){
    ctx.addIssue({code:'custom',path:['playback_url'],message:'Seul le lecteur iframe Restream est autorisé. Collez son code « Embed Player ».'});
  } else if(v.enabled && (!playback.hlsUrl && !playback.embedUrl)){
    ctx.addIssue({code:'custom',path:['playback_url'],message:'Pour activer le direct, fournissez le code « Embed Player » de Restream.'});
  }
  if(v.starts_at&&v.ends_at&&Date.parse(v.ends_at)<=Date.parse(v.starts_at)){
    ctx.addIssue({code:'custom',path:['ends_at'],message:'La fin doit être après le début.'});
  }
});
const fields='title,hls_url,enabled,description,standby_message,player_platform,playback_url,starts_at,ends_at,updated_at';
export const GET=handleRoute(async()=>{
  const {db}=await requireV2Api('schedule.manage');
  const {data,error}=await db.from('site_live_settings').select(fields).eq('id',1).maybeSingle();
  if(error||!data)throw new ApiError('Réglages de régie indisponibles.',503,'UNAVAILABLE');
  return ok(data);
});
export const PATCH=handleRoute(async(request:NextRequest)=>{
  const {db}=await requireV2Api('schedule.manage');
  const parsed=schema.safeParse(await request.json());
  if(!parsed.success)throw new ApiError('Configuration du direct invalide.',400,'BAD_REQUEST',parsed.error.flatten());
  const v=parsed.data;
  const normalized=extractLiveUrl(v.playback_url);
  const player=resolveLivePlayback(v.player_platform,normalized,request.nextUrl.hostname);
  if(isVercelOrSitePlaybackUrl(normalized,request.nextUrl.hostname)){
    throw new ApiError('Le flux doit être hébergé sur un serveur vidéo externe, pas sur Vercel.',400,'BAD_REQUEST');
  }
  if(v.enabled && (!player.supported || (!player.hlsUrl && !player.embedUrl))){
    throw new ApiError('Le direct exige un code « Embed Player » Restream valide.',400,'BAD_REQUEST');
  }
  const {data,error}=await db.from('site_live_settings')
    .update({
      ...v,playback_url:normalized,
      hls_url:player.hlsUrl,
      updated_at:new Date().toISOString()
    }).eq('id',1).select(fields).maybeSingle();
  if(error||!data)throw new ApiError('Modification du direct refusée.',403,'UNAUTHORIZED');
  revalidatePath('/direct');
  revalidatePath('/');
  return ok(data);
});
