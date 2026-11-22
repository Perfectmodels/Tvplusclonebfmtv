'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Maximize2, Minimize2, Radio, X } from 'lucide-react';
import TvPlusLogo from '../TvPlusLogo';
import { DEMO_CHANNEL } from '../../lib/video/demo-channel';
import { usePublicLiveSource } from '../../hooks/use-public-live-source';

export default function HomeLiveDock() {
  const anchorRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const config = usePublicLiveSource();
  const [useYouTube, setUseYouTube] = useState(false);
  const [docked, setDocked] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState(false);
  const [muted, setMuted] = useState(true);
  const [videoPlaying, setVideoPlaying] = useState(false);

  // La référence reste dans la mise en page : seul le lecteur passe en position fixe.
  useEffect(() => {
    const update = () => {
      const rect = anchorRef.current?.getBoundingClientRect();
      setDocked(Boolean(rect && rect.bottom < 122));
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  useEffect(() => {
    if (!expanded) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setExpanded(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [expanded]);

  const floating = docked && !dismissed;
  const showPlayer = !dismissed || !docked;
  const hlsUrl = config?.hlsUrl || '';
  const embedUrl = config?.isDemo && useYouTube ? DEMO_CHANNEL.youtubeEmbedUrl : config?.embedUrl || '';
  const playbackUrl = config?.externalUrl || '';
  const playerConfigured = Boolean(config && (hlsUrl || embedUrl));
  // Une simulation ou une iframe présente ne suffit pas à prouver un vrai direct TV+.
  const isBroadcasting = Boolean(config && !config.isDemo && hlsUrl && videoPlaying);

  useEffect(() => {
    if (!showPlayer || !hlsUrl || embedUrl) return;
    const video = videoRef.current;
    if (!video) return;
    let cancelled = false;
    let destroy: (() => void) | undefined;
    const start = async () => {
      setError(false);
      try {
        if (video.canPlayType('application/vnd.apple.mpegurl')) {
          video.src = hlsUrl;
          await video.play().catch(() => undefined);
          return;
        }
        const { default: Hls } = await import('hls.js');
        if (cancelled) return;
        if (!Hls.isSupported()) {
          setError(true);
          return;
        }
        const hls = new Hls({ lowLatencyMode: true, backBufferLength: 20 });
        destroy = () => hls.destroy();
        hls.loadSource(hlsUrl);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          if (!cancelled) void video.play().catch(() => undefined);
        });
        hls.on(Hls.Events.ERROR, (_event: unknown, info: { fatal?: boolean }) => {
          if (!cancelled && info.fatal) setError(true);
        });
      } catch {
        if (!cancelled) setError(true);
      }
    };
    void start();
    return () => {
      cancelled = true;
      destroy?.();
      video.pause();
      video.removeAttribute('src');
      video.load();
    };
  }, [hlsUrl, embedUrl, showPlayer]);

  const closeFloating = useCallback(() => {
    setExpanded(false);
    setDismissed(true);
  }, []);

  return (
    <section className="home-live-anchor" ref={anchorRef} aria-label="Le direct TV+ Afrique">
      {expanded && (
        <button type="button" className="home-live-backdrop"
          aria-label="Réduire le lecteur agrandi" onClick={() => setExpanded(false)} />
      )}
      <div className="home-live-stage">
        {showPlayer && (
          <div className={'home-live-player' + (floating ? ' is-floating' : '') + (expanded ? ' is-expanded' : '')}
            role={expanded ? 'dialog' : 'region'}
            aria-modal={expanded ? true : undefined}
            aria-label={expanded ? 'Direct TV+ Afrique agrandi' : 'Lecteur TV+ Afrique'}>
            <div className="home-live-screen">
              {embedUrl ? (
                <iframe title={config?.isDemo ? 'France 24 — démonstration' : 'Direct TV+ Afrique'} src={embedUrl}
                  allow="autoplay; fullscreen; picture-in-picture"
                  allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
              ) : hlsUrl ? (
                <video ref={videoRef} playsInline controls muted={muted}
                  onVolumeChange={event => setMuted(event.currentTarget.muted)}
                  onPlaying={() => setVideoPlaying(true)}
                  onPause={() => setVideoPlaying(false)}
                  onWaiting={() => setVideoPlaying(false)}
                  onError={() => {setVideoPlaying(false);setError(true);}}
                  aria-label={config?.isDemo ? 'France 24 — démonstration' : 'Vidéo en direct TV+ Afrique'} />
              ) : (
                <div className="home-live-standby">
                  <TvPlusLogo />
                  <p>{config ? config.standbyMessage || 'Le signal est indisponible.' : 'Chargement du direct…'}</p>
                  {playbackUrl && <a href={playbackUrl} target="_blank" rel="noopener noreferrer">
                    Regarder sur la plateforme <ArrowUpRight size={15} />
                  </a>}
                </div>
              )}
              {error && hlsUrl && !embedUrl && (
                <div className="home-live-error" role="alert">
                  Le flux ne peut pas être lu.{' '}
                  {config?.isDemo && !useYouTube && (
                    <button type="button" onClick={() => { setError(false); setUseYouTube(true); }}>
                      Essayer le lecteur YouTube de France 24
                    </button>
                  )}{' '}
                  <Link href="/direct">Ouvrir le direct</Link>
                </div>
              )}
              <span className={'home-live-status' + (isBroadcasting ? ' is-on-air' : '')}>
                <Radio size={13} aria-hidden="true" /> {config?.isDemo ? 'DÉMONSTRATION · FRANCE 24' : isBroadcasting ? 'EN DIRECT' : playerConfigured ? 'LECTEUR DISPONIBLE' : 'HORS ANTENNE'}
              </span>
            </div>
            <div className="home-live-toolbar">
              <span className="home-live-toolbar-title">{config?.isDemo ? 'France 24 · vidéo de démonstration' : 'TV+ Afrique'}</span>
              <button type="button" className="home-live-expand"
                aria-label={expanded ? 'Réduire le direct' : 'Agrandir le direct'}
                onClick={() => setExpanded(value => !value)}>
                {expanded ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
                <span>{expanded ? 'Réduire' : 'Agrandir'}</span>
              </button>
              {(floating || expanded) && (
                <button type="button" className="home-live-close" aria-label="Fermer le lecteur flottant"
                  onClick={closeFloating}><X size={20} /></button>
              )}
            </div>
          </div>
        )}
        {docked && dismissed && (
          <div className="home-live-dismissed">
            <TvPlusLogo />
            <span>Lecteur flottant fermé. Retrouvez le direct ici.</span>
          </div>
        )}
      </div>
      <div className="home-live-details">
        <span className="home-live-details-eyebrow">{config?.isDemo ? 'DÉMONSTRATION · SOURCE EXTERNE' : 'TV+ AFRIQUE · DIFFUSION'}</span>
        <h2>{config?.isDemo ? 'Lecteur TV+ en démonstration' : config?.title || 'Regardez TV+ Afrique en direct'}</h2>
        <p>{config?.isDemo ? 'Test du lecteur avec France 24. Ce flux n’est pas une diffusion de TV+ Afrique.' : config?.description || 'Retrouvez nos émissions, reportages et grands rendez-vous.'}</p>
        <Link href="/direct" className="home-live-details-link">
          Accéder à la page Direct <ArrowUpRight size={17} />
        </Link>
      </div>
    </section>
  );
}
