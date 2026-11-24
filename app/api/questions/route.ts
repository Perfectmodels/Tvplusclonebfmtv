import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getServerSupabase, getPublicServerSupabase } from '../../../lib/supabase/server';
import { usesTvplusV2 } from '../../../lib/db/v2-public';
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
  if (usesTvplusV2()) {
    const {error}=await getPublicServerSupabase().from('tvplus_reader_inbox').insert({
      kind:'question',name:payload.name,email:payload.email.toLowerCase().trim(),body:payload.question,
    });
    if(error)throw new ApiError('Impossible d’enregistrer votre question.',503,'UNAVAILABLE');
    return created({ok:true});
  }
  const db = getServerSupabase();
  const { data, error } = await db.from('questions').insert(payload).select('id, created_at').single();
  if (error) throw new Error(error.message);
  return created({ id: data.id });
});
