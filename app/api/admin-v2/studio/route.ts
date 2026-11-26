import {NextRequest} from 'next/server';
import {z} from 'zod';
import {getV2Actor} from '../../../../lib/auth/v2-admin';
import {conflict,getStudioItem,listStudioItems,saveStudioItem,updateStudioItem} from '../../../../lib/media/studio-repository';
import {ApiError,handleRoute,ok} from '../../../../lib/api/response';
import {kinds,states,saveSchema,canManageStudio,canReviewStudio,targets,readyForReview,type StudioKind} from '../../../../lib/media/studio-types';
import {revalidatePath,revalidateTag} from 'next/cache';
export const dynamic='force-dynamic';
async function actor(kind:StudioKind){const a=await getV2Actor();if(!a)throw new ApiError('Connexion requise.',401,'UNAUTHORIZED');if(!canManageStudio(a.permissions,kind))throw new ApiError('Permission insuffisante.',403,'UNAUTHORIZED');return a;}
const query=z.object({kind:z.enum(kinds),state:z.union([z.enum(states),z.literal('all')]).default('all'),q:z.string().max(100).default(''),page:z.coerce.number().int().min(1).max(10000).default(1),id:z.string().uuid().optional()});
export const GET=handleRoute(async(req:NextRequest)=>{const parsed=query.safeParse(Object.fromEntries(req.nextUrl.searchParams));if(!parsed.success)throw new ApiError('Filtres invalides.',400);const d=parsed.data;await actor(d.kind);return ok(d.id?await getStudioItem(d.kind,d.id):await listStudioItems(d.kind,d.state,d.q,d.page));});
const transition=z.object({action:z.literal('transition'),kind:z.enum(kinds),id:z.string().uuid(),revision:z.number().int().nonnegative(),target:z.enum(['published','scheduled','archived']),publish_at:z.string().datetime({offset:true}).optional()});
export const POST=handleRoute(async(req:NextRequest)=>{
 if(req.headers.get('origin')!==req.nextUrl.origin)throw new ApiError('Origine refusée.',403,'UNAUTHORIZED');
 const raw=await req.json().catch(()=>null);
 if(raw?.action==='transition'){
  const p=transition.safeParse(raw);if(!p.success)throw new ApiError('Transition invalide.',400);
  const {kind,id,revision,target,publish_at}=p.data;
  const a=await actor(kind);
  const current=await getStudioItem(kind,id);
  if(current.revision!==revision)throw conflict();
  if(!targets(current.state,canReviewStudio(a.permissions)).includes(target))throw new ApiError('Transition non autorisée.',403,'UNAUTHORIZED');
  if(['scheduled','published'].includes(target)&&!readyForReview(current))throw new ApiError('Source média compatible et couverture requises.',400);
  if(target==='scheduled'&&(!publish_at||Date.parse(publish_at)<=Date.now()+60_000))throw new ApiError('Choisissez une date future.',400);
  const result=await updateStudioItem(kind,id,revision,{studio_state:target,...(target==='scheduled'?{published_at:publish_at}:{})});
  revalidateTag('editorial-media');for(const path of ['/','/reels','/podcasts','/videos','/media/'+result.id])revalidatePath(path);return ok(result);
 }
 const p=saveSchema.safeParse(raw);if(!p.success)throw new ApiError(p.error.issues[0]?.message||'Formulaire invalide.',400);
 await actor(p.data.kind);
 return ok(await saveStudioItem(p.data));
});
