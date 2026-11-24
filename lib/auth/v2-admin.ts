import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { ApiError } from '../api/response';
import { createAuthClient } from './server';
import { usesTvplusV2 } from '../db/v2-public';
import { usesLwsCatalog } from '../db/lws-public';
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
  if (usesLwsCatalog()) {
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
  if (!usesTvplusV2()) return null;
  const db = await createAuthClient();
  const { data: { user }, error: authError } = await db.auth.getUser();
  if (authError || !user) return null;
  const { data: profile, error: profileError } = await db.from('profiles')
    .select('id,full_name,role,is_active').eq('id', user.id).maybeSingle();
  if (profileError || !profile || profile.is_active !== true) return null;
  const { data: role, error: roleError } = await db.from('roles')
    .select('permissions').eq('key', profile.role).maybeSingle();
  if (roleError || !role) return null;
  return {
    id: user.id, email: user.email ?? '', name: profile.full_name ?? user.email ?? '',
    role: profile.role, permissions: Array.isArray(role.permissions) ? role.permissions : [],
  };
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
  if (!usesTvplusV2()) throw new ApiError('API réservée à TV+ V2.', 404, 'NOT_FOUND');
  const actor = await getV2Actor();
  if (!actor) throw new ApiError('Authentification requise.', 401, 'UNAUTHORIZED');
  if (!hasV2Permission(actor, permission)) throw new ApiError('Permission insuffisante.', 403, 'UNAUTHORIZED');
  return { actor, db: await createAuthClient() };
}

export async function requireV2AnyApi(permissions: string[]) {
  if (!usesTvplusV2()) throw new ApiError('API réservée à TV+ V2.', 404, 'NOT_FOUND');
  const actor = await getV2Actor();
  if (!actor) throw new ApiError('Authentification requise.', 401, 'UNAUTHORIZED');
  if (!permissions.some(p => hasV2Permission(actor, p))) throw new ApiError('Permission insuffisante.', 403, 'UNAUTHORIZED');
  return { actor, db: await createAuthClient() };
}
