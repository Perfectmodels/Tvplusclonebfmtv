'use client';

import { useEffect, useRef, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { DEMO_CHANNEL } from '../../lib/video/demo-channel';

type Source = {
  mode: 'hls' | 'iframe';
  url: string;
  externalUrl: string;
  isDemo: boolean;
  title: string;
};

const demo: Source = {
  mode: 'hls',
  url: DEMO_CHANNEL.hlsUrl,
  externalUrl: DEMO_CHANNEL.watchUrl,
  isDemo: true,
  title: DEMO_CHANNEL.name,
};

/** Lecteur intégré : flux TV+ configuré en priorité, sinon essai externe identifié. */
export default function DirectLiveStage() {
  const [source, setSource] = useState<Source | null>(null);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [useYouTube, setUseYouTube] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    let mounted = true;
    fetch('/api/live-stream', { cache: 'no-store' })
      .then((response) => {
        if (!response.ok) throw new Error('Configuration indisponible');
        return response.json();
      })
      .then((body) => {
        if (!mounted) return;
        const config = body?.data;
        const enabled = Boolean(config?.enabled);
        if (enabled && typeof config?.embedUrl === 'string' && config.embedUrl) {
          setSource({
            mode: 'iframe',
            url: config.embedUrl,
            externalUrl: config.playbackUrl || '',
            isDemo: false,
            title: config.title || 'TV+ Afrique',
          });
        } else if (enabled && typeof config?.hlsUrl === 'string' && config.hlsUrl) {
          setSource({
            mode: 'hls',
            url: config.hlsUrl,
            externalUrl: config.playbackUrl || '',
            isDemo: false,
            title: config.title || 'TV+ Afrique',
          });
        } else {
          setSource(demo);
        }
      })
      .catch(() => { if (mounted) setSource(demo); });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (source?.mode !== 'hls' || useYouTube) return;
    const video = videoRef.current;
    if (!video) return;
    let cancelled = false;
    let destroy: (() => void) | undefined;
    const connect = async () => {
      setError(false);
      try {
        if (video.canPlayType('application/vnd.apple.mpegurl')) {
          video.src = source.url;
          await video.play().catch(() => undefined);
          return;
        }
        const { default: Hls } = await import('hls.js');
        if (cancelled) return;
        if (!Hls.isSupported()) {
          setError(true);
          return;
        }
        const hls = new Hls({ lowLatencyMode: true, backBufferLength: 30 });
        destroy = () => hls.destroy();
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          if (!cancelled) void video.play().catch(() => undefined);
        });
        hls.on(Hls.Events.ERROR, (_event: unknown, detail: { fatal?: boolean }) => {
          if (!cancelled && detail.fatal) setError(true);
        });
        hls.loadSource(source.url);
        hls.attachMedia(video);
      } catch {
        if (!cancelled) setError(true);
      }
    };
    void connect();
    return () => {
      cancelled = true;
      destroy?.();
      video.pause();
      video.removeAttribute('src');
      video.load();
    };
  }, [source, retry, useYouTube]);

  return (
    <div className="direct-live-stage">
      <div style={{ position: 'relative', aspectRatio: '16 / 9', background: '#020617', overflow: 'hidden' }}>
        {source?.isDemo && useYouTube ? (
          <iframe
            title="France 24 — démonstration (YouTube)"
            src={DEMO_CHANNEL.youtubeEmbedUrl}
            style={{ width: '100%', height: '100%', border: 0, display: 'block' }}
            allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        ) : source?.mode === 'iframe' ? (
          <iframe
            title={source.title}
            src={source.url}
            style={{ width: '100%', height: '100%', border: 0, display: 'block' }}
            allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        ) : source?.mode === 'hls' ? (
          <video
            ref={videoRef}
            controls
            muted
            autoPlay
            playsInline
            aria-label={source.title}
            onError={() => setError(true)}
            onPlaying={() => setError(false)}
            style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
          />
        ) : (
          <p role="status" style={{ color: '#fff', textAlign: 'center', padding: '18% 12px' }}>
            Chargement du lecteur vidéo…
          </p>
        )}
        {error && source && (
          <div role="alert" style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 20, background: 'rgba(2,6,23,.91)', color: '#fff', textAlign: 'center' }}>
            <strong>Le flux vidéo ne peut pas être chargé sur ce navigateur.</strong>
            <button type="button" onClick={() => { setError(false); setRetry((n) => n + 1); }} style={{ border: '1px solid #fff', padding: '8px 16px', borderRadius: 6 }}>Réessayer</button>
            {source.isDemo && !useYouTube && (
              <button type="button" onClick={() => { setError(false); setUseYouTube(true); }} style={{ border: '1px solid #fff', padding: '8px 16px', borderRadius: 6 }}>Essayer le lecteur YouTube officiel</button>
            )}
            {source.externalUrl && <a href={source.externalUrl} rel="noopener noreferrer" target="_blank" style={{ color: '#93c5fd' }}>Regarder sur le site du diffuseur <ExternalLink size={14} style={{ display: 'inline' }} /></a>}
          </div>
        )}
        {source?.isDemo && (
          <span style={{ position: 'absolute', top: 12, left: 12, borderRadius: 4, padding: '6px 9px', background: 'rgba(8,38,92,.94)', fontSize: 11, color: '#fff', fontWeight: 700, pointerEvents: 'none' }}>
            DÉMONSTRATION · FRANCE 24
          </span>
        )}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '12px 14px', background: '#eef3fb', color: '#0b285a' }}>
        <span style={{ fontSize: 13 }}>
          {source?.isDemo
            ? 'Flux externe de test (France 24) — ce n’est pas le direct TV+ Afrique.'
            : source ? 'Diffusion TV+ Afrique configurée par la régie.' : 'Vérification de la diffusion…'}
        </span>
        {source?.externalUrl && (
          <a href={source.externalUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, textDecoration: 'underline', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            Voir sur le diffuseur <ExternalLink size={14} />
          </a>
        )}
      </div>
    </div>
  );
}
