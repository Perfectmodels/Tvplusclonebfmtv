import { NextRequest } from 'next/server';
import { getFilActu } from '../../../lib/db/repository';
import { handleRoute, ok } from '../../../lib/api/response';

export const dynamic = 'force-dynamic';

export const GET = handleRoute(async (request: NextRequest) => {
  const limit = Math.min(100, Math.max(1, Number(request.nextUrl.searchParams.get('limit') ?? 20) || 20));
  const result = await getFilActu(limit);
  return ok(result);
});
