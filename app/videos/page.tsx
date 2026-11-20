import Breadcrumb from '../../components/Breadcrumb';
import LivePlayer from '../../components/LivePlayer';
import MediaBrowser from '../../components/MediaBrowser';
import { getVideos } from '../../lib/db/repository';
import { isPlayableVideoUrl } from '../../lib/media/urls';

export const revalidate = 60;

export default async function VideosPage() {
  const { data: videos } = await getVideos();
  const items = videos.filter((v) => isPlayableVideoUrl(v.href)).map((v) => ({
    id: v.id,
    title: v.title,
    category: v.category,
    image: v.image,
    meta: v.duration,
    description: v.description,
    href: v.href,
  }));

  return (
    <main className="shell listing-page">
      <Breadcrumb items={[{ label: 'Accueil', href: '/' }, { label: 'Vidéos' }]} />
      <h1 className="page-title">Vidéos</h1>
      <p className="page-intro">
        Reportages, décryptages et extraits d’antenne : retrouvez toutes les vidéos de la rédaction TV Plus.
      </p>
      <LivePlayer
        compact
        title="L'antenne TV+ Afrique"
        description="Retrouvez les reportages, éditions et émissions depuis le direct de TV+ Afrique."
      />
      <div className="section-head has-rule"><h2>Toutes les vidéos</h2></div>
      <MediaBrowser items={items} variant="video" />
    </main>
  );
}
