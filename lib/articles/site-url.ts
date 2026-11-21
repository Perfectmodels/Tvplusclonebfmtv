import 'server-only';
import { headers } from 'next/headers';

/** URL absolue du site, utilisée pour canonical, Open Graph et partage. */
export async function getSiteUrl(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/$/, '');
  // Une URL canonique unique pour éviter l'indexation des alias Vercel
  // et des déploiements de prévisualisation.
  // NEXT_PUBLIC_SITE_URL peut la remplacer lors du passage au domaine officiel.
  if (process.env.SUPABASE_SCHEMA_MODE === 'tvplus-v2') {
    return 'https://tvplusv2.vercel.app';
  }
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000';
  const proto = h.get('x-forwarded-proto') ?? 'http';
  return `${proto}://${host}`;
}
