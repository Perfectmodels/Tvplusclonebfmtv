'use client';

import { useState } from 'react';

const emptyForm = {
  email: '', password: '', firstName: '', lastName: '', photoUrl: '',
  birthDate: '', phone: '', city: '', bio: '', role: 'journalist',
};

export default function CreateProfile({ onCreated, roles }: {
  onCreated: () => Promise<void>;
  roles: { key: string; label: string }[];
}) {
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const create = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true); setMessage('');
    try {
      const payload: Record<string, unknown> = {
        email: form.email, password: form.password, role: roles.some((role) => role.key === form.role) ? form.role : roles[0]?.key,
        firstName: form.firstName || null, lastName: form.lastName || null,
        photoUrl: form.photoUrl || null, birthDate: form.birthDate || null,
        phone: form.phone || null, city: form.city || null, bio: form.bio || null,
      };
      const response = await fetch('/api/admin-v2/users/create', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error?.message ?? 'Création impossible');
      setForm(emptyForm); setMessage('Profil créé.'); await onCreated();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Erreur'); }
    finally { setBusy(false); }
  };

  return <details className="v2-dashboard-panel v2-section-details">
      <summary>Créer un profil</summary>
      {message && <p className="form-info" role="status">{message}</p>}
      <form onSubmit={create} className="v2-profile-form">
        {([
          ['firstName', 'Prénom', 'text'], ['lastName', 'Nom', 'text'],
          ['email', 'E-mail', 'email'], ['password', 'Mot de passe', 'password'],
          ['photoUrl', 'Photo (URL)', 'url'], ['birthDate', 'Date de naissance', 'date'],
          ['phone', 'Téléphone', 'tel'], ['city', 'Ville', 'text'],
        ] as const).map(([key, label, type]) => <label key={key}>
          <span>{label}</span>
          <input type={type} required={key === 'email' || key === 'password'}
            minLength={key === 'password' ? 8 : undefined} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })}/>
        </label>)}
        <label><span>Rôle</span>
          <select value={roles.some((role) => role.key === form.role) ? form.role : roles[0]?.key ?? ''} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            {roles.map((role) => <option value={role.key} key={role.key}>{role.label}</option>)}
          </select>
        </label>
        <label><span>Biographie</span>
          <textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })}/>
        </label>
        <button type="submit" disabled={busy || roles.length === 0}>{busy ? 'Patientez…' : 'Créer le profil'}</button>
      </form>
    </details>;
}
