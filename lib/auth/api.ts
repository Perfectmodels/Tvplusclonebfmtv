import 'server-only';
import { usesTvplusV2 } from '../db/v2-public';
import { getUser, getProfile } from './server';
import { ROLE_PERMISSIONS, type Permission } from './permissions';
import { ApiError } from '../api/response';

/** Garde de sécurité pour les Route Handlers : identité + permission. */
export async function requireApiPermission(permission: Permission) {
  // Le schéma TV+ V2 utilise d'autres permissions, rôles et colonnes.
  // Interdire l'admin du clone jusqu'à l'adaptation des écritures.
  if (usesTvplusV2()) throw new ApiError('Administration du clone indisponible en mode TV+ V2 lecture seule.', 503, 'UNAVAILABLE');
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
