import Link from 'next/link';
import { notFound } from 'next/navigation';
import Breadcrumb from '../../../components/Breadcrumb';
import ReplayEmbed from '../../../components/video/ReplayEmbed';
import { getPrograms, getEpisodes } from '../../../lib/db/repository';

export const revalidate = 60;

export default async function EmissionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [{ data: programs }, { data: allEpisodes }] = await Promise.all([
    getPrograms(), getEpisodes(100),
  ]);
  const program = programs.find((item) => item.slug === slug);
  if (!program) notFound();
  const episodes = allEpisodes.filter((item) => item.programId === program.id);

  return (
    <main className="shell listing-page">
      <Breadcrumb items={[
        { label: 'Accueil', href: '/' },
        { label: 'Émissions', href: '/replay-emissions' },
        { label: program.name },
      ]} />
      <div className="editorial-page-intro">
        <span className="editorial-eyebrow">LES ÉMISSIONS TV+ AFRIQUE</span>
        <h1 className="page-title">{program.name}</h1>
        {program.description && <p className="page-intro">{program.description}</p>}
        <div className="program-detail-meta">
          {program.host && <span>Présentation : {program.host}</span>}
          {program.slot && <span>Programmation : {program.slot}</span>}
        </div>
      </div>
      <section className="editorial-section" aria-label="Épisodes de l'émission">
        <div className="section-head has-rule"><h2>Les épisodes</h2></div>
        {episodes.length ? (
          <div className="media-grid">
            {episodes.map((episode) => (
              <article key={episode.id} className="media-card">
                <ReplayEmbed title={episode.title} url={episode.videoUrl} thumbnail={episode.thumbnail}/>
                <span className="media-body">
                  <span className="media-meta">{new Date(episode.publishedAt).toLocaleDateString('fr-FR')}</span>
                  <strong className="media-title">{episode.title}</strong>
                  {episode.description && <span className="media-description">{episode.description}</span>}

                </span>
              </article>
            ))}
          </div>
        ) : <p className="empty-state">Aucun épisode publié pour cette émission pour le moment.</p>}
      </section>
      <p><Link href="/replay-emissions" className="direct-cta">Toutes les émissions TV+</Link></p>
    </main>
  );
}
