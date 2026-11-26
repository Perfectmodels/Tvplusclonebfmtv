import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireV2Api } from '../../../../lib/auth/v2-admin';
import { handleRoute, ok, ApiError } from '../../../../lib/api/response';
import { newsroom } from '../../../../lib/admin-v2/lws';
import { parseJson } from '../../../../lib/api/validate';

export const dynamic = 'force-dynamic';

const schema = z.object({
  key: z.string().regex(/^[a-z_]{2,50}$/),
  label: z.string().trim().min(2).max(120),
  permissions: z.array(z.string().regex(/^[a-z_]+\.[a-z_]+$/)).max(60),
});

export const GET = handleRoute(async () => {
  const { actor } = await requireV2Api('roles.manage');
  return ok(await newsroom<{ items: unknown[] }>(actor, 'roles.list'));
});

export const PATCH = handleRoute(async (request: NextRequest) => {
  const { actor } = await requireV2Api('roles.manage');
  const payload = parseJson(schema, await request.json());
  if (payload.key === 'super_admin') throw new ApiError('Le rôle super_admin ne peut pas être modifié.', 400);
  return ok(await newsroom(actor, 'roles.update', { data: payload }));
});
