'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import PaginatedList from './PaginatedList';
import CreateProfile from './CreateProfile';

type Account = { id: string; full_name: string | null; email: string; role: string; is_active: boolean; article_count?: number };
type Role = { key: string; label: string };

export default function UserManagement({ actorId }: { actorId: string }) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [accountsResponse, rolesResponse] = await Promise.all([
      fetch('/api/admin-v2/users', { cache: 'no-store' }),
      fetch('/api/admin-v2/users?roles=1', { cache: 'no-store' }),
    ]);
    const [accountsBody, rolesBody] = await Promise.all([accountsResponse.json(), rolesResponse.json()]);
    if (!accountsResponse.ok || !rolesResponse.ok) throw new Error('Impossible de charger les utilisateurs et leurs rôles.');
    setAccounts(accountsBody.data.items);
    setRoles(rolesBody.data.items);
  }, []);

  useEffect(() => {
    load().catch((error: Error) => setMessage(error.message)).finally(() => setLoading(false));
  }, [load]);

  async function update(account: Account, change: { role?: string; is_active?: boolean }) {
    setBusy(account.id);
    setMessage('');
    try {
      const response = await fetch('/api/admin-v2/users/' + account.id, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(change),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error?.message ?? 'Modification impossible.');
      setAccounts((current) => current.map((item) => item.id === account.id ? { ...item, ...change } : item));
      setMessage('Compte mis à jour.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Modification impossible.');
    } finally {
      setBusy('');
    }
  }

  const filtered = accounts.filter((account) =>
    [account.full_name, account.email].some((value) => value?.toLowerCase().includes(query.trim().toLowerCase())));

  return <>
    <CreateProfile onCreated={load} roles={roles.filter((role) => role.key !== 'super_admin')} />
    <section className="v2-dashboard-panel">
      <header><h2>Comptes utilisateurs</h2></header>
      <label className="v2-field"><span>Rechercher un utilisateur</span>
        <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} />
      </label>
      {message && <p className="form-info" role="status">{message}</p>}
      {loading ? <p role="status">Chargement des comptes…</p> : filtered.length === 0 ? <p>Aucun utilisateur trouvé.</p> :
        <PaginatedList key={query} items={filtered}>{(visible) => <div className="v2-directory">
          {visible.map((account) => <article key={account.id} className="v2-directory-card">
            <div><strong>{account.full_name || account.email}</strong><br /><small>{account.email}</small></div>
            <label className="v2-field"><span>Rôle</span>
              <select value={account.role} disabled={account.id === actorId || account.role === 'super_admin' || Boolean(busy)}
                onChange={(event) => void update(account, { role: event.target.value })}>
                {!roles.some((role) => role.key === account.role) && <option value={account.role}>{account.role}</option>}
                {roles.filter((role) => role.key !== 'super_admin' || account.role === role.key).map((role) => <option value={role.key} key={role.key}>{role.label}</option>)}
              </select>
            </label>
            <div className="v2-actions">
              <Link className="admin-btn admin-btn-ghost" href={'/admin-v2/articles/redacteurs/' + account.id}>Profil</Link>
              <button type="button" className="admin-btn admin-btn-ghost" disabled={account.id === actorId || account.role === 'super_admin' || Boolean(busy)}
                onClick={() => void update(account, { is_active: !account.is_active })}>{account.is_active ? 'Désactiver' : 'Activer'}</button>
            </div>
          </article>)}
        </div>}</PaginatedList>}
    </section>
  </>;
}

