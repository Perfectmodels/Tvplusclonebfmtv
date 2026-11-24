'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ExternalLink, RotateCw, Sparkles } from 'lucide-react';
import { watchDraftKey, type WatchDraft, type WatchItem, type WatchRegion } from '../../lib/editorial/veille-types';

type Snapshot = { items: WatchItem[]; total: number; pageSize: number; canRemix: boolean; groqReady: boolean };
const dateFormat = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Libreville' });

export default function EditorialWatch({ actorId }: { actorId: string }) {
  const router = useRouter();
  const [region, setRegion] = useState<WatchRegion>('gabon');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [revision, setRevision] = useState(0);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<WatchItem | null>(null);
  const [angle, setAngle] = useState('');
  const [notes, setNotes] = useState('');
  const [draft, setDraft] = useState<WatchDraft | null>(null);
  const [generating, setGenerating] = useState(false);
  const [remixError, setRemixError] = useState('');
  const generation = useRef<AbortController | null>(null);

  useEffect(() => () => generation.current?.abort(), []);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    const params = new URLSearchParams({ region, page: String(page), q: query });
    fetch('/api/admin-v2/veille?' + params, { signal: controller.signal, cache: 'no-store' })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error?.message ?? 'Veille indisponible.');
        if (!controller.signal.aborted) setSnapshot(result.data);
      })
      .catch((reason: Error) => { if (!controller.signal.aborted) { setSnapshot(null); setError(reason.message); } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [region, page, query, revision]);

  function select(item: WatchItem | null) {
    generation.current?.abort();
    setGenerating(false);
    setSelected(item);
    setAngle('');
    setNotes('');
    setDraft(null);
    setRemixError('');
  }

  async function remix(event: React.FormEvent) {
    event.preventDefault();
    if (!selected || generating) return;
    const controller = new AbortController();
    generation.current = controller;
    setGenerating(true);
    setDraft(null);
    setRemixError('');
    try {
      const response = await fetch('/api/admin-v2/veille/remix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selected.id, region: selected.region, angle, notes }),
        signal: controller.signal,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message ?? 'Le remix a échoué.');
      if (!controller.signal.aborted) setDraft(result.data);
    } catch (reason) {
      if (!controller.signal.aborted) setRemixError(reason instanceof Error ? reason.message : 'Le remix a échoué.');
    } finally {
      if (!controller.signal.aborted) setGenerating(false);
    }
  }

  function openEditor() {
    if (!draft) return;
    try {
      sessionStorage.setItem(watchDraftKey + ':' + actorId, JSON.stringify(draft));
      router.push('/admin-v2/articles/new?veille=1');
    } catch {
      setRemixError('Le navigateur n’a pas pu transmettre le texte à l’éditeur.');
    }
  }

  const pages = Math.max(1, Math.ceil((snapshot?.total ?? 0) / (snapshot?.pageSize ?? 8)));

  return <div className="v2-newsroom-page">
    <header className="v2-newsroom-page-header"><div>
      <h1>Veille éditoriale</h1>
      <p>Les dernières publications des flux RSS suivis par la rédaction.</p>
    </div></header>
    <div className="v2-section-nav" role="group" aria-label="Zone de veille">
      {(['gabon', 'afrique'] as const).map((zone) => <button key={zone} type="button" aria-pressed={region === zone}
        className={'admin-btn ' + (region === zone ? 'admin-btn-primary' : 'admin-btn-ghost')}
        onClick={() => { setRegion(zone); setPage(1); select(null); }}>{zone === 'gabon' ? 'Gabon' : 'Afrique'}</button>)}
    </div>
    {selected ? <section className="v2-dashboard-panel v2-watch-panel">
      <button type="button" className="admin-btn admin-btn-ghost" onClick={() => select(null)}>Retour aux sujets</button>
      <h2>{selected.title}</h2>
      <p><a href={selected.href} target="_blank" rel="noopener noreferrer">Consulter la source · {selected.source}</a></p>
      <form onSubmit={remix}>
        <label className="v2-field"><span>Angle souhaité (facultatif)</span>
          <input value={angle} maxLength={280} onChange={(event) => setAngle(event.target.value)} />
        </label>
        <label className="v2-field"><span>Faits vérifiés à ajouter{selected.summary.length >= 60 && selected.summary !== selected.title ? ' (facultatif)' : ''}</span>
          <textarea value={notes} maxLength={2200} onChange={(event) => setNotes(event.target.value)} />
        </label>
        <button type="submit" className="admin-btn admin-btn-primary" disabled={generating}>
          <Sparkles size={16} aria-hidden="true" />{generating ? 'Réécriture en cours…' : 'Générer une proposition'}
        </button>
      </form>
      {remixError && <p className="v2-error" role="alert">{remixError}</p>}
      {draft && <article className="v2-note">
        <h3>{draft.title}</h3>
        <p><strong>{draft.excerpt}</strong></p>
        {draft.paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
        <button type="button" className="admin-btn admin-btn-primary" onClick={openEditor}>Reprendre dans l’éditeur</button>
      </article>}
    </section> : <>
      <form className="v2-toolbar" onSubmit={(event) => { event.preventDefault(); setPage(1); setQuery(search.trim()); }}>
        <input type="search" aria-label="Rechercher un sujet ou un média" placeholder="Sujet ou média…" maxLength={100}
          value={search} onChange={(event) => setSearch(event.target.value)} />
        <button className="admin-btn admin-btn-primary" type="submit">Rechercher</button>
        <button className="admin-btn admin-btn-ghost" type="button" onClick={() => setRevision((value) => value + 1)}>
          <RotateCw size={16} aria-hidden="true" /> Actualiser
        </button>
      </form>
      {snapshot?.canRemix && !snapshot.groqReady && <p className="v2-note">Remix IA indisponible. La clé Groq doit être configurée.</p>}
      {error && <p className="v2-error" role="alert">{error}</p>}
      {loading ? <p role="status">Collecte des flux…</p> : snapshot && <>
        <p role="status">{snapshot.total} sujet{snapshot.total !== 1 ? 's' : ''} disponible{snapshot.total !== 1 ? 's' : ''}.</p>
        <div className="v2-directory">
          {snapshot.items.map((item) => <article className="v2-dashboard-panel v2-watch-panel" key={item.id}>
            <p className="v2-lede">{item.source}{item.publishedAt && <> · <time dateTime={item.publishedAt}>{dateFormat.format(new Date(item.publishedAt))}</time></>}</p>
            <h2>{item.title}</h2>
            {item.summary && item.summary !== item.title && <p>{item.summary.length > 320 ? item.summary.slice(0, 317) + '…' : item.summary}</p>}
            <div className="v2-actions">
              <a href={item.href} target="_blank" rel="noopener noreferrer" className="admin-btn admin-btn-ghost">
                Lire la source <ExternalLink size={15} aria-hidden="true" />
              </a>
              {snapshot.canRemix && snapshot.groqReady && <button className="admin-btn admin-btn-primary" type="button" onClick={() => select(item)}>
                <Sparkles size={16} aria-hidden="true" /> Remixer avec Groq
              </button>}
            </div>
          </article>)}
        </div>
        {pages > 1 && <nav className="v2-local-pagination" aria-label="Pagination de la veille">
          <button className="admin-btn admin-btn-ghost" type="button" disabled={page <= 1} onClick={() => setPage(page - 1)}>Précédent</button>
          <span aria-live="polite">Page {page} / {pages}</span>
          <button className="admin-btn admin-btn-ghost" type="button" disabled={page >= pages} onClick={() => setPage(page + 1)}>Suivant</button>
        </nav>}
      </>}
    </>}
  </div>;
}
