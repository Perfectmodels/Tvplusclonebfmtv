import { NextRequest } from 'next/server';
import { z } from 'zod';
import { createAuthClient } from '../../../../lib/auth/server';
import { rateLimit } from '../../../../lib/api/rate-limit';
import { handleRoute, ok, ApiError } from '../../../../lib/api/response';
import { parseJson, emailSchema } from '../../../../lib/api/validate';

export const dynamic = 'force-dynamic';

export const POST = handleRoute(async (request: NextRequest) => {
  rateLimit(request, { limit: 3, windowMs: 300_000, prefix: 'forgot' });
  const { email } = parseJson(z.object({ email: emailSchema }), await request.json());
  const supabase = await createAuthClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) throw new ApiError(error.message, 400, 'BAD_REQUEST');
  return ok({ sent: true });
});
