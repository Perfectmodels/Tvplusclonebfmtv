import AdminShell from '../../components/admin/AdminShell';
import ToastProvider from '../../components/admin/ToastProvider';
import { requireAdmin } from '../../lib/auth/server';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireAdmin();

  return (
    <ToastProvider>
      <AdminShell title="Administration" userEmail={profile?.email ?? ''}>
        {children}
      </AdminShell>
    </ToastProvider>
  );
}
