import { NextRequest } from 'next/server';
import { requireV2Api, requireV2AnyApi } from '../../../../../lib/auth/v2-admin';
import { handleRoute, ok, ApiError } from '../../../../../lib/api/response';
import { cleanArticlePayload, invalidatePublicArticle } from '../../../../../lib/admin-v2/article-write';

export const dynamic='force-dynamic';
type Context={params:Promise<{id:string}>};

export const GET=handleRoute(async (_request:NextRequest,{params}:Context)=>{
  const {db}=await requireV2Api('articles.read_all');
  const {id}=await params;
  const {data,error}=await db.from('articles').select(
    'id,slug,short_code,title,excerpt,category_id,cover_media_id,content_json,tags,seo_title,seo_description,status,country_code,province_slug,featured,is_alert,published_at,author_id,updated_at'
  ).eq('id',id).maybeSingle();
  if(error)throw new ApiError('Lecture de l’article impossible.',503,'UNAVAILABLE');
  if(!data)throw new ApiError('Article introuvable.',404,'NOT_FOUND');
  return ok(data);
});

export const PATCH=handleRoute(async (request:NextRequest,{params}:Context)=>{
  const {db}=await requireV2AnyApi(['articles.edit_own','articles.review']);
  const {id}=await params;
  const input=await request.json();
  const expected=typeof input.expected_updated_at==='string'?input.expected_updated_at:'';
  if(!expected)throw new ApiError('Version de l’article requise pour éviter les conflits.',400);
  const patch=cleanArticlePayload(input);
  const {data:existing,error:existingError}=await db.from('articles').select('slug,updated_at').eq('id',id).maybeSingle();
  if(existingError)throw new ApiError('Article inaccessible.',403,'UNAUTHORIZED');
  if(!existing)throw new ApiError('Article introuvable.',404,'NOT_FOUND');
  if(existing.updated_at!==expected)throw new ApiError('L’article a changé depuis votre dernière lecture. Rechargez-le avant d’enregistrer.',409,'CONFLICT');
  const {data,error}=await db.from('articles').update(patch).eq('id',id).eq('updated_at',expected)
    .select('id,slug,short_code,status,updated_at').maybeSingle();
  if(error?.code==='23505')throw new ApiError('Ce lien court est déjà utilisé.',409,'CONFLICT');
  if(error)throw new ApiError('Enregistrement refusé ou impossible.',403,'UNAUTHORIZED');
  if(!data)throw new ApiError('Conflit de modification. Actualisez cet article.',409,'CONFLICT');
  invalidatePublicArticle(existing.slug);
  invalidatePublicArticle(data.slug);
  return ok(data);
});
