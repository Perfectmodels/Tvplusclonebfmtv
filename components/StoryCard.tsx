import Link from 'next/link';
import type { Story } from '../lib/data';
import { articlePath } from '../lib/articles/urls';
import TvPlusLogo from './TvPlusLogo';

type Variant = 'hero' | 'rail' | 'grid' | 'list';

function KindLabel({ kind }: { kind?: Story['kind'] }) {
  if (!kind) return null;
  const label =
    kind === 'live' ? 'Live en cours' : kind === 'alert' ? 'Alerte info' : kind === 'direct' ? 'Direct' : 'Vidéo';
  return <span className={'kind-label kind-' + kind}>{label}</span>;
}

export default function StoryCard({
  story,
  variant = 'grid',
}: {
  story: Story;
  variant?: Variant;
}) {
  // Toujours la page détail interne : URL courte et partageable.
  const href = articlePath(story);

  if (variant === 'hero') {
    return (
      <Link href={href} className="card-hero">
        {story.image ? <img src={story.image} alt="" className="card-hero-image" decoding="async" /> : <span className="card-hero-image card-image-placeholder"><TvPlusLogo /></span>}
        <span className="card-hero-shade" />
        <span className="card-hero-content">
          <span className="card-hero-top">
            <span className="category-label category-label-light">{story.category}</span>
            <KindLabel kind={story.kind} />
          </span>
          <span className="card-hero-title">{story.title}</span>
          <span className="card-hero-time">{story.time}</span>
        </span>
      </Link>
    );
  }

  if (variant === 'rail') {
    return (
      <Link href={href} className="card-rail">
        <span className="card-rail-thumb">
          {story.image ? <img src={story.image} alt="" loading="lazy" decoding="async" /> : <span className="card-image-placeholder"><TvPlusLogo /></span>}
        </span>
        <span className="card-rail-body">
          <span className="card-rail-meta">
            <span className="category-label">{story.category}</span>
            <KindLabel kind={story.kind} />
          </span>
          <span className="card-rail-title">{story.title}</span>
          <span className="card-time">{story.time}</span>
        </span>
      </Link>
    );
  }

  if (variant === 'list') {
    return (
      <Link href={href} className="card-list">
        <span className="category-label">{story.category}</span>
        <span className="card-list-title">{story.title}</span>
        <span className="card-time">{story.time}</span>
      </Link>
    );
  }

  return (
    <Link href={href} className="card-grid">
      <span className="card-grid-image">
        {story.image ? <img src={story.image} alt="" loading="lazy" decoding="async" /> : <span className="card-image-placeholder"><TvPlusLogo /></span>}
        {story.kind && (
          <span className="card-grid-badge">
            <KindLabel kind={story.kind} />
          </span>
        )}
      </span>
      <span className="card-grid-body">
        <span className="category-label">{story.category}</span>
        <span className="card-grid-title">{story.title}</span>
        <span className="card-time">{story.time}</span>
      </span>
    </Link>
  );
}
