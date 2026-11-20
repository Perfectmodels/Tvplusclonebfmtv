import { NextRequest } from 'next/server';
import { ApiError } from './response';

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

/**
 * Limiteur en mémoire, adapté à une instance unique.
 * En production multi-instances, remplacer par Supabase/Redis (table `rate_limits`).
 */
export function rateLimit(request: NextRequest, { limit = 5, windowMs = 60_000, prefix = 'global' } = {}) {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown';
  const key = `${prefix}:${ip}`;
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  if (bucket.count >= limit) {
    throw new ApiError('Trop de requêtes. Réessayez dans un instant.', 429, 'RATE_LIMITED');
  }
  bucket.count += 1;

  if (buckets.size > 5000) {
    for (const [k, v] of buckets) if (now > v.resetAt) buckets.delete(k);
  }
}
