import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireApiPermission, logAction } from '../../../../lib/auth/api';
import { PERMISSIONS } from '../../../../lib/auth/permissions';
import { getServerSupabase } from '../../../../lib/supabase/server';
import { handleRoute, ok, created, ApiError } from '../../../../lib/api/response';
import { parseJson, slugSchema } from '../../../../lib/api/validate';

export const dynamic = 'force-dynamic';

const schema = z.object({
  slug: slugSchema,
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(300).optional(),
});

export const GET = handleRoute(async () => {
  await requireApiPermission(PERMISSIONS.CATEGORIES_MANAGE);
  const db = getServerSupabase();
  const { data, error } = await db.from('categories').select('*').order('name');
  if (error) throw new Error(error.message);
  return ok({ items: data ?? [], total: data?.length ?? 0 });
});

export const POST = handleRoute(async (request: NextRequest) => {
  const actor = await requireApiPermission(PERMISSIONS.CATEGORIES_MANAGE);
  const payload = parseJson(schema, await request.json());
  const db = getServerSupabase();
  const { data: existing } = await db.from('categories').select('id').eq('slug', payload.slug).maybeSingle();
  if (existing) throw new ApiError('Cette rubrique existe déjà.', 409, 'CONFLICT');
  const { data, error } = await db.from('categories').insert(payload).select('*').single();
  if (error) throw new Error(error.message);
  await logAction(actor.user, 'category.create', 'categories', data.id, { name: data.name });
  return created(data);
});
