import { createAuthClient } from '../../../../lib/auth/server';
import { handleRoute, ok } from '../../../../lib/api/response';

export const dynamic = 'force-dynamic';

export const POST = handleRoute(async () => {
  const supabase = await createAuthClient();
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message);
  return ok({ signedOut: true });
});
