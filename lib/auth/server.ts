import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ROLE_PERMISSIONS, type Permission } from './permissions';

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

export async function getUser() {
  const supabase = await createAuthClient();
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}

export async function getProfile() {
  const user = await getUser();
  if (!user) return null;
  const supabase = await createAuthClient();
  const { data } = await supabase.from('profiles').select('id, email, full_name, role, created_at').eq('id', user.id).maybeSingle();
  return data ?? { id: user.id, email: user.email ?? '', full_name: null, role: 'reader' as const, created_at: user.created_at };
}

export async function requireUser() {
  const user = await getUser();
  if (!user) redirect('/connexion');
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  const profile = await getProfile();
  if (profile?.role !== 'admin') redirect('/acces-refuse');
  return { user, profile };
}

export async function hasPermission(permission: Permission): Promise<boolean> {
  const profile = await getProfile();
  if (!profile) return false;
  return (ROLE_PERMISSIONS[profile.role] ?? []).includes(permission);
}

export async function requirePermission(permission: Permission) {
  const { user, profile } = await requireAdmin();
  if (!(ROLE_PERMISSIONS[profile?.role ?? 'reader'] ?? []).includes(permission)) {
    redirect('/acces-refuse');
  }
  return { user, profile };
}
