import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireV2Api } from '../../../../lib/auth/v2-admin';
import { handleRoute, ok, created, ApiError } from '../../../../lib/api/response';
import { renderTiptapHtml } from '../../../../lib/editor/render';
import { revalidatePath, revalidateTag } from 'next/cache';

export const dynamic = 'force-dynamic';

export const articlePayload = z.object({
  title: z.string().trim().min(5).max(220),
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(120),
  excerpt: z.string().trim().max(2000).default(''),
  category_id: z.string().uuid(),
  cover_media_id: z.string().uuid().nullable().optional(),
  content_json: z.unknown(),
  tags: z.array(z.string().trim().min(1).max(65)).max(20).default([]),
  seo_title: z.string().trim().max(200).nullable().optional(),
  seo_description: z.string().trim().max(320).nullable().optional(),
  country_code: z.string().regex(/^[A-Z]{2}$/).default('GA'),
  province_slug: z.string().trim().max(100).nullable().optional(),
  featured: z.boolean().default(false),
  is_alert: z.boolean().default(false),
});

export function cleanArticlePayload(input: unknown) {
  const parsed = articlePayload.safeParse(input);
  if (!parsed.success) throw new ApiError('Champs article invalides.', 400, 'BAD_REQUEST', parsed.error.flatten());
  const article = parsed.data;
  if (!article.content_json || typeof article.content_json !== 'object' ||
      (article.content_json as {type?:string}).type !== 'doc' ||
      JSON.stringify(article.content_json).length > 120_000) {
    throw new ApiError('Le contenu Tiptap est invalide ou trop volumineux.', 400);
  }
  const html = renderTiptapHtml(article.content_json);
  return { ...article, content_html: html, cover_media_id: article.cover_media_id ?? null };
}

export function invalidatePublicArticle(slug?: string) {
  revalidateTag('public-articles');
  revalidatePath('/');
  if (slug) revalidatePath('/article/' + slug);
}

export const GET = handleRoute(async (request: NextRequest) => {
  const { db } = await requireV2Api('articles.read_all');
  const p = request.nextUrl.searchParams;
  const page = Math.min(10000, Math.max(1, Number(p.get('page')) || 1));
  const pageSize = 20;
  const status = p.get('status') ?? '';
  const search = (p.get('q') ?? '').trim().slice(0,100);
  let query = db.from('articles').select(
    'id,slug,title,excerpt,category_id,cover_media_id,status,featured,is_alert,updated_at,created_at,published_at,author_id',
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
  }).select('id,slug,status,updated_at').single();
  if(error?.code==='23505')throw new ApiError('Ce lien court existe déjà.',409,'CONFLICT');
  if(error)throw new ApiError('Impossible d’enregistrer le brouillon. Vérifiez les champs et les permissions.',400);
  invalidatePublicArticle(data.slug);
  return created(data);
});
