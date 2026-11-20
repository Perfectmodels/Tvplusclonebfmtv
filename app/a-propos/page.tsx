import Breadcrumb from '../../components/Breadcrumb';

export default function AProposPage() {
  return (
    <main className="shell listing-page">
      <Breadcrumb items={[{ label: 'Accueil', href: '/' }, { label: 'À propos' }]} />
      <h1 className="page-title">À propos de TV Plus</h1>
      <p className="page-intro">
        TV Plus est une plateforme d’information en continu dédiée au Gabon et à l’Afrique.
        Elle propose actualités, reportages, émissions, vidéos et directs.
      </p>
      <div className="prose-block">
        <h2>Une rédaction centralisée</h2>
        <p>
          La rédaction de TV Plus suit l’actualité des neuf provinces gabonaises à travers ses
          rubriques thématiques. Les reportages couvrent l’ensemble du territoire sans impliquer
          d’antennes régionales ou de bureaux physiques locaux.
        </p>
        <h2>Ce que nous publions</h2>
        <p>
          Des articles d’information, des décryptages, des entretiens, des émissions en replay,
          des podcasts et un flux d’actualité continue « News 24/7 » alimenté par plusieurs sources
          d’information. Les sources du flux ne sont pas affichées dans le bandeau éditorial.
        </p>
        <h2>Indépendance éditoriale</h2>
        <p>
          Le traitement de l’information repose sur le recoupement des faits et la séparation
          entre les contenus éditoriaux et les contenus de partenaires. Cette maquette est un
          projet de démonstration indépendant, sans lien avec BFMTV.
        </p>
      </div>
    </main>
  );
}
