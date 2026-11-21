import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireV2AnyApi, hasV2Permission } from '../../../../../../lib/auth/v2-admin';
import { handleRoute, ok, ApiError } from '../../../../../../lib/api/response';
import { invalidatePublicArticle } from '../../../../../../lib/admin-v2/article-write';
export const dynamic='force-dynamic';
type Context={params:Promise<{id:string}>};
const schema=z.object({
  action:z.enum(['submit','approve','publish','revert','schedule']),
  expected_updated_at:z.string(),
  scheduled_at:z.string().datetime().optional(),
});
export const POST=handleRoute(async(request:NextRequest,{params}:Context)=>{
  const {actor,db}=await requireV2AnyApi(['articles.edit_own','articles.review']);
  const body=schema.safeParse(await request.json());
  if(!body.success)throw new ApiError('Action invalide.',400);
  const {id}=await params;
  const {data:article,error:err}=await db.from('articles')
    .select('id,slug,status,author_id,updated_at').eq('id',id).maybeSingle();
  if(err||!article)throw new ApiError('Article inaccessible.',404,'NOT_FOUND');
  if(article.updated_at!==body.data.expected_updated_at)throw new ApiError('Article modifié par un autre utilisateur. Actualisez.',409,'CONFLICT');
  const canReview=hasV2Permission(actor,'articles.review');
  if(body.data.action!=='submit'&&!canReview)throw new ApiError('Validation réservée à la rédaction en chef.',403,'UNAUTHORIZED');
  const next={
    submit:'in_review',approve:'approved',publish:'published',revert:'draft',schedule:'scheduled',
  }[body.data.action];
  if(body.data.action==='submit'&&!['draft','in_review'].includes(article.status))
    throw new ApiError('Soumission interdite depuis ce statut.',409,'CONFLICT');
  if(body.data.action==='approve'&&!['draft','in_review','approved'].includes(article.status))
    throw new ApiError('Transition de validation invalide.',409,'CONFLICT');
  if(body.data.action==='schedule'&&(!body.data.scheduled_at||Date.parse(body.data.scheduled_at)<=Date.now()))
    throw new ApiError('La programmation doit être dans le futur.',400);
  const patch:Record<string,unknown>={status:next};
  if(body.data.action==='publish')patch.published_at=new Date().toISOString();
  if(body.data.action==='schedule')patch.published_at=body.data.scheduled_at;
  if(body.data.action==='approve'){patch.reviewed_by=actor.id;patch.reviewed_at=new Date().toISOString();}
  const {data,error}=await db.from('articles').update(patch).eq('id',id)
    .eq('updated_at',body.data.expected_updated_at).select('id,slug,status,updated_at').maybeSingle();
  if(error)throw new ApiError('Transition refusée par les permissions ou la base.',403,'UNAUTHORIZED');
  if(!data)throw new ApiError('Conflit de modification.',409,'CONFLICT');
  invalidatePublicArticle(article.slug);
  return ok(data);
});
