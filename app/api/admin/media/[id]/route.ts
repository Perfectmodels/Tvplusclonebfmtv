import { NextRequest } from 'next/server';
import { requireApiPermission, logAction } from '../../../../../lib/auth/api';
import { PERMISSIONS } from '../../../../../lib/auth/permissions';
import { getServerSupabase } from '../../../../../lib/supabase/server';
import { handleRoute, ok, ApiError } from '../../../../../lib/api/response';

export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ id: string }> };

export const DELETE = handleRoute(async (_request: NextRequest, { params }: Context) => {
  const actor = await requireApiPermission(PERMISSIONS.MEDIA_DELETE);
  const { id } = await params;
  const db = getServerSupabase();
  const { data: media } = await db.from('media').select('id, storage_path, public_url, file_name').eq('id', id).maybeSingle();
  if (!media) throw new ApiError('Média introuvable.', 404, 'NOT_FOUND');

  const { count } = await db.from('articles').select('*', { count: 'exact', head: true }).eq('image_url', media.public_url);
  if (count && count > 0) throw new ApiError(`Ce média est utilisé par ${count} article(s).`, 409, 'CONFLICT');

  await db.storage.from('media').remove([media.storage_path]);
  const { error } = await db.from('media').delete().eq('id', id);
  if (error) throw new Error(error.message);
  await logAction(actor.user, 'media.delete', 'media', id, { file_name: media.file_name });
  return ok({ deleted: id });
});
