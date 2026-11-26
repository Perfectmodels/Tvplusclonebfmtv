import Link from 'next/link';
import type { RedLineItem } from '../lib/media/red-line';

export default function RedLineCard({ item }: { item: RedLineItem }) {
  // Les visuels historiques sont déjà des affiches complètes : on ne rajoute aucun texte.
  if (item.legacy) {
    return (
      <Link href={item.href} className="redline-card is-legacy" aria-label={item.quote || 'Ligne Rouge'}>
        {item.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="redline-card__photo" src={item.image} alt={item.quote || ''} loading="lazy" decoding="async" />
        )}
      </Link>
    );
  }
  return (
    <Link href={item.href} className="redline-card" aria-label={[item.person, item.role].filter(Boolean).join(' — ') || 'Ligne Rouge'}>
      {item.image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="redline-card__photo" src={item.image} alt="" loading="lazy" decoding="async" />
      )}
      <span className="redline-card__veil" aria-hidden="true" />
      <span className="redline-card__mark" aria-hidden="true">&ldquo;</span>
      <span className="redline-card__quote">{item.quote}</span>
      <span className="redline-card__footer">
        {item.person && <strong className="redline-card__name">{item.person}</strong>}
        {item.role && <small className="redline-card__role">{item.role}</small>}
        <span className="redline-card__rule" aria-hidden="true" />
      </span>
      <span className="redline-card__brand" aria-hidden="true">TV+</span>
    </Link>
  );
}
