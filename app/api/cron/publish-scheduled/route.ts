import { NextRequest } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { getServerSupabase } from '../../../../lib/supabase/server';
import { usesTvplusV2 } from '../../../../lib/db/v2-public';
import { invalidatePublicArticle } from '../../../../lib/admin-v2/article-write';
import { handleRoute, ok, ApiError } from '../../../../lib/api/response';

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
  const now = new Date().toISOString();
  const v2 = usesTvplusV2();

  // TV+ V2 conserve la date planifiée dans published_at et n'a pas de colonnes
  // scheduled_at ou deleted_at. L'ancien schéma dispose de ces deux champs.
  let query = db.from('articles')
    .update(v2 ? { status: 'published' } : { status: 'published', published_at: now })
    .eq('status', 'scheduled')
    .lte(v2 ? 'published_at' : 'scheduled_at', now);

  if (!v2) query = query.is('deleted_at', null);

  const { data, error } = await query.select('id,title');
  if (error) throw new ApiError('La publication programmée est momentanément indisponible.', 503, 'UNAVAILABLE');

  if (data?.length) invalidatePublicArticle();
  return ok({ published: data?.length ?? 0, articles: data ?? [] });
}

export const GET = handleRoute(run);
export const POST = handleRoute(run);
