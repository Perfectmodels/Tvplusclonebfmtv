import { createAuthClient } from '../../../../lib/auth/server';
import { handleRoute, ok } from '../../../../lib/api/response';
import { usesLwsCatalog } from '../../../../lib/admin-v2/lws';
import { clearSession } from '../../../../lib/auth/session';

export const dynamic = 'force-dynamic';

export const POST = handleRoute(async () => {
  if (usesLwsCatalog()) {
    await clearSession();
    return ok({ signedOut: true });
  }
  const supabase = await createAuthClient();
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message);
  return ok({ signedOut: true });
});
