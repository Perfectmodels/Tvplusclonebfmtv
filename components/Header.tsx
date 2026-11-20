'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Menu, X, Search, ChevronRight } from 'lucide-react';
import TvPlusLogo from './TvPlusLogo';
import { categories, topicLinks, topics as staticTopics } from '../lib/data';

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
  userEmail = null,
  isAdmin = false,
}: { topics?: TopicItem[]; userEmail?: string | null; isAdmin?: boolean }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMenuOpen(false);
    setSearchOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setMenuOpen(false);
      setSearchOpen(false);
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
            {isAdmin && (
              <Link href="/admin" className="header-text-link header-admin">
                Admin
              </Link>
            )}
            <Link href={userEmail ? '/compte' : '/connexion'} className="header-text-link header-account">
              {userEmail ? 'Mon compte' : 'Connexion'}
            </Link>
            <Link href="/replay-emissions" className="header-text-link">
              Replay
            </Link>
            <Link href="/direct" className="direct-btn" data-open-live>
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
            <Link href="/rubrique/politique" className="nav-special">
              <GabonMark />
              Présidence
            </Link>
            {categories.map((category) => (
              <Link key={category} href={'/rubrique/' + encodeURIComponent(category.toLowerCase())}>
                {category}
              </Link>
            ))}
          </div>
        </div>
      </nav>

      {searchOpen && (
        <form id="site-search-form" className="header-search shell" action="/recherche" role="search">
          <Search size={18} aria-hidden="true" />
          <input name="q" autoFocus placeholder="Rechercher une actualité, une rubrique…" />
          <button type="submit">Rechercher</button>
        </form>
      )}

      {menuOpen && (
        <div className="mega-menu" id="site-mega-menu">
          <div className="shell mega-inner">
            <div className="mega-col mega-lead">
              <span className="mega-label">À la une</span>
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
                  href={'/rubrique/' + encodeURIComponent(category.toLowerCase())}
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
                  href={'/rubrique/' + encodeURIComponent(category.toLowerCase())}
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
