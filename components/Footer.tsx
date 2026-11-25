import Link from 'next/link';
import { ArrowRight, ArrowUpRight, MessageCircle, Play } from 'lucide-react';
import TvPlusLogo from './TvPlusLogo';
import { categories as staticCategories } from '../lib/data';
import { categoryHref } from '../lib/categories';

const watchLinks = [
  { label: 'Émissions et replays', href: '/replay-emissions' },
  { label: 'Programme TV', href: '/programme-tv' },
  { label: 'Vidéos', href: '/videos' },
  { label: 'Podcasts', href: '/podcasts' },
];

const serviceLinks = [
  { label: 'Rechercher un article', href: '/recherche' },
  { label: 'Newsletters', href: '/newsletters' },
  { label: 'Nous contacter', href: '/contacts' },
];

const informationLinks = [
  { label: 'À propos', href: '/a-propos' },
  { label: 'Mentions légales', href: '/mentions-legales' },
  { label: 'CGU', href: '/cgu' },
  { label: 'Données personnelles', href: '/donnees-personnelles' },
  { label: 'Plan du site', href: '/plan-du-site' },
];

function FooterLinks({ links }: { links: { label: string; href: string }[] }) {
  return (
    <ul className="footer-menu">
      {links.map(({ href, label }) => <li key={href}><Link href={href}>{label}</Link></li>)}
    </ul>
  );
}

export default function Footer({ categories = staticCategories }: { categories?: string[] }) {
  const topics = [...new Map(categories.map((label) => [categoryHref(label), { label, href: categoryHref(label) }])).values()]
    .slice(0, 4);

  return (
    <footer className="site-footer">
      <div className="shell">
        <div className="footer-masthead">
          <div className="footer-brand">
            <Link href="/" aria-label="Accueil de TV+ Afrique"><TvPlusLogo /></Link>
            <p>L’actualité du Gabon et de l’Afrique en continu.</p>
          </div>
          <div className="footer-actions">
            <Link href="/direct" className="footer-action footer-action-live">
              <Play size={16} fill="currentColor" aria-hidden="true" /> Regarder le direct
            </Link>
            <a href="https://l.tvplusafrique.com/xw7b" className="footer-action" target="_blank" rel="noopener noreferrer">
              <MessageCircle size={18} aria-hidden="true" /> Suivre sur WhatsApp
              <ArrowUpRight size={15} aria-hidden="true" />
            </a>
          </div>
        </div>

        <nav className="footer-navigation" aria-label="Navigation de pied de page">
          <section aria-labelledby="footer-actualites">
            <h2 id="footer-actualites">L’actualité</h2>
            <FooterLinks links={[
              { label: 'Dernières actualités', href: '/actualites' },
              { label: 'Fil info 24/7', href: '/news-24-7' },
              ...topics,
            ]} />
            <Link className="footer-all-topics" href="/plan-du-site#rubriques">
              Toutes les rubriques <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </section>
          <section aria-labelledby="footer-programmes">
            <h2 id="footer-programmes">À regarder et à écouter</h2>
            <FooterLinks links={watchLinks} />
          </section>
          <section aria-labelledby="footer-services">
            <h2 id="footer-services">Services</h2>
            <FooterLinks links={serviceLinks} />
          </section>
        </nav>

        <div className="footer-bottom">
          <small>© {new Date().getFullYear()} TV+ Afrique</small>
          <nav aria-label="Informations sur TV+ Afrique"><FooterLinks links={informationLinks} /></nav>
        </div>
      </div>
    </footer>
  );
}
