import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import Breadcrumb from '../../components/Breadcrumb';
import { getPracticalServices } from '../../lib/db/repository';

export const revalidate = 60;

export default async function PratiquePage() {
  const { data: services } = await getPracticalServices();

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
