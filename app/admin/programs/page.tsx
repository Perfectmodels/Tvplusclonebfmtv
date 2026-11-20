'use client';

import { useCallback, useState } from 'react';
import DataTable, { type Column } from '../../../components/admin/DataTable';
import AutoForm, { type Field } from '../../../components/admin/AutoForm';
import ConfirmDialog from '../../../components/admin/ConfirmDialog';
import { useToast } from '../../../components/admin/ToastProvider';

type Program = Record<string, any> & { id: string; slug: string; name: string; host: string; slot: string; category: string };

const fields: Field[] = [
  { name: 'name', label: 'Nom de l’émission', required: true },
  { name: 'slug', label: 'Slug', required: true },
  { name: 'host', label: 'Présentateur / équipe' },
  { name: 'slot', label: 'Créneau', required: true, placeholder: '17h00 – 19h00' },
  { name: 'category', label: 'Catégorie', required: true },
  { name: 'image_url', label: 'Miniature (URL)', type: 'url', full: true },
  { name: 'description', label: 'Description', type: 'textarea', full: true },
];

export default function AdminProgramsPage() {
  const [editing, setEditing] = useState<Program | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Program | null>(null);
  const [busy, setBusy] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const { success, error } = useToast();
  const done = useCallback(() => { setCreating(false); setEditing(null); setRefresh((r) => r + 1); }, []);

  async function confirmDelete() {
    if (!deleting) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/admin/programs/${deleting.id}`, { method: 'DELETE' });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error?.message ?? 'Suppression impossible.');
      success('Émission supprimée.'); setDeleting(null); setRefresh((r) => r + 1);
    } catch (err) { error(err instanceof Error ? err.message : 'Erreur.'); }
    finally { setBusy(false); }
  }

  const columns: Column<Program>[] = [
    { key: 'name', label: 'Émission', render: (row) => <strong>{row.name}</strong> },
    { key: 'slot', label: 'Créneau' },
    { key: 'category', label: 'Catégorie', hideOnMobile: true },
    { key: 'host', label: 'Équipe', hideOnMobile: true },
  ];

  return (
    <div className="admin-page">
      <div className="admin-page-head">
        <div><h2>Émissions et replays</h2><p>Gérez la grille des émissions et leurs informations.</p></div>
        <button type="button" className="admin-btn admin-btn-primary" onClick={() => setCreating(true)}>Nouvelle émission</button>
      </div>
      <DataTable endpoint="/api/admin/programs" columns={columns} rowKey={(r) => r.id} onEdit={setEditing} onDelete={setDeleting} refreshKey={refresh} searchPlaceholder="Rechercher une émission…" />
      {(creating || editing) && (
        <div className="admin-modal-backdrop" onClick={done}>
          <div className="admin-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-head"><h2>{editing ? 'Modifier l’émission' : 'Créer une émission'}</h2></div>
            <div className="admin-modal-body">
              <AutoForm
                endpoint={editing ? `/api/admin/programs/${editing.id}` : '/api/admin/programs'}
                method={editing ? 'PATCH' : 'POST'}
                fields={editing ? fields.filter((f) => f.name !== 'slug') : fields}
                initialValues={editing ? { ...editing, image_url: editing.image_url ?? '', description: editing.description ?? '' } : {}}
                onSuccess={done} onCancel={done}
              />
            </div>
          </div>
        </div>
      )}
      <ConfirmDialog open={!!deleting} title="Supprimer cette émission ?" message="L’émission sera retirée du programme public." confirmLabel="Supprimer" loading={busy} onConfirm={confirmDelete} onCancel={() => setDeleting(null)} />
    </div>
  );
}
