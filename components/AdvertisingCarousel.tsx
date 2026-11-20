'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import placements from '../data/homepage-ads.json';

type PlacementId = keyof typeof placements;
type Ad = {
  id: string;
  imageUrl: string;
  href: string;
  alt: string;
  advertiser: string;
};

const ROTATION_INTERVAL = 6000;
const placementLabels: Record<PlacementId, string> = {
  'after-hero': 'Bandeau publicitaire 1',
  'after-feed': 'Bandeau publicitaire 2',
  'after-live': 'Bandeau publicitaire 3',
  'after-selection': 'Bandeau publicitaire 4',
  'before-newsletter': 'Bandeau publicitaire 5',
};

export default function AdvertisingCarousel({ placement }: { placement: PlacementId }) {
  const ads: Ad[] = placements[placement];
  const [active, setActive] = useState(0);
  const [manualPause, setManualPause] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [inView, setInView] = useState(false);
  const [documentVisible, setDocumentVisible] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    const element = sectionRef.current;
    if (!element) return;
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      setInView(entry.isIntersecting);
    }, { threshold: 0.15 });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const update = () => setDocumentVisible(!document.hidden);
    update();
    document.addEventListener('visibilitychange', update);
    return () => document.removeEventListener('visibilitychange', update);
  }, []);

  useEffect(() => {
    if (ads.length < 2 || manualPause || hovered || focused || reducedMotion || !inView || !documentVisible) return;
    const timer = window.setInterval(() => {
      setActive((current) => (current + 1) % ads.length);
    }, ROTATION_INTERVAL);
    return () => window.clearInterval(timer);
  }, [ads.length, manualPause, hovered, focused, reducedMotion, inView, documentVisible]);

  if (!ads.length) return null;

  const current = ads[active] ?? ads[0];
  const validLink = /^https?:\/\//i.test(current.href) ? current.href : null;
  const graphic = current.imageUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className="advertising-carousel__image"
      src={current.imageUrl}
      alt={current.alt || (current.advertiser ? `Annonce de ${current.advertiser}` : 'Visuel publicitaire')}
      loading="lazy"
      decoding="async"
    />
  ) : (
    <div className="advertising-carousel__placeholder">
      <strong>Espace publicitaire</strong>
      <span>Emplacement {active + 1} sur {ads.length}</span>
    </div>
  );

  const move = (offset: number) => setActive((currentIndex) => (currentIndex + offset + ads.length) % ads.length);

  return (
    <section
      ref={sectionRef}
      className="advertising-carousel"
      aria-label={placementLabels[placement]}
      aria-roledescription="carrousel"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false);
      }}
    >
      <div className="advertising-carousel__heading">
        <span>Publicité</span>
        <span className="advertising-carousel__counter">{active + 1} / {ads.length}</span>
      </div>
      <div className="advertising-carousel__creative" role="group" aria-roledescription="diapositive"
        aria-label={`Publicité ${active + 1} sur ${ads.length}`}>
        {validLink && current.imageUrl ? (
          <a href={validLink} target="_blank" rel="noopener noreferrer sponsored" className="advertising-carousel__link"
            aria-label={`Voir l'annonce${current.advertiser ? ` de ${current.advertiser}` : ''} (nouvel onglet)`}>
            {graphic}
          </a>
        ) : graphic}
      </div>
      <div className="advertising-carousel__controls">
        <button type="button" className="advertising-carousel__control" onClick={() => move(-1)}
          aria-label={`Publicité précédente, ${placementLabels[placement]}`}>
          <ChevronLeft size={17} />
        </button>
        <div className="advertising-carousel__dots" role="group" aria-label="Choisir une publicité">
          {ads.map((ad, index) => (
            <button type="button" key={ad.id}
              className={`advertising-carousel__dot${active === index ? ' is-active' : ''}`}
              onClick={() => setActive(index)}
              aria-label={`Afficher la publicité ${index + 1}`}
              aria-pressed={active === index}
            />
          ))}
        </div>
        <button type="button" className="advertising-carousel__control" onClick={() => move(1)}
          aria-label={`Publicité suivante, ${placementLabels[placement]}`}>
          <ChevronRight size={17} />
        </button>
        <button type="button" className="advertising-carousel__control advertising-carousel__pause"
          onClick={() => setManualPause((value) => !value)}
          aria-label={manualPause ? 'Reprendre le défilement automatique' : 'Mettre le défilement automatique en pause'}
          aria-pressed={manualPause}>
          {manualPause ? <Play size={15} /> : <Pause size={15} />}
        </button>
      </div>
    </section>
  );
}
