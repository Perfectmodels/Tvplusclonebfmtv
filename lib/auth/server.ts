import 'server-only';
import { usesTvplusV2 } from '../db/v2-public';
import { usesLwsCatalog } from '../db/lws-public';
import { newsroom } from '../admin-v2/lws';
import { getSession } from './session';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ROLE_PERMISSIONS, type Permission } from './permissions';

export type AuthUser = { id: string; email?: string; created_at?: string; user_metadata?: Record<string, unknown> };
export type AuthProfile = {
  id: string; email: string; full_name: string | null; role: string; created_at: string;
  is_active?: boolean; permissions?: string[];
};

type MysqlProfile = {
  id: string; email: string; full_name: string | null; role: string;
  is_active: boolean; permissions: string[];
};

export async function createAuthClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error('Configuration Supabase manquante.');
  const cookieStore = await cookies();

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Appel depuis un Server Component : le middleware rafraîchit le cookie.
        }
      },
    },
  });
}

async function mysqlProfile(uid?: string): Promise<MysqlProfile | null> {
  const session = uid ? { uid } : await getSession();
  if (!session) return null;
  try {
    return await newsroom<MysqlProfile>({ id: session.uid, permissions: [] }, 'auth.me', { data: { id: session.uid } });
  } catch {
    return null;
  }
}

export async function getUser(): Promise<AuthUser | null> {
  if (usesLwsCatalog()) {
    const profile = await mysqlProfile();
    if (!profile) return null;
    return {
      id: profile.id, email: profile.email, created_at: '',
      user_metadata: { full_name: profile.full_name },
    };
  }
  const supabase = await createAuthClient();
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}

export async function getProfile(existingUser?: AuthUser | null): Promise<AuthProfile | null> {
  if (usesLwsCatalog()) {
    const profile = await mysqlProfile(existingUser?.id);
    if (!profile || !profile.is_active) return null;
    return { ...profile, created_at: '' };
  }
  const user = existingUser === undefined ? await getUser() : existingUser;
  if (!user) return null;
  const supabase = await createAuthClient();
  if (usesTvplusV2()) {
    const { data, error } = await supabase.from('profiles')
      .select('id, full_name, role, is_active, created_at')
      .eq('id', user.id).maybeSingle();
    if (error || !data || !data.is_active) return null;
    return { ...data, email: user.email ?? '' } as AuthProfile;
  }
  const { data } = await supabase.from('profiles').select('id, email, full_name, role, created_at').eq('id', user.id).maybeSingle();
  return data ?? { id: user.id, email: user.email ?? '', full_name: null, role: 'reader', created_at: user.created_at ?? '' };
}

export async function requireUser() {
  const user = await getUser();
  if (!user) redirect('/connexion');
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  const profile = await getProfile(user);
  if (!profile || !['admin', 'super_admin'].includes(profile.role)) redirect('/acces-refuse');
  return { user, profile };
}

export async function hasPermission(permission: Permission): Promise<boolean> {
  const profile = await getProfile();
  if (!profile) return false;
  if (profile.permissions) return profile.permissions.includes(permission);
  return (ROLE_PERMISSIONS[profile.role] ?? []).includes(permission);
}

export async function requirePermission(permission: Permission) {
  const { user, profile } = await requireAdmin();
  const granted = profile?.permissions
    ? profile.permissions.includes(permission)
    : (ROLE_PERMISSIONS[profile?.role ?? 'reader'] ?? []).includes(permission);
  if (!granted) redirect('/acces-refuse');
  return { user, profile };
}
