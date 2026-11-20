'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';

type Result = { title: string; category: string; description: string; href: string; type: string };

export default function SearchClient({ initialQuery = '' }: { initialQuery?: string }) {
  const [query, setQuery] = useState(initialQuery);
  const [submitted, setSubmitted] = useState(initialQuery);
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const term = submitted.trim();
    if (term.length < 2) {
      setResults([]);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError('');
    fetch('/api/search?q=' + encodeURIComponent(term))
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body?.error?.message ?? 'Recherche impossible.');
        return body.data.items as Result[];
      })
      .then((items) => { if (!cancelled) setResults(items); })
      .catch((err) => { if (!cancelled) setError(err instanceof Error ? err.message : 'Erreur.'); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [submitted]);

  const countLabel = useMemo(() => {
    if (!submitted) return '';
    return `${results.length} résultat${results.length > 1 ? 's' : ''} pour « ${submitted} »`;
  }, [results.length, submitted]);

  return (
    <>
      <form
        className="search-page-form"
        onSubmit={(event) => { event.preventDefault(); setSubmitted(query); }}
        role="search"
      >
        <Search size={20} aria-hidden="true" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Rechercher une actualité, une vidéo, une émission…"
          aria-label="Rechercher"
          autoFocus
        />
        <button type="submit">Rechercher</button>
      </form>

      {submitted && (
        <p className="search-count" aria-live="polite">
          {loading ? 'Recherche en cours…' : countLabel}
        </p>
      )}

      {error && <p className="form-error" role="alert">{error}</p>}

      <div className="search-results-list">
        {results.map((result, i) => (
          <Link href={result.href} className="search-result" key={result.title + i}>
            <span className="search-result-type">{result.type}</span>
            <span className="search-result-body">
              <span className="category-label">{result.category}</span>
              <strong>{result.title}</strong>
              <span>{result.description}</span>
            </span>
          </Link>
        ))}
      </div>
    </>
  );
}
