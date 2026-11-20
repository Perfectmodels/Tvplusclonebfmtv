import Link from 'next/link';
import { ChevronRight, Play } from 'lucide-react';
import Breadcrumb from '../../components/Breadcrumb';
import StoryCard from '../../components/StoryCard';
import TvPlusLogo from '../../components/TvPlusLogo';
import { getTvSchedule, listArticles } from '../../lib/db/repository';

export const revalidate = 60;

export default async function DirectPage() {
  const [{ data: schedule }, { items: stories }] = await Promise.all([
    getTvSchedule(),
    listArticles({ pageSize: 4 }),
  ]);

  return (
    <main className="shell direct-page">
      <Breadcrumb items={[{ label: 'Accueil', href: '/' }, { label: 'Le direct' }]} />
      <div className="editorial-page-intro">
        <span className="editorial-eyebrow"><span className="direct-dot" /> TV+ AFRIQUE · EN DIRECT</span>
        <h1 className="page-title">Regardez TV+ Afrique</h1>
        <p className="page-intro">L'information, les émissions et les grands rendez-vous de TV+ Afrique, sur tous vos écrans.</p>
      </div>

      <div className="direct-main-player">
        <button type="button" className="direct-player-large tvplus-video-placeholder" data-open-live aria-label="Ouvrir le lecteur du direct TV Plus Afrique">
          <TvPlusLogo />
          <span className="direct-player-badge"><span /> Le direct</span>
          <span className="play-button"><Play size={32} fill="currentColor" /></span>
          <span className="video-placeholder-caption">Regarder le direct TV+</span>
        </button>
        <div className="direct-schedule">
          <h2>Programme TV+</h2>
          <p className="direct-schedule-intro">Les prochains rendez-vous de l'antenne.</p>
          {schedule.length ? (
            <ul>
              {schedule.slice(0, 5).map((slot) => (
                <li key={slot.time + slot.title}><strong>{slot.time}</strong><span>{slot.title}</span></li>
              ))}
            </ul>
          ) : <p className="empty-state">La grille des programmes n'est pas encore disponible.</p>}
          <Link href="/programme-tv" className="direct-cta">
            Consulter la grille complète <ChevronRight size={16} />
          </Link>
          <p className="photo-credit">Programmation susceptible d'être modifiée par la rédaction.</p>
        </div>
      </div>

      {stories.length > 0 && (
        <section className="editorial-section" aria-label="L'actualité à suivre">
          <div className="section-head has-rule"><h2>L'actualité à suivre</h2></div>
          <div className="selection-grid">
            {stories.map((story) => <StoryCard key={story.slug} story={story} />)}
          </div>
        </section>
      )}
    </main>
  );
}
