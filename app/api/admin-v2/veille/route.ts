import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireV2Api } from '../../../../lib/auth/v2-admin';
import { ApiError, handleRoute, ok } from '../../../../lib/api/response';
import { watchRegions } from '../../../../lib/editorial/veille-types';
import { getEditorialWatch } from '../../../../lib/rss/editorial-watch';

export const dynamic = 'force-dynamic';
export const GET = handleRoute(async (request: NextRequest) => {
  const { actor } = await requireV2Api('articles.read_all');
  const params = request.nextUrl.searchParams;
  const region = z.enum(watchRegions).safeParse(params.get('region') ?? 'gabon');
  if (!region.success) throw new ApiError('Zone de veille invalide.');
  const page = z.coerce.number().int().min(1).max(100).catch(1).parse(params.get('page') ?? 1);
  const query = (params.get('q') ?? '').trim().slice(0, 100).toLocaleLowerCase('fr');
  const pageSize = 8;

  try {
    const snapshot = await getEditorialWatch(region.data);
    const items = query ? snapshot.filter((item) =>
      [item.title, item.summary, item.source].some((text) => text.toLocaleLowerCase('fr').includes(query))) : snapshot;
    return ok({
      items: items.slice((page - 1) * pageSize, page * pageSize),
      total: items.length,
      pageSize,
      canRemix: actor.permissions.includes('articles.create'),
      groqReady: Boolean(process.env.GROQ_API_KEY?.trim()),
    });
  } catch {
    throw new ApiError('Les flux de cette zone sont temporairement indisponibles. Réessayez dans quelques instants.', 503, 'UNAVAILABLE');
  }
});
