import Breadcrumb from '../../components/Breadcrumb';
import LivePlayer from '../../components/LivePlayer';
import MediaBrowser from '../../components/MediaBrowser';
import { getVideos } from '../../lib/db/repository';

export const revalidate = 60;

export default async function VideosPage() {
  const { data: videos } = await getVideos();
  const items = videos.map((v) => ({
    id: v.id,
    title: v.title,
    category: v.category,
    image: v.image,
    meta: v.duration,
    description: v.description,
    href: v.href ?? '/direct',
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
        image="https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1200&q=80&fit=crop"
        title="Les vidéos du direct"
        description="Revivez les grands moments de l’antenne et les interventions de nos journalistes."
        now="TV Plus Non-stop"
      />
      <div className="section-head has-rule"><h2>Toutes les vidéos</h2></div>
      <MediaBrowser items={items} variant="video" />
    </main>
  );
}
