import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireV2Api } from '../../../../lib/auth/v2-admin';
import { handleRoute, ok, created, ApiError } from '../../../../lib/api/response';
import { revalidateTag } from 'next/cache';
export const dynamic='force-dynamic';
const schema=z.object({slug:z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(75),name:z.string().trim().min(2).max(85),description:z.string().max(300).default('')});
export const GET=handleRoute(async()=>{
  const {db}=await requireV2Api('articles.read_all');
  const {data,error}=await db.from('categories').select('id,slug,name,description,position,parent_id').order('position');
  if(error)throw new ApiError('Catégories indisponibles.',503,'UNAVAILABLE');
  return ok({items:data??[]});
});
export const POST=handleRoute(async(request:NextRequest)=>{
  const {db}=await requireV2Api('categories.manage');
  const parsed=schema.safeParse(await request.json());
  if(!parsed.success)throw new ApiError('Rubrique invalide.',400,'BAD_REQUEST',parsed.error.flatten());
  const {data,error}=await db.from('categories').insert(parsed.data).select('id,slug,name').single();
  if(error?.code==='23505')throw new ApiError('La rubrique existe déjà.',409,'CONFLICT');
  if(error)throw new ApiError('Impossible d’ajouter la rubrique.',403,'UNAUTHORIZED');
  revalidateTag('public-categories');
  return created(data);
});
