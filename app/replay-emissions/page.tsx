import Link from 'next/link';
import Breadcrumb from '../../components/Breadcrumb';
import MediaBrowser from '../../components/MediaBrowser';
import Newsletter from '../../components/Newsletter';
import { getPrograms } from '../../lib/db/repository';

export const revalidate = 60;

export default async function ReplayPage() {
  const { data: programs, error } = await getPrograms();
  const items = programs.map((p) => ({
    id: p.id,
    title: p.name,
    category: p.category,
    image: p.image,
    meta: p.slot,
    description: [p.host,p.description].filter(Boolean).join(' · '),
    href: p.slug ? `/emissions/${p.slug}` : undefined,
  }));

  return (
    <main className="shell listing-page">
      <Breadcrumb items={[{ label: 'Accueil', href: '/' }, { label: 'Émissions & replays' }]} />
      <h1 className="page-title">Émissions & replays</h1>
      <p className="page-intro">
        Retrouvez vos émissions préférées en replay : information, décryptage, sport, culture et entretiens.
      </p>
      <p className="program-replay-cta"><Link href="/replays" className="direct-cta">Voir tous les épisodes disponibles</Link></p>
      <div className="section-head has-rule"><h2>Toutes les émissions</h2></div>
      {error ? <p className="empty-state">{error}</p> : <MediaBrowser items={items} variant="program" pageSize={8} />}
      <Newsletter
        title="Ne manquez plus une émission"
        description="Recevez chaque semaine la sélection des replays à ne pas rater."
        label="S’inscrire"
      />
    </main>
  );
}
