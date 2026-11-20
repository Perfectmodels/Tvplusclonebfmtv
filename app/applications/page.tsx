import Breadcrumb from '../../components/Breadcrumb';

export default function ApplicationsPage() {
  return (
    <main className="shell listing-page">
      <Breadcrumb items={[{ label: 'Accueil', href: '/' }, { label: 'Applications' }]} />
      <h1 className="page-title">Applications TV Plus</h1>
      <p className="page-intro">
        L’information en continu vous suit partout. Retrouvez les actualités, le direct et vos
        rubriques favorites depuis votre smartphone ou votre tablette.
      </p>
      <div className="newsletter-list">
        <div className="newsletter-card">
          <div className="newsletter-card-head"><h2>Application mobile</h2><span className="newsletter-frequency">iOS & Android</span></div>
          <p>
            Une interface pensée pour le mobile : fil d’actualité, alertes, directs et lecture
            confortable des articles.
          </p>
        </div>
        <div className="newsletter-card">
          <div className="newsletter-card-head"><h2>Notifications</h2><span className="newsletter-frequency">Alertes</span></div>
          <p>
            Recevez les informations urgentes et les grands titres du Gabon dès qu’ils sont
            publiés.
          </p>
        </div>
        <div className="newsletter-card">
          <div className="newsletter-card-head"><h2>Newsletters</h2><span className="newsletter-frequency">E-mail</span></div>
          <p>Le Récap Actu et nos rendez-vous thématiques dans votre boîte mail.</p>
        </div>
        <div className="newsletter-card">
          <div className="newsletter-card-head"><h2>Replays</h2><span className="newsletter-frequency">Vidéo</span></div>
          <p>Émissions et reportages disponibles à tout moment sur le site.</p>
        </div>
      </div>
    </main>
  );
}
