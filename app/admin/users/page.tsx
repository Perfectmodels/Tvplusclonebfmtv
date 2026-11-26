'use client';

import { useState } from 'react';
import DataTable, { type Column } from '../../../components/admin/DataTable';
import AutoForm, { type Field } from '../../../components/admin/AutoForm';
import ConfirmDialog from '../../../components/admin/ConfirmDialog';
import { useToast } from '../../../components/admin/ToastProvider';

type User = Record<string, any> & { id: string; email: string; full_name: string | null; role: string; created_at: string; last_sign_in_at: string | null };

export default function AdminUsersPage() {
  const [refresh, setRefresh] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const { success, error } = useToast();

  async function setRole(user: User, role: string) {
    setBusy(user.id);
    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error?.message ?? 'Mise à jour impossible.');
      success('Rôle mis à jour.'); setRefresh((r) => r + 1);
    } catch (err) { error(err instanceof Error ? err.message : 'Erreur.'); }
    finally { setBusy(null); }
  }

  const fields: Field[] = [
    { name: 'email', label: 'Adresse e-mail', type: 'text', required: true, placeholder: 'prenom@tvplusafrique.com', full: true },
    { name: 'password', label: 'Mot de passe', type: 'text', required: true, placeholder: '8 caractères minimum, dont un chiffre', full: true },
    { name: 'fullName', label: 'Nom complet' },
    { name: 'role', label: 'Rôle', type: 'select', required: true, options: [
      { value: 'reader', label: 'Lecteur' }, { value: 'admin', label: 'Administrateur' },
    ] },
  ];

  const columns: Column<User>[] = [
    { key: 'email', label: 'Utilisateur', render: (row) => <><strong>{row.full_name || 'Sans nom'}</strong><br /><span className="admin-muted">{row.email}</span></> },
    { key: 'role', label: 'Rôle', render: (row) => <span className={'admin-badge ' + (row.role === 'admin' ? 'role-admin' : 'role-reader')}>{row.role === 'admin' ? 'Administrateur' : 'Lecteur'}</span> },
    { key: 'created_at', label: 'Inscription', hideOnMobile: true, render: (row) => new Date(row.created_at).toLocaleDateString('fr-FR') },
  ];

  return (
    <div className="admin-page">
      <div className="admin-page-head">
        <div><h2>Utilisateurs et permissions</h2><p>Gérez les accès à l’espace d’administration.</p></div>
        <button type="button" className="admin-btn admin-btn-primary" onClick={() => setCreating(true)}>Nouvel utilisateur</button>
      </div>
      <DataTable
        endpoint="/api/admin/users" columns={columns} rowKey={(r) => r.id} refreshKey={refresh}
        searchPlaceholder="Rechercher un utilisateur…"
        extraActions={(row) => (
          <select
            className="admin-inline-select"
            value={row.role}
            disabled={busy === row.id}
            aria-label={'Rôle de ' + row.email}
            onChange={(e) => setRole(row, e.target.value)}
          >
            <option value="reader">Lecteur</option>
            <option value="admin">Administrateur</option>
          </select>
        )}
      />

      {creating && (
        <div className="admin-modal-backdrop" onClick={() => setCreating(false)}>
          <div className="admin-modal admin-modal-sm" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-head"><h2>Créer un utilisateur</h2></div>
            <div className="admin-modal-body">
              <AutoForm
                endpoint="/api/admin/users/create"
                fields={fields}
                initialValues={{ role: 'reader' }}
                submitLabel="Créer le compte"
                onSuccess={() => { setCreating(false); setRefresh((r) => r + 1); }}
                onCancel={() => setCreating(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
