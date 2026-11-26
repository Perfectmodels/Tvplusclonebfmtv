'use client';

import { useState } from 'react';
import DataTable, { type Column } from '../../../components/admin/DataTable';
import ConfirmDialog from '../../../components/admin/ConfirmDialog';
import { useToast } from '../../../components/admin/ToastProvider';

type Question = Record<string, any> & {
  id: string; name: string; email: string; question: string; status: string; created_at: string; answer: string | null;
};

export default function AdminQuestionsPage() {
  const [deleting, setDeleting] = useState<Question | null>(null);
  const [busy, setBusy] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const { success, error } = useToast();

  async function setStatus(question: Question, status: string) {
    try {
      const response = await fetch(`/api/admin/questions/${question.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error?.message ?? 'Mise à jour impossible.');
      success('Question mise à jour.'); setRefresh((r) => r + 1);
    } catch (err) { error(err instanceof Error ? err.message : 'Erreur.'); }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/admin/questions/${deleting.id}`, { method: 'DELETE' });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error?.message ?? 'Suppression impossible.');
      success('Question supprimée.'); setDeleting(null); setRefresh((r) => r + 1);
    } catch (err) { error(err instanceof Error ? err.message : 'Erreur.'); }
    finally { setBusy(false); }
  }

  const columns: Column<Question>[] = [
    { key: 'name', label: 'Auteur', render: (row) => <><strong>{row.name}</strong><br /><span className="admin-muted">{row.email}</span></> },
    { key: 'question', label: 'Question', render: (row) => row.question.slice(0, 140) + (row.question.length > 140 ? '…' : '') },
    { key: 'status', label: 'Statut', render: (row) => <span className={'admin-badge status-' + row.status}>{row.status}</span> },
    { key: 'created_at', label: 'Date', hideOnMobile: true, render: (row) => new Date(row.created_at).toLocaleDateString('fr-FR') },
  ];

  return (
    <div className="admin-page">
      <div className="admin-page-head">
        <div><h2>Questions du public</h2><p>Les messages envoyés depuis le bloc « Une question sur l’actualité ? ».</p></div>
      </div>
      <DataTable
        endpoint="/api/admin/questions" columns={columns} rowKey={(r) => r.id} refreshKey={refresh}
        onDelete={setDeleting} exportable searchPlaceholder="Rechercher une question…"
        bulkActions={[
          { label: 'Marquer traitée', value: 'answered' },
          { label: 'Archiver', value: 'archived' },
        ]}
        onBulkAction={async (ids, action) => {
          await Promise.all(ids.map((id) => fetch(`/api/admin/questions/${id}`, {
            method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: action }),
          })));
          success(`${ids.length} question(s) mise(s) à jour.`); setRefresh((r) => r + 1);
        }}
        extraActions={(row) => row.status !== 'answered'
          ? <button type="button" className="admin-link" onClick={() => setStatus(row, 'answered')}>Traiter</button>
          : null}
      />
      <ConfirmDialog open={!!deleting} title="Supprimer cette question ?" message="Le message sera définitivement supprimé." confirmLabel="Supprimer" loading={busy} onConfirm={confirmDelete} onCancel={() => setDeleting(null)} />
    </div>
  );
}
