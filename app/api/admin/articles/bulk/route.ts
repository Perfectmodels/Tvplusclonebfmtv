import { NextRequest } from 'next/server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { requireApiPermission, logAction } from '../../../../../lib/auth/api';
import { PERMISSIONS } from '../../../../../lib/auth/permissions';
import { getServerSupabase } from '../../../../../lib/supabase/server';
import { handleRoute, ok } from '../../../../../lib/api/response';
import { parseJson } from '../../../../../lib/api/validate';

export const dynamic = 'force-dynamic';

const schema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(50),
  action: z.enum(['publish', 'archive', 'delete']),
});

export const POST = handleRoute(async (request: NextRequest) => {
  const body = parseJson(schema, await request.json());
  const permissions = {
    publish: PERMISSIONS.ARTICLES_PUBLISH,
    archive: PERMISSIONS.ARTICLES_UPDATE,
    delete: PERMISSIONS.ARTICLES_DELETE,
  };
  const actor = await requireApiPermission(permissions[body.action]);

  const db = getServerSupabase();
  const patch: Record<string, unknown> =
    body.action === 'publish'
      ? { status: 'published', published_at: new Date().toISOString() }
      : body.action === 'archive'
        ? { status: 'archived' }
        : { status: 'archived', deleted_at: new Date().toISOString() };

  const { data, error } = await db.from('articles')
    .update({ ...patch, updated_by: actor.user.id })
    .in('id', body.ids)
    .is('deleted_at', null)
    .select('id');
  if (error) throw new Error(error.message);

  await logAction(actor.user, `article.bulk.${body.action}`, 'articles', body.ids.join(','), { count: data?.length ?? 0 });
  revalidatePath('/');
  revalidatePath('/news-24-7');
  revalidatePath('/sitemap.xml');
  return ok({ updated: data?.length ?? 0 });
});
