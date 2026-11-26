import { randomBytes } from 'node:crypto';

/** Identifiant court, URL-safe et cryptographiquement sûr (7 caractères par défaut). */
export function generateShortId(length = 7): string {
  // base64url : [A-Za-z0-9_-], sans caractère réservé dans une URL.
  const bytes = Math.ceil((length * 6) / 8);
  return randomBytes(bytes).toString('base64url').slice(0, length);
}
