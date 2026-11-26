import { NextRequest } from 'next/server';
import { z } from 'zod';
import {newsroom} from '../../../lib/admin-v2/lws';
import { rateLimit } from '../../../lib/api/rate-limit';
import { handleRoute, created, ApiError } from '../../../lib/api/response';
import { parseJson, emailSchema } from '../../../lib/api/validate';

export const dynamic = 'force-dynamic';

const schema = z.object({
  name: z.string().trim().min(2).max(100),
  email: emailSchema,
  question: z.string().trim().min(10).max(2000),
});

export const POST = handleRoute(async (request: NextRequest) => {
  rateLimit(request, { limit: 4, windowMs: 300_000, prefix: 'questions' });
  const payload = parseJson(schema, await request.json());
  const data=await newsroom<{id:string}>({id:'public',permissions:[]},'forms.question',{data:payload});
  return created({id:data.id});
});
