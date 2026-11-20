import Breadcrumb from '../../components/Breadcrumb';
import NewsletterForm from '../../components/NewsletterForm';
import { getNewsletterFormats } from '../../lib/db/repository';

export const revalidate = 60;

export default async function NewslettersPage() {
  const { data: newsletters } = await getNewsletterFormats();

  return (
    <main className="shell listing-page">
      <Breadcrumb items={[{ label: 'Accueil', href: '/' }, { label: 'Newsletters' }]} />
      <h1 className="page-title">Newsletters</h1>
      <p className="page-intro">
        Choisissez les rendez-vous qui vous intéressent : l’essentiel de l’actualité livré
        directement dans votre boîte mail.
      </p>
      <div className="newsletter-list">
        {newsletters.map((n) => (
          <div className="newsletter-card" key={n.id}>
            <div className="newsletter-card-head">
              <h2>{n.name}</h2>
              <span className="newsletter-frequency">{n.frequency}</span>
            </div>
            <p>{n.description}</p>
            <NewsletterForm name={n.name} />
          </div>
        ))}
      </div>
    </main>
  );
}
