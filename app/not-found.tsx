import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="shell not-found-page">
      <span className="not-found-code">404</span>
      <h1>Cette page est introuvable</h1>
      <p>Le contenu recherché n’existe pas ou a été déplacé.</p>
      <div className="not-found-actions">
        <Link href="/" className="not-found-primary">Retour à l’accueil</Link>
        <Link href="/news-24-7" className="not-found-secondary">Voir le fil News 24/7</Link>
      </div>
    </main>
  );
}
