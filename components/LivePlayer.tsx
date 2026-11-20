import Link from 'next/link';
import { ChevronRight, Play } from 'lucide-react';

export default function LivePlayer({
  image,
  title = 'Regarder le direct',
  description = 'Suivez l’antenne TV Plus en continu : décryptages, débats et dernières informations du Gabon et du monde.',
  now = 'TV Plus Non-stop',
  href = '/direct',
  compact = false,
}: {
  image: string;
  title?: string;
  description?: string;
  now?: string;
  href?: string;
  compact?: boolean;
}) {
  return (
    <section className={compact ? 'direct-strip is-compact' : 'direct-strip'} aria-label="Le direct">
      <Link href={href} className="direct-player" data-open-live>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="direct-player-image" src={image} alt="" />
        <span className="direct-player-badge"><span /> Direct</span>
        <span className="play-button"><Play size={28} fill="currentColor" /></span>
      </Link>
      <div className="direct-strip-info">
        <h3>{title}</h3>
        <p>{description}</p>
        <span className="direct-now">En ce moment : <strong>{now}</strong></span>
        <Link href={href} className="direct-cta" data-open-live>
          Voir le direct <ChevronRight size={16} />
        </Link>
      </div>
    </section>
  );
}
