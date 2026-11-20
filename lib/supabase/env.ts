/**
 * Centralise la lecture des variables d'environnement Supabase.
 * Les valeurs secrètes ne sont jamais journalisées ni exposées au client.
 */

const SERVER_KEYS = {
  url: 'SUPABASE_URL',
  publishableKey: 'SUPABASE_PUBLISHABLE_KEY',
  secretKey: 'SUPABASE_SECRET_KEY',
} as const;

export function getServerEnv() {
  const url = process.env[SERVER_KEYS.url];
  const publishableKey = process.env[SERVER_KEYS.publishableKey];
  const secretKey = process.env[SERVER_KEYS.secretKey];

  if (!url || !publishableKey || !secretKey) {
    throw new Error(
      'Configuration Supabase incomplète : SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY et SUPABASE_SECRET_KEY sont requis.',
    );
  }
  return { url, publishableKey, secretKey };
}

export function isSupabaseConfigured() {
  return Boolean(
    process.env[SERVER_KEYS.url] &&
      process.env[SERVER_KEYS.publishableKey] &&
      process.env[SERVER_KEYS.secretKey],
  );
}

export function getPublicEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error('Variables publiques Supabase manquantes (voir next.config.ts).');
  }
  return { url, key };
}
