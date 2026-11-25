import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ArticlePagination from '../../components/ArticlePagination';
import { getSiteUrl } from '../../lib/articles/site-url';
import Breadcrumb from '../../components/Breadcrumb';
import StoryCard from '../../components/StoryCard';
import { listArticles } from '../../lib/db/repository';

export const revalidate = 60;

const pageSize = 24;
type Props = { searchParams: Promise<{ page?: string }> };

function pageNumber(value?: string) {
  if (!value || !/^[1-9]\d{0,4}$/.test(value)) return 1;
  return Number(value);
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const page = pageNumber((await searchParams).page);
  return {
    title: page > 1 ? `Dernières actualités · Page ${page} — TV+ Afrique` : 'Dernières actualités — TV+ Afrique',
    alternates: { canonical: (await getSiteUrl()) + '/actualites' + (page > 1 ? '?page=' + page : '') },
  };
}

export default async function LatestArticlesPage({ searchParams }: Props) {
  const page = pageNumber((await searchParams).page);
  const { items, total } = await listArticles({ page, pageSize });
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (page > totalPages) notFound();

  return (
    <main className="shell listing-page">
      <Breadcrumb items={[
        { label: 'Accueil', href: '/' },
        { label: 'Dernières actualités' },
      ]} />
      <h1 className="page-title">Dernières actualités</h1>
      <p className="page-intro">
        Les articles publiés par la rédaction de TV+ Afrique, classés des plus récents aux plus anciens.
        {total > 0 && ` ${total.toLocaleString('fr-FR')} articles disponibles.`}
      </p>
      {items.length > 0
        ? <section className="selection-grid" aria-label="Articles récemment publiés">
            {items.map(story => (
              <StoryCard key={story.shortId || story.slug} story={story} />
            ))}
          </section>
        : <p className="empty-state">Aucun article publié pour le moment.</p>}
      <ArticlePagination path="/actualites" page={page} totalPages={totalPages} />
    </main>
  );
}
