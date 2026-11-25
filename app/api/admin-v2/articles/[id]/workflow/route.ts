import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireV2AnyApi, hasV2Permission } from '../../../../../../lib/auth/v2-admin';
import { handleRoute, ok, ApiError } from '../../../../../../lib/api/response';
import { invalidatePublicArticle } from '../../../../../../lib/admin-v2/article-write';

export const dynamic='force-dynamic';
type Context={params:Promise<{id:string}>};
const schema=z.object({
  action:z.enum(['submit','approve','publish','revert','schedule','activate','deactivate','archive','restore']),
  expected_updated_at:z.string().min(1),
  scheduled_at:z.string().datetime({offset:true}).optional(),
});

const transitions:Record<string,string[]> = {
  submit:['draft','in_review'],
  approve:['draft','in_review','approved'],
  publish:['draft','in_review','approved','scheduled','inactive'],
  revert:['published','scheduled','in_review','approved','inactive'],
  schedule:['draft','in_review','approved','inactive','scheduled'],
  activate:['inactive'],
  deactivate:['published'],
  archive:['draft','in_review','approved','published','scheduled','inactive'],
  restore:['archived'],
};

export const POST=handleRoute(async(request:NextRequest,{params}:Context)=>{
  const {actor,db}=await requireV2AnyApi(['articles.edit_own','articles.review']);
  const parsed=schema.safeParse(await request.json());
  if(!parsed.success)throw new ApiError('Action ou date de programmation invalide.',400);
  const body=parsed.data;
  const {id}=await params;
  if(!/^[\da-f-]{36}$/i.test(id))throw new ApiError('Identifiant d’article invalide.',400);
  const {data:article,error:readError}=await db.from('articles')
    .select('id,slug,short_code,status,author_id,updated_at,published_at')
    .eq('id',id).maybeSingle();
  if(readError||!article)throw new ApiError('Article inaccessible.',404,'NOT_FOUND');
  if(article.updated_at!==body.expected_updated_at)
    throw new ApiError('Cet article a été modifié. Actualisez avant de poursuivre.',409,'CONFLICT');
  const canReview=hasV2Permission(actor,'articles.review');
  if(!canReview && (body.action!=='submit'||article.author_id!==actor.id))
    throw new ApiError('Action réservée à la rédaction en chef.',403,'UNAUTHORIZED');
  if(!transitions[body.action].includes(article.status))
    throw new ApiError('Cette action n’est pas possible avec le statut actuel de l’article.',409,'CONFLICT');
  if(body.action==='schedule' && (!body.scheduled_at || Date.parse(body.scheduled_at)<=Date.now()+60_000))
    throw new ApiError('Choisissez une date et une heure futures (au moins une minute).',400);
  const next:Record<string,string>={
    submit:'in_review',approve:'approved',publish:'published',revert:'draft',
    schedule:'scheduled',activate:'published',deactivate:'inactive',
    archive:'archived',restore:article.published_at?'inactive':'draft',
  };
  const patch:Record<string,unknown>={status:next[body.action]};
  if(body.action==='publish')patch.published_at=article.status==='inactive'&&article.published_at?article.published_at:new Date().toISOString();
  if(body.action==='activate')patch.published_at=article.published_at||new Date().toISOString();
  if(body.action==='schedule')patch.published_at=body.scheduled_at;
  if(body.action==='approve'){
    patch.reviewed_by=actor.id;patch.reviewed_at=new Date().toISOString();
  }
  // Archives et désactivations préservent la date historique, mais ne sont plus visibles côté public.
  const {data,error}=await db.from('articles').update(patch).eq('id',id)
    .eq('updated_at',body.expected_updated_at)
    .select('id,slug,short_code,status,published_at,updated_at').maybeSingle();
  if(error)throw new ApiError('Action refusée par les permissions ou la base.',403,'UNAUTHORIZED');
  if(!data)throw new ApiError('Conflit de modification. Actualisez cet article.',409,'CONFLICT');
  invalidatePublicArticle(article.slug,article.short_code);
  return ok(data);
});
