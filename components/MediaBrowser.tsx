'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Clock3 } from 'lucide-react';

export type BrowseItem = {
  id: string;
  title: string;
  category: string;
  image: string;
  meta: string;
  description: string;
  href?: string;
  playable?: boolean;
};

export default function MediaBrowser({
  items,
  variant = 'video',
  pageSize = 8,
  showFilters = true,
}: {
  items: BrowseItem[];
  variant?: 'video' | 'audio' | 'program';
  pageSize?: number;
  showFilters?: boolean;
}) {
  const [active, setActive] = useState('Tout');
  const [visible, setVisible] = useState(pageSize);
  const categories = ['Tout', ...Array.from(new Set(items.map((i) => i.category)))];
  const filtered = !showFilters || active === 'Tout' ? items : items.filter((i) => i.category === active);
  const shown = filtered.slice(0, visible);

  return (
    <>
      {showFilters && <div className="filter-bar" role="group" aria-label="Filtrer par rubrique">
        {categories.map((category) => (
          <button
            key={category}
            type="button"
            className={'filter-chip' + (active === category ? ' is-active' : '')}
            aria-pressed={active === category}
            onClick={() => { setActive(category); setVisible(pageSize); }}
          >
            {category}
          </button>
        ))}
      </div>}

      {shown.length === 0 ? <p className="empty-state">Aucun contenu disponible pour ce filtre.</p> : (
        <div className="media-grid">
          {shown.map((item) => {
            const content = (
              <>
                <span className="media-image">
                  {item.image && <img src={item.image} alt="" loading="lazy" decoding="async" />}
                  <span className="media-duration">
                    {variant === 'audio' ? <Clock3 size={13} /> : null} {item.meta}
                  </span>
                  {variant === 'video' && item.href && item.playable !== false && <span className="media-play" aria-hidden="true">▶</span>}
                </span>
                <span className="media-body">
                  <span className="media-meta">{item.category}</span>
                  <span className="media-title">{item.title}</span>
                  <span className="media-description">{item.description}</span>
                </span>
              </>
            );
            if (!item.href) return <article className="media-card" key={item.id}>{content}</article>;
            if (/^https?:\/\//i.test(item.href)) {
              return <a className="media-card" key={item.id} href={item.href} target="_blank" rel="noopener noreferrer">{content}</a>;
            }
            return <Link href={item.href} className="media-card" key={item.id}>{content}</Link>;
          })}
        </div>
      )}

      {visible < filtered.length && (
        <div className="load-more-wrap">
          <button type="button" className="load-more" onClick={() => setVisible((v) => v + pageSize)}>
            Afficher plus de contenus
          </button>
        </div>
      )}
    </>
  );
}
