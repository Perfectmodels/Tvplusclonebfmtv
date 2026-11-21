'use client';

import Link from 'next/link';
import { useEffect } from 'react';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Journal technique disponible pour le diagnostic, aucun détail sensible côté page.
    console.error('Erreur de chargement TV+ Afrique', error);
  }, [error]);

  return (
    <main className="shell listing-page">
      <div className="editorial-page-intro">
        <h1 className="page-title">Ce contenu est momentanément indisponible.</h1>
        <p className="page-intro">
          Une source d'information ou un service technique ne répond pas.
          Le reste de TV+ Afrique reste accessible.
        </p>
        <div className="not-found-actions">
          <button type="button" className="admin-btn admin-btn-primary" onClick={reset}>
            Réessayer
          </button>
          <Link href="/" className="admin-btn admin-btn-ghost">
            Retour à l'accueil
          </Link>
        </div>
      </div>
    </main>
  );
}
