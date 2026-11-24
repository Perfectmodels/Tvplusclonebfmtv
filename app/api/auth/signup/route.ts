import { NextRequest } from 'next/server';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { createAuthClient } from '../../../../lib/auth/server';
import { rateLimit } from '../../../../lib/api/rate-limit';
import { handleRoute, ok, ApiError } from '../../../../lib/api/response';
import { parseJson, emailSchema } from '../../../../lib/api/validate';
import { newsroom, usesLwsCatalog } from '../../../../lib/admin-v2/lws';
import { hashPassword } from '../../../../lib/auth/password';
import { setSession } from '../../../../lib/auth/session';

export const dynamic = 'force-dynamic';

const schema = z.object({
  email: emailSchema,
  password: z.string().min(8).max(200).regex(/[0-9]/, 'Le mot de passe doit contenir au moins un chiffre.'),
  fullName: z.string().trim().min(2).max(100).optional(),
});

export const POST = handleRoute(async (request: NextRequest) => {
  rateLimit(request, { limit: 5, windowMs: 60_000, prefix: 'signup' });
  const { email, password, fullName } = parseJson(schema, await request.json());

  if (usesLwsCatalog()) {
    const id = randomUUID();
    await newsroom({ id, permissions: [] }, 'profile.signup', {
      data: { id, email, full_name: fullName ?? null, password_hash: hashPassword(password) },
    });
    await setSession(id);
    return ok({ id, needsConfirmation: false });
  }

  const supabase = await createAuthClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName ?? '' } },
  });
  if (error) throw new ApiError(error.message, 400, 'BAD_REQUEST');
  return ok({ id: data.user?.id ?? null, needsConfirmation: !data.session });
});
