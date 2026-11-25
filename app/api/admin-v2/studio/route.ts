import {NextRequest} from 'next/server';
import {z} from 'zod';
import {getV2Actor} from '../../../../lib/auth/v2-admin';
import {newsroom} from '../../../../lib/admin-v2/lws';
import {ApiError,handleRoute,ok} from '../../../../lib/api/response';
import {kinds,states,saveSchema,canManageStudio,readyForReview,type StudioKind,type StudioList,type StudioItem} from '../../../../lib/media/studio-types';
import {revalidatePath,revalidateTag} from 'next/cache';
export const dynamic='force-dynamic';
async function actor(kind:StudioKind){const a=await getV2Actor();if(!a)throw new ApiError('Connexion requise.',401,'UNAUTHORIZED');if(!canManageStudio(a.permissions,kind))throw new ApiError('Permission insuffisante.',403,'UNAUTHORIZED');return a;}
const query=z.object({kind:z.enum(kinds),state:z.union([z.enum(states),z.literal('all')]).default('all'),q:z.string().max(100).default(''),page:z.coerce.number().int().min(1).max(10000).default(1),id:z.string().uuid().optional()});
export const GET=handleRoute(async(req:NextRequest)=>{const parsed=query.safeParse(Object.fromEntries(req.nextUrl.searchParams));if(!parsed.success)throw new ApiError('Filtres invalides.',400);const d=parsed.data,a=await actor(d.kind);return ok(d.id?await newsroom<StudioItem>(a,'studio.get',{data:d}):await newsroom<StudioList>(a,'studio.list',{data:d}));});
const transition=z.object({action:z.literal('transition'),kind:z.enum(kinds),id:z.string().uuid(),revision:z.number().int().nonnegative(),target:z.enum(states),publish_at:z.string().datetime({offset:true}).optional()});
export const POST=handleRoute(async(req:NextRequest)=>{
 if(req.headers.get('origin')!==req.nextUrl.origin)throw new ApiError('Origine refusée.',403,'UNAUTHORIZED');
 const raw=await req.json().catch(()=>null);
 if(raw?.action==='transition'){
  const p=transition.safeParse(raw);if(!p.success)throw new ApiError('Transition invalide.',400);
  const a=await actor(p.data.kind);
  if(['review','approved','scheduled','published'].includes(p.data.target)){
   const current=await newsroom<StudioItem>(a,'studio.get',{data:{kind:p.data.kind,id:p.data.id}});
   if(current.revision!==p.data.revision)throw new ApiError('Ce contenu a été modifié. Rechargez la page.',409,'CONFLICT');
   if(!readyForReview(current))throw new ApiError('Source média compatible et couverture requises.',400);
  }
  const result=await newsroom<StudioItem>(a,'studio.transition',{data:p.data});
  revalidateTag('editorial-media');for(const path of ['/','/reels','/podcasts','/videos','/media/'+result.id])revalidatePath(path);return ok(result);
 }
 const p=saveSchema.safeParse(raw);if(!p.success)throw new ApiError(p.error.issues[0]?.message||'Formulaire invalide.',400);
 return ok(await newsroom<StudioItem>(await actor(p.data.kind),'studio.save',{data:p.data}));
});
