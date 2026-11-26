'use client';

import { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { parseVideoUrl, videoEmbedUrl, videoFeedUrl } from '../../lib/video/providers';

/**
 * Aperçu vidéo silencieux : il ne monte le lecteur que lorsqu'il est réellement visible.
 * Sans `active`, l'intersection avec la fenêtre décide de la lecture.
 */
export default function AutoplayVideo({
  source,
  cover,
  title,
  active,
  showSound = false,
  className = '',
}: {
  source: string;
  cover?: string;
  title: string;
  active?: boolean;
  showSound?: boolean;
  className?: string;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    if (active !== undefined || !container.current) return;
    const observer = new IntersectionObserver(entries => {
      setInView(entries.some(entry => entry.isIntersecting && entry.intersectionRatio >= 0.6));
    }, { threshold: [0, 0.6, 1] });
    observer.observe(container.current);
    return () => observer.disconnect();
  }, [active]);

  const playing = active === undefined ? inView : active;
  const link = parseVideoUrl(source);
  const direct = /\.(mp4|webm)(?:\?|$)/i.test(source);
  const embed = link ? videoEmbedUrl(link.platform, link.externalId, source) : '';
  const feed = embed && link ? videoFeedUrl(embed, link.platform, muted) : '';

  return (
    <div ref={container} className={'autoplay-video ' + className}>
      {cover && (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="autoplay-video__cover" src={cover} alt="" loading="lazy" decoding="async" />
      )}
      {playing && direct && (
        // eslint-disable-next-line jsx-a11y/media-has-caption
        <video className="autoplay-video__player" src={source} poster={cover} autoPlay muted={muted} playsInline loop preload="none" />
      )}
      {playing && !direct && feed && (
        <iframe
          className="autoplay-video__player"
          src={feed}
          title={'Lecture : ' + title}
          allow="autoplay; fullscreen; picture-in-picture"
          referrerPolicy="strict-origin-when-cross-origin"
          loading="lazy"
        />
      )}
      {playing && showSound && (direct || feed) && (
        <button
          type="button"
          className="autoplay-video__sound"
          onClick={() => setMuted(value => !value)}
          aria-label={muted ? 'Activer le son' : 'Couper le son'}
        >
          {muted ? <VolumeX size={17} /> : <Volume2 size={17} />}
        </button>
      )}
    </div>
  );
}
