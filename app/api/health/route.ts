import { NextRequest } from 'next/server';
import { getServerSupabase, getPublicServerSupabase } from '../../../lib/supabase/server';
import { usesTvplusV2 } from '../../../lib/db/v2-public';
import { isSupabaseConfigured } from '../../../lib/supabase/env';
import { handleRoute, ok, fail } from '../../../lib/api/response';

export const dynamic = 'force-dynamic';

export const GET = handleRoute(async (_request: NextRequest) => {
  if (!isSupabaseConfigured()) return fail('Supabase non configuré.', 503, 'INTERNAL_ERROR');
  const db = usesTvplusV2() ? getPublicServerSupabase() : getServerSupabase();
  const { error } = await db.from('categories').select('id').limit(1);
  if (error) {
    return ok({
      status: 'degraded',
      supabase: 'reachable',
      database: 'schema_missing',
      hint: usesTvplusV2() ? 'Vérifier la lecture RLS des rubriques TV+ V2.' : 'Appliquer les migrations de ce dépôt sur une base dédiée.',
    });
  }
  return ok({ status: 'ok', supabase: 'reachable', database: 'ready', schema: usesTvplusV2() ? 'tvplus-v2' : 'clone' });
});
