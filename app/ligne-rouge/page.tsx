import Breadcrumb from '../../components/Breadcrumb';
import { AvPageHeader, AvPagination } from '../../components/AvCatalog';
import RedLineCard from '../../components/RedLineCard';
import { listRedLine } from '../../lib/media/red-line';

export const revalidate = 120;
export const metadata = { title: 'Ligne Rouge — TV+ Afrique', alternates: { canonical: '/ligne-rouge' } };

export default async function LigneRougePage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const page = Math.max(1, Math.min(10000, Math.floor(Number((await searchParams).page) || 1)));
  const size = 12;
  const result = await listRedLine(size, page).catch(() => null);

  return (
    <main className="shell listing-page av-public">
      <Breadcrumb items={[{ label: 'Accueil', href: '/' }, { label: 'Ligne Rouge' }]} />
      <AvPageHeader current="/ligne-rouge" title="Ligne Rouge" description="Les déclarations et les citations de l’actualité." />
      {result === null ? (
        <p role="alert">Le catalogue est momentanément indisponible.</p>
      ) : result.items.length ? (
        <section className="av-section" aria-label="Citations Ligne Rouge">
          <div className="redline-grid">{result.items.map(item => <RedLineCard key={item.id} item={item} />)}</div>
        </section>
      ) : (
        <p>Aucun numéro publié.</p>
      )}
      <AvPagination path="/ligne-rouge" page={page} size={size} total={result?.total ?? 0} />
    </main>
  );
}
