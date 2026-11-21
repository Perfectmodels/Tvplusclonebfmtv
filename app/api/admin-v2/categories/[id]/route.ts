import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireV2Api } from '../../../../../lib/auth/v2-admin';
import { handleRoute, ok, ApiError } from '../../../../../lib/api/response';
import { revalidateTag } from 'next/cache';
export const dynamic='force-dynamic';
type Context={params:Promise<{id:string}>};
export const PATCH=handleRoute(async(request:NextRequest,{params}:Context)=>{
  const {db}=await requireV2Api('categories.manage');const {id}=await params;
  const parse=z.object({name:z.string().trim().min(2).max(85),description:z.string().max(300)}).safeParse(await request.json());
  if(!parse.success)throw new ApiError('Rubrique invalide.',400);
  const {data,error}=await db.from('categories').update(parse.data).eq('id',id).select('id,name,slug').maybeSingle();
  if(error||!data)throw new ApiError('Mise à jour impossible.',400);
  revalidateTag('public-categories');
  return ok(data);
});
