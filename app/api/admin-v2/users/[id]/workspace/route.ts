import { requireV2Api } from '../../../../../../lib/auth/v2-admin';
import { handleRoute, ok } from '../../../../../../lib/api/response';
import { newsroom } from '../../../../../../lib/admin-v2/lws';

export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ id: string }> };

export const GET = handleRoute(async (_request: Request, { params }: Context) => {
  const { actor } = await requireV2Api('articles.read_all');
  const { id } = await params;
  return ok(await newsroom(actor, 'users.workspace', { id }));
});
