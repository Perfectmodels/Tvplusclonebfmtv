import Link from 'next/link';

export const metadata = {
  title: 'Administration en préparation — TV+ Afrique',
  robots: { index: false, follow: false },
};

export default function AdminUnavailablePage() {
  return (
    <main className="shell not-found-page">
      <span className="not-found-code">Administration</span>
      <h1>Tableau de bord en préparation</h1>
      <p>Le site public TV+ Afrique fonctionne en lecture seule sur la base TV+ V2.
        La rédaction, les autorisations et la publication ne sont pas encore
        compatibles avec ce nouveau schéma. Aucune clé secrète n'est nécessaire
        pour consulter les actualités.</p>
      <div className="not-found-actions">
        <Link href="/" className="not-found-primary">Retour à l'accueil</Link>
        <Link href="/news-24-7" className="not-found-secondary">Consulter News 24/7</Link>
      </div>
    </main>
  );
}
