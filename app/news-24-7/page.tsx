import AlertBar from '../../components/AlertBar';
import Breadcrumb from '../../components/Breadcrumb';
import FilActuFeed from '../../components/FilActuFeed';
import { getFilActu, getCategories, listArticles } from '../../lib/db/repository';
import { getNewsFeed } from '../../lib/rss/news';

export const revalidate = 60;

export default async function FilInfoPage() {
  const results = await Promise.allSettled([
    getFilActu(20), getNewsFeed(20), getCategories(), listArticles({ pageSize: 30 }),
  ]);
  const feed = results[0].status === 'fulfilled' ? results[0].value.data : [];
  const wire = results[1].status === 'fulfilled' ? results[1].value.items : [];
  const categories = results[2].status === 'fulfilled' ? results[2].value.data : [];
  const allArticles = results[3].status === 'fulfilled' ? results[3].value.items : [];
  const alert = allArticles.find((story) => story.kind === 'alert');
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
      {alert && <AlertBar title={alert.title} href={alert.shortId ? `/a/${alert.shortId}` : `/article/${alert.slug}`} time={alert.time} />}
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
        {wire.length === 0 && <p className="empty-state">Le fil RSS est temporairement indisponible. Les autres rubriques restent accessibles.</p>}
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
