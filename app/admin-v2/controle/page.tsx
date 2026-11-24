'use client';

import { useCallback, useEffect, useState } from 'react';
import { ShieldCheck, ClipboardCheck, CalendarClock, ScrollText } from 'lucide-react';

type Control = {
  counts: Record<string, number>; total: number; media: number;
  authors: { full_name: string | null; total: number; published: number }[];
  dailyWritten: { day: string; n: number }[];
  dailyPublished: { day: string; n: number }[];
  countries: { country_code: string; n: number }[];
  reviewQueue: { id: string; title: string; status: string; updated_at: string | null; author_name: string | null }[];
  audit: { id: string; action: string; created_at: string | null; actor_email: string | null }[];
};

export default function ControlePage() {
  const [data, setData] = useState<Control | null>(null);
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    const response = await fetch('/api/admin-v2/controle', { cache: 'no-store' });
    const body = await response.json();
    if (!response.ok) throw new Error(body?.error?.message ?? 'Accès refusé');
    setData(body.data);
  }, []);
  useEffect(() => { load().catch((error) => setMessage(error.message)); }, [load]);

  if (message) return <div className="v2-newsroom-page"><p className="form-error">{message}</p></div>;
  if (!data) return <div className="v2-newsroom-page"><p>Chargement…</p></div>;

  const publishedByDay = new Map(data.dailyPublished.map((d) => [d.day, d.n]));

  return <div className="v2-newsroom-page">
    <header className="v2-newsroom-page-header">
      <div><p className="v2-newsroom-eyebrow">TV+ AFRIQUE · CONTRÔLE ÉDITORIAL</p>
        <h1>Contrôle & rapports</h1><p>Vue globale de la production et des validations.</p></div>
      <ShieldCheck size={28}/>
    </header>

    <section aria-label="Indicateurs" className="v2-dashboard-kpis">
      {[
        ['Articles en ligne', data.counts.published ?? 0],
        ['À valider', data.counts.in_review ?? 0],
        ['Programmés', data.counts.scheduled ?? 0],
        ['Médias', data.media],
      ].map(([label, value]) => <div key={String(label)} className="v2-dashboard-kpi">
        <span className="v2-dashboard-kpi-head"><span>{label}</span></span>
        <strong>{String(value)}</strong>
      </div>)}
    </section>

    <div className="v2-dashboard-figures">
      <section className="v2-dashboard-panel" aria-labelledby="validation-title">
        <header><div><h2 id="validation-title">File de validation</h2>
          <p>Articles en attente de relecture ou programmés.</p></div><ClipboardCheck size={21}/></header>
        <table className="v2-table">
          <thead><tr><th>Titre</th><th>Rédacteur</th><th>Statut</th><th>Modifié</th></tr></thead>
          <tbody>{data.reviewQueue.map((item) => <tr key={item.id}>
            <td>{item.title}</td><td>{item.author_name ?? '—'}</td>
            <td>{item.status}</td><td>{item.updated_at ?? '—'}</td>
          </tr>)}</tbody>
        </table>
      </section>

      <section className="v2-dashboard-panel" aria-labelledby="production-title">
        <header><div><h2 id="production-title">Production par jour</h2><p>30 derniers jours.</p></div>
          <CalendarClock size={21}/></header>
        <table className="v2-table">
          <thead><tr><th>Date</th><th>Rédigés</th><th>Publiés</th></tr></thead>
          <tbody>{data.dailyWritten.map((day) => <tr key={day.day}>
            <td>{day.day}</td><td>{day.n}</td><td>{publishedByDay.get(day.day) ?? 0}</td>
          </tr>)}</tbody>
        </table>
      </section>
    </div>

    <div className="v2-dashboard-figures">
      <section className="v2-dashboard-panel" aria-labelledby="authors-title">
        <header><div><h2 id="authors-title">Production par rédacteur</h2></div></header>
        <table className="v2-table">
          <thead><tr><th>Rédacteur</th><th>Total</th><th>Publiés</th></tr></thead>
          <tbody>{data.authors.map((author, index) => <tr key={index}>
            <td>{author.full_name ?? 'Sans nom'}</td><td>{author.total}</td><td>{author.published}</td>
          </tr>)}</tbody>
        </table>
      </section>
      <section className="v2-dashboard-panel" aria-labelledby="countries-title">
        <header><div><h2 id="countries-title">Articles par pays</h2></div></header>
        <ul>{data.countries.map((country) => <li key={country.country_code}>
          {country.country_code} — {country.n} articles
        </li>)}</ul>
      </section>
    </div>

    <section className="v2-dashboard-panel" aria-labelledby="audit-title">
      <header><div><h2 id="audit-title">Journal d'activité</h2><p>Dernières actions éditoriales.</p></div>
        <ScrollText size={21}/></header>
      <table className="v2-table">
        <thead><tr><th>Action</th><th>Acteur</th><th>Date</th></tr></thead>
        <tbody>{data.audit.map((entry) => <tr key={entry.id}>
          <td>{entry.action}</td><td>{entry.actor_email ?? 'Automatisation'}</td>
          <td>{entry.created_at ?? '—'}</td>
        </tr>)}</tbody>
      </table>
    </section>
  </div>;
}
