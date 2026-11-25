import {NextRequest} from 'next/server';
import {z} from 'zod';
import {requireV2Api} from '../../../../lib/auth/v2-admin';
import {newsroom} from '../../../../lib/admin-v2/lws';
import {handleRoute,ok,created,ApiError} from '../../../../lib/api/response';
import {validMedia} from '../../../../lib/media/catalog';
import {revalidateTag,revalidatePath} from 'next/cache';
export const dynamic='force-dynamic';
const schema=z.object({kind:z.enum(['reel','reportage','podcast']),title:z.string().trim().min(3).max(200),description:z.string().max(2000).default(''),category:z.string().max(100).default(''),source_url:z.string().trim().max(1300),thumbnail_url:z.string().trim().max(1300).refine(v=>!v||/^https:\/\/[^\s]+$/i.test(v)),duration_seconds:z.number().int().nonnegative().nullable(),status:z.enum(['draft','published'])});
const select='id,kind,title,description,category,source_url,thumbnail_url,duration_seconds,status,published_at';
async function authorized(){return (await requireV2Api('shows.manage')).actor;}
function clean(input:unknown){const parsed=schema.safeParse(input);if(!parsed.success)throw new ApiError('Champs invalides.',400);const v=parsed.data;if(!v.source_url.startsWith('https://')||!validMedia(v.kind,v.source_url))throw new ApiError('Adresse média HTTPS compatible requise.',400);return v;}
function invalidate(){revalidateTag('editorial-media');revalidatePath('/');}
export const GET=handleRoute(async()=>{const actor=await authorized();return ok(await newsroom(actor,'catalog.list'));});
export const POST=handleRoute(async(request:NextRequest)=>{const actor=await authorized(),v=clean(await request.json());const data=await newsroom(actor,'catalog.create',{data:v});invalidate();return created(data);});
export const PATCH=handleRoute(async(request:NextRequest)=>{const actor=await authorized(),input=await request.json();const id=z.string().uuid().safeParse(input.id);if(!id.success)throw new ApiError('Identifiant invalide.',400);const data=await newsroom(actor,'catalog.edit',{id:id.data,data:clean(input)});invalidate();return ok(data);});