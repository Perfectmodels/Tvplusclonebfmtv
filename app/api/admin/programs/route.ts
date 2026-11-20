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
  name: z.string().trim().min(2).max(100),
  host: z.string().trim().max(100).optional(),
  slot: z.string().trim().min(3).max(60),
  category: z.string().trim().min(2).max(60),
  image_url: z.string().url().optional().nullable(),
  description: z.string().trim().max(600).optional(),
});

export const GET = handleRoute(async () => {
  await requireApiPermission(PERMISSIONS.PROGRAMS_MANAGE);
  const db = getServerSupabase();
  const { data, error } = await db.from('programs').select('*').order('slot');
  if (error) throw new Error(error.message);
  return ok({ items: data ?? [], total: data?.length ?? 0 });
});

export const POST = handleRoute(async (request: NextRequest) => {
  const actor = await requireApiPermission(PERMISSIONS.PROGRAMS_MANAGE);
  const payload = parseJson(schema, await request.json());
  const db = getServerSupabase();
  const { data: existing } = await db.from('programs').select('id').eq('slug', payload.slug).maybeSingle();
  if (existing) throw new ApiError('Cette émission existe déjà.', 409, 'CONFLICT');
  const { data, error } = await db.from('programs').insert(payload).select('*').single();
  if (error) throw new Error(error.message);
  await logAction(actor.user, 'program.create', 'programs', data.id, { name: data.name });
  return created(data);
});
