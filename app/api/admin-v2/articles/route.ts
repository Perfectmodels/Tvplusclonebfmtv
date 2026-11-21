import { NextRequest } from 'next/server';
import { requireV2Api } from '../../../../lib/auth/v2-admin';
import { handleRoute, ok, created, ApiError } from '../../../../lib/api/response';

import { cleanArticlePayload, invalidatePublicArticle } from '../../../../lib/admin-v2/article-write';

export const dynamic = 'force-dynamic';


export const GET = handleRoute(async (request: NextRequest) => {
  const { db } = await requireV2Api('articles.read_all');
  const p = request.nextUrl.searchParams;
  const page = Math.min(10000, Math.max(1, Number(p.get('page')) || 1));
  const pageSize = 20;
  const status = p.get('status') ?? '';
  const search = (p.get('q') ?? '').trim().slice(0,100);
  let query = db.from('articles').select(
    'id,slug,short_code,title,excerpt,category_id,cover_media_id,status,featured,is_alert,updated_at,created_at,published_at,author_id',
    { count:'exact' },
  );
  if (['draft','in_review','approved','scheduled','published'].includes(status)) query = query.eq('status',status);
  if (search) query = query.ilike('title', '%' + search.replace(/[%_]/g,'') + '%');
  const {data,count,error} = await query.order('updated_at',{ascending:false})
    .range((page-1)*pageSize,page*pageSize-1);
  if (error) throw new ApiError('Impossible de charger les articles.', 503, 'UNAVAILABLE');
  return ok({items:data??[],total:count??0,page,pageSize});
});

export const POST = handleRoute(async (request: NextRequest) => {
  const {actor,db} = await requireV2Api('articles.create');
  const body = cleanArticlePayload(await request.json());
  const {data,error} = await db.from('articles').insert({
    ...body, author_id:actor.id,status:'draft',published_at:null
  }).select('id,slug,short_code,status,updated_at').single();
  if(error?.code==='23505')throw new ApiError('Ce lien court existe déjà.',409,'CONFLICT');
  if(error)throw new ApiError('Impossible d’enregistrer le brouillon. Vérifiez les champs et les permissions.',400);
  invalidatePublicArticle(data.slug);
  return created(data);
});
