'use client';

import { useCallback, useEffect, useState } from 'react';
import { Shield } from 'lucide-react';

type Role = { key: string; label: string; permissions: string[] };

const ALL_PERMISSIONS = [
  'articles.read', 'articles.read_all', 'articles.create', 'articles.edit_own',
  'articles.review', 'articles.publish_scheduled', 'categories.manage', 'shows.manage',
  'media.upload', 'media.delete', 'schedule.manage', 'settings.manage',
  'users.manage', 'roles.manage', 'audit.read',
];

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [selected, setSelected] = useState<Record<string, string[]>>({});
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    const response = await fetch('/api/admin-v2/roles', { cache: 'no-store' });
    const body = await response.json();
    if (!response.ok) throw new Error(body?.error?.message ?? 'Accès refusé');
    const items = body.data.items as Role[];
    setRoles(items);
    setSelected(Object.fromEntries(items.map((role) => [role.key, role.permissions])));
  }, []);
  useEffect(() => { load().catch((error) => setMessage(error.message)); }, [load]);

  const toggle = (key: string, permission: string) => {
    setSelected((current) => {
      const values = current[key] ?? [];
      return { ...current, [key]: values.includes(permission)
        ? values.filter((item) => item !== permission) : [...values, permission] };
    });
  };

  const save = async (role: Role) => {
    setMessage('');
    const response = await fetch('/api/admin-v2/roles', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: role.key, label: role.label, permissions: selected[role.key] ?? [] }),
    });
    const body = await response.json();
    setMessage(response.ok ? `Rôle ${role.label} mis à jour.` : (body?.error?.message ?? 'Échec'));
    if (response.ok) await load();
  };

  return <div className="v2-newsroom-page">
    <header className="v2-newsroom-page-header">
      <div><p className="v2-newsroom-eyebrow">TV+ AFRIQUE · RÔLES ET ACCÈS</p>
        <h1>Rôles & accès</h1><p>Chaque rôle ouvre un espace et un tableau de bord adaptés.</p></div>
      <Shield size={28}/>
    </header>
    {message && <p className="form-info" role="status">{message}</p>}

    {roles.map((role) => <section key={role.key} className="v2-dashboard-panel" aria-labelledby={`role-${role.key}`}>
      <header><div><h2 id={`role-${role.key}`}>{role.label}</h2>
        <p><code>{role.key}</code> — {(selected[role.key] ?? []).length} permission(s)</p></div></header>
      <div className="v2-permission-list">
        {ALL_PERMISSIONS.map((permission) => <label key={permission} className="v2-permission-toggle">
          <input type="checkbox" checked={(selected[role.key] ?? []).includes(permission)}
            disabled={role.key === 'super_admin'}
            onChange={() => toggle(role.key, permission)}/>
          <span>{permission}</span>
        </label>)}
      </div>
      {role.key !== 'super_admin' && <div className="v2-role-actions">
        <button type="button" onClick={() => save(role)}>Enregistrer</button>
      </div>}
    </section>)}
  </div>;
}
