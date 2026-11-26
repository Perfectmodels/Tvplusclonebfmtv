import { getCategories } from '../../../lib/db/repository';
import { handleRoute, ok } from '../../../lib/api/response';

export const dynamic = 'force-dynamic';

export const GET = handleRoute(async () => {
  const result = await getCategories();
  return ok(result);
});
