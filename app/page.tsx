import Link from 'next/link';
import AlertBar from '../components/AlertBar';
import HomeLiveDock from '../components/video/HomeLiveDock';
import Newsletter from '../components/Newsletter';
import QuestionSection from '../components/QuestionSection';
import FilActuFeed from '../components/FilActuFeed';
import NewsTicker from '../components/NewsTicker';
import AdvertisingCarousel from '../components/AdvertisingCarousel';
import { getHomepageAds } from '../lib/ads/v2';
import SectionHeading from '../components/SectionHeading';
import StoryCard from '../components/StoryCard';
import CategoryNewsCarousel from '../components/CategoryNewsCarousel';
import { listArticles, getCategories } from '../lib/db/repository';
import { distributeHomepageStories } from '../lib/editorial/home-distribution';
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
    listArticles({ search: q, pageSize: q ? 30 : 200 }),
    q ? Promise.resolve({ items: [] }) : getNewsFeed(20),
    q ? Promise.resolve({ data: [] }) : getCategories(),
    q ? Promise.resolve(null) : getHomepageAds(),
  ]);
  const filtered = results[0].status === 'fulfilled' ? results[0].value.items : [];
  const wire = results[1].status === 'fulfilled' ? results[1].value.items : [];
  const categories = results[2].status === 'fulfilled' ? results[2].value.data : [];
  const ads = results[3].status === 'fulfilled' ? results[3].value : null;

  // Allocation exclusive : un article n'apparaît qu'une fois sur l'accueil.
  const { alert, hero, rail, selection, feed, blocks } = distributeHomepageStories(filtered, categories);

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
            <section className="home-live-first" aria-labelledby="home-live-title">
              <div className="home-live-first-heading">
                <span className="home-live-first-mark">TV+ AFRIQUE · LE DIRECT</span>
                <h1 id="home-live-title">Regardez TV+ Afrique</h1>
              </div>
              <HomeLiveDock />
            </section>

            <AdvertisingCarousel placement="after-live" ads={ads?.["after-live"] ?? []} />

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

            <AdvertisingCarousel placement="after-hero" ads={ads?.["after-hero"] ?? []} />

            {selection.length > 0 && (
              <CategoryNewsCarousel
                title="Sélection de la rédaction"
                sectionId="selection-title"
                items={selection}
                moreHref="/plan-du-site"
                selection
              />
            )}

            <AdvertisingCarousel placement="after-selection" ads={ads?.["after-selection"] ?? []} />

            <section id="fil-info" className="home-news-feed" aria-labelledby="fil-title">
              <SectionHeading
                id="fil-title"
                title="Fil actu"
                moreHref="/news-24-7"
                moreLabel="Toute l'actualité"
              />
              <FilActuFeed items={feed} categories={categories} />
            </section>

            <AdvertisingCarousel placement="after-feed" ads={ads?.["after-feed"] ?? []} />

            <section className="home-question-section" aria-label="Questions du public">
              <QuestionSection />
            </section>

            <div className="home-category-stack">
              {blocks.map(block => (
                <CategoryNewsCarousel
                  key={block.name}
                  title={block.name}
                  sectionId={'cat-' + categorySlug(block.name)}
                  items={block.items}
                  moreHref={categoryHref(block.name)}
                />
              ))}

              <section className="category-block" aria-label="Toutes les rubriques">
                <SectionHeading title="Toutes les rubriques" />
                <div className="rubrique-chips">
                  {categories.map(category => (
                    <Link key={category} href={categoryHref(category)}>{category}</Link>
                  ))}
                </div>
              </section>
            </div>

            <AdvertisingCarousel placement="before-newsletter" ads={ads?.["before-newsletter"] ?? []} />

            <Newsletter />
          </>
        )}
      </main>
    </>
  );
}
