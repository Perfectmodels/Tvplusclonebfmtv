'use client';

import { useCallback, useEffect, useState } from 'react';
import DataTable, { type Column } from '../../../components/admin/DataTable';
import AutoForm, { type Field } from '../../../components/admin/AutoForm';
import ConfirmDialog from '../../../components/admin/ConfirmDialog';
import { useToast } from '../../../components/admin/ToastProvider';

type Episode = Record<string, any> & {
  id: string; title: string; status: string; duration: string; created_at: string;
};

export default function AdminReplaysPage() {
  const [editing, setEditing] = useState<Episode | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Episode | null>(null);
  const [busy, setBusy] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [programs, setPrograms] = useState<{ value: string; label: string }[]>([]);
  const { success, error } = useToast();

  useEffect(() => {
    fetch('/api/admin/programs').then((r) => r.json()).then((b) => {
      setPrograms((b.data?.items ?? []).map((p: any) => ({ value: p.id, label: p.name })));
    }).catch(() => {});
  }, []);

  const done = useCallback(() => { setCreating(false); setEditing(null); setRefresh((r) => r + 1); }, []);

  async function confirmDelete() {
    if (!deleting) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/admin/episodes/${deleting.id}`, { method: 'DELETE' });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error?.message ?? 'Suppression impossible.');
      success('Replay supprimé.'); setDeleting(null); setRefresh((r) => r + 1);
    } catch (err) { error(err instanceof Error ? err.message : 'Erreur.'); }
    finally { setBusy(false); }
  }

  const fields: Field[] = [
    { name: 'title', label: 'Titre de l’épisode', required: true, full: true },
    { name: 'program_id', label: 'Émission', type: 'select', options: programs },
    { name: 'duration', label: 'Durée', placeholder: '42:18' },
    { name: 'status', label: 'Statut', type: 'select', required: true, options: [
      { value: 'draft', label: 'Brouillon' }, { value: 'published', label: 'Publié' }, { value: 'archived', label: 'Archivé' },
    ] },
    { name: 'description', label: 'Description', type: 'textarea', full: true },
    { name: 'video_url', label: 'URL de la vidéo', type: 'url', full: true },
    { name: 'thumbnail_url', label: 'URL de la miniature', type: 'url', full: true },
  ];

  const columns: Column<Episode>[] = [
    { key: 'title', label: 'Épisode', render: (row) => <strong>{row.title}</strong> },
    { key: 'program', label: 'Émission', hideOnMobile: true, render: (row) => row.programs?.name ?? '—' },
    { key: 'duration', label: 'Durée', hideOnMobile: true },
    { key: 'status', label: 'Statut', render: (row) => <span className={'admin-badge status-' + row.status}>{row.status}</span> },
    { key: 'created_at', label: 'Ajouté le', hideOnMobile: true, render: (row) => new Date(row.created_at).toLocaleDateString('fr-FR') },
  ];

  return (
    <div className="admin-page">
      <div className="admin-page-head">
        <div><h2>Replays</h2><p>Gérez les épisodes disponibles sur la page publique /replays.</p></div>
        <button type="button" className="admin-btn admin-btn-primary" onClick={() => setCreating(true)}>Nouvel épisode</button>
      </div>
      <DataTable endpoint="/api/admin/episodes" columns={columns} rowKey={(r) => r.id} onEdit={setEditing} onDelete={setDeleting} refreshKey={refresh} exportable searchPlaceholder="Rechercher un replay…" />
      {(creating || editing) && (
        <div className="admin-modal-backdrop" onClick={done}>
          <div className="admin-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-head"><h2>{editing ? 'Modifier le replay' : 'Créer un replay'}</h2></div>
            <div className="admin-modal-body">
              <AutoForm
                endpoint={editing ? `/api/admin/episodes/${editing.id}` : '/api/admin/episodes'}
                method={editing ? 'PATCH' : 'POST'}
                fields={fields}
                initialValues={editing ? {
                  title: editing.title, program_id: editing.program_id ?? '', duration: editing.duration,
                  status: editing.status, description: editing.description ?? '',
                  video_url: editing.video_url ?? '', thumbnail_url: editing.thumbnail_url ?? '',
                } : { status: 'draft', duration: '00:00' }}
                onSuccess={done} onCancel={done}
              />
            </div>
          </div>
        </div>
      )}
      <ConfirmDialog open={!!deleting} title="Supprimer ce replay ?" message="L’épisode sera retiré de la page publique." confirmLabel="Supprimer" loading={busy} onConfirm={confirmDelete} onCancel={() => setDeleting(null)} />
    </div>
  );
}
