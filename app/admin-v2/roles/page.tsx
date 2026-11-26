import { redirect } from 'next/navigation';

export default function LegacyRolesPage() {
  redirect('/admin-v2/utilisateurs?vue=roles');
}
