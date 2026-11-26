import Link from 'next/link';
import Breadcrumb from '../../components/Breadcrumb';

export const revalidate = 60;

const sections = [
  { title: 'L’information', links: [
    ['Accueil', '/'], ['Dernières actualités', '/actualites'], ['Fil info News 24/7', '/news-24-7'], ['Recherche', '/recherche'],
    ['Direct Premium', '/direct'], ['Reportages', '/videos'], ['Articles vidéo', '/articles-video'], ['Reels', '/reels'],
  ] },
  { title: 'Les émissions', links: [
    ['Émissions & replays', '/replay-emissions'], ['Tous les replays', '/replays'], ['Ligne Rouge', '/ligne-rouge'], ['Podcasts', '/podcasts'],
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

export default function PlanDuSitePage() {
  return (
    <main className="shell listing-page">
      <Breadcrumb items={[{ label: 'Accueil', href: '/' }, { label: 'Plan du site' }]} />
      <h1 className="page-title">Plan du site</h1>
      <p className="page-intro">Toutes les pages publiques de TV Plus, réunies au même endroit.</p>
      <div className="sitemap-grid">
        {sections.map((section) => (
          <section key={section.title}>
            <h2>{section.title}</h2>
            <div className="sitemap-links">
              {section.links.map(([label, href]) => <Link href={href} key={href}>{label}</Link>)}
            </div>
          </section>
        ))}
        <section id="rubriques">
          <h2>Toutes les rubriques</h2>
          <div className="sitemap-links"><Link href="/rubriques">Ouvrir le répertoire des rubriques</Link></div>
        </section>
      </div>
    </main>
  );
}
