import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireApiPermission, logAction } from '../../../../lib/auth/api';
import { PERMISSIONS } from '../../../../lib/auth/permissions';
import { getServerSupabase } from '../../../../lib/supabase/server';
import { handleRoute, ok } from '../../../../lib/api/response';
import { parseJson } from '../../../../lib/api/validate';

export const dynamic = 'force-dynamic';

function mask(value: string | null) {
  if (!value) return '';
  if (value.length <= 6) return '••••••';
  return value.slice(0, 3) + '••••••' + value.slice(-3);
}

export const GET = handleRoute(async () => {
  await requireApiPermission(PERMISSIONS.SETTINGS_MANAGE);
  const db = getServerSupabase();
  const { data, error } = await db.from('stream_settings').select('*').order('provider');
  if (error) throw new Error(error.message);
  // La clé de flux n'est jamais renvoyée en clair au navigateur.
  return ok((data ?? []).map((row) => ({
    provider: row.provider,
    label: row.label,
    rtmpUrl: row.rtmp_url ?? '',
    keyMasked: mask(row.stream_key),
    hasKey: Boolean(row.stream_key),
    enabled: row.enabled,
    instructions: row.instructions ?? '',
  })));
});

const schema = z.object({
  provider: z.string().min(2).max(40),
  rtmpUrl: z.string().trim().max(300).optional(),
  streamKey: z.string().trim().max(300).optional(),
  enabled: z.boolean().optional(),
});

export const POST = handleRoute(async (request: NextRequest) => {
  const actor = await requireApiPermission(PERMISSIONS.SETTINGS_MANAGE);
  const payload = parseJson(schema, await request.json());
  const db = getServerSupabase();
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (payload.rtmpUrl !== undefined) update.rtmp_url = payload.rtmpUrl || null;
  if (payload.streamKey !== undefined && payload.streamKey) update.stream_key = payload.streamKey;
  if (payload.enabled !== undefined) update.enabled = payload.enabled;
  const { data, error } = await db.from('stream_settings').update(update).eq('provider', payload.provider).select('provider, label, rtmp_url, enabled').maybeSingle();
  if (error) throw new Error(error.message);
  await logAction(actor.user, 'stream_settings.update', 'stream_settings', payload.provider, { enabled: payload.enabled });
  return ok(data);
});
