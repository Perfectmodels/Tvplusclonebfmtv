'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Plus, UsersRound, FileText, CalendarDays, Globe2 } from 'lucide-react';

type Author = {
  id: string; full_name: string | null; first_name: string | null; last_name: string | null;
  photo_url: string | null; role: string; is_temporary: boolean;
  total: number; published: number; drafts: number; article_count?: number;
  email?: string;
};
type Day = { day: string; n: number };

const emptyForm = {
  email: '', password: '', firstName: '', lastName: '', photoUrl: '',
  birthDate: '', phone: '', city: '', bio: '', role: 'journalist',
};

export default function RedacteursPage() {
  const [authors, setAuthors] = useState<Author[]>([]);
  const [dailyWritten, setDailyWritten] = useState<Day[]>([]);
  const [dailyPublished, setDailyPublished] = useState<Day[]>([]);
  const [countries, setCountries] = useState<{ country_code: string; n: number }[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const response = await fetch('/api/admin-v2/stats/authors', { cache: 'no-store' });
    const body = await response.json();
    if (!body.success) throw new Error(body?.error?.message ?? 'Statistiques indisponibles');
    setAuthors(body.data.authors);
    setDailyWritten(body.data.dailyWritten);
    setDailyPublished(body.data.dailyPublished);
    setCountries(body.data.countries);
    const users = await fetch('/api/admin-v2/users', { cache: 'no-store' }).then((r) => r.json());
    if (users.success) {
      const byId = new Map((users.data.items as Author[]).map((u) => [u.id, u]));
      setAuthors((current) => current.map((a) => ({ ...a, email: byId.get(a.id)?.email })));
    }
  }, []);

  useEffect(() => { load().catch((error) => setMessage(error.message)); }, [load]);

  const create = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true); setMessage('');
    try {
      const payload: Record<string, unknown> = {
        email: form.email, password: form.password, role: form.role,
        firstName: form.firstName || null, lastName: form.lastName || null,
        photoUrl: form.photoUrl || null, birthDate: form.birthDate || null,
        phone: form.phone || null, city: form.city || null, bio: form.bio || null,
      };
      const response = await fetch('/api/admin-v2/users/create', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error?.message ?? 'Création impossible');
      setForm(emptyForm); setMessage('Profil créé.'); await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Erreur'); }
    finally { setBusy(false); }
  };

  const publishedByDay = new Map(dailyPublished.map((d) => [d.day, Number(d.n)]));
  const name = (author: Author) => author.full_name || [author.first_name, author.last_name].filter(Boolean).join(' ') || 'Sans nom';

  return <div className="v2-newsroom-page">
    <header className="v2-newsroom-page-header">
      <div><p className="v2-newsroom-eyebrow">TV+ AFRIQUE · ÉQUIPE ÉDITORIALE</p>
        <h1>Rédacteurs</h1><p>Profils, productions et statistiques par jour.</p></div>
    </header>

    {message && <p className="form-info" role="status">{message}</p>}

    <section className="v2-dashboard-panel" aria-labelledby="redacteurs-title">
      <header><div><h2 id="redacteurs-title">Espace de chaque rédacteur</h2>
        <p>Le nombre d'articles concerne toute la production enregistrée.</p></div>
        <UsersRound size={21}/></header>
      <table className="v2-table">
        <thead><tr><th>Rédacteur</th><th>Rôle</th><th>Articles</th><th>Publiés</th><th>Brouillons</th><th>Profil</th></tr></thead>
        <tbody>
          {authors.map((author) => <tr key={author.id}>
            <td>
              <span className="v2-author-cell">
                {author.photo_url && <img src={author.photo_url} alt="" width={28} height={28}/>}
                <span><strong>{name(author)}</strong><small>{author.email}</small></span>
              </span>
            </td>
            <td>{author.role}</td>
            <td>{author.article_count ?? author.total}</td>
            <td>{author.published}</td>
            <td>{author.drafts}</td>
            <td>
              {author.is_temporary && <span className="v2-badge-temp">à compléter</span>}
              <Link href={`/admin-v2/redacteurs/${author.id}`}>Ouvrir l'espace</Link>
            </td>
          </tr>)}
        </tbody>
      </table>
    </section>

    <div className="v2-dashboard-figures">
      <section className="v2-dashboard-panel" aria-labelledby="daily-title">
        <header><div><h2 id="daily-title">Articles par jour</h2><p>30 derniers jours, heure UTC.</p></div>
          <CalendarDays size={21}/></header>
        <table className="v2-table">
          <thead><tr><th>Date</th><th>Rédigés</th><th>Publiés</th></tr></thead>
          <tbody>{dailyWritten.map((day) => <tr key={day.day}>
            <td>{day.day}</td><td>{day.n}</td><td>{publishedByDay.get(day.day) ?? 0}</td>
          </tr>)}</tbody>
        </table>
      </section>
      <section className="v2-dashboard-panel" aria-labelledby="countries-title">
        <header><div><h2 id="countries-title">Articles par pays</h2></div><Globe2 size={21}/></header>
        <ul>{countries.map((country) => <li key={country.country_code}>
          {country.country_code} — {country.n} articles
        </li>)}</ul>
      </section>
    </div>

    <section className="v2-dashboard-panel" aria-labelledby="create-title">
      <header><div><h2 id="create-title">Créer un profil</h2>
        <p>Nom, prénom, photo, date de naissance, ville, rôle et mot de passe (8 caractères minimum, dont un chiffre).</p></div>
        <Plus size={21}/></header>
      <form onSubmit={create} className="v2-profile-form">
        {([
          ['firstName', 'Prénom', 'text'], ['lastName', 'Nom', 'text'],
          ['email', 'E-mail', 'email'], ['password', 'Mot de passe', 'password'],
          ['photoUrl', 'Photo (URL)', 'url'], ['birthDate', 'Date de naissance', 'date'],
          ['phone', 'Téléphone', 'tel'], ['city', 'Ville', 'text'],
        ] as const).map(([key, label, type]) => <label key={key}>
          <span>{label}</span>
          <input type={type} required={key === 'email' || key === 'password'}
            value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })}/>
        </label>)}
        <label><span>Rôle</span>
          <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            <option value="journalist">Journaliste</option>
            <option value="editor_in_chief">Rédacteur en chef</option>
            <option value="admin">Administrateur</option>
            <option value="reader">Lecteur</option>
          </select>
        </label>
        <label><span>Biographie</span>
          <textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })}/>
        </label>
        <button type="submit" disabled={busy}>{busy ? 'Patientez…' : 'Créer le profil'}</button>
      </form>
    </section>
  </div>;
}
