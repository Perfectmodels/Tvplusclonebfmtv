import { NextRequest } from 'next/server';
import { z } from 'zod';
import { createAuthClient } from '../../../../lib/auth/server';
import { rateLimit } from '../../../../lib/api/rate-limit';
import { handleRoute, ok, ApiError } from '../../../../lib/api/response';
import { parseJson, emailSchema } from '../../../../lib/api/validate';

export const dynamic = 'force-dynamic';

const schema = z.object({ email: emailSchema, password: z.string().min(6).max(200) });

export const POST = handleRoute(async (request: NextRequest) => {
  rateLimit(request, { limit: 10, windowMs: 60_000, prefix: 'login' });
  const { email, password } = parseJson(schema, await request.json());
  const supabase = await createAuthClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new ApiError('Adresse e-mail ou mot de passe incorrect.', 401, 'UNAUTHORIZED');
  return ok({ id: data.user.id, email: data.user.email });
});
