import Breadcrumb from '../../components/Breadcrumb';

export default function CguPage() {
  return (
    <main className="shell listing-page">
      <Breadcrumb items={[{ label: 'Accueil', href: '/' }, { label: 'CGU' }]} />
      <h1 className="page-title">Conditions générales d’utilisation</h1>
      <div className="prose-block">
        <h2>Objet</h2>
        <p>
          Les présentes conditions régissent l’utilisation de la maquette TV Plus. L’accès au site
          est libre et gratuit, à des fins d’information et de démonstration.
        </p>
        <h2>Contenus</h2>
        <p>
          Les articles, vidéos et données affichés sont fournis à titre d’exemple. Ils ne
          constituent pas une information d’actualité certifiée et ne doivent pas être utilisés
          comme source de décision.
        </p>
        <h2>Comportement attendu</h2>
        <p>
          Les utilisateurs s’engagent à ne pas perturber le fonctionnement du service, à ne pas
          tenter d’accéder aux espaces d’administration et à respecter les droits de propriété
          intellectuelle.
        </p>
        <h2>Modification</h2>
        <p>
          Les présentes conditions peuvent être adaptées à mesure que la maquette évolue. La
          version en vigueur est celle publiée sur cette page.
        </p>
      </div>
    </main>
  );
}
