import AlertBar from '../../components/AlertBar';
import Breadcrumb from '../../components/Breadcrumb';
import FilActuFeed from '../../components/FilActuFeed';
import { getFilActu, getCategories, listArticles } from '../../lib/db/repository';
import { getNewsFeed } from '../../lib/rss/news';

export const revalidate = 60;

export default async function FilInfoPage() {
  const [{ data: feed }, { items: wire }, { data: categories }, { items: allArticles }] = await Promise.all([
    getFilActu(20), getNewsFeed(20), getCategories(), listArticles({ pageSize: 30 }),
  ]);
  const slugs = new Set(feed.map((f) => f.slug));
  const extra = allArticles
    .filter((s) => !slugs.has(s.slug))
    .slice(0, 10)
    .map((s) => ({
      time: s.time,
      category: s.category,
      title: s.title,
      summary: s.summary,
      slug: s.slug,
      shortId: s.shortId,
      image: s.image,
    }));

  return (
    <main className="shell listing-page">
      <Breadcrumb items={[{ label: 'Accueil', href: '/' }, { label: 'Fil info' }]} />
      <AlertBar
        title={feed[0]?.title ?? 'L’actualité gabonaise en continu'}
        href={feed[0] ? (feed[0].shortId ? `/a/${feed[0].shortId}` : `/article/${feed[0].slug}`) : '/news-24-7'}
        time={feed[0]?.time}
      />
      <h1 className="page-title">Fil info — News 24/7</h1>
      <p className="page-intro">
        Toute l’actualité du Gabon et du monde, minute par minute. Les informations sont publiées
        et mises à jour en continu par la rédaction TV Plus.
      </p>
      <div className="section-head has-rule">
        <h2>News 24/7 — en direct</h2>
        <span className="section-live-tag"><span /> Flux continu</span>
      </div>
      <div className="wire-grid">
        {wire.map((item) => (
          <a href={item.href} className="wire-item" key={item.id} target="_blank" rel="noopener noreferrer">
            <span className="wire-time">{item.time}</span>
            <strong>{item.title}</strong>
          </a>
        ))}
      </div>

      <div className="section-head has-rule">
        <h2>Le fil de la rédaction</h2>
      </div>
      <FilActuFeed items={[...feed, ...extra]} categories={categories} />
    </main>
  );
}
