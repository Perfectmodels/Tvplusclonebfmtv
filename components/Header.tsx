'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Menu, X, Search, ChevronRight, ChevronDown } from 'lucide-react';
import { EDITORIAL_COUNTRIES } from '../lib/editor/countries';
import TvPlusLogo from './TvPlusLogo';
import { categoryHref } from '../lib/categories';

type Panel = 'menu' | 'search' | 'countries';

const menuGroups = [
  { label: 'L’actualité', links: [
    ['Dernières actualités', '/actualites'],
    ['Gabon', '/pays/ga'],
    ['Toutes les actualités','/actualites'],
    ['TV+ Reels','/reels'],
    ['Articles vidéo','/articles-video'],
    ['Ligne Rouge','/ligne-rouge'],
  ] },
  { label: 'À regarder et à écouter', links: [
    ['Le direct', '/direct'],
    ['Émissions et replays', '/replays'],
    ['Grille des programmes', '/programme-tv'],
    ['Vidéos', '/videos'],
    ['Podcasts', '/podcasts'],
  ] },
  { label: 'Services', links: [
    ['Rechercher un article', '/recherche'],
    ['Newsletters', '/newsletters'],
    ['Nous contacter', '/contacts'],
  ] },
];

export default function Header({ categories = [] }: { categories?: string[] }) {
  const [panel, setPanel] = useState<Panel | null>(null);
  const pathname = usePathname();
  const close = () => setPanel(null);
  const toggle = (name: Panel) => setPanel((current) => current === name ? null : name);
  const active = (href: string) => pathname === href ? 'page' : undefined;

  useEffect(close, [pathname]);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') setPanel(null); };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <header className="site-header">
      <div className="header-top">
        <div className="shell header-top-inner">
          <button className="menu-toggle" type="button" aria-label={panel === 'menu' ? 'Fermer le menu' : 'Ouvrir le menu'}
            aria-expanded={panel === 'menu'} aria-controls="site-mega-menu" onClick={() => toggle('menu')}>
            {panel === 'menu' ? <X size={26} strokeWidth={2.4} /> : <Menu size={26} strokeWidth={2.4} />}
            <span>Menu</span>
          </button>

          <Link href="/" className="brand" aria-label="Accueil de TV+ Afrique" onClick={close}><TvPlusLogo /></Link>
          <div className="header-actions">
            <Link href="/replays" className="header-text-link" aria-current={active('/replays')} onClick={close}>Replays</Link>
            <Link href="/direct" className="direct-btn" aria-current={active('/direct')} onClick={close}>
              <span className="direct-dot" /> Direct
            </Link>
            <button hidden className="header-search-btn" type="button"
              aria-label={panel === 'search' ? 'Fermer la recherche' : 'Rechercher'}
              aria-expanded={panel === 'search'} aria-controls="site-search-form" onClick={() => toggle('search')}>
              {panel === 'search' ? <X size={19} /> : <Search size={19} />}
            </button>
          </div>
        </div>
      </div>

      <nav className="nav-primary" aria-label="Navigation principale">
        <div className="shell nav-primary-inner">
          <div className="nav-links">
            <button type="button" className="nav-country-toggle" aria-expanded={panel === 'countries'}
              aria-controls="country-navigation" aria-label="Gabon et actualités par pays" onClick={() => toggle('countries')}>
              Gabon <ChevronDown size={14} aria-hidden="true" />
            </button>
            {categories.slice(0, 5).map((category) => (
              <Link key={category} href={categoryHref(category)} className="nav-editorial-category"
                aria-current={active(categoryHref(category))} onClick={close}>{category}</Link>
            ))}
            <Link href="/rubriques" aria-current={active('/rubriques')} onClick={close}>Toutes les rubriques</Link>
          </div>
        </div>
      </nav>

      {panel === 'countries' && (
        <nav id="country-navigation" className="country-navigation" aria-label="Actualités par pays">
          <div className="country-navigation-inner shell">
            <strong>Actualités par pays</strong>
            <div className="country-navigation-grid">
              {EDITORIAL_COUNTRIES.filter(({ code }) => code !== 'FR').map((country) => {
                const href = '/pays/' + country.code.toLowerCase();
                return <Link href={href} key={country.code} aria-current={active(href)} onClick={close}>
                  {country.name}<ChevronRight size={14} aria-hidden="true" />
                </Link>;
              })}
            </div>
          </div>
        </nav>
      )}

      {panel === 'search' && (
        <form id="site-search-form" className="header-search shell" action="/recherche" role="search">
          <Search size={18} aria-hidden="true" />
          <input name="q" autoFocus aria-label="Rechercher un article" placeholder="Rechercher une actualité…" />
          <button type="submit">Rechercher</button>
        </form>
      )}

      {panel === 'menu' && (
        <nav className="mega-menu" id="site-mega-menu" aria-label="Menu du site">
          <div className="shell mega-inner">
            <section className="mega-col">
              <h2 className="mega-label">Rubriques</h2>
              {categories.map((category) => (
                <Link href={categoryHref(category)} key={category} aria-current={active(categoryHref(category))} onClick={close}>
                  {category} <ChevronRight size={15} aria-hidden="true" />
                </Link>
              ))}
              <Link href="/rubriques" aria-current={active('/rubriques')} onClick={close}>Toutes les rubriques <ChevronRight size={15} aria-hidden="true" /></Link>
            </section>
            {menuGroups.map((group) => (
              <section className="mega-col" key={group.label}>
                <h2 className="mega-label">{group.label}</h2>
                {group.links.map(([label, href]) => (
                  <Link key={href} href={href} aria-current={active(href)} onClick={close}>
                    {label} <ChevronRight size={15} aria-hidden="true" />
                  </Link>
                ))}
              </section>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}
