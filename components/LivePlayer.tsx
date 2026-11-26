import Link from 'next/link';
import { ChevronRight, Play } from 'lucide-react';
import TvPlusLogo from './TvPlusLogo';

export default function LivePlayer({
  image,
  title = 'Regarder le direct',
  description = 'Suivez les émissions et les dernières informations de TV+ Afrique.',
  now,
  href = '/direct',
  compact = false,
}: {
  image?: string;
  title?: string;
  description?: string;
  now?: string;
  href?: string;
  compact?: boolean;
}) {
  return (
    <section className={compact ? 'direct-strip is-compact' : 'direct-strip'} aria-label="Le direct TV Plus">
      <Link href="/direct" className="direct-player" aria-label="Accéder au direct Premium">
        {image ? <img className="direct-player-image" src={image} alt="" /> : (
          <span className="direct-player-placeholder tvplus-video-placeholder"><TvPlusLogo /></span>
        )}
        <span className="direct-player-badge"><span /> Direct TV+</span>
        <span className="play-button"><Play size={28} fill="currentColor" /></span>
      </Link>
      <div className="direct-strip-info">
        <h3>{title}</h3>
        <p>{description}</p>
        {now && <span className="direct-now">À l'antenne : <strong>{now}</strong></span>}
        <Link href={href} className="direct-cta">
          Accéder au direct <ChevronRight size={16} />
        </Link>
      </div>
    </section>
  );
}
