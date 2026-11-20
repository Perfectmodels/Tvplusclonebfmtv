import Link from 'next/link';
import Breadcrumb from '../../components/Breadcrumb';
import QuestionSection from '../../components/QuestionSection';
import { getEpisodes } from '../../lib/db/repository';

export const revalidate = 60;

export default async function ReplaysPage() {
  const { data: episodes } = await getEpisodes(24);

  return (
    <main className="shell listing-page">
      <Breadcrumb items={[{ label: 'Accueil', href: '/' }, { label: 'Replays' }]} />
      <h1 className="page-title">Replays</h1>
      <p className="page-intro">
        Retrouvez les émissions et les reportages déjà diffusés sur TV Plus Afrique.
      </p>

      {episodes.length ? (
        <div className="media-grid">
          {episodes.map((episode) => (
            <article className="media-card" key={episode.id}>
              <span className="media-image">
                {episode.thumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={episode.thumbnail} alt="" loading="lazy" />
                ) : null}
                <span className="media-duration">{episode.duration}</span>
              </span>
              <span className="media-body">
                <span className="media-meta">REPLAY · {new Date(episode.publishedAt).toLocaleDateString('fr-FR')}</span>
                <span className="media-title">{episode.title}</span>
                {episode.description && <span className="media-description">{episode.description}</span>}
                {episode.videoUrl && (
                  <a className="admin-link" href={episode.videoUrl} target="_blank" rel="noopener noreferrer">Regarder</a>
                )}
              </span>
            </article>
          ))}
        </div>
      ) : (
        <p className="empty-state">Aucun replay disponible pour le moment.</p>
      )}

      <div className="section-head has-rule"><h2>Une question ?</h2></div>
      <QuestionSection />
      <p className="photo-credit"><Link href="/replay-emissions">Voir toutes les émissions →</Link></p>
    </main>
  );
}
