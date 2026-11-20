import { NextRequest } from 'next/server';
import { z } from 'zod';
import { subscribeNewsletter, getNewsletterFormats } from '../../../lib/db/repository';
import { rateLimit } from '../../../lib/api/rate-limit';
import { handleRoute, created, ok } from '../../../lib/api/response';
import { parseJson, emailSchema } from '../../../lib/api/validate';

export const dynamic = 'force-dynamic';

const schema = z.object({
  email: emailSchema,
  newsletter: z.string().trim().min(2).max(80).default('Récap Actu'),
});

export async function GET() {
  const formats = await getNewsletterFormats();
  return ok(formats);
}

export const POST = handleRoute(async (request: NextRequest) => {
  rateLimit(request, { limit: 5, windowMs: 60_000, prefix: 'newsletter' });
  const { email, newsletter } = parseJson(schema, await request.json());
  const row = await subscribeNewsletter(email, newsletter);
  return created(row);
});
