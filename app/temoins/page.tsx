import Breadcrumb from '../../components/Breadcrumb';
import { getTestimonials } from '../../lib/db/repository';

export const revalidate = 60;

export default async function TemoinsPage() {
  const { data: witnesses } = await getTestimonials();

  return (
    <main className="shell listing-page">
      <Breadcrumb items={[{ label: 'Accueil', href: '/' }, { label: 'Témoins' }]} />
      <h1 className="page-title">Témoins</h1>
      <p className="page-intro">
        Des femmes et des hommes racontent l’actualité telle qu’ils la vivent, partout au Gabon.
      </p>
      {witnesses.length ? (
        <div className="witness-grid">
          {witnesses.map((w) => (
            <article className="witness-card" key={w.id}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={w.image} alt="" loading="lazy" />
              <div className="witness-body">
                <span className="category-label">{w.place}</span>
                <h2>{w.title}</h2>
                <span className="card-time">Témoignage recueilli par la rédaction</span>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="empty-state">Aucun témoignage publié pour le moment.</p>
      )}
    </main>
  );
}
