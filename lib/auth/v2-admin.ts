import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { ApiError } from '../api/response';
import { getServerSupabase } from '../supabase/server';
import { newsroom } from '../admin-v2/lws';
import { getSession } from './session';

export type V2Actor = {
  id: string;
  email: string;
  name: string;
  role: string;
  permissions: string[];
};

/** Le client conserve le JWT de la session, Supabase RLS autorise toutes les requêtes. */
export const getV2Actor = cache(async (): Promise<V2Actor | null> => {
  {
    const session = await getSession();
    if (!session) return null;
    try {
      const profile = await newsroom<{ id: string; email: string; full_name: string | null; role: string; permissions: string[]; is_active: boolean }>(
        { id: session.uid, permissions: [] }, 'auth.me', { data: { id: session.uid } },
      );
      if (!profile.is_active) return null;
      return {
        id: profile.id, email: profile.email, name: profile.full_name ?? profile.email,
        role: profile.role, permissions: profile.permissions,
      };
    } catch {
      return null;
    }
  }
});

export function hasV2Permission(actor: V2Actor, permission: string) {
  return actor.permissions.includes(permission);
}

export async function requireV2Page(permission = 'articles.read_all') {
  const actor = await getV2Actor();
  if (!actor) redirect('/connexion?next=/admin-v2');
  if (!hasV2Permission(actor, permission)) redirect('/acces-refuse');
  return actor;
}

export async function requireV2Api(permission: string) {
  const actor = await getV2Actor();
  if (!actor) throw new ApiError('Authentification requise.', 401, 'UNAUTHORIZED');
  if (!hasV2Permission(actor, permission)) throw new ApiError('Permission insuffisante.', 403, 'UNAUTHORIZED');
  return { actor, db: getServerSupabase() };
}

export async function requireV2AnyApi(permissions: string[]) {
  const actor = await getV2Actor();
  if (!actor) throw new ApiError('Authentification requise.', 401, 'UNAUTHORIZED');
  if (!permissions.some(p => hasV2Permission(actor, p))) throw new ApiError('Permission insuffisante.', 403, 'UNAUTHORIZED');
  return { actor, db: getServerSupabase() };
}
