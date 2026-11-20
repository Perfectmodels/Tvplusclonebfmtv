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
};

export default function MediaBrowser({
  items,
  variant = 'video',
  pageSize = 8,
}: {
  items: BrowseItem[];
  variant?: 'video' | 'audio' | 'program';
  pageSize?: number;
}) {
  const [active, setActive] = useState('Tout');
  const [visible, setVisible] = useState(pageSize);
  const categories = ['Tout', ...Array.from(new Set(items.map((i) => i.category)))];
  const filtered = active === 'Tout' ? items : items.filter((i) => i.category === active);
  const shown = filtered.slice(0, visible);

  return (
    <>
      <div className="filter-bar" role="group" aria-label="Filtrer par rubrique">
        {categories.map((category) => (
          <button
            key={category}
            type="button"
            className={'filter-chip' + (active === category ? ' is-active' : '')}
            onClick={() => { setActive(category); setVisible(pageSize); }}
          >
            {category}
          </button>
        ))}
      </div>

      <div className="media-grid">
        {shown.map((item) => (
          <Link href={item.href ?? '/direct'} className="media-card" key={item.id}>
            <span className="media-image">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.image} alt={item.title} loading="lazy" decoding="async" />
              <span className="media-duration">
                {variant === 'audio' ? <Clock3 size={13} /> : null} {item.meta}
              </span>
              {variant === 'video' && <span className="media-play" aria-hidden="true">▶</span>}
            </span>
            <span className="media-body">
              <span className="media-meta">{item.category}</span>
              <span className="media-title">{item.title}</span>
              <span className="media-description">{item.description}</span>
            </span>
          </Link>
        ))}
      </div>

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
