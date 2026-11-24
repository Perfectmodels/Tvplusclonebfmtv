import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireV2Api } from '../../../../lib/auth/v2-admin';
import { handleRoute, ok } from '../../../../lib/api/response';
import { parseJson } from '../../../../lib/api/validate';
import { rateLimit } from '../../../../lib/api/rate-limit';
import { aiQuota, reserveAiRequest } from '../../../../lib/editorial/ai-quota';
import { completeGroq, requireGroqKey } from '../../../../lib/editorial/groq';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const schema = z.object({
  question: z.string().trim().min(1).max(2000),
  history: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string().trim().min(1).max(2400),
  })).max(6).default([]),
});

export const GET = handleRoute(async () => {
  const { actor } = await requireV2Api('articles.read_all');
  return ok(await aiQuota(actor.id));
});

export const POST = handleRoute(async (request: NextRequest) => {
  const { actor } = await requireV2Api('articles.read_all');
  const key = requireGroqKey();
  rateLimit(request, { prefix: 'tvplus-assistant:' + actor.id, limit: 5 });
  const { question, history } = parseJson(schema, await request.json().catch(() => null));
  const quota = await reserveAiRequest(actor.id);
  const reply = await completeGroq(key, [
    { role: 'system', content: 'Tu es TV+Assistant, l’assistant de rédaction de TV+ Afrique. Réponds en français, de façon claire et concise. Aide à trouver des angles, structurer des sujets, reformuler et préparer des interviews et publications. Tu ne consultes ni le web ni les données internes. Distingue les faits fournis des suggestions, signale ce qui reste à vérifier et n’invente ni citations, ni sources, ni faits. Réponds en texte lisible avec des listes courtes si utile.' },
    ...history,
    { role: 'user', content: question },
  ], 1100);
  return ok({ reply, ...quota });
});
