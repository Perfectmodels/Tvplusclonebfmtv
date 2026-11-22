'use client';

import { useEffect, useState } from 'react';
import { fetchPublicLiveSource, type PublicLiveSource } from '../lib/video/public-live-source';

// Le signal vidéo est lu directement chez le diffuseur, jamais par une fonction Vercel.
// Limiter les vérifications de la régie réduit les Edge Requests et invocations Supabase.
const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

/** Même source régie pour /direct, accueil et lecteur flottant, sans sondage intensif. */
export function usePublicLiveSource(active = true): PublicLiveSource | null {
  const [source, setSource] = useState<PublicLiveSource | null>(null);

  useEffect(() => {
    if (!active) return;
    let mounted = true;
    let lastRefresh = 0;
    const refresh = () => {
      if (document.visibilityState === 'hidden') return;
      lastRefresh = Date.now();
      void fetchPublicLiveSource().then((next) => {
        if (mounted) setSource(next);
      });
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible' && Date.now() - lastRefresh >= REFRESH_INTERVAL_MS) {
        refresh();
      }
    };

    refresh();
    const interval = window.setInterval(refresh, REFRESH_INTERVAL_MS);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      mounted = false;
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [active]);

  return active ? source : null;
}
