import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import type { FeedItem } from '../lib/rss/feeds';

/**
 * Deux présentations du fil News 24/7 :
 * - "full" : bandeau défilant (utilisable en largeur)
 * - "rail" : panneau vertical compact, placé à côté du grand article « À la une »
 * Les sources ne sont jamais affichées.
 */
export default function NewsTicker({
  items,
  variant = 'full',
  limit = 6,
}: {
  items: FeedItem[];
  variant?: 'full' | 'rail';
  limit?: number;
}) {
  if (!items.length) return null;

  if (variant === 'rail') {
    return (
      <section className="news-rail-panel" aria-label="News 24/7, l’actualité en continu">
        <header className="news-rail-head">
          <span className="news-rail-label">
            <span className="news-ticker-pulse" aria-hidden="true" />
            News 24/7
          </span>
          <Link href="/news-24-7" className="news-rail-more">
            Tout le fil <ChevronRight size={14} />
          </Link>
        </header>
        <div className="news-rail-list" tabIndex={0} role="region" aria-label="Faire défiler les actualités News 24/7">
          {items.slice(0, limit).map((item) => (
            <a
              href={item.href}
              className="news-rail-item"
              key={item.id}
              target="_blank"
              rel="noopener noreferrer"
            >
              <span className="news-rail-time">{item.time}</span>
              <span className="news-rail-title">{item.title}</span>
            </a>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="news-ticker" aria-label="News 24/7, l’actualité en continu">
      <div className="news-ticker-inner">
        <span className="news-ticker-label">
          <span className="news-ticker-pulse" aria-hidden="true" />
          News 24/7
        </span>

        <div className="news-ticker-viewport">
          <div className="news-ticker-track">
            {[0, 1].map((copy) => (
              <div className="news-ticker-group" key={copy} aria-hidden={copy === 1 ? 'true' : undefined}>
                {items.map((item) => (
                  <Link
                    href={item.href}
                    className="news-ticker-item"
                    key={`${copy}-${item.id}`}
                    tabIndex={copy === 1 ? -1 : undefined}
                  >
                    <span className="news-ticker-time">{item.time}</span>
                    <span className="news-ticker-title">{item.title}</span>
                  </Link>
                ))}
              </div>
            ))}
          </div>
        </div>

        <Link href="/news-24-7" className="news-ticker-more">
          Tout le fil <ChevronRight size={14} />
        </Link>
      </div>
    </section>
  );
}
