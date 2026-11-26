'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import AutoplayVideo from './AutoplayVideo';

export type FeedItem = {
  id: string;
  title: string;
  source: string;
  cover: string;
  kind: 'reel' | 'replay' | 'reportage' | 'podcast';
  category: string;
  href: string;
  deadLink?: boolean;
};

const TABS = [
  { id: 'all', label: 'Tout le flux' },
  { id: 'reel', label: 'Reels' },
  { id: 'replay', label: 'Replays' },
  { id: 'reportage', label: 'Reportages' },
  { id: 'podcast', label: 'Podcasts' },
] as const;

export default function VideoFeed({ items }: { items: FeedItem[] }) {
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('all');
  const [active, setActive] = useState(0);
  const nodes = useRef<(HTMLElement | null)[]>([]);

  const visible = useMemo(
    () => tab === 'all' ? items : items.filter(item => item.kind === tab),
    [items, tab],
  );

  useEffect(() => { setActive(0); }, [tab]);

  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      const best = entries
        .filter(entry => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!best) return;
      const index = Number((best.target as HTMLElement).dataset.index);
      if (Number.isFinite(index)) setActive(index);
    }, { threshold: [0.2, 0.5, 0.8] });
    nodes.current.forEach(node => { if (node) observer.observe(node); });
    return () => observer.disconnect();
  }, [visible]);

  return (
    <div className="video-feed">
      <nav className="video-feed-tabs" aria-label="Filtrer le fil vidéo">
        {TABS.map(entry => (
          <button
            key={entry.id}
            type="button"
            aria-pressed={tab === entry.id}
            onClick={() => setTab(entry.id)}
          >
            {entry.label}
          </button>
        ))}
      </nav>
      {!visible.length && <p className="empty-state">Aucune vidéo disponible dans cette catégorie.</p>}
      <div className="video-feed-list">
        {visible.map((item, index) => (
          <article
            key={item.id}
            className="video-feed-item"
            data-index={index}
            ref={node => { nodes.current[index] = node; }}
          >
            <AutoplayVideo
              source={item.source}
              cover={item.cover}
              title={item.title}
              active={index === active}
              showSound
              className="video-feed-media"
            />
            <div className="video-feed-info">
              <span className="video-feed-kind">{item.category}</span>
              <h2>{item.title}</h2>
              {!item.deadLink && <Link href={item.href}>Ouvrir la fiche</Link>}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
