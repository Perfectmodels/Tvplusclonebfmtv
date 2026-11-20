import { NextRequest } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { getServerSupabase } from '../../../../lib/supabase/server';
import { handleRoute, ok } from '../../../../lib/api/response';
import { ApiError } from '../../../../lib/api/response';

export const dynamic = 'force-dynamic';

function authorized(request: NextRequest) {
  const secrets = [process.env.CRON_SECRET, process.env.SUPABASE_SECRET_KEY].filter(Boolean) as string[];
  const header = request.headers.get('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  return secrets.some((secret) => {
    const a = Buffer.from(secret);
    const b = Buffer.from(token);
    return a.length === b.length && timingSafeEqual(a, b);
  });
}

async function run(request: NextRequest) {
  if (!authorized(request)) throw new ApiError('Accès non autorisé.', 401, 'UNAUTHORIZED');
  const db = getServerSupabase();
  const { data, error } = await db
    .from('articles')
    .update({ status: 'published', published_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('status', 'scheduled')
    .lte('scheduled_at', new Date().toISOString())
    .is('deleted_at', null)
    .select('id, title');
  if (error) throw new Error(error.message);
  return ok({ published: data?.length ?? 0, articles: data ?? [] });
}

export const GET = handleRoute(run);
export const POST = handleRoute(run);
