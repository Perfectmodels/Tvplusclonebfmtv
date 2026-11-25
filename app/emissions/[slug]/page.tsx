import Link from 'next/link';
import { notFound } from 'next/navigation';
import Breadcrumb from '../../../components/Breadcrumb';
import ShowIntro from '../../../components/video/ShowIntro';
import MediaBrowser from '../../../components/MediaBrowser';
import { getPrograms, getEpisodes } from '../../../lib/db/repository';

export const revalidate = 60;

export default async function EmissionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [{ data: programs }, { data: allEpisodes }] = await Promise.all([
    getPrograms(), getEpisodes(500),
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
      <ShowIntro title={program.name} url={program.introVideoUrl} poster={program.image}/>
      <section className="editorial-section" aria-label="Épisodes de l'émission">
        <div className="section-head has-rule"><h2>Les épisodes</h2></div>
        {episodes.length ? (
          <MediaBrowser variant="video" pageSize={12} items={episodes.map(episode=>({id:episode.id,title:episode.title,category:program.name,image:episode.thumbnail||'/logo.png',meta:new Date(episode.publishedAt).toLocaleDateString('fr-FR',{timeZone:'Africa/Libreville'}),description:episode.legacyPage?'Archive TV+ Afrique':episode.description,href:'/replays/'+encodeURIComponent(episode.id)}))}/>
        ) : <p className="empty-state">Aucun épisode publié pour cette émission pour le moment.</p>}
      </section>
      <p><Link href="/replay-emissions" className="direct-cta">Toutes les émissions TV+</Link></p>
    </main>
  );
}
