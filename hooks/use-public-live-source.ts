'use client';

import { useEffect, useState } from 'react';
import { fetchPublicLiveSource, type PublicLiveSource } from '../lib/video/public-live-source';

// Le lecteur Restream permanent surveille lui-même son état OFFLINE / LIVE.
// Ne jamais interroger Vercel ou Supabase pour chaque spectateur à chaque changement d'antenne.
const LEGACY_REFRESH_MS = 15 * 60 * 1000;
const isPermanentRestream = (source: PublicLiveSource | null) =>
  Boolean(source?.enabled && source.embedUrl.startsWith('https://player.restream.io/'));

/** Une requête lors de l'ouverture, puis aucun polling si Restream Embed est installé. */
export function usePublicLiveSource(active = true): PublicLiveSource | null {
  const [source, setSource] = useState<PublicLiveSource | null>(null);
  const permanent = isPermanentRestream(source);

  useEffect(() => {
    if (!active || permanent) return;
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
      if (document.visibilityState === 'visible' && Date.now() - lastRefresh >= LEGACY_REFRESH_MS) {
        refresh();
      }
    };

    refresh();
    // Seulement tant que YouTube ou un lecteur non permanent est utilisé.
    const interval = window.setInterval(refresh, LEGACY_REFRESH_MS);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      mounted = false;
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [active, permanent]);

  return active ? source : null;
}
