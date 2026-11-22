import Link from 'next/link';
import TvPlusLogo from './TvPlusLogo';
import { categories as staticCategories } from '../lib/data';
import { categoryHref } from '../lib/categories';

export default function Footer({ categories = staticCategories }: { categories?: string[] }) {
  return (
    <footer className="site-footer">
      <div className="shell footer-main">
        <div className="footer-brand">
          <Link href="/" aria-label="TV Plus, accueil">
            <TvPlusLogo />
          </Link>
          <p>Première sur l’info au Gabon. Suivez l’actualité en continu, 24h/24 et 7j/7.</p>
        </div>
        <div>
          <h3 className="footer-title">Toutes les rubriques</h3>
          <div className="footer-links">
            {categories.slice(0, 5).map((category) => (
              <Link key={category} href={categoryHref(category)}>
                {category}
              </Link>
            ))}
          </div>
        </div>
        <div>
          <h3 className="footer-title">&nbsp;</h3>
          <div className="footer-links">
            {categories.slice(5).map((category) => (
              <Link key={category} href={categoryHref(category)}>
                {category}
              </Link>
            ))}
          </div>
        </div>
        <div>
          <h3 className="footer-title">Les directs</h3>
          <div className="footer-links">
            <Link href="/direct">Direct TV Plus</Link>
            <Link href="/programme-tv">Programme TV</Link>
            <Link href="/replays">Replays</Link>
            <Link href="/news-24-7">Le fil info</Link>
          </div>
        </div>
        <div>
          <h3 className="footer-title">Services</h3>
          <div className="footer-links">
            <Link href="/newsletters">Newsletters</Link>
            <Link href="/videos">Vidéos</Link>
            <Link href="/podcasts">Podcasts</Link>
            <Link href="/plan-du-site">Plan du site</Link>
            <Link href="/programme-tv">Programme TV</Link>
            <Link href="/replays">Replays</Link>
            <Link href="/suivez-nous">Suivez-nous</Link>
            <Link href="/applications">Applications</Link>
          </div>
        </div>
      </div>
      <div className="shell footer-bottom">
        <span>© {new Date().getFullYear()} TV Plus. Tous droits réservés.</span>
        <div className="footer-socials">
          <Link href="/a-propos">Qui sommes-nous ?</Link>
          <Link href="/mentions-legales">Mentions légales</Link>
          <Link href="/cgu">CGU</Link>
          <Link href="/contacts">Contact</Link>
        </div>
      </div>
    </footer>
  );
}
