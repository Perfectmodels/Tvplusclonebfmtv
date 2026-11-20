import Breadcrumb from '../../components/Breadcrumb';

export default function DonneesPersonnellesPage() {
  return (
    <main className="shell listing-page">
      <Breadcrumb items={[{ label: 'Accueil', href: '/' }, { label: 'Données personnelles' }]} />
      <h1 className="page-title">Données personnelles</h1>
      <div className="prose-block">
        <h2>Données collectées</h2>
        <p>
          Les formulaires de contact et d’inscription aux newsletters collectent uniquement les
          informations nécessaires à leur traitement : nom, adresse e-mail, objet et message.
        </p>
        <h2>Finalités</h2>
        <p>
          Ces données servent à répondre aux messages transmis et à envoyer les newsletters
          demandées. Elles ne sont pas utilisées à d’autres fins et ne sont pas revendues.
        </p>
        <h2>Conservation</h2>
        <p>
          Les données sont conservées dans la base Supabase du projet pendant la durée nécessaire
          au traitement, puis supprimées ou anonymisées.
        </p>
        <h2>Vos droits</h2>
        <p>
          Vous pouvez demander l’accès, la rectification ou la suppression de vos données via la
          page contact. Le navigateur stocke uniquement les préférences locales de recherche
          lorsque cette fonctionnalité est activée.
        </p>
      </div>
    </main>
  );
}
