import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireV2Api } from '../../../../lib/auth/v2-admin';
import { ApiError, handleRoute,ok,created } from '../../../../lib/api/response';
import { parseVideoUrl } from '../../../../lib/video/providers';
import { revalidateTag } from 'next/cache';
export const dynamic='force-dynamic';
const payload=z.object({
  show_id:z.string().uuid(),title:z.string().trim().min(3).max(200),
  description:z.string().trim().max(1600).default(''),
  aired_at:z.string().datetime({offset:true}),
  duration_seconds:z.number().int().nonnegative().nullable().optional(),
  source_url:z.string().trim().max(1300).default(''),
  thumbnail_url:z.string().trim().max(1300).default('')
    .refine(v=>!v||/^https:\/\/[^\s]+$/i.test(v),'Couverture HTTPS uniquement'),
  publish_at:z.string().datetime({offset:true}).nullable().optional(),
  status:z.enum(['draft','published']).default('draft'),
});
function clean(input:unknown){
  const p=payload.safeParse(input);
  if(!p.success)throw new ApiError('Champs du replay invalides.',400,'BAD_REQUEST',p.error.flatten());
  const v=p.data,parsed=parseVideoUrl(v.source_url);
  if(v.source_url&&!parsed)throw new ApiError('Lien invalide. YouTube, Facebook, TikTok, Vimeo ou Dailymotion sont acceptés.',400);
  if(v.status==='published'&&!parsed)throw new ApiError('Un lien vidéo valide est requis pour publier.',400);
  if(v.publish_at&&Date.parse(v.publish_at)<Date.now()+60_000&&v.status==='draft')
    throw new ApiError('Programmez au moins une minute dans le futur.',400);
  return {...v,platform:parsed?.platform??null,external_id:parsed?.externalId??null,
    status:v.publish_at&&Date.parse(v.publish_at)>Date.now()?'draft':v.status};
}
const select='id,show_id,title,description,aired_at,duration_seconds,platform,external_id,source_url,thumbnail_url,publish_at,status,updated_at';
export const GET=handleRoute(async()=>{
 const {db}=await requireV2Api('shows.manage');
 const {data,error}=await db.from('episodes').select(select).order('aired_at',{ascending:false}).limit(300);
 if(error)throw new ApiError('Replays indisponibles.',503,'UNAVAILABLE');
 return ok({items:data??[]});
});
export const POST=handleRoute(async(request:NextRequest)=>{
 const {db}=await requireV2Api('shows.manage');
 const values=clean(await request.json());
 const {data,error}=await db.from('episodes').insert(values).select('id,title').single();
 if(error)throw new ApiError('Création du replay refusée.',403,'UNAUTHORIZED');
 revalidateTag('public-episodes');return created(data);
});
export const PATCH=handleRoute(async(request:NextRequest)=>{
 const {db}=await requireV2Api('shows.manage');
 const input=await request.json();
 const id=z.string().uuid().safeParse(input?.id);
 if(!id.success)throw new ApiError('Identifiant du replay invalide.',400);
 const values=clean(input);
 const {data,error}=await db.from('episodes').update(values).eq('id',id.data).select('id,title').maybeSingle();
 if(error||!data)throw new ApiError('Modification du replay refusée.',403,'UNAUTHORIZED');
 revalidateTag('public-episodes');return ok(data);
});
