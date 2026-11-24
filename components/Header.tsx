'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Menu, X, Search, ChevronRight, ChevronDown, House } from 'lucide-react';
import { EDITORIAL_COUNTRIES } from '../lib/editor/countries';
import TvPlusLogo from './TvPlusLogo';
import { topicLinks, topics as staticTopics } from '../lib/data';
import { categoryHref } from '../lib/categories';

type TopicItem = { label: string; link: string };

function GabonMark() {
  return (
    <svg width="18" height="20" viewBox="0 0 18 20" aria-hidden="true" className="gabon-mark">
      <rect x="0" y="0" width="4" height="20" fill="#009E60" />
      <rect x="5" y="0" width="8" height="20" fill="#FCD116" />
      <rect x="14" y="0" width="4" height="20" fill="#0055A4" />
    </svg>
  );
}

export default function Header({
  topics = staticTopics.map((label) => ({ label, link: topicLinks[label] ?? '/news-24-7' })),
  categories = [],
}: { topics?: TopicItem[]; categories?: string[] }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [countryOpen, setCountryOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMenuOpen(false);
    setSearchOpen(false);
    setCountryOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setMenuOpen(false);
      setSearchOpen(false);
      setCountryOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <header className="site-header">
      <div className="header-top">
        <div className="shell header-top-inner">
          <button
            className="menu-toggle"
            aria-label={menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
            aria-expanded={menuOpen}
            aria-controls="site-mega-menu"
            onClick={() => setMenuOpen((v) => !v)}
          >
            {menuOpen ? <X size={26} strokeWidth={2.4} /> : <Menu size={26} strokeWidth={2.4} />}
            <span>Menu</span>
          </button>

          <Link href="/" className="brand" aria-label="TV Plus, accueil">
            <TvPlusLogo />
          </Link>

          <div className="header-actions">
            <Link href="/replay-emissions" className="header-text-link">
              Replay
            </Link>
            <Link href="/direct" className="direct-btn">
              <span className="direct-dot" />
              Direct
            </Link>
            <button
              className="header-search-btn"
              aria-label={searchOpen ? 'Fermer la recherche' : 'Rechercher'}
              aria-expanded={searchOpen}
              aria-controls="site-search-form"
              onClick={() => setSearchOpen((v) => !v)}
            >
              {searchOpen ? <X size={19} /> : <Search size={19} />}
            </button>
          </div>
        </div>
      </div>

      <nav className="nav-primary" aria-label="Navigation principale">
        <div className="shell nav-primary-inner">
          <div className="nav-topics">
            {topics.map((topic, i) => (
              <Link
                key={topic.label}
                href={topic.link}
                className={i === topics.length - 1 ? 'topic-last' : ''}
              >
                {topic.label}
              </Link>
            ))}
          </div>
          <div className="nav-links">
            <Link href="/" className={'nav-home-btn'+(pathname==='/'?' is-active':'')} aria-label="Accueil">
              <House size={16} aria-hidden="true"/> Accueil
            </Link>
            <button type="button" className="nav-country-toggle" aria-expanded={countryOpen}
              aria-controls="country-navigation" onClick={()=>{setCountryOpen(v=>!v);setMenuOpen(false)}}>
              <GabonMark /> Pays <ChevronDown size={14} aria-hidden="true"/>
            </button>
            {categories.map((category) => (
              <Link key={category} href={categoryHref(category)}>
                {category}
              </Link>
            ))}
          </div>
        </div>
      </nav>

      {countryOpen && (
        <div id="country-navigation" className="country-navigation" role="navigation" aria-label="Choisir un pays">
          <div className="country-navigation-inner shell">
            <strong>Actualités par pays</strong>
            <div className="country-navigation-grid">
              {EDITORIAL_COUNTRIES.map(country => (
                <Link href={'/pays/'+country.code.toLowerCase()} key={country.code}
                  className={country.code==='GA'?'country-gabon':''}
                  onClick={()=>setCountryOpen(false)}>
                  {country.name}<ChevronRight size={14} aria-hidden="true"/>
                </Link>
              ))}
            </div>
            <p>Les pays sans publication affichent un état vide, sans reprendre les actualités du Gabon.</p>
          </div>
        </div>
      )}

      {searchOpen && (
        <form id="site-search-form" className="header-search shell" action="/recherche" role="search">
          <Search size={18} aria-hidden="true" />
          <input name="q" autoFocus placeholder="Rechercher une actualité, une rubrique…" />
          <button type="submit">Rechercher</button>
        </form>
      )}

      {menuOpen && (
        <div className="mega-menu" id="site-mega-menu" aria-label="Menu de navigation">
          <div className="shell mega-inner">
            <div className="mega-col mega-lead">
              <span className="mega-label">Navigation</span>
              <Link href="/" onClick={() => setMenuOpen(false)}>Accueil <ChevronRight size={15}/></Link>
              <Link href="/actualites" onClick={() => setMenuOpen(false)}>Toutes les actualités <ChevronRight size={15}/></Link>
              <Link href="/pays/ga" onClick={() => setMenuOpen(false)}>Gabon et pays <ChevronRight size={15}/></Link>
              {topics.map((topic) => (
                <Link key={topic.label} href={topic.link} onClick={() => setMenuOpen(false)}>
                  {topic.label} <ChevronRight size={15} />
                </Link>
              ))}
            </div>
            <div className="mega-col">
              <span className="mega-label">Toutes les rubriques</span>
              {categories.slice(0, 5).map((category) => (
                <Link
                  key={category}
                  href={categoryHref(category)}
                  onClick={() => setMenuOpen(false)}
                >
                  {category} <ChevronRight size={15} />
                </Link>
              ))}
            </div>
            <div className="mega-col">
              <span className="mega-label">&nbsp;</span>
              {categories.slice(5).map((category) => (
                <Link
                  key={category}
                  href={categoryHref(category)}
                  onClick={() => setMenuOpen(false)}
                >
                  {category} <ChevronRight size={15} />
                </Link>
              ))}
            </div>
            <div className="mega-col mega-services">
              <span className="mega-label">Services</span>
              {[
                ['Le direct', '/direct'],
                ['Le fil info', '/news-24-7'],
                ['Les vidéos', '/videos'],
                ['Émissions & replays', '/replay-emissions'],
                ['Replays', '/replays'],
                ['Podcasts', '/podcasts'],
                ['Programme TV', '/programme-tv'],
                ['Plan du site', '/plan-du-site'],
              ].map(([label, href]) => (
                <Link key={label} href={href} onClick={() => setMenuOpen(false)}>
                  {label} <ChevronRight size={15} />
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
