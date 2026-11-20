import { timingSafeEqual } from 'node:crypto';
import type { NextRequest } from 'next/server';
import { ApiError } from './response';

function safeEqual(a: string, b: string) {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

/** Vérifie le secret partagé pour les endpoints d'écriture/ administration. */
export function requireAdmin(request: NextRequest) {
  const secret = process.env.SUPABASE_SECRET_KEY;
  const header = request.headers.get('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : request.headers.get('x-api-key') ?? '';
  if (!secret || !token || !safeEqual(token, secret)) {
    throw new ApiError('Accès non autorisé.', 401, 'UNAUTHORIZED');
  }
}
