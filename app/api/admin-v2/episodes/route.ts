import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireV2Api } from '../../../../lib/auth/v2-admin';
import { ApiError, handleRoute,ok,created } from '../../../../lib/api/response';
import { revalidateTag } from 'next/cache';
export const dynamic='force-dynamic';
const payload=z.object({
  show_id:z.string().uuid(),
  title:z.string().trim().min(3).max(200),
  description:z.string().trim().max(1600).default(''),
  aired_at:z.string().datetime(),
  duration_seconds:z.number().int().nonnegative().nullable().optional(),
  platform:z.enum(['youtube','tiktok']).nullable().optional(),
  external_id:z.string().trim().max(180).nullable().optional(),
  status:z.enum(['draft','published']).default('draft'),
});
export const GET=handleRoute(async()=>{
 const {db}=await requireV2Api('shows.manage');
 const {data,error}=await db.from('episodes')
   .select('id,show_id,title,description,aired_at,duration_seconds,platform,external_id,status,updated_at')
   .order('aired_at',{ascending:false}).limit(150);
 if(error)throw new ApiError('Replays indisponibles.',503,'UNAVAILABLE');
 return ok({items:data??[]});
});
export const POST=handleRoute(async(request:NextRequest)=>{
 const {db}=await requireV2Api('shows.manage');
 const p=payload.safeParse(await request.json());
 if(!p.success)throw new ApiError('Données replay invalides.',400,'BAD_REQUEST',p.error.flatten());
 const {data,error}=await db.from('episodes').insert(p.data).select('id,title').single();
 if(error)throw new ApiError('Création du replay refusée.',403,'UNAUTHORIZED');
 revalidateTag('public-episodes');return created(data);
});
export const PATCH=handleRoute(async(request:NextRequest)=>{
 const {db}=await requireV2Api('shows.manage');
 const p=payload.extend({id:z.string().uuid()}).safeParse(await request.json());
 if(!p.success)throw new ApiError('Données replay invalides.',400,'BAD_REQUEST',p.error.flatten());
 const {id,...values}=p.data;
 const {data,error}=await db.from('episodes').update(values).eq('id',id).select('id,title').maybeSingle();
 if(error||!data)throw new ApiError('Mise à jour refusée.',403,'UNAUTHORIZED');
 revalidateTag('public-episodes');return ok(data);
});
