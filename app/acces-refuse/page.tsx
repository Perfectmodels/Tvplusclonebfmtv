import Link from 'next/link';

export default function AccessDeniedPage() {
  return (
    <main className="shell not-found-page">
      <span className="not-found-code">Accès refusé</span>
      <h1>Vous n’avez pas les droits nécessaires</h1>
      <p>Cette espace est réservé aux administrateurs de TV Plus.</p>
      <div className="not-found-actions">
        <Link href="/" className="not-found-primary">Retour à l’accueil</Link>
        <Link href="/compte" className="not-found-secondary">Mon compte</Link>
      </div>
    </main>
  );
}
