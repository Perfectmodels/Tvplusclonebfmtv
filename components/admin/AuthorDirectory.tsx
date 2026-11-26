'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { CalendarDays, Globe2 } from 'lucide-react';
import PaginatedList from './PaginatedList';

import type { AuthorStats } from '../../lib/admin-v2/author-stats';

type Day = { day: string; n: number };

export default function AuthorDirectory({ actorId, canOpenProfiles }: { actorId: string; canOpenProfiles: boolean }) {
  const [authors, setAuthors] = useState<AuthorStats[]>([]);
  const [dailyWritten, setDailyWritten] = useState<Day[]>([]);
  const [dailyPublished, setDailyPublished] = useState<Day[]>([]);
  const [countries, setCountries] = useState<{ country_code: string; n: number }[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/admin-v2/stats/authors', { cache: 'no-store', signal: controller.signal })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body?.error?.message ?? 'Statistiques indisponibles.');
        setAuthors(body.data.authors);
        setDailyWritten(body.data.dailyWritten);
        setDailyPublished(body.data.dailyPublished);
        setCountries(body.data.countries);
      })
      .catch((error: Error) => { if (!controller.signal.aborted) setMessage(error.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);

  const publishedByDay = new Map(dailyPublished.map((d) => [d.day, Number(d.n)]));
  const name = (author: AuthorStats) => author.full_name || [author.first_name, author.last_name].filter(Boolean).join(' ') || 'Sans nom';

  const filtered = authors.filter((author) => name(author).toLowerCase().includes(query.trim().toLowerCase()));

  return <div className="v2-newsroom-page">
    {message && <p className="form-info" role="status">{message}</p>}
    <section className="v2-dashboard-panel">
      <header><h2>Rédacteurs et production</h2></header>
      <label className="v2-field"><span>Rechercher un rédacteur</span>
        <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} />
      </label>
      {loading ? <p role="status">Chargement des rédacteurs…</p> : filtered.length === 0 ? <p>Aucun rédacteur trouvé.</p> :
        <PaginatedList key={query} items={filtered}>{(visible) => <div className="v2-directory">
          {visible.map((author) => <article key={author.id} className="v2-directory-card">
            <div className="v2-author-cell">
              {author.photo_url && <img src={author.photo_url} alt="" width={28} height={28} />}
              <strong>{name(author)}</strong>
            </div>
            <span>{author.total} articles · {author.published} publiés · {author.drafts} brouillons</span>
            <div className="v2-actions">
              {!author.aliasIds?.length && <Link className="admin-btn admin-btn-ghost" href={`/admin-v2/articles?auteur=${author.id}`}>Articles</Link>}
              {(canOpenProfiles || author.id === actorId) &&
                <Link className="admin-btn admin-btn-ghost" href={`/admin-v2/articles/redacteurs/${author.id}`}>Profil</Link>}
            </div>
          </article>)}
        </div>}</PaginatedList>}
    </section>

    <div className="v2-dashboard-figures">
      <section className="v2-dashboard-panel" aria-labelledby="daily-title">
        <header><div><h2 id="daily-title">Articles par jour</h2><p>30 derniers jours, heure UTC.</p></div>
          <CalendarDays size={21}/></header>
        <PaginatedList items={dailyWritten} pageSize={7}>{(days) => <table className="v2-table">
          <thead><tr><th>Date</th><th>Rédigés</th><th>Publiés</th></tr></thead>
          <tbody>{days.map((day) => <tr key={day.day}>
            <td data-label="Date">{day.day}</td><td data-label="Rédigés">{day.n}</td><td data-label="Publiés">{publishedByDay.get(day.day) ?? 0}</td>
          </tr>)}</tbody>
        </table>}</PaginatedList>
      </section>
      <section className="v2-dashboard-panel" aria-labelledby="countries-title">
        <header><div><h2 id="countries-title">Articles par pays</h2></div><Globe2 size={21}/></header>
        <PaginatedList items={countries}>{(visible) => <ul>{visible.map((country) => <li key={country.country_code}>
          {country.country_code} — {country.n} articles
        </li>)}</ul>}</PaginatedList>
      </section>
    </div>

  </div>;
}
