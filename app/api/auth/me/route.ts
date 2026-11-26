import { getUser, getProfile } from '../../../../lib/auth/server';
import { handleRoute, ok } from '../../../../lib/api/response';

export const dynamic = 'force-dynamic';

export const GET = handleRoute(async () => {
  const user = await getUser();
  if (!user) return ok({ user: null, profile: null });
  return ok({ user: { id: user.id, email: user.email }, profile: await getProfile() });
});
