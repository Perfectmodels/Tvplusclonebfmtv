import { NextRequest } from 'next/server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { requireApiPermission, logAction } from '../../../../../lib/auth/api';
import { PERMISSIONS } from '../../../../../lib/auth/permissions';
import { getServerSupabase } from '../../../../../lib/supabase/server';
import { handleRoute, ok, ApiError } from '../../../../../lib/api/response';
import { parseJson } from '../../../../../lib/api/validate';

export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ id: string }> };

const schema = z.object({
  title: z.string().trim().min(3).max(200).optional(),
  program_id: z.string().uuid().optional().nullable(),
  description: z.string().trim().max(1000).optional(),
  video_url: z.string().url().optional().nullable(),
  thumbnail_url: z.string().url().optional().nullable(),
  duration: z.string().trim().max(20).optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
}).refine((v) => Object.keys(v).length > 0, { message: 'Aucune donnée à mettre à jour.' });

export const PATCH = handleRoute(async (request: NextRequest, { params }: Context) => {
  const actor = await requireApiPermission(PERMISSIONS.PROGRAMS_MANAGE);
  const { id } = await params;
  const payload = parseJson(schema, await request.json());
  const db = getServerSupabase();
  const update: Record<string, unknown> = { ...payload, updated_at: new Date().toISOString() };
  if (payload.status === 'published') update.published_at = new Date().toISOString();
  const { data, error } = await db.from('episodes').update(update).eq('id', id).select('*').maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new ApiError('Épisode introuvable.', 404, 'NOT_FOUND');
  await logAction(actor.user, 'episode.update', 'episodes', id, { title: data.title, status: data.status });
  revalidatePath('/replays');
  return ok(data);
});

export const DELETE = handleRoute(async (_request: NextRequest, { params }: Context) => {
  const actor = await requireApiPermission(PERMISSIONS.PROGRAMS_MANAGE);
  const { id } = await params;
  const db = getServerSupabase();
  const { error } = await db.from('episodes').delete().eq('id', id);
  if (error) throw new Error(error.message);
  await logAction(actor.user, 'episode.delete', 'episodes', id);
  revalidatePath('/replays');
  return ok({ deleted: id });
});
