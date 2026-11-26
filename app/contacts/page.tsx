import Breadcrumb from '../../components/Breadcrumb';
import ContactForm from '../../components/ContactForm';

export default function ContactsPage() {
  return (
    <main className="shell listing-page">
      <Breadcrumb items={[{ label: 'Accueil', href: '/' }, { label: 'Contact' }]} />
      <h1 className="page-title">Contact</h1>
      <p className="page-intro">
        Une information, une question ou un signalement ? Écrivez à la rédaction via le formulaire
        ci-dessous.
      </p>
      <ContactForm />
    </main>
  );
}
