import Breadcrumb from '../../components/Breadcrumb';

const accounts = [
  { name: 'Facebook', url: 'https://www.facebook.com/', detail: 'L’actualité et les directs en direct sur votre fil.' },
  { name: 'X', url: 'https://x.com/', detail: 'Les titres et les alertes info en temps réel.' },
  { name: 'Instagram', url: 'https://www.instagram.com/', detail: 'Images et coulisses de la rédaction.' },
  { name: 'YouTube', url: 'https://www.youtube.com/', detail: 'Émissions, reportages et replays vidéo.' },
  { name: 'LinkedIn', url: 'https://www.linkedin.com/', detail: 'L’actualité économique et institutionnelle.' },
];

export default function SuivezNousPage() {
  return (
    <main className="shell listing-page">
      <Breadcrumb items={[{ label: 'Accueil', href: '/' }, { label: 'Suivez-nous' }]} />
      <h1 className="page-title">Suivez TV Plus</h1>
      <p className="page-intro">
        Retrouvez l’actualité gabonaise sur vos réseaux préférés et ne manquez aucune information
        importante.
      </p>
      <div className="service-grid">
        {accounts.map((account) => (
          <a href={account.url} className="service-card" key={account.name} target="_blank" rel="noopener noreferrer">
            <span className="service-icon" aria-hidden="true">{account.name.slice(0, 2).toUpperCase()}</span>
            <strong>{account.name}</strong>
            <span>{account.detail}</span>
          </a>
        ))}
      </div>
    </main>
  );
}
