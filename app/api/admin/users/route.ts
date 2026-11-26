import { NextRequest } from 'next/server';
import { requireApiPermission, logAction } from '../../../../lib/auth/api';
import { PERMISSIONS } from '../../../../lib/auth/permissions';
import { getServerSupabase } from '../../../../lib/supabase/server';
import { handleRoute, ok } from '../../../../lib/api/response';

export const dynamic = 'force-dynamic';

export const GET = handleRoute(async () => {
  await requireApiPermission(PERMISSIONS.USERS_MANAGE);
  const db = getServerSupabase();
  const { data: profiles, error } = await db.from('profiles').select('id, email, full_name, role, created_at').order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  const { data: list } = await db.auth.admin.listUsers();
  const lastSignIn = new Map((list?.users ?? []).map((u) => [u.id, u.last_sign_in_at ?? null]));
  return ok({ items: (profiles ?? []).map((p) => ({ ...p, last_sign_in_at: lastSignIn.get(p.id) ?? null })), total: profiles?.length ?? 0 });
});
