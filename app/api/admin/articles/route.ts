import { NextRequest } from 'next/server';
import { requireApiPermission, logAction } from '../../../../lib/auth/api';
import { PERMISSIONS } from '../../../../lib/auth/permissions';
import { getServerSupabase } from '../../../../lib/supabase/server';
import { handleRoute, ok, created, ApiError } from '../../../../lib/api/response';
import { parseJson } from '../../../../lib/api/validate';
import { articleCreateSchema } from '../../../../lib/editor/schema';
import { renderTiptapHtml, countWords, readingTime } from '../../../../lib/editor/render';
import { generateShortId } from '../../../../lib/articles/short-id';

export const dynamic = 'force-dynamic';

export const GET = handleRoute(async (request: NextRequest) => {
  const actor = await requireApiPermission(PERMISSIONS.ARTICLES_READ);
  const params = request.nextUrl.searchParams;
  const page = Math.max(1, Number(params.get('page') ?? 1) || 1);
  const pageSize = Math.min(50, Math.max(1, Number(params.get('pageSize') ?? 10) || 10));
  const status = params.get('status') ?? '';
  const category = params.get('category') ?? '';
  const q = (params.get('q') ?? '').trim();
  const sort = params.get('sort') === 'title' ? 'title' : 'created_at';
  const order = params.get('order') === 'asc' ? 'asc' : 'desc';

  const db = getServerSupabase();
  let query = db.from('articles').select('*', { count: 'exact' }).is('deleted_at', null);
  if (status) query = query.eq('status', status);
  if (category) query = query.eq('category_slug', category);
  if (q) {
    const term = `%${q}%`;
    query = query.or(`title.ilike.${term},summary.ilike.${term},slug.ilike.${term}`);
  }
  const { data, error, count } = await query.order(sort, { ascending: order === 'asc' }).range((page - 1) * pageSize, page * pageSize - 1);
  if (error) throw new Error(error.message);
  return ok({ items: data ?? [], total: count ?? 0, page, pageSize, can: actor.profile?.role === 'admin' });
});

export const POST = handleRoute(async (request: NextRequest) => {
  const actor = await requireApiPermission(PERMISSIONS.ARTICLES_CREATE);
  const payload = parseJson(articleCreateSchema, await request.json());
  const db = getServerSupabase();

  // Slug automatique et unique (l'utilisateur ne le saisit plus).
  let slug = payload.slug;
  let suffix = 2;
  while (true) {
    const { data: taken } = await db.from('articles').select('id').eq('slug', slug).maybeSingle();
    if (!taken) break;
    slug = `${payload.slug}-${suffix++}`;
  }

  const words = countWords(payload.content_json);
  const body = payload.content_json ? renderTiptapHtml(payload.content_json) : payload.body ?? null;

  // Identifiant court généré côté serveur, unique et permanent.
  let shortId = generateShortId();
  for (let attempt = 0; attempt < 6; attempt++) {
    const { data: taken } = await db.from('articles').select('id').eq('short_id', shortId).maybeSingle();
    if (!taken) break;
    shortId = generateShortId();
  }

  let data: any = null;
  let error: { message: string; code?: string } | null = null;
  for (let attempt = 0; attempt < 6; attempt++) {
    const result = await db.from('articles').insert({
      ...payload,
      short_id: shortId,
      content_html: body,
      word_count: words,
      reading_time: readingTime(words),
      author: payload.author ?? actor.profile?.full_name ?? actor.user.email ?? null,
      updated_by: actor.user.id,
      published_at: payload.status === 'published' ? new Date().toISOString() : null,
    }).select('*').single();
    if (!result.error) { data = result.data; error = null; break; }
    error = result.error;
    if (result.error.code === '23505' && result.error.message.includes('short_id')) {
      shortId = generateShortId();
      continue;
    }
    break;
  }
  if (error || !data) throw new Error(error?.message ?? 'Création impossible.');

  await logAction(actor.user, 'article.create', 'articles', data.id, { title: data.title, status: data.status, shortId });
  return created(data);
});
