import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getServerEnv } from './env';

let cached: SupabaseClient | null = null;

/**
 * Client serveur privilégié. Utilise la clé secrète : contourne RLS.
 * À n'utiliser que dans du code serveur (Server Components, Route Handlers).
 */
export function getServerSupabase(): SupabaseClient {
  if (cached) return cached;
  const { url, secretKey } = getServerEnv();
  cached = createClient(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { 'x-application-name': 'tvplus-backend' } },
  });
  return cached;
}

/** Alias explicite pour les opérations d'administration. */
export const getAdminSupabase = getServerSupabase;

/** Client avec la clé publique : respecte les politiques RLS. */
export function getPublicServerSupabase(): SupabaseClient {
  const { url, publishableKey } = getServerEnv();
  return createClient(url, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
