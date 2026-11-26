import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireApiPermission, logAction } from '../../../../lib/auth/api';
import { PERMISSIONS } from '../../../../lib/auth/permissions';
import { getServerSupabase } from '../../../../lib/supabase/server';
import { handleRoute, ok, created } from '../../../../lib/api/response';
import { parseJson } from '../../../../lib/api/validate';

export const dynamic = 'force-dynamic';

const schema = z.object({
  label: z.string().trim().min(3).max(120),
  link: z.string().url().or(z.string().startsWith('/')),
});

export const GET = handleRoute(async () => {
  await requireApiPermission(PERMISSIONS.SETTINGS_MANAGE);
  const db = getServerSupabase();
  const { data, error } = await db.from('site_topics').select('*').order('id');
  if (error) throw new Error(error.message);
  return ok({ items: data ?? [], total: data?.length ?? 0 });
});

export const POST = handleRoute(async (request: NextRequest) => {
  const actor = await requireApiPermission(PERMISSIONS.SETTINGS_MANAGE);
  const payload = parseJson(schema, await request.json());
  const db = getServerSupabase();
  const { data: max } = await db.from('site_topics').select('id').order('id', { ascending: false }).limit(1).maybeSingle();
  const { data, error } = await db.from('site_topics').insert({ id: (max?.id ?? 0) + 1, ...payload }).select('*').single();
  if (error) throw new Error(error.message);
  await logAction(actor.user, 'topic.create', 'site_topics', String(data.id), { label: data.label });
  return created(data);
});

export const DELETE = handleRoute(async (request: NextRequest) => {
  const actor = await requireApiPermission(PERMISSIONS.SETTINGS_MANAGE);
  const id = Number(request.nextUrl.searchParams.get('id'));
  if (!Number.isInteger(id)) throw new Error('Identifiant invalide.');
  const db = getServerSupabase();
  const { error } = await db.from('site_topics').delete().eq('id', id);
  if (error) throw new Error(error.message);
  await logAction(actor.user, 'topic.delete', 'site_topics', String(id));
  return ok({ deleted: id });
});
