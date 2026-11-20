'use client';

import { useRef, useState } from 'react';
import { articlePath } from '../lib/articles/urls';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';

export type FeedItem = {
  time: string;
  category: string;
  title: string;
  summary: string;
  slug: string;
  image?: string;
  shortId?: string;
};

export default function FilActuFeed({ items, categories }: { items: FeedItem[]; categories: string[] }) {
  const [active, setActive] = useState('Tout');
  const [mode, setMode] = useState<'auto' | 'manual'>('auto');
  const [paused, setPaused] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const filtered = active === 'Tout' ? items : items.filter((i) => i.category === active);

  function scrollBy(direction: number) {
    trackRef.current?.scrollBy({ left: direction * 340, behavior: 'smooth' });
  }

  const card = (item: FeedItem, key: string) => (
    <Link href={articlePath(item)} className="fil-carousel-card" key={key}>
      <span className="fil-carousel-copy">
        <span className="fil-carousel-time">{item.time}</span>
        <span className="fil-category">{item.category}</span>
        <strong>{item.title}</strong>
        <span className="fil-carousel-summary">{item.summary}</span>
      </span>
      {item.image && (
        <span className="fil-carousel-thumb">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={item.image} alt="" loading="lazy" />
        </span>
      )}
    </Link>
  );

  return (
    <>
      <div className="fil-controls">
        <div className="filter-bar" role="group" aria-label="Filtrer le fil information">
          {['Tout', ...categories].map((category) => (
            <button
              key={category}
              type="button"
              className={'filter-chip' + (active === category ? ' is-active' : '')}
              onClick={() => setActive(category)}
            >
              {category}
            </button>
          ))}
        </div>
        <div className="fil-mode">
          <button
            type="button"
            className={'filter-chip' + (mode === 'auto' ? ' is-active' : '')}
            onClick={() => setMode('auto')}
            aria-pressed={mode === 'auto'}
          >
            <Play size={13} /> Auto
          </button>
          <button
            type="button"
            className={'filter-chip' + (mode === 'manual' ? ' is-active' : '')}
            onClick={() => setMode('manual')}
            aria-pressed={mode === 'manual'}
          >
            <ChevronRight size={13} /> Manuel
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="admin-empty">Aucune information pour ce filtre.</div>
      ) : mode === 'auto' ? (
        <div
          className={'fil-carousel is-auto' + (paused ? ' is-paused' : '')}
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocus={() => setPaused(true)}
          onBlur={() => setPaused(false)}
        >
          <div className="fil-carousel-track">
            <div className="fil-carousel-group">{filtered.map((item) => card(item, item.slug + '-a'))}</div>
            <div className="fil-carousel-group" aria-hidden="true">{filtered.map((item) => card(item, item.slug + '-b'))}</div>
          </div>
          <button type="button" className="fil-carousel-pause" onClick={() => setPaused((v) => !v)} aria-label={paused ? 'Reprendre le défilement' : 'Mettre en pause'}>
            {paused ? <Play size={15} /> : <Pause size={15} />}
          </button>
        </div>
      ) : (
        <div className="fil-carousel is-manual">
          <button type="button" className="fil-carousel-arrow" onClick={() => scrollBy(-1)} aria-label="Informations précédentes"><ChevronLeft size={18} /></button>
          <div className="fil-carousel-viewport" ref={trackRef}>
            <div className="fil-carousel-group">{filtered.map((item) => card(item, item.slug + '-m'))}</div>
          </div>
          <button type="button" className="fil-carousel-arrow" onClick={() => scrollBy(1)} aria-label="Informations suivantes"><ChevronRight size={18} /></button>
        </div>
      )}
    </>
  );
}
