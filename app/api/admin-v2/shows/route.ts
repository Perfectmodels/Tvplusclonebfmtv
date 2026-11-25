import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireV2Api } from '../../../../lib/auth/v2-admin';
import { ApiError, handleRoute,ok,created } from '../../../../lib/api/response';
import {parseVideoUrl} from '../../../../lib/video/providers';
import { revalidateTag } from 'next/cache';
export const dynamic='force-dynamic';
const schema=z.object({
  slug:z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(100),
  title:z.string().trim().min(3).max(130),
  tagline:z.string().trim().max(200).default(''),
  description:z.string().trim().max(2500).default(''),
  schedule_label:z.string().trim().max(150).default(''),
  host_name:z.string().trim().max(130).default(''),
  frequency:z.string().trim().max(130).default(''),
  category_id:z.string().uuid().nullable().optional(),
  cover_media_id:z.string().uuid().nullable().optional(),
  intro_video_url:z.string().trim().max(1300).refine(v=>!v||!!parseVideoUrl(v)||/^https:\/\/[^\s]+\.(mp4|webm)(?:\?.*)?$/i.test(v),'Générique vidéo HTTPS valide requis').nullable().optional(),
  is_active:z.boolean().default(false),
  position:z.number().int().min(0).max(32000).default(0)
});
export const GET=handleRoute(async()=>{
 const {db}=await requireV2Api('shows.manage');
 const {data,error}=await db.from('shows').select('id,slug,title,tagline,description,schedule_label,host_name,frequency,category_id,cover_media_id,intro_video_url,is_active,position,updated_at').order('position');
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

export const DELETE=handleRoute(async(request:NextRequest)=>{
 const {db}=await requireV2Api('shows.manage');
 const parsed=z.object({id:z.string().uuid()}).safeParse(await request.json());
 if(!parsed.success)throw new ApiError('Émission invalide.',400);
 const {count,error:checkError}=await db.from('episodes').select('id',{head:true,count:'exact'}).eq('show_id',parsed.data.id);
 if(checkError)throw new ApiError('Impossible de vérifier les épisodes associés.',503,'UNAVAILABLE');
 if((count??0)>0)throw new ApiError('Cette émission possède des replays. Retirez-les ou affectez-les à une autre émission.',409,'CONFLICT');
 const {error}=await db.from('shows').delete().eq('id',parsed.data.id);
 if(error)throw new ApiError('Suppression refusée.',403,'UNAUTHORIZED');
 revalidateTag('public-programs');return ok({deleted:true});
});
