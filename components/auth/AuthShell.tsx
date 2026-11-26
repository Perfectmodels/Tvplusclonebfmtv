import Link from 'next/link';
import TvPlusLogo from '../TvPlusLogo';

export default function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <main className="auth-page">
      <div className="auth-panel">
        <Link href="/" className="auth-brand" aria-label="TV Plus, accueil">
          <TvPlusLogo />
        </Link>
        <div className="auth-panel-copy">
          <span className="auth-kicker">TV Plus — Espace personnel</span>
          <h2>L’actualité du Gabon, en continu.</h2>
          <p>
            Connectez-vous pour retrouver vos newsletters, vos préférences et tous les services de
            la rédaction.
          </p>
        </div>
        <span className="auth-panel-footer">Première sur l’info au Gabon</span>
      </div>
      <div className="auth-content">
        <div className="auth-card">
          <h1>{title}</h1>
          <p className="auth-subtitle">{subtitle}</p>
          {children}
        </div>
      </div>
    </main>
  );
}
