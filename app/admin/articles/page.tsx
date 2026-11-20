'use client';

import { useState } from 'react';
import Link from 'next/link';
import DataTable, { type Column } from '../../../components/admin/DataTable';
import ConfirmDialog from '../../../components/admin/ConfirmDialog';
import { useToast } from '../../../components/admin/ToastProvider';

type Article = Record<string, any> & {
  id: string; slug: string; title: string; category_slug: string; status: string; created_at: string; word_count?: number;
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon', review: 'À valider', needs_correction: 'À corriger', validated: 'Validé',
  scheduled: 'Programmé', published: 'Publié', archived: 'Archivé',
};

export default function AdminArticlesPage() {
  const [deleting, setDeleting] = useState<Article | null>(null);
  const [busy, setBusy] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const { success, error } = useToast();

  async function setStatus(article: Article, status: string) {
    setBusy(true);
    try {
      const response = await fetch(`/api/admin/articles/${article.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error?.message ?? 'Mise à jour impossible.');
      success('Statut mis à jour.'); setRefresh((r) => r + 1);
    } catch (err) { error(err instanceof Error ? err.message : 'Erreur.'); }
    finally { setBusy(false); }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/admin/articles/${deleting.id}`, { method: 'DELETE' });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error?.message ?? 'Suppression impossible.');
      success('Article supprimé.'); setDeleting(null); setRefresh((r) => r + 1);
    } catch (err) { error(err instanceof Error ? err.message : 'Erreur.'); }
    finally { setBusy(false); }
  }

  async function bulk(ids: string[], action: string) {
    setBusy(true);
    try {
      const response = await fetch('/api/admin/articles/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, action }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error?.message ?? 'Action impossible.');
      success(`${body.data.updated} article(s) mis à jour.`);
      setRefresh((r) => r + 1);
    } catch (err) {
      error(err instanceof Error ? err.message : 'Erreur.');
    } finally {
      setBusy(false);
    }
  }

  async function toggleFlag(article: Article, field: 'is_alert' | 'featured') {
    try {
      const response = await fetch(`/api/admin/articles/${article.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: !article[field] }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error?.message ?? 'Mise à jour impossible.');
      success(field === 'is_alert' ? 'Alerte info mise à jour.' : 'Mise à la une mise à jour.');
      setRefresh((r) => r + 1);
    } catch (err) { error(err instanceof Error ? err.message : 'Erreur.'); }
  }

  const columns: Column<Article>[] = [
    { key: 'title', label: 'Titre', render: (row) => <><strong>{row.title}</strong>{(row.is_alert || row.featured) && <span className="admin-row-flags">{row.is_alert && <span className="admin-badge status-review">ALERTE INFO</span>}{row.featured && <span className="admin-badge status-published">À LA UNE</span>}</span>}</> },
    { key: 'category_slug', label: 'Rubrique', hideOnMobile: true },
    { key: 'status', label: 'Statut', render: (row) => <span className={'admin-badge status-' + row.status}>{STATUS_LABELS[row.status] ?? row.status}</span> },
    { key: 'word_count', label: 'Mots', hideOnMobile: true, render: (row) => row.word_count ?? 0 },
    { key: 'created_at', label: 'Créé le', hideOnMobile: true, render: (row) => new Date(row.created_at).toLocaleDateString('fr-FR') },
  ];

  return (
    <div className="admin-page">
      <div className="admin-page-head">
        <div><h2>Gestion des articles</h2><p>Créez, rédigez et publiez les contenus de la rédaction.</p></div>
        <Link href="/admin/articles/new" className="admin-btn admin-btn-primary">Nouvel article</Link>
      </div>
      <DataTable
        endpoint="/api/admin/articles" columns={columns} rowKey={(r) => r.id} refreshKey={refresh}
        onDelete={setDeleting}
        onBulkAction={bulk}
        exportable
        bulkActions={[
          { label: 'Publier', value: 'publish' },
          { label: 'Archiver', value: 'archive' },
          { label: 'Supprimer', value: 'delete' },
        ]}
        searchPlaceholder="Rechercher un article…"
        extraActions={(row) => (
          <>
            <Link className="admin-link" href={`/admin/articles/${row.id}/edit`}>Ouvrir le studio</Link>
            <button type="button" className="admin-link" onClick={() => toggleFlag(row, 'is_alert')}>{row.is_alert ? 'Retirer alerte' : 'Alerte info'}</button>
            <button type="button" className="admin-link" onClick={() => toggleFlag(row, 'featured')}>{row.featured ? 'Retirer une' : 'À la une'}</button>
            {row.status === 'published'
              ? <button type="button" className="admin-link" disabled={busy} onClick={() => setStatus(row, 'draft')}>Dépublier</button>
              : <button type="button" className="admin-link" disabled={busy} onClick={() => setStatus(row, 'published')}>Publier</button>}
          </>
        )}
      />
      <ConfirmDialog open={!!deleting} title="Supprimer cet article ?" message="L’article sera archivé et retiré du site public. Cette action est journalisée." confirmLabel="Supprimer" loading={busy} onConfirm={confirmDelete} onCancel={() => setDeleting(null)} />
    </div>
  );
}
