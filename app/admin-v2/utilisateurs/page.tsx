import Link from 'next/link';
import { redirect } from 'next/navigation';
import { hasV2Permission, requireV2Page } from '../../../lib/auth/v2-admin';
import RoleManagement from '../../../components/admin/RoleManagement';
import UserManagement from '../../../components/admin/UserManagement';

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ vue?: string }> }) {
  const actor = await requireV2Page();
  const canManageUsers = hasV2Permission(actor, 'users.manage');
  const canManageRoles = hasV2Permission(actor, 'roles.manage');
  if (!canManageUsers && !canManageRoles) redirect('/acces-refuse');

  const roles = canManageRoles && ((await searchParams).vue === 'roles' || !canManageUsers);
  return <div className="v2-newsroom-page">
    <header className="v2-newsroom-page-header"><h1>Utilisateurs et rôles</h1></header>
    {canManageUsers && canManageRoles && <nav className="v2-section-nav" aria-label="Gestion des accès">
      <Link href="/admin-v2/utilisateurs" aria-current={!roles ? 'page' : undefined}>Utilisateurs</Link>
      <Link href="/admin-v2/utilisateurs?vue=roles" aria-current={roles ? 'page' : undefined}>Rôles et permissions</Link>
    </nav>}
    {roles ? <RoleManagement /> : <UserManagement actorId={actor.id} />}
  </div>;
}
