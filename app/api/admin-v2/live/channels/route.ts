import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireV2Api } from '../../../../../lib/auth/v2-admin';
import { handleRoute,ok,created,ApiError } from '../../../../../lib/api/response';
export const dynamic='force-dynamic';
const schema=z.object({
  name:z.string().trim().min(2).max(120),
  platform:z.enum(['youtube','facebook','tiktok','twitch','dailymotion','vimeo','restream','mux','cloudflare','wowza','castr','custom']),
  watch_url:z.string().trim().max(1400).refine(v=>!v||/^https:\/\/[^\s]+$/i.test(v),'Lien public HTTPS uniquement'),
  enabled:z.boolean(),position:z.number().int().min(0).max(999).default(0),
  notes:z.string().trim().max(350).default(''),
}).refine(v=>!v.enabled||Boolean(v.watch_url),{message:'Un lien est requis pour activer la destination.'});
export const GET=handleRoute(async()=>{
  const {db}=await requireV2Api('schedule.manage');
  const {data,error}=await db.from('live_distribution_channels').select('id,name,platform,watch_url,enabled,position,notes,updated_at').order('position').order('name');
  if(error)throw new ApiError('Destinations indisponibles.',503,'UNAVAILABLE');
  return ok({items:data??[]});
});
export const POST=handleRoute(async(request:NextRequest)=>{
  const {db}=await requireV2Api('schedule.manage');
  const p=schema.safeParse(await request.json());
  if(!p.success)throw new ApiError('Vérifiez cette destination.',400,'BAD_REQUEST',p.error.flatten());
  const {data,error}=await db.from('live_distribution_channels').insert(p.data).select('id').single();
  if(error)throw new ApiError('Création de la destination refusée.',403,'UNAUTHORIZED');
  return created(data);
});
export const PATCH=handleRoute(async(request:NextRequest)=>{
  const {db}=await requireV2Api('schedule.manage');
  const p=schema.extend({id:z.string().uuid()}).safeParse(await request.json());
  if(!p.success)throw new ApiError('Destination invalide.',400);
  const {id,...values}=p.data;
  const {data,error}=await db.from('live_distribution_channels').update(values).eq('id',id).select('id').maybeSingle();
  if(error||!data)throw new ApiError('Modification refusée.',403,'UNAUTHORIZED');
  return ok(data);
});
export const DELETE=handleRoute(async(request:NextRequest)=>{
  const {db}=await requireV2Api('schedule.manage');
  const p=z.object({id:z.string().uuid()}).safeParse(await request.json());
  if(!p.success)throw new ApiError('Identifiant invalide.',400);
  const {error}=await db.from('live_distribution_channels').delete().eq('id',p.data.id);
  if(error)throw new ApiError('Suppression refusée.',403,'UNAUTHORIZED');
  return ok({deleted:true});
});
