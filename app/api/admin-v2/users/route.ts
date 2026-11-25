import { requireV2Api } from '../../../../lib/auth/v2-admin';
import { handleRoute, ok, ApiError } from '../../../../lib/api/response';
import { newsroom, usesLwsCatalog } from '../../../../lib/admin-v2/lws';

export const dynamic = 'force-dynamic';

export const GET = handleRoute(async (request: Request) => {
  const { actor, db } = await requireV2Api('users.manage');
  if (usesLwsCatalog()) {
    if (new URL(request.url).searchParams.get('roles') === '1') {
      return ok(await newsroom<{ items: unknown[] }>(actor, 'roles.list'));
    }
    return ok(await newsroom<{ items: unknown[]; total: number }>(actor, 'users.list'));
  }
  const [profiles, roles] = await Promise.all([
    db.from('profiles').select('id,email,full_name,role,is_active,created_at').order('created_at', { ascending: false }),
    db.from('roles').select('key,label,permissions').order('key'),
  ]);
  if (profiles.error || roles.error) throw new ApiError('Comptes utilisateurs indisponibles.', 503, 'UNAVAILABLE');
  if (new URL(request.url).searchParams.get('roles') === '1') return ok({ items: roles.data ?? [] });
  return ok({ items: profiles.data ?? [], total: profiles.data?.length ?? 0 });
});
