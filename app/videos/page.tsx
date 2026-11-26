import Breadcrumb from '../../components/Breadcrumb';
import { AvCard, AvPageHeader, AvPagination } from '../../components/AvCatalog';
import { listCatalog } from '../../lib/media/catalog';

export const revalidate = 120;
export const metadata = { title: 'Reportages et vidéos — TV+ Afrique', alternates: { canonical: '/videos' } };

export default async function VideosPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const page = Math.max(1, Math.min(10000, Math.floor(Number((await searchParams).page) || 1)));
  const size = 24;
  const data = await listCatalog('reportage', size, page);

  return (
    <main className="shell listing-page av-public">
      <Breadcrumb items={[{ label: 'Accueil', href: '/' }, { label: 'Reportages' }]} />
      <AvPageHeader current="/videos" title="Reportages & vidéos" description="Reportages, interviews et décryptages de la rédaction TV+ Afrique." />
      {!data.available && <p role="alert">Les reportages sont momentanément indisponibles.</p>}
      {data.available && !data.items.length && <p className="empty-state">Aucun reportage publié sur cette page.</p>}
      {data.items.length > 0 && (
        <section className="av-section" aria-label="Reportages publiés">
          <div className="av-grid av-report-grid">{data.items.map(item => <AvCard key={item.id} item={item} />)}</div>
        </section>
      )}
      <AvPagination path="/videos" page={page} total={data.total} size={size} />
    </main>
  );
}
