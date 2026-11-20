import Link from 'next/link';
import { CheckCircle2, FileText, Clock3, Send, Archive, FolderTree, Plus, RefreshCw } from 'lucide-react';
import { getDashboardStats } from '../../lib/db/repository';

export const dynamic = 'force-dynamic';

const STATUS_LABELS: Record<string, string> = {
  published: 'Publié', draft: 'Brouillon', review: 'À valider', needs_correction: 'À corriger',
  validated: 'Validé', scheduled: 'Programmé', archived: 'Archivé',
};

export default async function AdminDashboard() {
  const stats = await getDashboardStats();

  const cards = [
    { label: 'Articles publiés', value: stats.published, icon: CheckCircle2, tone: 'ok' },
    { label: 'Brouillons', value: stats.drafts, icon: FileText, tone: 'blue' },
    { label: 'À valider', value: stats.review, icon: Clock3, tone: 'warn' },
    { label: 'Programmés', value: stats.scheduled, icon: Send, tone: 'blue' },
    { label: 'Archivés', value: stats.archived, icon: Archive, tone: 'muted' },
    { label: 'Rubriques', value: stats.categories, icon: FolderTree, tone: 'blue' },
  ];

  return (
    <div className="admin-page">
      <div className="admin-page-head">
        <div>
          <h2>Bonjour, bienvenue sur TV+ Admin</h2>
          <p>Vue d’ensemble de la rédaction et accès rapide aux actions principales.</p>
        </div>
        <div className="admin-page-actions">
          <Link href="/admin/articles" className="admin-btn admin-btn-ghost"><RefreshCw size={15} /> Gérer les articles</Link>
          <Link href="/admin/articles/new" className="admin-btn admin-btn-primary"><Plus size={15} /> Nouvel article</Link>
        </div>
      </div>

      <div className="admin-stat-grid">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div className={'admin-stat-card tone-' + card.tone} key={card.label}>
              <span className="admin-stat-icon"><Icon size={18} /></span>
              <strong>{card.value}</strong>
              <span>{card.label}</span>
            </div>
          );
        })}
      </div>

      <section className="admin-section">
        <div className="admin-section-head">
          <h3>Activité éditoriale récente</h3>
          <Link href="/admin/articles" className="admin-link">Voir tous les articles</Link>
        </div>
        {stats.recent.length ? (
          <div className="admin-table-scroll">
            <table className="admin-table">
              <thead><tr><th>Titre</th><th>Rubrique</th><th>Statut</th><th>Date</th></tr></thead>
              <tbody>
                {stats.recent.map((item) => (
                  <tr key={item.id}>
                    <td data-label="Titre">{item.title}</td>
                    <td data-label="Rubrique">{item.category}</td>
                    <td data-label="Statut"><span className={'admin-badge status-' + item.status}>{STATUS_LABELS[item.status] ?? item.status}</span></td>
                    <td data-label="Date">{new Date(item.date).toLocaleDateString('fr-FR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="admin-empty">Aucune activité récente.</div>
        )}
      </section>
    </div>
  );
}
