import Breadcrumb from '../../components/Breadcrumb';
import MediaBrowser from '../../components/MediaBrowser';
import { getPodcasts } from '../../lib/db/repository';
import { isPlayableAudioUrl } from '../../lib/media/urls';

export const revalidate = 60;

export default async function PodcastsPage() {
  const { data: podcasts } = await getPodcasts();
  const items = podcasts.filter((p) => isPlayableAudioUrl(p.href)).map((p) => ({
    id: p.id,
    title: p.title,
    category: p.category,
    image: p.image,
    meta: p.duration,
    description: p.description,
    href: p.href,
  }));

  return (
    <main className="shell listing-page">
      <Breadcrumb items={[{ label: 'Accueil', href: '/' }, { label: 'Podcasts' }]} />
      <h1 className="page-title">Podcasts</h1>
      <p className="page-intro">
        Écoutez nos podcasts quand vous le souhaitez : décryptages, récits, entretiens et analyses.
      </p>
      <div className="section-head has-rule"><h2>Tous les podcasts</h2></div>
      <MediaBrowser items={items} variant="audio" pageSize={8} />
    </main>
  );
}
