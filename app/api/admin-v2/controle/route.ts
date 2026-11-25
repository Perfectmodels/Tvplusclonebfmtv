import { consolidateAuthorStats, type AuthorStats } from '../../../../lib/admin-v2/author-stats';
import { requireV2Api } from '../../../../lib/auth/v2-admin';
import { handleRoute, ok } from '../../../../lib/api/response';
import { newsroom } from '../../../../lib/admin-v2/lws';

type Full = {
  counts: Record<string, number>;
  total: number;
  media: number;
  author_stats: AuthorStats[];
  daily_written: unknown[];
  daily_published: unknown[];
  country_stats: unknown[];
  review_queue: unknown[];
  audit: unknown[];
};

export const dynamic = 'force-dynamic';

export const GET = handleRoute(async () => {
  const { actor } = await requireV2Api('articles.review');
  const data = await newsroom<Full>(actor, 'dashboard.full');
  return ok({
    counts: data.counts, total: data.total, media: data.media,
    authors: consolidateAuthorStats(data.author_stats ?? []),
    dailyWritten: data.daily_written ?? [],
    dailyPublished: data.daily_published ?? [],
    countries: data.country_stats ?? [],
    reviewQueue: data.review_queue ?? [],
    audit: data.audit ?? [],
  });
});
