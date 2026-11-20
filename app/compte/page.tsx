import Link from 'next/link';
import Breadcrumb from '../../components/Breadcrumb';
import LogoutButton from '../../components/auth/LogoutButton';
import { getProfile, requireUser } from '../../lib/auth/server';

export const dynamic = 'force-dynamic';

export default async function ComptePage() {
  await requireUser();
  const profile = await getProfile();

  return (
    <main className="shell listing-page">
      <Breadcrumb items={[{ label: 'Accueil', href: '/' }, { label: 'Mon compte' }]} />
      <h1 className="page-title">Mon compte</h1>
      <p className="page-intro">Gérez vos informations personnelles et vos préférences TV Plus.</p>

      <div className="account-card">
        <div className="account-head">
          <span className="account-avatar" aria-hidden="true">{(profile?.full_name || profile?.email || 'U').slice(0, 1).toUpperCase()}</span>
          <div>
            <h2>{profile?.full_name || 'Utilisateur TV Plus'}</h2>
            <span className="account-role">{profile?.role === 'admin' ? 'Administrateur' : 'Lecteur'}</span>
          </div>
        </div>
        <dl className="account-details">
          <div><dt>Adresse e-mail</dt><dd>{profile?.email}</dd></div>
          <div><dt>Membre depuis</dt><dd>{profile?.created_at ? new Date(profile.created_at).toLocaleDateString('fr-FR') : '—'}</dd></div>
          <div><dt>Identifiant</dt><dd className="account-id">{profile?.id}</dd></div>
        </dl>
        <div className="account-actions">
          <Link href="/newsletters" className="not-found-secondary">Mes newsletters</Link>
          <LogoutButton />
        </div>
      </div>
    </main>
  );
}
