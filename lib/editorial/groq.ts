import 'server-only';
import { ApiError } from '../api/response';

type Message = { role: 'system' | 'user' | 'assistant'; content: string };

export function requireGroqKey() {
  const key = process.env.GROQ_API_KEY?.trim();
  if (!key) throw new ApiError('Groq doit être configuré par un administrateur.', 503, 'UNAVAILABLE');
  return key;
}

export async function completeGroq(key: string, messages: Message[], maxTokens: number, json = false): Promise<string> {
  const model = process.env.GROQ_MODEL?.trim() || 'openai/gpt-oss-120b';
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
    cache: 'no-store',
    signal: AbortSignal.timeout(25_000),
    body: JSON.stringify({
      model,
      messages,
      max_completion_tokens: maxTokens,
      temperature: 0.3,
      ...(model.startsWith('openai/gpt-oss-') ? { reasoning_effort: 'low' } : {}),
      ...(json ? { response_format: { type: 'json_object' } } : {}),
    }),
  }).catch(() => {
    throw new ApiError('Groq ne répond pas. Réessayez dans un instant.', 503, 'UNAVAILABLE');
  });

  if (response.status === 429) throw new ApiError('Le quota du fournisseur Groq est temporairement atteint.', 429, 'RATE_LIMITED');
  if (!response.ok) throw new ApiError('Groq a refusé la demande. Contactez un administrateur si le problème persiste.', 503, 'UNAVAILABLE');

  const result = await response.json().catch(() => null);
  const content = result?.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) {
    throw new ApiError('La réponse de Groq est vide. Essayez une nouvelle génération.', 502, 'UNAVAILABLE');
  }
  return content.trim();
}
