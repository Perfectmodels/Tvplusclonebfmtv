import { requireV2Api, hasV2Permission } from '../../../../../../lib/auth/v2-admin';
import { handleRoute, ok, ApiError } from '../../../../../../lib/api/response';
import { newsroom } from '../../../../../../lib/admin-v2/lws';

export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ id: string }> };

export const GET = handleRoute(async (_request: Request, { params }: Context) => {
  const { actor } = await requireV2Api('articles.read_all');
  const { id } = await params;
  const elevated = hasV2Permission(actor, 'articles.review') || hasV2Permission(actor, 'users.manage');
  if (id !== actor.id && !elevated) throw new ApiError('Accès à cet espace refusé.', 403, 'UNAUTHORIZED');
  return ok(await newsroom(actor, 'users.workspace', { id }));
});
