import { NextRequest } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { refreshNewsFeed } from '../../../../lib/rss/ingest';
import { usesTvplusV2 } from '../../../../lib/db/v2-public';
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
  if (usesTvplusV2()) throw new ApiError('Le flux RSS est géré par TV+ V2. La tâche du clone est désactivée.', 503, 'UNAVAILABLE');
  if (!authorized(request)) throw new ApiError('Accès non autorisé.', 401, 'UNAUTHORIZED');
  return ok(await refreshNewsFeed());
}

export const GET = handleRoute(run);
export const POST = handleRoute(run);
