import {NextRequest} from 'next/server';
import {z} from 'zod';
import {requireV2Api} from '../../../../lib/auth/v2-admin';
import {getServerSupabase} from '../../../../lib/supabase/server';
import {handleRoute,ok,created,ApiError} from '../../../../lib/api/response';
import {validMedia} from '../../../../lib/media/catalog';
import {revalidateTag,revalidatePath} from 'next/cache';
export const dynamic='force-dynamic';
const schema=z.object({kind:z.enum(['reel','reportage','podcast']),title:z.string().trim().min(3).max(200),description:z.string().max(2000).default(''),category:z.string().max(100).default(''),source_url:z.string().trim().max(1300),thumbnail_url:z.string().trim().max(1300).refine(v=>!v||/^https:\/\/[^\s]+$/i.test(v)),duration_seconds:z.number().int().nonnegative().nullable(),status:z.enum(['draft','published'])});
const select='id,kind,title,description,category,source_url,thumbnail_url,duration_seconds,status,published_at';
async function authorized(){await requireV2Api('shows.manage');return getServerSupabase();}
function clean(input:unknown){const parsed=schema.safeParse(input);if(!parsed.success)throw new ApiError('Champs invalides.',400);const v=parsed.data;if(!v.source_url.startsWith('https://')||!validMedia(v.kind,v.source_url))throw new ApiError('Adresse média HTTPS compatible requise.',400);return v;}
function invalidate(){revalidateTag('editorial-media');revalidatePath('/');}
export const GET=handleRoute(async()=>{const db=await authorized();const {data,error}=await db.from('editorial_media').select(select).order('created_at',{ascending:false}).limit(300);if(error)throw new ApiError('Catalogue indisponible. Vérifier la migration.',503,'UNAVAILABLE');return ok({items:data??[]});});
export const POST=handleRoute(async(request:NextRequest)=>{const db=await authorized(),v=clean(await request.json());const {data,error}=await db.from('editorial_media').insert({...v,published_at:v.status==='published'?new Date().toISOString():null}).select(select).single();if(error)throw new ApiError('Création impossible.',503,'UNAVAILABLE');invalidate();return created(data);});
export const PATCH=handleRoute(async(request:NextRequest)=>{const db=await authorized(),input=await request.json(),parsedId=z.string().uuid().safeParse(input.id),v=clean(input);if(!parsedId.success)throw new ApiError('Identifiant invalide.',400);const id=parsedId.data;const {data:old,error:readError}=await db.from('editorial_media').select('published_at').eq('id',id).maybeSingle();if(readError||!old)throw new ApiError('Contenu introuvable.',404,'NOT_FOUND');const {data,error}=await db.from('editorial_media').update({...v,published_at:v.status==='published'?old.published_at||new Date().toISOString():null,updated_at:new Date().toISOString()}).eq('id',id).select(select).single();if(error)throw new ApiError('Modification impossible.',503,'UNAVAILABLE');invalidate();return ok(data);});
