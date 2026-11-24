'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

type Profile = {
  id: string; email: string; full_name: string | null; first_name: string | null;
  last_name: string | null; photo_url: string | null; birth_date: string | null;
  phone: string | null; city: string | null; bio: string | null;
  role: string; is_active: boolean; is_temporary: boolean; permissions: string[];
};
type Article = { id: string; title: string; status: string; country_code: string; category: string | null; published_at: string | null };
type Workspace = { profile: Profile; articles: Article[]; counts: Record<string, number>; total: number };

export default function RedacteurWorkspace({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState('');
  const [data, setData] = useState<Workspace | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => { params.then((p) => setId(p.id)); }, [params]);
  const load = useCallback(async () => {
    const response = await fetch(`/api/admin-v2/users/${id}/workspace`, { cache: 'no-store' });
    const body = await response.json();
    if (!body.success) throw new Error(body?.error?.message ?? 'Espace indisponible');
    setData(body.data); setProfile(body.data.profile);
  }, [id]);
  useEffect(() => { if (id) load().catch((error) => setMessage(error.message)); }, [id, load]);

  const save = async (event: React.FormEvent) => {
    event.preventDefault(); setMessage('');
    if (!profile) return;
    const response = await fetch(`/api/admin-v2/users/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        first_name: profile.first_name, last_name: profile.last_name, photo_url: profile.photo_url,
        birth_date: profile.birth_date, phone: profile.phone, city: profile.city, bio: profile.bio,
        role: profile.role, is_temporary: false,
      }),
    });
    const body = await response.json();
    setMessage(response.ok ? 'Profil mis à jour.' : (body?.error?.message ?? 'Échec'));
    if (response.ok) await load();
  };

  const field = (key: keyof Profile, label: string, type = 'text') => (
    <label key={key}><span>{label}</span>
      <input type={type} value={(profile?.[key] as string | null) ?? ''}
        onChange={(e) => setProfile((p) => p ? { ...p, [key]: e.target.value } : p)}/>
    </label>
  );

  return <div className="v2-newsroom-page">
    <header className="v2-newsroom-page-header">
      <div><p className="v2-newsroom-eyebrow">ESPACE RÉDACTEUR</p>
        <h1>{profile?.full_name || [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'Profil'}</h1>
        <p>{data?.total ?? 0} articles au total · {data?.counts?.published ?? 0} publiés</p></div>
      <Link href="/admin-v2/redacteurs" className="v2-newsroom-secondary">Retour</Link>
    </header>
    {message && <p className="form-info" role="status">{message}</p>}

    {profile && <section className="v2-dashboard-panel" aria-labelledby="acces-title">
      <header><div><h2 id="acces-title">Accès du rédacteur</h2>
        <p>Rôle : {profile.role} — {(profile.permissions ?? []).length} permission(s).</p></div></header>
      <ul className="v2-permission-list">{(profile.permissions ?? []).map((permission) =>
        <li key={permission}><code>{permission}</code></li>)}
        {!(profile.permissions ?? []).length && <li>Aucune permission particulière.</li>}
      </ul>
    </section>}

    {profile && <section className="v2-dashboard-panel" aria-labelledby="profil-title">
      <header><div><h2 id="profil-title">Profil avancé</h2>
        <p>{profile.is_temporary ? 'Profil temporaire à compléter.' : 'Profil actif.'}</p></div></header>
      <form onSubmit={save} className="v2-profile-form">
        {field('first_name', 'Prénom')}{field('last_name', 'Nom')}{field('email', 'E-mail', 'email')}
        {field('photo_url', 'Photo (URL)', 'url')}{field('birth_date', 'Date de naissance', 'date')}
        {field('phone', 'Téléphone', 'tel')}{field('city', 'Ville')}
        <label><span>Rôle</span>
          <select value={profile.role} onChange={(e) => setProfile({ ...profile, role: e.target.value })}>
            {['journalist', 'editor_in_chief', 'admin', 'reader'].map((role) => <option key={role} value={role}>{role}</option>)}
          </select>
        </label>
        <label><span>Biographie</span>
          <textarea value={profile.bio ?? ''} onChange={(e) => setProfile({ ...profile, bio: e.target.value })}/>
        </label>
        <button type="submit">Enregistrer</button>
      </form>
    </section>}

    <section className="v2-dashboard-panel" aria-labelledby="articles-title">
      <header><div><h2 id="articles-title">Articles du rédacteur</h2><p>100 derniers articles.</p></div></header>
      <table className="v2-table">
        <thead><tr><th>Titre</th><th>Rubrique</th><th>Pays</th><th>Statut</th><th>Publication</th></tr></thead>
        <tbody>{(data?.articles ?? []).map((article) => <tr key={article.id}>
          <td>{article.title}</td><td>{article.category ?? '—'}</td><td>{article.country_code}</td>
          <td>{article.status}</td><td>{article.published_at ?? '—'}</td>
        </tr>)}</tbody>
      </table>
    </section>
  </div>;
}
