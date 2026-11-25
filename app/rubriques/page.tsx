import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import Breadcrumb from '../../components/Breadcrumb';
import { categoryHref } from '../../lib/categories';
import { getCategories } from '../../lib/db/repository';
import { navigationCategories } from '../../lib/public-navigation';

export const revalidate = 60;
export const metadata: Metadata = {
  title: 'Toutes les rubriques — TV+ Afrique',
  description: 'Retrouvez les rubriques de TV+ Afrique et les derniers articles classés par thème.',
};

export default async function RubriquesPage() {
  const { data } = await getCategories().catch(() => ({ data: [] as string[] }));
  const categories = navigationCategories(data);

  return <main className="shell listing-page rubriques-page">
    <Breadcrumb items={[{ label: 'Accueil', href: '/' }, { label: 'Toutes les rubriques' }]} />
    <div className="rubriques-page-heading">
      <h1>Toutes les rubriques</h1>
      <p>Choisissez une rubrique pour retrouver ses derniers articles.</p>
    </div>
    {categories.length > 0 ? (
      <ul className="rubriques-list">
        {categories.map((category) => <li key={category}>
          <Link href={categoryHref(category)}>
            {category}<ArrowRight size={18} aria-hidden="true" />
          </Link>
        </li>)}
      </ul>
    ) : <p className="empty-state">Les rubriques sont momentanément indisponibles. <Link href="/actualites">Voir les dernières actualités</Link></p>}
  </main>;
}
