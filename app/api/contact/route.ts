import { NextRequest } from 'next/server';
import { z } from 'zod';
import { createContact } from '../../../lib/db/repository';
import { rateLimit } from '../../../lib/api/rate-limit';
import { handleRoute, created } from '../../../lib/api/response';
import { parseJson, emailSchema } from '../../../lib/api/validate';

export const dynamic = 'force-dynamic';

const schema = z.object({
  name: z.string().trim().min(2).max(100),
  email: emailSchema,
  subject: z.string().trim().min(3).max(150),
  message: z.string().trim().min(10).max(4000),
});

export const POST = handleRoute(async (request: NextRequest) => {
  rateLimit(request, { limit: 3, windowMs: 300_000, prefix: 'contact' });
  const payload = parseJson(schema, await request.json());
  const row = await createContact(payload);
  return created(row);
});
