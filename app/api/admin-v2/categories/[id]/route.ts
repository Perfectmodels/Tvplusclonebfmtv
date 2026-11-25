import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireV2Api } from '../../../../../lib/auth/v2-admin';
import { handleRoute,ok,ApiError } from '../../../../../lib/api/response';
import { newsroom, usesLwsCatalog } from '../../../../../lib/admin-v2/lws';
import { revalidateTag } from 'next/cache';
export const dynamic='force-dynamic';
type Context={params:Promise<{id:string}>};
const schema=z.object({
 name:z.string().trim().min(2).max(85),description:z.string().trim().max(300),
 parent_id:z.string().uuid().nullable(),position:z.number().int().min(0).max(32000),
 hue:z.number().int().min(0).max(359),
});
export const PATCH=handleRoute(async(request:NextRequest,{params}:Context)=>{
 const {actor,db}=await requireV2Api('categories.manage');const {id}=await params;
 if(!z.string().uuid().safeParse(id).success)throw new ApiError('Rubrique inconnue.',400);
 const parse=schema.safeParse(await request.json());
 if(!parse.success)throw new ApiError('Rubrique invalide.',400,'BAD_REQUEST',parse.error.flatten());
 if(usesLwsCatalog()){
  const data=await newsroom(actor,'categories.edit',{id,data:parse.data});
  revalidateTag('public-categories');revalidateTag('public-articles');return ok(data);
 }
 if(parse.data.parent_id===id)throw new ApiError('Une rubrique ne peut pas être son propre parent.',400);
 if(parse.data.parent_id){
  const {data:possibleParent}=await db.from('categories').select('id,parent_id').eq('id',parse.data.parent_id).maybeSingle();
  if(!possibleParent)throw new ApiError('Rubrique parente introuvable.',400);
  if(possibleParent.parent_id===id)throw new ApiError('Cette hiérarchie formerait une boucle.',400);
  // Aucune rubrique ne peut être à la fois une descendante et son propre ancêtre.
  let ancestor=possibleParent.parent_id,depth=0;
  while(ancestor&&depth<30){
    if(ancestor===id)throw new ApiError('Hiérarchie circulaire interdite.',400);
    const result=await db.from('categories').select('parent_id').eq('id',ancestor).maybeSingle();
    ancestor=result.data?.parent_id??null;depth++;
  }
  if(depth>=30)throw new ApiError('Hiérarchie trop profonde.',400);
 }
 const {data,error}=await db.from('categories').update(parse.data).eq('id',id).select('id,name,slug').maybeSingle();
 if(error||!data)throw new ApiError('Mise à jour impossible.',403,'UNAUTHORIZED');
 revalidateTag('public-categories');revalidateTag('public-articles');return ok(data);
});
export const DELETE=handleRoute(async(_request:NextRequest,{params}:Context)=>{
 const {actor,db}=await requireV2Api('categories.manage');const {id}=await params;
 if(!z.string().uuid().safeParse(id).success)throw new ApiError('Identifiant invalide.',400);
 if(usesLwsCatalog()){
  const data=await newsroom(actor,'categories.delete',{id});
  revalidateTag('public-categories');return ok(data);
 }
 const [articles,shows,children]=await Promise.all([
  db.from('articles').select('id',{count:'exact',head:true}).eq('category_id',id),
  db.from('shows').select('id',{count:'exact',head:true}).eq('category_id',id),
  db.from('categories').select('id',{count:'exact',head:true}).eq('parent_id',id)
 ]);
 if([articles,shows,children].some(r=>r.error))throw new ApiError('Vérification des dépendances impossible.',503);
 if((articles.count??0)||(shows.count??0)||(children.count??0))
  throw new ApiError('Rubrique utilisée. Déplacez ses articles, ses émissions ou ses sous-rubriques avant suppression.',409,'CONFLICT');
 const {error}=await db.from('categories').delete().eq('id',id);
 if(error)throw new ApiError('Suppression de rubrique refusée.',403,'UNAUTHORIZED');
 revalidateTag('public-categories');return ok({deleted:true});
});
