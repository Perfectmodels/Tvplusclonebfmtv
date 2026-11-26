import { requireApiPermission } from '../../../../lib/auth/api';
import { PERMISSIONS } from '../../../../lib/auth/permissions';
import { getServerSupabase } from '../../../../lib/supabase/server';
import { handleRoute, ok } from '../../../../lib/api/response';

export const dynamic = 'force-dynamic';

export const GET = handleRoute(async () => {
  await requireApiPermission(PERMISSIONS.ARTICLES_READ);
  const db = getServerSupabase();
  const { data, error } = await db.from('questions').select('*').order('created_at', { ascending: false }).limit(100);
  if (error) throw new Error(error.message);
  return ok({ items: data ?? [], total: data?.length ?? 0 });
});
