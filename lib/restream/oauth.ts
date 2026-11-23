import 'server-only';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';

export type RestreamTokenSet = { access_token: string; refresh_token: string; expires_at: number };
export type RestreamRow = {
  id: number; account_id: string; account_name: string;
  token_ciphertext: string; expires_at: string; connected_by: string;
};
export type RestreamChannel = { id: number; platformId?: number; displayName?: string; channelUrl?: string };

const restreamBase = 'https://api.restream.io';
export const oauthCookie = 'tvplus_restream_oauth';

export function getRestreamApp() {
  const clientId = process.env.RESTREAM_CLIENT_ID?.trim() || '';
  const clientSecret = process.env.RESTREAM_CLIENT_SECRET?.trim() || '';
  const redirectUri = process.env.RESTREAM_REDIRECT_URI?.trim() || '';
  // Never use request Host to invent a redirect: prevent redirect-URI confusion.
  if (!clientId || !clientSecret || !redirectUri) return null;
  const uri = new URL(redirectUri);
  if (uri.protocol !== 'https:' || uri.pathname !== '/api/admin-v2/restream/callback') return null;
  return { clientId, clientSecret, redirectUri };
}

function tokenKey() {
  const app = getRestreamApp();
  if (!app) throw new Error('Application Restream non configurée.');
  // Restream client secret is server-only; rotating the app secret requires reconnecting.
  return createHash('sha256').update('tvplus-restream-oauth-storage-v1:').update(app.clientSecret).digest();
}

export function encryptTokens(tokens: RestreamTokenSet) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', tokenKey(), iv);
  const content = Buffer.concat([cipher.update(JSON.stringify(tokens), 'utf8'), cipher.final()]);
  return [iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), content.toString('base64url')].join('.');
}

export function decryptTokens(encrypted: string): RestreamTokenSet {
  const parts = encrypted.split('.');
  if (parts.length !== 3) throw new Error('Jeton Restream invalide.');
  const decipher = createDecipheriv('aes-256-gcm', tokenKey(), Buffer.from(parts[0], 'base64url'));
  decipher.setAuthTag(Buffer.from(parts[1], 'base64url'));
  const json = Buffer.concat([decipher.update(Buffer.from(parts[2], 'base64url')), decipher.final()]).toString('utf8');
  const token = JSON.parse(json) as RestreamTokenSet;
  if (!token.access_token || !token.refresh_token || !Number.isFinite(token.expires_at)) throw new Error('Jeton Restream invalide.');
  return token;
}

export async function tokenRequest(fields: URLSearchParams) {
  const app = getRestreamApp();
  if (!app) throw new Error('Application Restream non configurée.');
  const response = await fetch(restreamBase + '/oauth/token', {
    method: 'POST', cache: 'no-store', signal: AbortSignal.timeout(12000),
    headers: { 'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: 'Basic ' + Buffer.from(app.clientId + ':' + app.clientSecret).toString('base64') },
    body: fields,
  });
  if (!response.ok) throw new Error('Restream a refusé la connexion. Réessayez depuis la régie.');
  const body = await response.json() as {
    access_token?: string; refresh_token?: string; expires_in?: number;
    accessToken?: string; refreshToken?: string; accessTokenExpiresIn?: number;
  };
  const access_token = body.access_token || body.accessToken;
  const refresh_token = body.refresh_token || body.refreshToken;
  if (!access_token || !refresh_token) throw new Error('Restream n’a pas renvoyé les jetons OAuth attendus.');
  return {
    access_token, refresh_token,
    expires_at: Math.floor(Date.now()/1000) + (body.expires_in || body.accessTokenExpiresIn || 3600),
  } satisfies RestreamTokenSet;
}

export async function restreamGet<T>(path: string, accessToken: string): Promise<T> {
  const response = await fetch(restreamBase + path, {
    cache: 'no-store', signal: AbortSignal.timeout(12000),
    headers: { Authorization: 'Bearer ' + accessToken, Accept: 'application/json' },
  });
  if (!response.ok) throw new Error('Restream ne répond pas ou les autorisations ont expiré.');
  return await response.json() as T;
}

export async function getSavedConnection(db: SupabaseClient): Promise<RestreamRow | null> {
  const { data, error } = await db.from('restream_connections')
    .select('id,account_id,account_name,token_ciphertext,expires_at,connected_by')
    .eq('id',1).maybeSingle();
  if (error) throw new Error('Stockage de connexion Restream indisponible.');
  return data as RestreamRow | null;
}

export async function getValidToken(db: SupabaseClient, row: RestreamRow) {
  const tokens = decryptTokens(row.token_ciphertext);
  if (tokens.expires_at > Date.now()/1000 + 120) return tokens.access_token;
  const updated = await tokenRequest(new URLSearchParams({
    grant_type: 'refresh_token', refresh_token: tokens.refresh_token,
  }));
  const { error } = await db.from('restream_connections').update({
    token_ciphertext: encryptTokens(updated),
    expires_at: new Date(updated.expires_at * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('id',1).eq('token_ciphertext',row.token_ciphertext);
  if (error) throw new Error('Impossible de renouveler la connexion Restream.');
  return updated.access_token;
}
