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
  full_name: z.string().trim().min(2).max(120).optional(),
  first_name: z.string().trim().max(80).nullable().optional(),
  last_name: z.string().trim().max(80).nullable().optional(),
  photo_url: z.string().trim().max(1300).nullable().optional(),
  birth_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  phone: z.string().trim().max(40).nullable().optional(),
  city: z.string().trim().max(120).nullable().optional(),
  bio: z.string().trim().max(2000).nullable().optional(),
  is_active: z.boolean().optional(),
  is_temporary: z.boolean().optional(),
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
  const update: Record<string, unknown> = {};
  for (const key of ['role', 'full_name', 'first_name', 'last_name', 'photo_url', 'birth_date', 'phone', 'city', 'bio', 'is_active']) {
    if (key in payload) update[key] = (payload as Record<string, unknown>)[key];
  }
  const { data, error } = await db.from('profiles').update(update).eq('id', id)
    .select('id,email,full_name,role,is_active').maybeSingle();
  if (error) throw new ApiError('Mise à jour impossible.', 503, 'UNAVAILABLE');
  if (!data) throw new ApiError('Utilisateur introuvable.', 404, 'NOT_FOUND');
  return ok(data);
});
