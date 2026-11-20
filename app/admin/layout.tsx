import AdminShell from '../../components/admin/AdminShell';
import { usesTvplusV2 } from '../../lib/db/v2-public';
import ToastProvider from '../../components/admin/ToastProvider';
import { requireAdmin } from '../../lib/auth/server';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (usesTvplusV2()) {
    return <main className="shell listing-page">
      <h1 className="page-title">Administration en préparation</h1>
      <p className="page-intro">Les contenus TV+ V2 sont accessibles en lecture seule.
      Les opérations de publication seront ouvertes après l'adaptation des permissions et du schéma.</p>
    </main>;
  }
  const { profile } = await requireAdmin();

  return (
    <ToastProvider>
      <AdminShell title="Administration" userEmail={profile?.email ?? ''}>
        {children}
      </AdminShell>
    </ToastProvider>
  );
}
