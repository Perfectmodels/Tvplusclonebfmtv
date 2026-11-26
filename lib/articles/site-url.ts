import 'server-only';

/** URL canonique unique, indépendante des en-têtes de requête. */
export function canonicalSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'https://tvplusclonebfmtv.vercel.app';
  const url = new URL(configured);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new Error('NEXT_PUBLIC_SITE_URL doit être une origine HTTP(S) sans chemin.');
  }
  return url.origin;
}

export async function getSiteUrl(): Promise<string> {
  return canonicalSiteUrl();
}
