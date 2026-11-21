'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  Maximize2,
  ExternalLink,
  Pause,
  PictureInPicture2,
  Play,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';

type LiveOverlayContextValue = {
  isOpen: boolean;
  open: () => void;
  close: () => void;
};

const LiveOverlayContext = createContext<LiveOverlayContextValue | null>(null);

export function useLiveOverlay() {
  const value = useContext(LiveOverlayContext);
  if (!value) throw new Error('useLiveOverlay doit être utilisé dans LiveOverlayProvider.');
  return value;
}

type Status = 'idle' | 'loading' | 'ready' | 'playing' | 'error' | 'no-stream';

export default function LiveOverlayProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState<Status>('idle');
  const [attempt, setAttempt] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<{ destroy: () => void } | null>(null);
  const fallbackStreamUrl = process.env.NEXT_PUBLIC_LIVE_STREAM_URL ?? '';
  const [streamUrl, setStreamUrl] = useState(fallbackStreamUrl);
  const [embedUrl, setEmbedUrl] = useState('');
  const [externalUrl, setExternalUrl] = useState('');
  const [standbyMessage, setStandbyMessage] = useState('Le direct reprendra prochainement.');

  // Le direct est configuré depuis l'admin, sans redéploiement ni stockage vidéo.
  // Le endpoint public est mis en cache côté CDN pendant 30 secondes.
  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    fetch('/api/live-stream')
      .then((response) => response.json())
      .then((body) => {
        if (!active) return;
        const config = body?.data;
        const configured = config?.enabled ? config.hlsUrl : '';
        setStreamUrl(config?.enabled ? configured : '');
        setEmbedUrl(config?.enabled ? config.embedUrl || '' : '');
        setExternalUrl(config?.enabled ? config.playbackUrl || '' : '');
        setStandbyMessage(config?.standbyMessage || 'Le direct reprendra prochainement.');
      })
      .catch(() => { if (active) {setStreamUrl(fallbackStreamUrl);setEmbedUrl('');setExternalUrl('');} });
    return () => { active = false; };
  }, [isOpen, fallbackStreamUrl]);

  const open = useCallback(() => {
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    const video = videoRef.current;
    if (video) {
      video.pause();
      if (document.pictureInPictureElement === video) {
        document.exitPictureInPicture().catch(() => {});
      }
    }
    hlsRef.current?.destroy();
    hlsRef.current = null;
    setIsOpen(false);
    setEmbedUrl('');
    setExternalUrl('');
    setPlaying(false);
    setStatus('idle');
  }, []);

  // Ouvre le lecteur depuis n'importe quel élément portant data-open-live.
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('[data-open-live]')) {
        event.preventDefault();
        open();
      }
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [open]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) close();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, close]);

  useEffect(() => {
    if (!isOpen) return;
    if (embedUrl) {setStatus('ready');return;}
    if (!streamUrl) {
      setStatus('no-stream');
      return;
    }

    let cancelled = false;
    const video = videoRef.current;
    if (!video) return;

    setStatus('loading');

    const attach = async () => {
      try {
        if (video.canPlayType('application/vnd.apple.mpegurl')) {
          video.src = streamUrl;
          setStatus('ready');
          video.play().catch(() => setStatus('ready'));
        } else {
          const { default: Hls } = await import('hls.js');
          if (cancelled) return;
          if (Hls.isSupported()) {
            const hls = new Hls({ lowLatencyMode: true, backBufferLength: 30 });
            hlsRef.current = hls;
            hls.loadSource(streamUrl);
            hls.attachMedia(video);
            hls.on(Hls.Events.MANIFEST_PARSED, () => {
              if (!cancelled) {
                setStatus('ready');
                video.play().catch(() => setStatus('ready'));
              }
            });
            hls.on(Hls.Events.ERROR, (_event: unknown, data: { fatal?: boolean }) => {
              if (data.fatal && !cancelled) setStatus('error');
            });
          } else {
            video.src = streamUrl;
            setStatus('ready');
            video.play().catch(() => setStatus('ready'));
          }
        }
      } catch {
        if (!cancelled) setStatus('error');
      }
    };

    attach();
    return () => {
      cancelled = true;
      hlsRef.current?.destroy();
      hlsRef.current = null;
    };
  }, [isOpen, streamUrl, attempt, embedUrl]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video || !['playing', 'ready'].includes(status)) return;
    if (video.paused) {
      video.play().catch(() => setStatus('error'));
    } else {
      video.pause();
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
  };

  const toggleFullscreen = () => {
    const node = videoRef.current?.parentElement;
    if (!node) return;
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else node.requestFullscreen?.().catch(() => {});
  };

  const togglePip = async () => {
    const video = videoRef.current;
    if (!video || !document.pictureInPictureEnabled) return;
    try {
      if (document.pictureInPictureElement === video) await document.exitPictureInPicture();
      else await video.requestPictureInPicture();
    } catch {
      // Le navigateur peut refuser PiP : on conserve le lecteur flottant.
    }
  };

  return (
    <LiveOverlayContext.Provider value={{ isOpen, open, close }}>
      {children}
      {isOpen && (
        <section className="live-overlay" role="region" aria-label="Lecteur direct TV Plus">
          <header className="live-overlay-head">
            <span className="live-overlay-badge"><span className="live-overlay-pulse" /> Direct</span>
            <span className="live-overlay-title">TV Plus — en direct</span>
            <button type="button" className="live-control-btn" onClick={close} aria-label="Fermer le lecteur">
              <X size={15} />
            </button>
          </header>

          <div className="live-overlay-body">
            {embedUrl ? (
              <iframe className="live-overlay-video" src={embedUrl} title="Direct TV+ Afrique" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
            ) : streamUrl ? (
              <video
                ref={videoRef}
                className="live-overlay-video"
                playsInline
                muted={muted}
                onPlaying={() => { setStatus('playing'); setPlaying(true); }}
                onPause={() => { setPlaying(false); setStatus('ready'); }}
                onWaiting={() => setStatus('loading')}
                onError={() => setStatus('error')}
              />
            ) : null}

            {!embedUrl && status !== 'playing' && (
              <div className="live-overlay-state" role="status">
                {status === 'no-stream' ? (
                  <>
                    <strong>Flux direct non configuré</strong>
                    <span>{standbyMessage}</span>
                  </>
                ) : status === 'ready' ? (
                  <strong>Appuyez sur Lecture pour regarder le direct.</strong>
                ) : status === 'error' ? (
                  <>
                    <strong>Impossible de charger le flux</strong>
                    <button type="button" className="live-retry" onClick={() => { setStatus('idle'); setAttempt((n) => n + 1); }}>
                      Réessayer
                    </button>
                  </>
                ) : (
                  <strong>Chargement du direct…</strong>
                )}
              </div>
            )}
          </div>

          <footer className="live-overlay-controls">
            {embedUrl || (externalUrl && !streamUrl) ? (
              <a href={externalUrl} target="_blank" rel="noopener noreferrer" className="live-control-btn" aria-label="Ouvrir sur le diffuseur">Ouvrir sur le diffuseur <ExternalLink size={15}/></a>
            ) : <>
            <button type="button" className="live-control-btn" onClick={togglePlay} aria-label={playing ? 'Mettre en pause' : 'Lecture'} disabled={status !== 'playing' && status !== 'ready'}>
              {playing ? <Pause size={15} /> : <Play size={15} />}
            </button>
            <button type="button" className="live-control-btn" onClick={toggleMute} aria-label={muted ? 'Activer le son' : 'Couper le son'} disabled={status !== 'playing' && status !== 'ready'}>
              {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
            </button>
            <button type="button" className="live-control-btn" onClick={togglePip} aria-label="Picture in picture" disabled={status !== 'playing' && status !== 'ready'}>
              <PictureInPicture2 size={15} />
            </button>
            <button type="button" className="live-control-btn" onClick={toggleFullscreen} aria-label="Plein écran" disabled={status !== 'playing' && status !== 'ready'}>
              <Maximize2 size={15} />
            </button>
            </>}
            <span className="live-overlay-watermark">TV+</span>
          </footer>
        </section>
      )}
    </LiveOverlayContext.Provider>
  );
}
