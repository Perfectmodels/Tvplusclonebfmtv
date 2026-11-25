'use client';

import { useState } from 'react';
import type { seoScore } from '../../lib/seo/score';
import type { SeoSuggestions } from '../../lib/seo/suggestions';

export default function ArticleSeoTools({ score, title, text, onApply }: {
  score: ReturnType<typeof seoScore>;
  title: string;
  text: string;
  onApply?: (field: 'title' | 'description' | 'keywords', value: string) => void;
}) {
  const [suggestions, setSuggestions] = useState<SeoSuggestions | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function generate() {
    if(busy||!window.confirm('Envoyer ce texte au fournisseur IA configuré pour obtenir des suggestions SEO ?'))return;
    setBusy(true);
    setError('');
    setSuggestions(null);
    try {
      const response = await fetch('/api/admin-v2/seo/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, text: text.slice(0, 7000) }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message ?? 'Suggestions indisponibles.');
      setSuggestions(result.data);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Suggestions indisponibles.');
    } finally {
      setBusy(false);
    }
  }

  return <div className="v2-seo-tools">
    <details>
      <summary>Contrôle SEO interne · {score.value}/100</summary>
      <ul>{score.checks.map((check) => <li key={check.label}>
        <strong>{check.label} · {check.earned}/{check.points}</strong>
        {check.earned < check.points && <p>{check.tip}</p>}
      </li>)}</ul>
    </details>
    {onApply && <>
      <button type="button" className="admin-btn admin-btn-ghost" onClick={generate} disabled={busy || text.trim().length < 100}>
        {busy ? 'Analyse en cours…' : 'Proposer des textes SEO'}
      </button>
      {error && <p className="v2-error" role="alert">{error}</p>}
      {suggestions && <div className="v2-note" aria-live="polite">
        <h3>Titres SEO proposés</h3>
        <ul>{suggestions.titles.map((value, index) => <li key={index}>
          <button type="button" className="admin-btn admin-btn-ghost" onClick={() => onApply('title', value)}>{value}</button>
        </li>)}</ul>
        <p>{suggestions.description}</p>
        <button type="button" className="admin-btn admin-btn-ghost" onClick={() => onApply('description', suggestions.description)}>Reprendre la description</button>
        <p>{suggestions.keywords.join(', ')}</p>
        <button type="button" className="admin-btn admin-btn-ghost" onClick={() => onApply('keywords', suggestions.keywords.join(', '))}>Reprendre les mots-clés</button>
        <p><strong>Résumé</strong><br />{suggestions.summary}</p>
        <p><strong>Légende sociale</strong><br />{suggestions.social}</p>
        {suggestions.questions.length > 0 && <div><strong>Questions de recherche</strong><ul>{suggestions.questions.map((question, i) => <li key={i}>{question}</li>)}</ul></div>}
      </div>}
    </>}
  </div>;
}
