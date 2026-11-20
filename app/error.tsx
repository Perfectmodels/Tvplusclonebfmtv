'use client';

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="shell error-page">
      <span className="not-found-code">Erreur</span>
      <h1>Le contenu n’a pas pu être chargé</h1>
      <p>Une erreur temporaire est survenue. Vous pouvez réessayer.</p>
      <button type="button" className="not-found-primary" onClick={reset}>
        Réessayer
      </button>
    </main>
  );
}
