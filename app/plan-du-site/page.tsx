import Link from 'next/link';
import Breadcrumb from '../../components/Breadcrumb';
import { getCategories } from '../../lib/db/repository';
import { categoryHref } from '../../lib/categories';

export const revalidate = 60;

const sections = [
  { title: 'L’information', links: [
    ['Accueil', '/'], ['Toutes les rubriques', '/rubriques'], ['Dernières actualités', '/actualites'], ['Fil info News 24/7', '/news-24-7'], ['Recherche', '/recherche'],
    ['Direct', '/direct'], ['Vidéos', '/videos'],
  ] },
  { title: 'Les émissions', links: [
    ['Émissions & replays', '/replay-emissions'], ['Podcasts', '/podcasts'],
    ['Programme TV', '/programme-tv'],
  ] },
  { title: 'Services', links: [
    ['Newsletters', '/newsletters'], ['Témoins', '/temoins'], ['Pratique', '/pratique'], ['Contact', '/contacts'],
  ] },
  { title: 'Informations légales', links: [
    ['À propos', '/a-propos'], ['Mentions légales', '/mentions-legales'],
    ['CGU', '/cgu'], ['Données personnelles', '/donnees-personnelles'],
  ] },
];

export default async function PlanDuSitePage() {
  const { data: categories } = await getCategories();

  return (
    <main className="shell listing-page">
      <Breadcrumb items={[{ label: 'Accueil', href: '/' }, { label: 'Plan du site' }]} />
      <h1 className="page-title">Plan du site</h1>
      <p className="page-intro">Toutes les pages publiques de TV Plus, réunies au même endroit.</p>
      <div className="sitemap-grid">
        {sections.map((section) => (
          <section key={section.title}>
            <h2>{section.title}</h2>
            <div className="footer-links">
              {section.links.map(([label, href]) => <Link href={href} key={href}>{label}</Link>)}
            </div>
          </section>
        ))}
        <section>
          <h2>Toutes les rubriques</h2>
          <div className="footer-links">
            {categories.map((category) => (
              <Link key={category} href={categoryHref(category)}>{category}</Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
