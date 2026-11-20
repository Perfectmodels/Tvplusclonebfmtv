'use client';

import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';

export default function LogoutButton() {
  const router = useRouter();

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
    router.refresh();
  }

  return (
    <button type="button" className="auth-submit auth-logout" onClick={logout}>
      <LogOut size={16} /> Se déconnecter
    </button>
  );
}
