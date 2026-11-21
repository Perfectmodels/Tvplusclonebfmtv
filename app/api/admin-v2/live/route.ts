import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireV2Api } from '../../../../lib/auth/v2-admin';
import { handleRoute,ok,ApiError } from '../../../../lib/api/response';
import { revalidatePath } from 'next/cache';
export const dynamic='force-dynamic';
const date=z.string().datetime({offset:true}).nullable();
const schema=z.object({
  title:z.string().trim().min(3).max(120),
  description:z.string().trim().max(1200).default(''),
  standby_message:z.string().trim().max(350).default('Le direct reprendra prochainement.'),
  player_platform:z.enum(['hls','youtube','facebook','tiktok','twitch','vimeo','dailymotion','custom']).default('hls'),
  playback_url:z.string().trim().max(1400).refine(v=>!v||/^https:\/\/[^\s]+$/i.test(v),'URL de lecture HTTPS uniquement'),
  enabled:z.boolean(),
  starts_at:date.default(null),ends_at:date.default(null),
}).superRefine((v,ctx)=>{
  if(v.enabled&&!v.playback_url)ctx.addIssue({code:'custom',message:'Renseignez un flux avant de rendre le direct visible.'});
  if(v.starts_at&&v.ends_at&&Date.parse(v.ends_at)<=Date.parse(v.starts_at))ctx.addIssue({code:'custom',message:'La fin doit être après le début.'});
  if(v.playback_url&&v.player_platform==='hls'&&!/^https:\/\/[^\s]+\.m3u8(?:\?.*)?$/i.test(v.playback_url))ctx.addIssue({code:'custom',message:'URL HLS .m3u8 HTTPS requise.'});
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
  const {data,error}=await db.from('site_live_settings')
    .update({...v,hls_url:v.player_platform==='hls'?v.playback_url:'',updated_at:new Date().toISOString()})
    .eq('id',1).select(fields).maybeSingle();
  if(error||!data)throw new ApiError('Modification du direct refusée.',403,'UNAUTHORIZED');
  revalidatePath('/direct');
  return ok(data);
});
