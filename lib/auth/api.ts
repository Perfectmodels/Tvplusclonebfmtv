import 'server-only';
import { getUser, getProfile } from './server';
import { ROLE_PERMISSIONS, type Permission } from './permissions';
import { ApiError } from '../api/response';

/** Garde de sécurité pour les Route Handlers : identité + permission. */
export async function requireApiPermission(permission: Permission) {
  const user = await getUser();
  if (!user) throw new ApiError('Authentification requise.', 401, 'UNAUTHORIZED');
  const profile = await getProfile();
  if (!profile || !(ROLE_PERMISSIONS[profile.role] ?? []).includes(permission)) {
    throw new ApiError('Accès refusé.', 403, 'UNAUTHORIZED');
  }
  return { user, profile };
}

export async function logAction(
  actor: { id: string; email?: string | null },
  action: string,
  entity: string,
  entityId?: string,
  details?: unknown,
) {
  const { getServerSupabase } = await import('../supabase/server');
  const db = getServerSupabase();
  await db.from('audit_logs').insert({
    actor_id: actor.id,
    actor_email: actor.email ?? null,
    action,
    entity,
    entity_id: entityId ?? null,
    details: details ?? null,
  });
}
