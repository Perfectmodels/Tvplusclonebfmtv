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
  status: z.enum(['new', 'answered', 'archived']).optional(),
  answer: z.string().trim().max(2000).optional(),
}).refine((v) => Object.keys(v).length > 0, { message: 'Aucune donnée à mettre à jour.' });

export const PATCH = handleRoute(async (request: NextRequest, { params }: Context) => {
  const actor = await requireApiPermission(PERMISSIONS.ARTICLES_UPDATE);
  const { id } = await params;
  const payload = parseJson(schema, await request.json());
  const db = getServerSupabase();
  const { data, error } = await db.from('questions').update(payload).eq('id', id).select('id, status').maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new ApiError('Question introuvable.', 404, 'NOT_FOUND');
  await logAction(actor.user, 'question.update', 'questions', id, { status: payload.status });
  return ok(data);
});

export const DELETE = handleRoute(async (_request: NextRequest, { params }: Context) => {
  const actor = await requireApiPermission(PERMISSIONS.ARTICLES_DELETE);
  const { id } = await params;
  const db = getServerSupabase();
  const { error } = await db.from('questions').delete().eq('id', id);
  if (error) throw new Error(error.message);
  await logAction(actor.user, 'question.delete', 'questions', id);
  return ok({ deleted: id });
});
