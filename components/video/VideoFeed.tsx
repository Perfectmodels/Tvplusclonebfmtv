'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { PlayCircle, Headphones } from 'lucide-react';

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

  const visible = useMemo(
    () => tab === 'all' ? items : items.filter(item => item.kind === tab),
    [items, tab],
  );

  useEffect(() => {
    const sync = () => setTab(window.location.hash === '#reportages' ? 'reportage' : 'all');
    sync();
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, []);

  return (
    <div className="video-feed">
      <nav className="video-feed-tabs" aria-label="Filtrer le fil vidéo">
        {TABS.map(entry => (
          <button
            key={entry.id}
            id={entry.id === 'reportage' ? 'reportages' : undefined}
            type="button"
            aria-pressed={tab === entry.id}
            onClick={() => { if (window.location.hash) window.history.replaceState(null, '', window.location.pathname + window.location.search); setTab(entry.id); }}
          >
            {entry.label}
          </button>
        ))}
      </nav>
      {!visible.length && <p className="empty-state">Aucune vidéo disponible dans cette catégorie.</p>}
      <div className="video-feed-list">
        {visible.map(item => (
          <article
            key={item.id}
            className="video-feed-item"
          >
            <Link href={item.href} prefetch={false} className="video-feed-media autoplay-video" aria-label={'Ouvrir : ' + item.title}>
              {item.cover && <img className="autoplay-video__cover" src={item.cover} alt="" loading="lazy" decoding="async" />}
              <span style={{position:'absolute',inset:0,display:'grid',placeItems:'center',color:'white'}}>
                {item.kind === 'podcast' ? <Headphones size={42} aria-hidden="true" /> : <PlayCircle size={48} aria-hidden="true" />}
              </span>
            </Link>
            <div className="video-feed-info">
              <span className="video-feed-kind">{item.category}</span>
              <h2>{item.title}</h2>
              {!item.deadLink && <Link href={item.href} prefetch={false}>Ouvrir la fiche</Link>}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
