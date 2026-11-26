import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import Breadcrumb from '../../components/Breadcrumb';
import { getPracticalServices } from '../../lib/db/repository';

export const revalidate = 60;

export default async function PratiquePage() {
  const { data: available } = await getPracticalServices();
  const services = available.length ? available : [
    { name:'Programme TV', description:'Voir les horaires des émissions et rendez-vous à l’antenne.',href:'/programme-tv',icon:'TV' },
    { name:'En direct', description:'Accéder au lecteur TV+ Afrique.',href:'/direct',icon:'TV' },
    { name:'Émissions et replays', description:'Consulter les émissions et leurs épisodes.',href:'/replay-emissions',icon:'RE' },
    { name:'Fil info', description:'Suivre les dernières dépêches publiées.',href:'/news-24-7',icon:'FI' },
    { name:'Contact', description:'Contacter la rédaction de TV+ Afrique.',href:'/contacts',icon:'CO' },
  ];

  return (
    <main className="shell listing-page">
      <Breadcrumb items={[{ label: 'Accueil', href: '/' }, { label: 'Pratique' }]} />
      <h1 className="page-title">TV Plus pratique</h1>
      <p className="page-intro">
        Tous les services utiles au quotidien : programme TV, newsletters, podcasts et
        informations pratiques.
      </p>
      <div className="service-grid">
        {services.map((s) => (
          <Link href={s.href} className="service-card" key={s.name}>
            <span className="service-icon" aria-hidden="true">{s.icon.slice(0, 2).toUpperCase()}</span>
            <strong>{s.name}</strong>
            <span>{s.description}</span>
            <ChevronRight size={16} />
          </Link>
        ))}
      </div>
    </main>
  );
}
