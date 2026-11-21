'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import type { Story } from '../lib/data';
import { articlePath } from '../lib/articles/urls';
import StoryCard from './StoryCard';
import SectionHeading from './SectionHeading';

const PAGE_SIZE = 3;
const INTERVAL_MS = 6500;

export default function CategoryNewsCarousel({
  title, items, moreHref, sectionId, selection = false,
}: {
  title: string; items: Story[]; moreHref?: string; sectionId: string; selection?: boolean;
}) {
  const [page, setPage] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [visible, setVisible] = useState(false);
  const [documentVisible, setDocumentVisible] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const root = useRef<HTMLElement>(null);
  const related = items.slice(1);
  const pages = useMemo(
    () => Array.from({ length: Math.ceil(related.length / PAGE_SIZE) }, (_, i) =>
      related.slice(i * PAGE_SIZE, (i + 1) * PAGE_SIZE)),
    [items],
  );
  const first = items[0];
  useEffect(() => {
    const target = root.current;
    if (!target) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.08 });
    observer.observe(target);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const change = () => setReducedMotion(media.matches);
    change();
    media.addEventListener('change', change);
    return () => media.removeEventListener('change', change);
  }, []);
  useEffect(() => {
    const change = () => setDocumentVisible(!document.hidden);
    document.addEventListener('visibilitychange', change);
    change();
    return () => document.removeEventListener('visibilitychange', change);
  }, []);
  useEffect(() => {
    if (pages.length < 2 || paused || hovered || focused || !visible || !documentVisible || reducedMotion) return;
    const timer = window.setInterval(() => setPage(p => (p + 1) % pages.length), INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [pages.length, paused, hovered, focused, visible, documentVisible, reducedMotion]);

  if (!first) return null;
  const move = (direction: number) => setPage(p => (p + direction + pages.length) % pages.length);

  return (
    <section ref={root} className={'editorial-category-section' + (selection ? ' is-selection' : '')}
      aria-labelledby={sectionId}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={event => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false);
      }}>
      <SectionHeading id={sectionId} title={title} moreHref={moreHref}
        moreLabel={selection ? 'Toutes les rubriques' : 'Toute l’actualité'} />
      <div className="editorial-category-layout">
        <div className="editorial-category-feature">
          <StoryCard story={first} variant="hero" />
        </div>
        <div className="editorial-category-side" aria-label={'Autres articles — ' + title}>
          {pages.length ? (
            <>
              <div className="editorial-side-toolbar">
                <span>À lire également</span>
                <div className="editorial-side-actions">
                  <span className="editorial-side-count">{page + 1} / {pages.length}</span>
                  {pages.length > 1 && (
                    <>
                      <button type="button" onClick={() => move(-1)}
                        aria-label={'Actualités précédentes — ' + title}><ChevronLeft size={17} /></button>
                      <button type="button" onClick={() => move(1)}
                        aria-label={'Actualités suivantes — ' + title}><ChevronRight size={17} /></button>
                      <button type="button" aria-label={paused ? 'Reprendre le défilement' : 'Mettre le défilement en pause'}
                        aria-pressed={paused} onClick={() => setPaused(value => !value)}>
                        {paused ? <Play size={15} /> : <Pause size={15} />}
                      </button>
                    </>
                  )}
                </div>
              </div>
              <div className="editorial-side-viewport">
                <div className="editorial-side-track" style={{ transform: `translateX(-${page * 100}%)` }}>
                  {pages.map((group, index) => (
                    <div className="editorial-side-slide" key={index} aria-hidden={index !== page}>
                      {group.map(article => (
                        <Link key={article.shortId ?? article.slug} href={articlePath(article)}
                          className="editorial-mini-article" tabIndex={index === page ? 0 : -1}>
                          <span className="editorial-mini-thumb">
                            {article.image ? <img src={article.image} alt="" loading="lazy" decoding="async" /> :
                              <span className="editorial-mini-placeholder">TV+</span>}
                          </span>
                          <span className="editorial-mini-body">
                            <span className="editorial-mini-category">{article.category}</span>
                            <strong>{article.title}</strong>
                            <time>{article.time}</time>
                          </span>
                        </Link>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
              {pages.length > 1 && <div className="editorial-side-dots" role="group" aria-label={'Pages du carrousel ' + title}>
                {pages.map((_, i) => (
                  <button type="button" key={i} aria-label={'Afficher les articles ' + (i + 1)}
                    aria-pressed={i === page} className={i === page ? 'is-active' : ''}
                    onClick={() => setPage(i)} />
                ))}
              </div>}
            </>
          ) : <div className="editorial-side-empty">Retrouvez prochainement d’autres actualités de cette rubrique.</div>}
        </div>
      </div>
    </section>
  );
}
