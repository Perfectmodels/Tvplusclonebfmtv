import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import AlertBar from '../components/AlertBar';
import LivePlayer from '../components/LivePlayer';
import Newsletter from '../components/Newsletter';
import QuestionSection from '../components/QuestionSection';
import FilActuFeed from '../components/FilActuFeed';
import NewsTicker from '../components/NewsTicker';
import AdvertisingCarousel from '../components/AdvertisingCarousel';
import SectionHeading from '../components/SectionHeading';
import StoryCard from '../components/StoryCard';
import { listArticles, getFilActu, getCategories } from '../lib/db/repository';
import { articlePath } from '../lib/articles/urls';
import { categoryHref, categorySlug } from '../lib/categories';
import { getNewsFeed } from '../lib/rss/news';

export const revalidate = 60;

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  // Les erreurs d'un service n'empêchent pas les autres blocs de s'afficher.
  // La recherche n'a pas besoin des flux RSS ni de charger la navigation des rubriques.
  const results = await Promise.allSettled([
    listArticles({ search: q, pageSize: 30 }),
    q ? Promise.resolve({ data: [] }) : getFilActu(8),
    q ? Promise.resolve({ items: [] }) : getNewsFeed(20),
    q ? Promise.resolve({ data: [] }) : getCategories(),
  ]);
  const filtered = results[0].status === 'fulfilled' ? results[0].value.items : [];
  const feed = results[1].status === 'fulfilled' ? results[1].value.data : [];
  const wire = results[2].status === 'fulfilled' ? results[2].value.items : [];
  const categories = results[3].status === 'fulfilled' ? results[3].value.data : [];

  const alert = filtered.find((story) => story.kind === 'alert');
  const hero = filtered.find((story) => story.featured) ?? filtered[0];
  const remainder = filtered.filter((story) => story.slug !== hero?.slug);
  const rail = remainder.slice(0, 3);
  const selection = remainder.slice(3, 11);
  const blocks = categories
    .map((name) => ({
      name,
      items: filtered.filter((story) => categorySlug(story.category) === categorySlug(name)).slice(0, 4),
    }))
    .filter((block) => block.items.length > 0)
    .slice(0, 6);

  return (
    <>
      {!q && alert && (
        <AlertBar title={alert.title} href={articlePath(alert)} time={alert.time} />
      )}

      <main className="shell">
        {q ? (
          <section className="search-results">
            <SectionHeading title={`Résultats pour « ${q} »`} />
            {filtered.length > 0 ? (
              <div className="selection-grid">
                {filtered.map((story) => <StoryCard key={story.slug} story={story} />)}
              </div>
            ) : (
              <p className="empty-state">Aucune actualité ne correspond à votre recherche.</p>
            )}
          </section>
        ) : (
          <>
            <section className="hero-layout" aria-label="À la une">
              <div className="hero-main">
                {hero ? <StoryCard story={hero} variant="hero" /> : (
                  <p className="empty-state">Les actualités à la une seront bientôt disponibles.</p>
                )}
              </div>
              <div className="hero-rail">
                <NewsTicker items={wire} variant="rail" limit={20} />
                {rail.map((story) => <StoryCard key={story.slug} story={story} variant="rail" />)}
              </div>
            </section>

            <AdvertisingCarousel placement="after-hero" />

            <section id="fil-info" className="home-news-feed" aria-labelledby="fil-title">
              <SectionHeading
                id="fil-title"
                title="Fil actu"
                moreHref="/news-24-7"
                moreLabel="Toute l'actualité"
              />
              <FilActuFeed items={feed} categories={categories} />
            </section>

            <AdvertisingCarousel placement="after-feed" />

            <section className="home-duo" aria-label="Direct et questions du public">
              <LivePlayer />
              <QuestionSection />
            </section>

            <AdvertisingCarousel placement="after-live" />

            {selection.length > 0 && (
              <section aria-labelledby="selection-title">
                <SectionHeading id="selection-title" title="Sélection de la rédaction" />
                <div className="selection-grid">
                  {selection.map((story) => <StoryCard key={story.slug} story={story} />)}
                </div>
              </section>
            )}

            <AdvertisingCarousel placement="after-selection" />

            <div className="home-category-stack">
              {blocks.map((block) => (
                <section className="category-block" key={block.name} aria-labelledby={'cat-' + block.name}>
                  <SectionHeading
                    id={'cat-' + block.name}
                    title={block.name}
                    moreHref={categoryHref(block.name)}
                    moreLabel={'Toute l’actu ' + block.name}
                  />
                  <div className="selection-grid">
                    {block.items.map((story) => <StoryCard key={story.slug} story={story} />)}
                  </div>
                </section>
              ))}

              <section className="category-block">
                <SectionHeading title="Toutes les rubriques" />
                <div className="rubrique-chips">
                  {categories.map((category) => (
                    <Link key={category} href={categoryHref(category)}>
                      {category}
                    </Link>
                  ))}
                </div>
              </section>
            </div>

            <AdvertisingCarousel placement="before-newsletter" />

            <Newsletter />
          </>
        )}
      </main>
    </>
  );
}
