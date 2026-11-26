import { NextRequest } from 'next/server';
import { requireV2Api } from '../../../../lib/auth/v2-admin';
import { handleRoute, ok, created, ApiError } from '../../../../lib/api/response';
import { cleanArticlePayload, invalidatePublicArticle } from '../../../../lib/admin-v2/article-write';
import { enrichArticleRows, enrichArticleRowsFromMysql, type ArticleAdminRow } from '../../../../lib/admin-v2/article-records';

import { newsroom, usesLwsCatalog, getReferences } from '../../../../lib/admin-v2/lws';

export const dynamic = 'force-dynamic';
const allowedStatuses = ['draft','in_review','approved','scheduled','published','inactive','archived'];

export const GET = handleRoute(async (request: NextRequest) => {
  const {actor,db} = await requireV2Api('articles.read_all');
  const p = request.nextUrl.searchParams;
  const page = Math.min(10000, Math.max(1, Number(p.get('page')) || 1));
  const pageSize = 18;
  const status = p.get('status') ?? '';
  const search = (p.get('q') ?? '').trim().slice(0,100);
  const category = p.get('category') ?? '';
  const author = p.get('author') ?? '';
  const order = p.get('sort') ?? 'updated';
  if (usesLwsCatalog()) {
    const result = await newsroom<{items:ArticleAdminRow[];total:number;page:number;pageSize:number}>(actor,'list',{data:{page,search,category,author,sort:order,status:allowedStatuses.includes(status)?status:''}});
    return ok({...result,items:await enrichArticleRowsFromMysql(actor,result.items)});
  }
  let query = db.from('articles').select(
    'id,slug,short_code,title,excerpt,category_id,cover_media_id,status,featured,is_alert,updated_at,created_at,published_at,author_id,reviewed_by,source_author_name,source_cover_url',
    { count:'exact' },
  );
  if (allowedStatuses.includes(status)) query = query.eq('status',status);
  if (category && /^[\da-f-]{36}$/i.test(category)) query = query.eq('category_id',category);
  if (author && /^[\da-f-]{36}$/i.test(author)) query = query.eq('author_id',author);
  if (search) query = query.ilike('title', '%' + search.replace(/[%_]/g,'') + '%');
  const sortColumn = order === 'published' ? 'published_at' : order === 'created' ? 'created_at' : 'updated_at';
  const {data,count,error} = await query.order(sortColumn,{ascending:false,nullsFirst:false})
    .range((page-1)*pageSize,page*pageSize-1);
  if (error) throw new ApiError('Impossible de charger les articles.',503,'UNAVAILABLE');
  return ok({
    items: await enrichArticleRows(db,(data??[]) as ArticleAdminRow[]),
    total: count??0,page,pageSize,
  });
});

export const POST = handleRoute(async (request: NextRequest) => {
  const {actor,db} = await requireV2Api('articles.create');
  const body = cleanArticlePayload(await request.json());
  if (usesLwsCatalog()) {
    const references = await getReferences(actor, db, body.category_id, body.cover_media_id);
    const article = await newsroom<{slug:string}>(actor,'create',{data:body,references});
    invalidatePublicArticle(article.slug);
    return created(article);
  }
  const {data,error} = await db.from('articles').insert({
    ...body,source_author_name:actor.name,author_id:actor.id,status:'draft',published_at:null
  }).select('id,slug,short_code,status,updated_at').single();
  if (error?.code === '23505') throw new ApiError('Ce lien est déjà utilisé.',409,'CONFLICT');
  if (error) throw new ApiError('Impossible d’enregistrer le brouillon. Vérifiez les champs et les permissions.',400);
  invalidatePublicArticle(data.slug);
  return created(data);
});
