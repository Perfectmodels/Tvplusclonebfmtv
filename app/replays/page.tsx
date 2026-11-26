import {AvPageHeader} from '../../components/AvCatalog';
import Link from 'next/link';
import Breadcrumb from '../../components/Breadcrumb';
import ReplayCatalog from '../../components/video/ReplayCatalog';
import { getPrograms } from '../../lib/db/repository';

export const revalidate = 60;

export default async function ReplaysPage({
  searchParams,
}: {
  searchParams: Promise<{ emission?: string | string[]; page?: string | string[] }>;
}) {
  const [{ emission, page }, { data: programs }] = await Promise.all([
    searchParams,
    getPrograms().catch((error: unknown) => {
      console.error('Chargement des émissions de replay', error);
      return { data: [] };
    }),
  ]);
  const show = programs.find((program) => program.slug === emission);

  return (
    <main className="shell listing-page av-public">
      <Breadcrumb items={[{ label: 'Accueil', href: '/' }, { label: 'Replays' }]} />
      <AvPageHeader current="/replays" title="Replays" description="Retrouvez les émissions de TV+ Afrique à la demande." />
      <div className="replay-controls">
        {programs.length > 0 && (
          <form action="/replays" className="replay-filter">
            <label htmlFor="replay-show">Émission</label>
            <select id="replay-show" name="emission" className="filter-chip" defaultValue={show?.slug ?? ''}>
              <option value="">Toutes</option>
              {programs.filter((program) => program.slug).map((program) => (
                <option key={program.id} value={program.slug}>{program.name}</option>
              ))}
            </select>
            <button type="submit" className="filter-chip">Filtrer</button>
          </form>
        )}
        <Link href="/replay-emissions" className="direct-cta">Voir toutes les émissions</Link>
      </div>
      <ReplayCatalog programs={programs} show={show} page={page} path="/replays" filter={show?.slug} />
    </main>
  );
}
