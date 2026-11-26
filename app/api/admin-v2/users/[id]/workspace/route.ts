import { requireV2Api, hasV2Permission } from '../../../../../../lib/auth/v2-admin';
import { handleRoute, ok, ApiError } from '../../../../../../lib/api/response';
import { newsroom } from '../../../../../../lib/admin-v2/lws';
import { consolidateAuthorStats, type AuthorStats } from '../../../../../../lib/admin-v2/author-stats';
import { isPanfilEbo } from '../../../../../../lib/articles/author-names';

export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ id: string }> };
type Workspace = {
  profile: { id: string; full_name: string | null };
  articles: { id: string; published_at: string | null; created_at: string | null }[];
  counts: Record<string, number>;
  total: number;
};

export const GET = handleRoute(async (_request: Request, { params }: Context) => {
  const { actor } = await requireV2Api('articles.read_all');
  const { id } = await params;
  const canSeeOtherProfiles = hasV2Permission(actor, 'articles.review') || hasV2Permission(actor, 'users.manage');
  if (id !== actor.id && !canSeeOtherProfiles) throw new ApiError('Accès à cet espace refusé.', 403, 'UNAUTHORIZED');
  const workspace = await newsroom<Workspace>(actor, 'users.workspace', { id });
  if (!canSeeOtherProfiles || !isPanfilEbo(workspace.profile.full_name)) return ok(workspace);

  const { author_stats } = await newsroom<{ author_stats: AuthorStats[] }>(actor, 'dashboard.full');
  const canonical = consolidateAuthorStats(author_stats ?? []).find((row) => isPanfilEbo(row.full_name));
  if (!canonical) return ok(workspace);
  const ids = [canonical.id, ...(canonical.aliasIds ?? [])];
  const workspaces = await Promise.all(ids.map((profileId) =>
    profileId === id ? workspace : newsroom<Workspace>(actor, 'users.workspace', { id: profileId })));
  const counts: Record<string, number> = {};
  for (const item of workspaces) {
    for (const [status, count] of Object.entries(item.counts)) counts[status] = (counts[status] ?? 0) + count;
  }
  return ok({
    profile: { ...workspaces[0].profile, full_name: 'Panfil Ebo' },
    articles: workspaces.flatMap((item) => item.articles).sort((a, b) =>
      (b.published_at ?? b.created_at ?? '').localeCompare(a.published_at ?? a.created_at ?? '')),
    counts,
    total: workspaces.reduce((total, item) => total + item.total, 0),
    authorIds: ids,
  });
});
