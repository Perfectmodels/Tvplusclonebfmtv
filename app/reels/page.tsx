import Breadcrumb from '../../components/Breadcrumb';
import { AvCard, AvPageHeader, AvPagination } from '../../components/AvCatalog';
import { listCatalog } from '../../lib/media/catalog';

export const revalidate = 120;
export const metadata = {
  title: 'TV+ Reels — Les vidéos courtes de TV+ Afrique',
  alternates: { canonical: '/reels' },
};

export default async function Reels({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const page = Math.max(1, Math.min(10000, Math.floor(Number((await searchParams).page) || 1)));
  const size = 20;
  const data = await listCatalog('reel', size, page);

  return (
    <main className="shell listing-page av-public">
      <Breadcrumb items={[{ label: 'Accueil', href: '/' }, { label: 'Reels' }]} />
      <AvPageHeader current="/reels" title="TV+ Reels" description="Vidéos courtes de TV+ Afrique." />
      {!data.available && <p role="alert">Les Reels sont momentanément indisponibles.</p>}
      {data.available && !data.items.length && <p className="empty-state">Aucun Reel publié sur cette page.</p>}
      {data.items.length > 0 && (
        <section className="av-section" aria-label="Reels publiés">
          <div className="av-grid av-reel-grid">{data.items.map(item => <AvCard key={item.id} item={item} />)}</div>
        </section>
      )}
      <AvPagination path="/reels" page={page} total={data.total} size={size} />
    </main>
  );
}
