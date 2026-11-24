import { requireV2Api } from '../../../../../lib/auth/v2-admin';
import { handleRoute, ok } from '../../../../../lib/api/response';
import { newsroom } from '../../../../../lib/admin-v2/lws';

type Full = {
  author_stats: unknown[];
  daily_written: unknown[];
  daily_published: unknown[];
  country_stats: unknown[];
};

export const dynamic = 'force-dynamic';

export const GET = handleRoute(async () => {
  const { actor } = await requireV2Api('articles.read_all');
  const data = await newsroom<Full>(actor, 'dashboard.full');
  return ok({
    authors: data.author_stats ?? [],
    dailyWritten: data.daily_written ?? [],
    dailyPublished: data.daily_published ?? [],
    countries: data.country_stats ?? [],
  });
});
