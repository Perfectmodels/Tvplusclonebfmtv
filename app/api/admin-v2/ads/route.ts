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
}).refine(x=>!x.active||Boolean(x.image_url&&x.alt),{
  message:'Une annonce active exige un visuel et un texte alternatif.'
});
export const GET=handleRoute(async()=>{
  const {db}=await requireV2Api('settings.manage');
  const {data,error}=await db.from('homepage_ad_slots').select('banner,slot,advertiser,image_url,target_url,alt,active,updated_at')
    .order('banner').order('slot');
  if(error)throw new ApiError('Publicités indisponibles.',503,'UNAVAILABLE');
  return ok({items:data??[]});
});
export const PATCH=handleRoute(async(request:NextRequest)=>{
  const {db}=await requireV2Api('settings.manage');
  const parsed=schema.safeParse(await request.json());
  if(!parsed.success)throw new ApiError('Données publicitaires invalides.',400,'BAD_REQUEST',parsed.error.flatten());
  const {banner,slot,...values}=parsed.data;
  const {data,error}=await db.from('homepage_ad_slots')
    .update({...values,updated_at:new Date().toISOString()}).eq('banner',banner).eq('slot',slot)
    .select('banner,slot,advertiser,image_url,target_url,alt,active,updated_at').maybeSingle();
  if(error||!data)throw new ApiError('Enregistrement publicitaire refusé.',403,'UNAUTHORIZED');
  revalidateTag('homepage-ads');revalidatePath('/');
  return ok(data);
});
