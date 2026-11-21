import ToastProvider from '../../components/admin/ToastProvider';
import V2AdminShell from '../../components/admin/V2AdminShell';
import { getV2Actor, hasV2Permission } from '../../lib/auth/v2-admin';
import { redirect } from 'next/navigation';
import { usesTvplusV2 } from '../../lib/db/v2-public';
import './admin-v2.css';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Administration — TV+ Afrique', robots: { index: false, follow: false } };

export default async function AdminV2Layout({children}:{children:React.ReactNode}) {
  if (!usesTvplusV2()) redirect('/admin');
  const actor = await getV2Actor();
  if (!actor) redirect('/connexion?next=/admin-v2');
  if (!hasV2Permission(actor,'articles.read_all')) redirect('/acces-refuse');
  return <ToastProvider><V2AdminShell role={actor.role} email={actor.email} permissions={actor.permissions}>{children}</V2AdminShell></ToastProvider>;
}
