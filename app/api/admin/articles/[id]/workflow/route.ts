import { NextRequest } from 'next/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireApiPermission, logAction } from '../../../../../../lib/auth/api';
import { PERMISSIONS } from '../../../../../../lib/auth/permissions';
import { getServerSupabase } from '../../../../../../lib/supabase/server';
import { handleRoute, ok, ApiError } from '../../../../../../lib/api/response';
import { parseJson } from '../../../../../../lib/api/validate';

export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ id: string }> };

const schema = z.object({
  action: z.enum(['submit', 'request-correction', 'validate', 'publish', 'unpublish', 'archive', 'schedule']),
  scheduled_at: z.string().datetime().optional(),
  expected_version: z.number().int().optional(),
});

const TRANSITIONS: Record<string, { status: string; permission: string }> = {
  submit: { status: 'review', permission: PERMISSIONS.ARTICLES_UPDATE },
  'request-correction': { status: 'needs_correction', permission: PERMISSIONS.ARTICLES_UPDATE },
  validate: { status: 'validated', permission: PERMISSIONS.ARTICLES_PUBLISH },
  publish: { status: 'published', permission: PERMISSIONS.ARTICLES_PUBLISH },
  unpublish: { status: 'draft', permission: PERMISSIONS.ARTICLES_PUBLISH },
  archive: { status: 'archived', permission: PERMISSIONS.ARTICLES_UPDATE },
  schedule: { status: 'scheduled', permission: PERMISSIONS.ARTICLES_PUBLISH },
};

export const POST = handleRoute(async (request: NextRequest, { params }: Context) => {
  const payload = parseJson(schema, await request.json());
  const transition = TRANSITIONS[payload.action];
  const actor = await requireApiPermission(transition.permission as any);
  const { id } = await params;

  if (payload.action === 'schedule' && !payload.scheduled_at) {
    throw new ApiError('Une date de programmation est requise.', 400);
  }

  const db = getServerSupabase();
  const { data: current } = await db.from('articles').select('version, status').eq('id', id).is('deleted_at', null).maybeSingle();
  if (!current) throw new ApiError('Article introuvable.', 404, 'NOT_FOUND');
  if (payload.expected_version != null && payload.expected_version !== current.version) {
    throw new ApiError('L’article a changé. Rechargez avant de continuer.', 409, 'CONFLICT');
  }

  const update: Record<string, unknown> = {
    status: transition.status,
    version: current.version + 1,
    updated_at: new Date().toISOString(),
  };
  if (transition.status === 'published') update.published_at = new Date().toISOString();
  if (transition.status === 'scheduled') update.scheduled_at = payload.scheduled_at;

  update.updated_by = actor.user.id;

  const { data, error } = await db.from('articles').update(update).eq('id', id).select('id, status, version').maybeSingle();
  if (error) throw new Error(error.message);
  await logAction(actor.user, 'article.workflow', 'articles', id, {
    action: payload.action, from: current.status, to: transition.status,
  });
  revalidatePath('/');
  revalidatePath('/news-24-7');
  revalidatePath('/sitemap.xml');
  return ok(data);
});
