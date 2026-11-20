import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '../../../../lib/api/auth';
import { handleRoute, ok, created } from '../../../../lib/api/response';
import { parseJson } from '../../../../lib/api/validate';
import { getServerSupabase } from '../../../../lib/supabase/server';

export const dynamic = 'force-dynamic';

const schema = z.object({
  name: z.string().trim().min(2).max(80),
  url: z.string().url().max(500),
});

export const GET = handleRoute(async (request: NextRequest) => {
  requireAdmin(request);
  const db = getServerSupabase();
  const { data, error } = await db.from('rss_sources').select('id, name, url, active').order('name');
  if (error) throw new Error(error.message);
  return ok(data ?? []);
});

export const POST = handleRoute(async (request: NextRequest) => {
  requireAdmin(request);
  const payload = parseJson(schema, await request.json());
  const db = getServerSupabase();
  const { data, error } = await db.from('rss_sources').insert(payload).select('id, name, url, active').single();
  if (error) throw new Error(error.message);
  return created(data);
});

export const DELETE = handleRoute(async (request: NextRequest) => {
  requireAdmin(request);
  const id = request.nextUrl.searchParams.get('id');
  if (!id) throw new Error('Paramètre id requis.');
  const db = getServerSupabase();
  const { error } = await db.from('rss_sources').delete().eq('id', id);
  if (error) throw new Error(error.message);
  return ok({ deleted: id });
});
