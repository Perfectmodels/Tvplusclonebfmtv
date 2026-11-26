import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import RedLineCard from './RedLineCard';
import type { RedLineItem } from '../lib/media/red-line';

export default function RedLineStrip({
  title,
  href,
  items,
  emptyMessage,
  id,
}: {
  title: string;
  href: string;
  items: RedLineItem[];
  emptyMessage?: string;
  id?: string;
}) {
  if (!items.length && !emptyMessage) return null;
  return (
    <section id={id} className="tvplus-media-strip is-red" aria-label={title}>
      <header>
        <h2>{title}</h2>
        <Link href={href} aria-label={'Tout voir · ' + title}>Tout voir <ArrowRight size={16} /></Link>
      </header>
      {items.length ? (
        <div className="tvplus-media-track redline-track" tabIndex={0} role="region" aria-label={'Défiler : ' + title}>
          {items.map(item => <RedLineCard key={item.id} item={item} />)}
        </div>
      ) : (
        <p className="empty-state">{emptyMessage}</p>
      )}
    </section>
  );
}
