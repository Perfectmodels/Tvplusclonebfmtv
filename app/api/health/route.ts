import { NextRequest } from 'next/server';
import { getServerSupabase } from '../../../lib/supabase/server';
import { isSupabaseConfigured } from '../../../lib/supabase/env';
import { handleRoute, ok, fail } from '../../../lib/api/response';

export const dynamic = 'force-dynamic';

export const GET = handleRoute(async (_request: NextRequest) => {
  if (!isSupabaseConfigured()) return fail('Supabase non configuré.', 503, 'INTERNAL_ERROR');
  const db = getServerSupabase();
  const { error } = await db.from('categories').select('id').limit(1);
  if (error) {
    return ok({
      status: 'degraded',
      supabase: 'reachable',
      database: 'schema_missing',
      hint: 'Appliquer supabase/migrations/0001_init.sql dans le SQL Editor Supabase.',
    });
  }
  return ok({ status: 'ok', supabase: 'reachable', database: 'ready' });
});
