import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireV2Api } from '../../../../../lib/auth/v2-admin';
import { handleRoute, ok, ApiError } from '../../../../../lib/api/response';
import { newsroom, usesLwsCatalog } from '../../../../../lib/admin-v2/lws';
import { parseJson } from '../../../../../lib/api/validate';

export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ id: string }> };

const schema = z.object({
  role: z.string().regex(/^[a-z_]{2,50}$/).optional(),
  full_name: z.string().trim().min(2).max(100).optional(),
  is_active: z.boolean().optional(),
});

export const PATCH = handleRoute(async (request: NextRequest, { params }: Context) => {
  const { actor, db } = await requireV2Api('users.manage');
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) throw new ApiError('Identifiant invalide.', 400);
  if (id === actor.id) throw new ApiError('Vous ne pouvez pas modifier votre propre rôle.', 400);
  const payload = parseJson(schema, await request.json());
  if (usesLwsCatalog()) {
    return ok(await newsroom(actor, 'users.update', { id, data: payload }));
  }
  const { data, error } = await db.from('profiles').update(payload).eq('id', id)
    .select('id,email,full_name,role,is_active').maybeSingle();
  if (error) throw new ApiError('Mise à jour impossible.', 503, 'UNAVAILABLE');
  if (!data) throw new ApiError('Utilisateur introuvable.', 404, 'NOT_FOUND');
  return ok(data);
});
