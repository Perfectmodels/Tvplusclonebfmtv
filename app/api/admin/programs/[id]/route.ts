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
  name: z.string().trim().min(2).max(100).optional(),
  host: z.string().trim().max(100).optional(),
  slot: z.string().trim().min(3).max(60).optional(),
  category: z.string().trim().min(2).max(60).optional(),
  image_url: z.string().url().optional().nullable(),
  description: z.string().trim().max(600).optional(),
}).refine((v) => Object.keys(v).length > 0, { message: 'Aucune donnée à mettre à jour.' });

export const PATCH = handleRoute(async (request: NextRequest, { params }: Context) => {
  const actor = await requireApiPermission(PERMISSIONS.PROGRAMS_MANAGE);
  const { id } = await params;
  const payload = parseJson(schema, await request.json());
  const db = getServerSupabase();
  const { data, error } = await db.from('programs').update(payload).eq('id', id).select('*').maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new ApiError('Émission introuvable.', 404, 'NOT_FOUND');
  await logAction(actor.user, 'program.update', 'programs', id, { name: data.name });
  return ok(data);
});

export const DELETE = handleRoute(async (_request: NextRequest, { params }: Context) => {
  const actor = await requireApiPermission(PERMISSIONS.PROGRAMS_MANAGE);
  const { id } = await params;
  const db = getServerSupabase();
  const { error } = await db.from('programs').delete().eq('id', id);
  if (error) throw new Error(error.message);
  await logAction(actor.user, 'program.delete', 'programs', id);
  return ok({ deleted: id });
});
