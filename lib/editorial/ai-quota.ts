import 'server-only';
import { createHmac } from 'node:crypto';
import { BlobNotFoundError, BlobPreconditionFailedError, head, put, type HeadBlobResult } from '@vercel/blob';
import { ApiError } from '../api/response';

const gabonDate = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Africa/Libreville', year: 'numeric', month: '2-digit', day: '2-digit' });
const unavailable = () => new ApiError('Le compteur IA est temporairement indisponible. Réessayez dans un instant.', 503, 'UNAVAILABLE');

function limits() {
  const bound = (value: string | undefined, fallback: number, maximum: number) => {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 && parsed <= maximum ? parsed : fallback;
  };
  return { user: bound(process.env.TVPLUS_AI_DAILY_USER_LIMIT, 12, 100), global: bound(process.env.TVPLUS_AI_DAILY_GLOBAL_LIMIT, 120, 1000) };
}

function names(actorId: string) {
  const secret = process.env.AUTH_SESSION_SECRET?.trim();
  if (!process.env.BLOB_READ_WRITE_TOKEN || !secret) throw unavailable();
  const prefix = 'editorial-ai-quota/' + gabonDate.format(new Date()) + '/';
  const file = (id: string) => prefix + createHmac('sha256', secret).update('ai-quota:' + id).digest('hex') + '.txt';
  return { user: file('account:' + actorId), global: file('global') };
}

async function current(path: string, signal: AbortSignal): Promise<HeadBlobResult | null> {
  try {
    const meta = await head(path, { abortSignal: signal });
    if (!Number.isSafeInteger(meta.size) || meta.size < 1 || !meta.etag) throw unavailable();
    return meta;
  } catch (error) {
    if (error instanceof BlobNotFoundError) return null;
    throw unavailable();
  }
}

// Une demande = un octet. Le compteur utilise la taille de l’objet côté stockage,
// sans télécharger son contenu ni dépendre du cache CDN ou d’une instance Vercel.
async function increment(path: string, limit: number, message: string, signal: AbortSignal) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const previous = await current(path, signal);
    const used = previous?.size ?? 0;
    if (used >= limit) throw new ApiError(message, 429, 'RATE_LIMITED');
    try {
      await put(path, '1'.repeat(used + 1), {
        access: 'public',
        addRandomSuffix: false,
        contentType: 'text/plain',
        ttlDays: 2,
        ...(previous ? { ifMatch: previous.etag } : { allowOverwrite: false }),
        abortSignal: signal,
      });
      return used + 1;
    } catch (error) {
      const collision = error instanceof BlobPreconditionFailedError ||
        (!previous && error instanceof Error && /already exists|overwrite/i.test(error.message));
      if (!collision) throw unavailable();
    }
  }
  throw unavailable();
}

export async function aiQuota(actorId: string) {
  const limit = limits().user;
  const used = (await current(names(actorId).user, AbortSignal.timeout(3500)))?.size ?? 0;
  return { limit, remaining: Math.max(0, limit - used) };
}

export async function reserveAiRequest(actorId: string) {
  const paths = names(actorId);
  const signal = AbortSignal.timeout(6500);
  const limit = limits();
  const userMessage = 'Votre quota IA du jour est atteint. Il se renouvelle à minuit, heure de Libreville.';
  if (((await current(paths.user, signal))?.size ?? 0) >= limit.user) throw new ApiError(userMessage, 429, 'RATE_LIMITED');
  await increment(paths.global, limit.global, 'Le quota IA de TV+ Afrique est atteint pour aujourd’hui.', signal);
  const used = await increment(paths.user, limit.user, userMessage, signal);
  return { limit: limit.user, remaining: limit.user - used };
}
