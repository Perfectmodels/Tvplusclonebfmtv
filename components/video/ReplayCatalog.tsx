import Link from 'next/link';
import MediaBrowser from '../MediaBrowser';
import { getEpisodes } from '../../lib/db/repository';
import type { Program } from '../../lib/extra';
import { parseVideoUrl } from '../../lib/video/providers';

const pageSize = 12;

export default async function ReplayCatalog({
  programs,
  show,
  page: requestedPage,
  path,
  filter,
}: {
  programs: Program[];
  show?: Program;
  page?: string | string[];
  path: string;
  filter?: string;
}) {
  const parsedPage = Number(requestedPage);
  const page = typeof requestedPage === 'string' && /^[1-9]\d{0,7}$/.test(requestedPage) ? parsedPage : 1;
  const result = await getEpisodes(pageSize + 1, show?.id, (page - 1) * pageSize).catch((error: unknown) => {
    console.error('Chargement du catalogue des replays', error);
    return null;
  });

  if (!result || result.error) {
    return <p className="empty-state">Les replays sont temporairement indisponibles. Réessayez dans quelques instants.</p>;
  }

  const programsById = new Map(programs.map((program) => [program.id, program]));
  const items = result.data.slice(0, pageSize).map((episode) => {
    const program = episode.programId ? programsById.get(episode.programId) : undefined;
    return {
      id: episode.id,
      title: episode.title,
      category: program?.name ?? 'Replay',
      image: episode.thumbnail || program?.image || '/logo.png',
      meta: new Date(episode.publishedAt).toLocaleDateString('fr-FR', { timeZone: 'Africa/Libreville' }),
      description: episode.legacyPage ? 'Archive TV+ Afrique' : episode.description,
      href: '/replays/' + encodeURIComponent(episode.id),
      playable: Boolean(parseVideoUrl(episode.videoUrl)),
    };
  });

  function pageHref(target: number) {
    const params = new URLSearchParams();
    if (filter) params.set('emission', filter);
    if (target > 1) params.set('page', String(target));
    return params.size ? path + '?' + params.toString() : path;
  }

  return (
    <>
      {items.length > 0 ? (
        <MediaBrowser items={items} variant="video" pageSize={pageSize} showFilters={false} />
      ) : (
        <p className="empty-state">
          {page > 1 ? 'Aucun épisode sur cette page.' : 'Aucun replay disponible pour le moment.'}
        </p>
      )}
      {(page > 1 || result.data.length > pageSize) && (
        <nav className="filter-bar replay-pagination" aria-label="Pages des replays">
          {page > 1 && <Link className="filter-chip" href={pageHref(items.length ? page - 1 : 1)}>{items.length ? 'Page précédente' : 'Première page'}</Link>}
          <span aria-current="page">Page {page}</span>
          {result.data.length > pageSize && <Link className="filter-chip" href={pageHref(page + 1)}>Page suivante</Link>}
        </nav>
      )}
    </>
  );
}
