import { NextRequest } from 'next/server';
import { getNewsFeed } from '../../../lib/rss/news';
import { handleRoute, ok } from '../../../lib/api/response';

export const dynamic = 'force-dynamic';

export const GET = handleRoute(async (request: NextRequest) => {
  const limit = Math.min(100, Math.max(1, Number(request.nextUrl.searchParams.get('limit') ?? 30) || 30));
  const result = await getNewsFeed(limit);
  // Les champs de source ne sont jamais renvoyés.
  return ok(result, 200, { headers: { 'Cache-Control': 'public, s-maxage=180, stale-while-revalidate=600' } });
});
