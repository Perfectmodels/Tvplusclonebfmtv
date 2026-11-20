'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useToast } from '../../../components/admin/ToastProvider';

type Topic = { id: number; label: string; link: string };
type Source = { id: string; name: string; url: string; active: boolean };

export default function AdminSettingsPage() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [label, setLabel] = useState('');
  const [link, setLink] = useState('');
  const [sourceName, setSourceName] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const { success, error } = useToast();

  const load = useCallback(async () => {
    const [t, s] = await Promise.all([fetch('/api/admin/topics'), fetch('/api/admin/rss-sources')]);
    const tb = await t.json(); const sb = await s.json();
    if (t.ok) setTopics(tb.data.items ?? []);
    if (s.ok) setSources(Array.isArray(sb.data) ? sb.data : sb.data.items ?? []);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function addTopic(e: React.FormEvent) {
    e.preventDefault(); setBusy(true);
    try {
      const response = await fetch('/api/admin/topics', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ label, link }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error?.message ?? 'Ajout impossible.');
      success('Tendance ajoutée.'); setLabel(''); setLink(''); load();
    } catch (err) { error(err instanceof Error ? err.message : 'Erreur.'); }
    finally { setBusy(false); }
  }

  async function removeTopic(id: number) {
    const response = await fetch(`/api/admin/topics?id=${id}`, { method: 'DELETE' });
    if (response.ok) { success('Tendance supprimée.'); load(); }
    else error('Suppression impossible.');
  }

  async function addSource(e: React.FormEvent) {
    e.preventDefault(); setBusy(true);
    try {
      const response = await fetch('/api/admin/rss-sources', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: sourceName, url: sourceUrl }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error?.message ?? 'Ajout impossible.');
      success('Flux RSS ajouté.'); setSourceName(''); setSourceUrl(''); load();
    } catch (err) { error(err instanceof Error ? err.message : 'Erreur.'); }
    finally { setBusy(false); }
  }

  async function removeSource(id: string) {
    const response = await fetch(`/api/admin/rss-sources?id=${id}`, { method: 'DELETE' });
    if (response.ok) { success('Flux supprimé.'); load(); }
    else error('Suppression impossible.');
  }

  return (
    <div className="admin-page">
      <div className="admin-page-head">
        <div><h2>Paramètres</h2><p>Configurez les tendances de navigation et les flux du fil News 24/7.</p></div>
      </div>

      <div className="admin-settings-grid">
        <section className="admin-section">
          <h3>Sujets tendance du header</h3>
          <form className="admin-inline-form" onSubmit={addTopic}>
            <input required minLength={3} value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Libellé" aria-label="Libellé de la tendance" />
            <input required value={link} onChange={(e) => setLink(e.target.value)} placeholder="/article/… ou https://…" aria-label="Lien" />
            <button type="submit" className="admin-btn admin-btn-primary" disabled={busy}><Plus size={15} /> Ajouter</button>
          </form>
          <div className="admin-list">
            {topics.map((topic) => (
              <div className="admin-list-row" key={topic.id}>
                <span>{topic.label}</span>
                <button type="button" className="admin-link admin-link-danger" onClick={() => removeTopic(topic.id)}><Trash2 size={14} /> Supprimer</button>
              </div>
            ))}
          </div>
        </section>

        <section className="admin-section">
          <h3>Flux RSS — News 24/7</h3>
          <form className="admin-inline-form" onSubmit={addSource}>
            <input required minLength={2} value={sourceName} onChange={(e) => setSourceName(e.target.value)} placeholder="Nom interne" aria-label="Nom du flux" />
            <input required type="url" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="https://…/rss.xml" aria-label="URL du flux" />
            <button type="submit" className="admin-btn admin-btn-primary" disabled={busy}><Plus size={15} /> Ajouter</button>
          </form>
          <div className="admin-list">
            {sources.map((source) => (
              <div className="admin-list-row" key={source.id}>
                <span><strong>{source.name}</strong><br /><small>{source.url}</small></span>
                <button type="button" className="admin-link admin-link-danger" onClick={() => removeSource(source.id)}><Trash2 size={14} /> Supprimer</button>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
