import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireV2Api } from '../../../../lib/auth/v2-admin';
import { handleRoute,ok,created,ApiError } from '../../../../lib/api/response';
import { revalidateTag } from 'next/cache';
export const dynamic='force-dynamic';
const categorySchema=z.object({
  slug:z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(75),
  name:z.string().trim().min(2).max(85),
  description:z.string().trim().max(300).default(''),
  parent_id:z.string().uuid().nullable().default(null),
  position:z.number().int().min(0).max(32000).default(0),
  hue:z.number().int().min(0).max(359).default(216),
});
export const GET=handleRoute(async()=>{
  const {db}=await requireV2Api('articles.read_all');
  const {data,error}=await db.from('categories').select('id,slug,name,description,position,parent_id,hue').order('position').order('name');
  if(error)throw new ApiError('Rubriques indisponibles.',503,'UNAVAILABLE');
  const counts=await Promise.all((data??[]).map(c=>db.from('articles').select('id',{count:'exact',head:true}).eq('category_id',c.id)));
  return ok({items:(data??[]).map((c,i)=>({...c,article_count:counts[i]?.count??0}))});
});
export const POST=handleRoute(async(request:NextRequest)=>{
  const {db}=await requireV2Api('categories.manage');
  const parsed=categorySchema.safeParse(await request.json());
  if(!parsed.success)throw new ApiError('Rubrique invalide.',400,'BAD_REQUEST',parsed.error.flatten());
  const {data,error}=await db.from('categories').insert(parsed.data).select('id,slug,name').single();
  if(error?.code==='23505')throw new ApiError('Ce lien de rubrique existe déjà.',409,'CONFLICT');
  if(error)throw new ApiError('Impossible de créer la rubrique.',403,'UNAUTHORIZED');
  revalidateTag('public-categories');revalidateTag('public-articles');return created(data);
});
