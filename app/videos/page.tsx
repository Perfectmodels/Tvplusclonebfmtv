import Breadcrumb from '../../components/Breadcrumb';
import { AvPageHeader } from '../../components/AvCatalog';
import VideoFeed, { type FeedItem } from '../../components/video/VideoFeed';
import { listCatalog } from '../../lib/media/catalog';
import { getEpisodes } from '../../lib/db/repository';

export const revalidate = 120;
export const metadata = { title: 'Espace vidéo — TV+ Afrique', alternates: { canonical: '/videos' } };

export default async function VideosPage() {
  const [reels, reports, episodes, podcasts] = await Promise.all([
    listCatalog('reel', 24, 1).catch(() => ({ items: [] })),
    listCatalog('reportage', 24, 1).catch(() => ({ items: [] })),
    getEpisodes(24).catch(() => ({ data: [] })),
    listCatalog('podcast', 12, 1).catch(() => ({ items: [] })),
  ]);

  const feed: FeedItem[] = [
    ...reels.items.map(item => ({
      id: item.id,
      title: item.title,
      source: item.source_url,
      cover: item.thumbnail_url,
      kind: 'reel' as const,
      category: 'TV+ Reels',
      href: '/media/' + item.id,
    })),
    ...episodes.data.filter(episode => Boolean(episode.videoUrl)).map(episode => ({
      id: episode.id,
      title: episode.title,
      source: episode.videoUrl,
      cover: episode.thumbnail ?? '',
      kind: 'replay' as const,
      category: 'Replay',
      href: '/replays/' + episode.id,
    })),
    ...reports.items.map(item => ({
      id: item.id,
      title: item.title,
      source: item.source_url,
      cover: item.thumbnail_url,
      kind: 'reportage' as const,
      category: item.category || 'Reportage',
      href: '/media/' + item.id,
    })),
    ...podcasts.items.map(item => ({
      id: item.id,
      title: item.title,
      source: item.source_url,
      cover: item.thumbnail_url,
      kind: 'podcast' as const,
      category: item.category || 'Podcast',
      href: '/media/' + item.id,
    })),
  ].filter(item => Boolean(item.source));

  return (
    <main className="shell listing-page av-public">
      <Breadcrumb items={[{ label: 'Accueil', href: '/' }, { label: 'Espace vidéo' }]} />
      <AvPageHeader current="/videos" title="Espace vidéo" description="Le fil de toutes les vidéos TV+ Afrique : reels, replays, reportages et podcasts." />
      <VideoFeed items={feed} />
    </main>
  );
}
