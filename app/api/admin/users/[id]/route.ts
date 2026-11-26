import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireApiPermission, logAction } from '../../../../../lib/auth/api';
import { PERMISSIONS } from '../../../../../lib/auth/permissions';
import { getServerSupabase } from '../../../../../lib/supabase/server';
import { handleRoute, ok, ApiError } from '../../../../../lib/api/response';
import { parseJson } from '../../../../../lib/api/validate';

export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ id: string }> };

const schema = z.object({
  role: z.enum(['reader', 'admin']),
  full_name: z.string().trim().min(2).max(100).optional(),
});

export const PATCH = handleRoute(async (request: NextRequest, { params }: Context) => {
  const actor = await requireApiPermission(PERMISSIONS.USERS_MANAGE);
  const { id } = await params;
  const payload = parseJson(schema, await request.json());
  if (id === actor.user.id) throw new ApiError('Vous ne pouvez pas modifier votre propre rôle.', 400);
  const db = getServerSupabase();
  const { data, error } = await db.from('profiles').update(payload).eq('id', id).select('id, email, full_name, role').maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new ApiError('Utilisateur introuvable.', 404, 'NOT_FOUND');
  await logAction(actor.user, 'user.update', 'profiles', id, { role: payload.role });
  return ok(data);
});
