import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireV2Api } from '../../../../lib/auth/v2-admin';
import { handleRoute,ok,ApiError } from '../../../../lib/api/response';
export const dynamic='force-dynamic';
const schema=z.object({
  title:z.string().trim().min(3).max(120),
  hls_url:z.string().trim().max(1400).refine(s=>!s||/^https:\/\//.test(s),'URL HTTPS uniquement'),
  enabled:z.boolean(),
}).refine(v=>!v.enabled||Boolean(v.hls_url),{message:'Définissez un flux HLS avant de l’activer'});
export const GET=handleRoute(async()=>{
  const {db}=await requireV2Api('schedule.manage');
  const {data,error}=await db.from('site_live_settings').select('title,hls_url,enabled,updated_at').eq('id',1).maybeSingle();
  if(error||!data)throw new ApiError('Paramètres du direct indisponibles.',503,'UNAVAILABLE');
  return ok(data);
});
export const PATCH=handleRoute(async(request:NextRequest)=>{
  const {db}=await requireV2Api('schedule.manage');
  const parsed=schema.safeParse(await request.json());
  if(!parsed.success)throw new ApiError('Paramètres HLS invalides.',400,'BAD_REQUEST',parsed.error.flatten());
  const {data,error}=await db.from('site_live_settings').update({...parsed.data,updated_at:new Date().toISOString()})
    .eq('id',1).select('title,hls_url,enabled,updated_at').maybeSingle();
  if(error||!data)throw new ApiError('Modification du direct refusée.',403,'UNAUTHORIZED');
  return ok(data);
});
