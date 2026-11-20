import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import AlertBar from '../components/AlertBar';
import LivePlayer from '../components/LivePlayer';
import Newsletter from '../components/Newsletter';
import QuestionSection from '../components/QuestionSection';
import FilActuFeed from '../components/FilActuFeed';
import NewsTicker from '../components/NewsTicker';
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
  const [{ items: filtered }, { data: feed }, { items: wire }, { data: categories }] = await Promise.all([
    listArticles({ search: q, pageSize: 30 }),
    getFilActu(8),
    getNewsFeed(8),
    getCategories(),
  ]);

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
      {!q && (
        <AlertBar
          title={filtered[0]?.title ?? 'L’actualité gabonaise en continu'}
          href={filtered[0] ? articlePath(filtered[0]) : '/'}
          time={filtered[0]?.time}
        />
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
              <div className="hero-main">{hero && <StoryCard story={hero} variant="hero" />}</div>
              <div className="hero-rail">
                <NewsTicker items={wire} variant="rail" limit={6} />
                {rail.map((story) => <StoryCard key={story.slug} story={story} variant="rail" />)}
              </div>
            </section>

            <section className="home-duo" aria-label="Direct et questions du public">
              <LivePlayer />
              <QuestionSection />
            </section>

            <section aria-labelledby="selection-title">
              <SectionHeading id="selection-title" title="Sélection de la rédaction" arrows />
              <div className="selection-grid">
                {selection.map((story) => <StoryCard key={story.slug} story={story} />)}
              </div>
            </section>

            <section id="fil-info" aria-labelledby="fil-title">
              <SectionHeading
                id="fil-title"
                title="Fil actu"
                moreHref="/news-24-7"
                moreLabel="Toute l’actualité"
              />
              <FilActuFeed items={feed} categories={categories} />
            </section>

            <Newsletter />

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
          </>
        )}
      </main>
    </>
  );
}
