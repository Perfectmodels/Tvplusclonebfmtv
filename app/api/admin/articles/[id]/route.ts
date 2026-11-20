import { NextRequest } from 'next/server';
import { requireApiPermission, logAction } from '../../../../../lib/auth/api';
import { PERMISSIONS } from '../../../../../lib/auth/permissions';
import { getServerSupabase } from '../../../../../lib/supabase/server';
import { handleRoute, ok, ApiError } from '../../../../../lib/api/response';
import { parseJson } from '../../../../../lib/api/validate';
import { articleUpdateSchema } from '../../../../../lib/editor/schema';
import { renderTiptapHtml, countWords, readingTime } from '../../../../../lib/editor/render';

export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ id: string }> };

export const GET = handleRoute(async (_request: NextRequest, { params }: Context) => {
  await requireApiPermission(PERMISSIONS.ARTICLES_READ);
  const { id } = await params;
  const db = getServerSupabase();
  const { data, error } = await db.from('articles').select('*').eq('id', id).is('deleted_at', null).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new ApiError('Article introuvable.', 404, 'NOT_FOUND');
  return ok(data);
});

export const PATCH = handleRoute(async (request: NextRequest, { params }: Context) => {
  const actor = await requireApiPermission(PERMISSIONS.ARTICLES_UPDATE);
  const { id } = await params;
  const payload = parseJson(articleUpdateSchema, await request.json());
  const db = getServerSupabase();

  const { data: current } = await db.from('articles').select('version, title, content_json, content_html').eq('id', id).is('deleted_at', null).maybeSingle();
  if (!current) throw new ApiError('Article introuvable.', 404, 'NOT_FOUND');
  if (payload.expected_version != null && payload.expected_version !== current.version) {
    throw new ApiError('L’article a été modifié par un autre utilisateur. Rechargez avant de continuer.', 409, 'CONFLICT');
  }

  const { expected_version: _expected, ...changes } = payload;
  const update: Record<string, unknown> = { ...changes, updated_at: new Date().toISOString(), updated_by: actor.user.id, version: current.version + 1 };
  if (payload.content_json) {
    update.content_html = renderTiptapHtml(payload.content_json);
    const words = countWords(payload.content_json);
    update.word_count = words;
    update.reading_time = readingTime(words);
  }
  if (payload.status === 'published') update.published_at = new Date().toISOString();

  const { data, error } = await db.from('articles').update(update).eq('id', id).select('*').maybeSingle();
  if (error) throw new Error(error.message);

  await db.from('article_revisions').insert({
    article_id: id,
    version: current.version + 1,
    title: data.title,
    content_json: data.content_json ?? current.content_json,
    content_html: data.content_html ?? current.content_html,
    changed_by: actor.user.id,
    change_note: payload.status ? 'Changement de statut' : 'Modification éditoriale',
  });

  await logAction(actor.user, payload.status ? 'article.status' : 'article.update', 'articles', id, {
    status: payload.status ?? null, title: data.title, version: data.version,
  });
  return ok(data);
});

export const DELETE = handleRoute(async (_request: NextRequest, { params }: Context) => {
  const actor = await requireApiPermission(PERMISSIONS.ARTICLES_DELETE);
  const { id } = await params;
  const db = getServerSupabase();
  const { data, error } = await db.from('articles')
    .update({ deleted_at: new Date().toISOString(), status: 'archived', updated_by: actor.user.id })
    .eq('id', id).is('deleted_at', null).select('id, title').maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new ApiError('Article introuvable.', 404, 'NOT_FOUND');
  await logAction(actor.user, 'article.delete', 'articles', id, { title: data.title });
  return ok({ deleted: id, soft: true });
});
