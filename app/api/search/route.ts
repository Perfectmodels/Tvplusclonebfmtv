import { NextRequest } from 'next/server';
import { searchAll } from '../../../lib/db/repository';
import { handleRoute, ok, fail } from '../../../lib/api/response';

export const dynamic = 'force-dynamic';

export const GET = handleRoute(async (request: NextRequest) => {
  const q = (request.nextUrl.searchParams.get('q') ?? '').trim();
  if (q.length < 2) return fail('La recherche nécessite au moins 2 caractères.', 400);
  return ok({ query: q, ...(await searchAll(q)) });
});
