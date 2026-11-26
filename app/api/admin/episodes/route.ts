import { NextRequest } from 'next/server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { requireApiPermission, logAction } from '../../../../lib/auth/api';
import { PERMISSIONS } from '../../../../lib/auth/permissions';
import { getServerSupabase } from '../../../../lib/supabase/server';
import { handleRoute, ok, created } from '../../../../lib/api/response';
import { parseJson } from '../../../../lib/api/validate';

export const dynamic = 'force-dynamic';

const schema = z.object({
  title: z.string().trim().min(3).max(200),
  program_id: z.string().uuid().optional().nullable(),
  description: z.string().trim().max(1000).optional(),
  video_url: z.string().url().optional().nullable(),
  thumbnail_url: z.string().url().optional().nullable(),
  duration: z.string().trim().max(20).default('00:00'),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
});

export const GET = handleRoute(async () => {
  await requireApiPermission(PERMISSIONS.PROGRAMS_MANAGE);
  const db = getServerSupabase();
  const { data, error } = await db.from('episodes').select('*, programs(name)').order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return ok({ items: data ?? [], total: data?.length ?? 0 });
});

export const POST = handleRoute(async (request: NextRequest) => {
  const actor = await requireApiPermission(PERMISSIONS.PROGRAMS_MANAGE);
  const payload = parseJson(schema, await request.json());
  const db = getServerSupabase();
  const { data, error } = await db.from('episodes').insert({
    ...payload,
    published_at: payload.status === 'published' ? new Date().toISOString() : null,
  }).select('*').single();
  if (error) throw new Error(error.message);
  await logAction(actor.user, 'episode.create', 'episodes', data.id, { title: data.title });
  revalidatePath('/replays');
  return created(data);
});
