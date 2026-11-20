import Breadcrumb from '../../components/Breadcrumb';
import SearchClient from '../../components/SearchClient';

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;

  return (
    <main className="shell listing-page">
      <Breadcrumb items={[{ label: 'Accueil', href: '/' }, { label: 'Recherche' }]} />
      <h1 className="page-title">Recherche</h1>
      <p className="page-intro">
        Cherchez parmi les articles, vidéos, émissions et podcasts publiés sur TV Plus.
      </p>
      <SearchClient initialQuery={q ?? ''} />
    </main>
  );
}
