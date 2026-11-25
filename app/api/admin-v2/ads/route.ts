import {newsroom} from '../../../../lib/admin-v2/lws';
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireV2Api } from '../../../../lib/auth/v2-admin';
import { handleRoute,ok,ApiError } from '../../../../lib/api/response';
import { revalidateTag, revalidatePath } from 'next/cache';
export const dynamic='force-dynamic';
const schema=z.object({
  banner:z.number().int().min(1).max(5),slot:z.number().int().min(1).max(5),
  advertiser:z.string().trim().max(120).default(''),
  image_url:z.string().trim().max(700).refine(x=>!x||/^https?:\/\//i.test(x)||x.startsWith('/')&&!x.startsWith('//'),'Image URL invalide'),
  target_url:z.string().trim().max(700).refine(x=>!x||/^https?:\/\//i.test(x),'Lien invalide'),
  alt:z.string().trim().max(300),active:z.boolean(),
  starts_at:z.string().datetime({offset:true}).nullable().default(null),
  ends_at:z.string().datetime({offset:true}).nullable().default(null),
}).refine(x=>!x.active||Boolean(x.image_url&&x.alt),{
  message:'Une annonce active exige un visuel et un texte alternatif.'
}).refine(x=>!x.starts_at||!x.ends_at||Date.parse(x.ends_at)>Date.parse(x.starts_at),{
  message:'La fin de diffusion doit être après le début.'
});
export const GET=handleRoute(async()=>{
  const {actor}=await requireV2Api('settings.manage');
  return ok(await newsroom(actor,'ads.list'));
});
export const PATCH=handleRoute(async(request:NextRequest)=>{
  const {actor}=await requireV2Api('settings.manage');
  const parsed=schema.safeParse(await request.json());
  if(!parsed.success)throw new ApiError('Données publicitaires invalides.',400,'BAD_REQUEST',parsed.error.flatten());
  const data=await newsroom(actor,'ads.save',{data:parsed.data});
  revalidateTag('homepage-ads');revalidatePath('/');
  return ok(data);
});
