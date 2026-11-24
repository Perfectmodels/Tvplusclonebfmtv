import { NextRequest } from 'next/server';
import { z } from 'zod';
import { createAuthClient } from '../../../../lib/auth/server';
import { rateLimit } from '../../../../lib/api/rate-limit';
import { handleRoute, ok, ApiError } from '../../../../lib/api/response';
import { parseJson, emailSchema } from '../../../../lib/api/validate';
import { newsroom, usesLwsCatalog } from '../../../../lib/admin-v2/lws';
import { verifyPassword } from '../../../../lib/auth/password';
import { setSession } from '../../../../lib/auth/session';

export const dynamic = 'force-dynamic';

const schema = z.object({ email: emailSchema, password: z.string().min(6).max(200) });

type LoginProfile = { id: string; email: string; password_hash: string };

export const POST = handleRoute(async (request: NextRequest) => {
  rateLimit(request, { limit: 10, windowMs: 60_000, prefix: 'login' });
  const { email, password } = parseJson(schema, await request.json());

  if (usesLwsCatalog()) {
    let profile: LoginProfile | null = null;
    try {
      profile = await newsroom<LoginProfile>({ id: 'public', permissions: [] }, 'auth.login', { data: { email } });
    } catch {
      profile = null;
    }
    if (!profile || !verifyPassword(password, profile.password_hash ?? '')) {
      throw new ApiError('Adresse e-mail ou mot de passe incorrect.', 401, 'UNAUTHORIZED');
    }
    await setSession(profile.id);
    return ok({ id: profile.id, email: profile.email });
  }

  const supabase = await createAuthClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new ApiError('Adresse e-mail ou mot de passe incorrect.', 401, 'UNAUTHORIZED');
  return ok({ id: data.user.id, email: data.user.email });
});
