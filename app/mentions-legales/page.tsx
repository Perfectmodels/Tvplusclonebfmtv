import Breadcrumb from '../../components/Breadcrumb';

export default function MentionsLegalesPage() {
  return (
    <main className="shell listing-page">
      <Breadcrumb items={[{ label: 'Accueil', href: '/' }, { label: 'Mentions légales' }]} />
      <h1 className="page-title">Mentions légales</h1>
      <div className="prose-block">
        <h2>Éditeur</h2>
        <p>
          Ce site est une maquette de démonstration indépendante. Il n’est pas affilié à BFMTV
          ni à aucun groupe de télévision. Les contenus publiés proviennent de flux RSS publics et sont fournis à titre
          d’information.
        </p>
        <h2>Hébergement</h2>
        <p>
          Les données applicatives sont hébergées chez Supabase. Les images d’illustration
          proviennent de services tiers et sont utilisées à titre d’exemple.
        </p>
        <h2>Propriété intellectuelle</h2>
        <p>
          Le logo TV Plus et les éléments graphiques du site sont protégés. Toute reproduction
          non autorisée est interdite. Les titres et textes sont fournis à titre de démonstration.
        </p>
      </div>
    </main>
  );
}
