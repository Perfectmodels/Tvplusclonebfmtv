import Breadcrumb from '../../components/Breadcrumb';
import StoryCard from '../../components/StoryCard';
import { listArticles } from '../../lib/db/repository';

export const revalidate = 60;

export default async function LatestArticlesPage() {
  const { items, total } = await listArticles({ page: 1, pageSize: 60 });

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
    </main>
  );
}
