import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireV2Api } from '../../../../lib/auth/v2-admin';
import { ApiError, handleRoute,ok,created } from '../../../../lib/api/response';
import { revalidateTag } from 'next/cache';
export const dynamic='force-dynamic';
const schema=z.object({
  slug:z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(100),
  title:z.string().trim().min(3).max(130),
  tagline:z.string().trim().max(200).default(''),
  description:z.string().trim().max(2500).default(''),
  schedule_label:z.string().trim().max(150).default(''),
  category_id:z.string().uuid().nullable().optional(),
  cover_media_id:z.string().uuid().nullable().optional(),
  is_active:z.boolean().default(false),
  position:z.number().int().min(0).max(32000).default(0)
});
export const GET=handleRoute(async()=>{
 const {db}=await requireV2Api('shows.manage');
 const {data,error}=await db.from('shows').select('id,slug,title,tagline,description,schedule_label,category_id,cover_media_id,is_active,position,updated_at').order('position');
 if(error)throw new ApiError('Émissions indisponibles.',503,'UNAVAILABLE');
 return ok({items:data??[]});
});
export const POST=handleRoute(async(request:NextRequest)=>{
 const {db}=await requireV2Api('shows.manage');
 const p=schema.safeParse(await request.json());
 if(!p.success)throw new ApiError('Données émission invalides.',400,'BAD_REQUEST',p.error.flatten());
 const {data,error}=await db.from('shows').insert(p.data).select('id,slug,title').single();
 if(error?.code==='23505')throw new ApiError('Ce lien d’émission existe déjà.',409,'CONFLICT');
 if(error)throw new ApiError('Création d’émission refusée.',403,'UNAUTHORIZED');
 revalidateTag('public-programs');return created(data);
});
export const PATCH=handleRoute(async(request:NextRequest)=>{
 const {db}=await requireV2Api('shows.manage');
 const p=schema.extend({id:z.string().uuid()}).safeParse(await request.json());
 if(!p.success)throw new ApiError('Données émission invalides.',400,'BAD_REQUEST',p.error.flatten());
 const {id,...values}=p.data;
 const {data,error}=await db.from('shows').update(values).eq('id',id).select('id,title,slug').maybeSingle();
 if(error||!data)throw new ApiError('Mise à jour refusée.',403,'UNAUTHORIZED');
 revalidateTag('public-programs');return ok(data);
});
