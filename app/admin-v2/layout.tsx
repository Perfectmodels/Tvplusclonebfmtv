import ToastProvider from '../../components/admin/ToastProvider';
import V2AdminShell from '../../components/admin/V2AdminShell';
import { getV2Actor, hasV2Permission } from '../../lib/auth/v2-admin';
import { redirect } from 'next/navigation';
import './admin-v2.css';
import './regie.css';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Administration — TV+ Afrique', robots: { index: false, follow: false } };

export default async function AdminV2Layout({children}:{children:React.ReactNode}) {
  const actor = await getV2Actor();
  if (!actor) redirect('/connexion?next=/admin-v2');
  if (!['articles.read_all','settings.manage','shows.manage','schedule.manage','users.manage','roles.manage','studio.reel_manage','studio.podcast_manage','studio.reportage_manage'].some(p=>hasV2Permission(actor,p))) redirect('/acces-refuse');
  return <ToastProvider><V2AdminShell role={actor.role} email={actor.email} permissions={actor.permissions}>{children}</V2AdminShell></ToastProvider>;
}
