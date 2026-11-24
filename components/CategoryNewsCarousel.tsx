'use client';

import { useMemo, useState } from 'react';
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
  const related = items.slice(1);
  const pages = useMemo(
    () => Array.from({ length: Math.ceil(related.length / PAGE_SIZE) }, (_, i) =>
      related.slice(i * PAGE_SIZE, (i + 1) * PAGE_SIZE)),
    [items],
  );
  const first = items[0];


  if (!first) return null;
  const move = (direction: number) => setPage(p => (p + direction + pages.length) % pages.length);

  return (
    <section className={'editorial-category-section' + (selection ? ' is-selection' : '')}
      aria-labelledby={sectionId}>
      <SectionHeading id={sectionId} title={title} moreHref={selection?moreHref:undefined}
        moreLabel={selection ? 'Toutes les rubriques' : undefined} />
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
                  <span className="editorial-side-count">Page {page + 1} sur {pages.length}</span>
                  {pages.length > 1 && (
                    <>
                      <button type="button" onClick={() => move(-1)}
                        aria-label={'Actualités précédentes — ' + title}><ChevronLeft size={17} /></button>
                      <button type="button" onClick={() => move(1)}
                        aria-label={'Actualités suivantes — ' + title}><ChevronRight size={17} /></button>

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
                    onClick={() => setPage(i)}>{i + 1}</button>
                ))}
              </div>}
            </>
          ) : <div className="editorial-side-empty">Retrouvez prochainement d’autres actualités de cette rubrique.</div>}
        </div>
      </div>
    </section>
  );
}
