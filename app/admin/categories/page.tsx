'use client';

import { useCallback, useState } from 'react';
import DataTable, { type Column } from '../../../components/admin/DataTable';
import AutoForm, { type Field } from '../../../components/admin/AutoForm';
import ConfirmDialog from '../../../components/admin/ConfirmDialog';
import { useToast } from '../../../components/admin/ToastProvider';

type Category = Record<string, any> & { id: string; slug: string; name: string; description: string | null };

const fields: Field[] = [
  { name: 'name', label: 'Nom de la rubrique', required: true, placeholder: 'Politique' },
  { name: 'slug', label: 'Slug (URL)', required: true, placeholder: 'politique' },
  { name: 'description', label: 'Description', type: 'textarea', full: true },
];

export default function AdminCategoriesPage() {
  const [editing, setEditing] = useState<Category | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Category | null>(null);
  const [busy, setBusy] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const { success, error } = useToast();

  const done = useCallback(() => { setCreating(false); setEditing(null); setRefresh((r) => r + 1); }, []);

  async function confirmDelete() {
    if (!deleting) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/admin/categories/${deleting.id}`, { method: 'DELETE' });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error?.message ?? 'Suppression impossible.');
      success('Rubrique supprimée.');
      setDeleting(null);
      setRefresh((r) => r + 1);
    } catch (err) { error(err instanceof Error ? err.message : 'Erreur.'); }
    finally { setBusy(false); }
  }

  const columns: Column<Category>[] = [
    { key: 'name', label: 'Rubrique', render: (row) => <strong>{row.name}</strong> },
    { key: 'slug', label: 'Slug' },
    { key: 'description', label: 'Description', hideOnMobile: true, render: (row) => row.description ?? '—' },
  ];

  return (
    <div className="admin-page">
      <div className="admin-page-head">
        <div><h2>Gestion des rubriques</h2><p>Organisez les catégories d’actualités du site public.</p></div>
        <button type="button" className="admin-btn admin-btn-primary" onClick={() => setCreating(true)}>Nouvelle rubrique</button>
      </div>
      <DataTable endpoint="/api/admin/categories" columns={columns} rowKey={(r) => r.id} onEdit={setEditing} onDelete={setDeleting} refreshKey={refresh} searchPlaceholder="Rechercher une rubrique…" />
      {(creating || editing) && (
        <div className="admin-modal-backdrop" onClick={done}>
          <div className="admin-modal admin-modal-sm" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-head"><h2>{editing ? 'Modifier la rubrique' : 'Créer une rubrique'}</h2></div>
            <div className="admin-modal-body">
              <AutoForm
                endpoint={editing ? `/api/admin/categories/${editing.id}` : '/api/admin/categories'}
                method={editing ? 'PATCH' : 'POST'}
                fields={editing ? fields.filter((f) => f.name !== 'slug') : fields}
                initialValues={editing ? { name: editing.name, description: editing.description ?? '' } : {}}
                onSuccess={done} onCancel={done}
              />
            </div>
          </div>
        </div>
      )}
      <ConfirmDialog open={!!deleting} title="Supprimer cette rubrique ?" message="La suppression est refusée si des articles sont encore associés à cette rubrique." confirmLabel="Supprimer" loading={busy} onConfirm={confirmDelete} onCancel={() => setDeleting(null)} />
    </div>
  );
}
