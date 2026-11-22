'use client';

import { useEffect, useState } from 'react';
import { fetchPublicLiveSource, type PublicLiveSource } from '../lib/video/public-live-source';

/** Même résolution et même rafraîchissement pour tous les lecteurs publics. */
export function usePublicLiveSource(active = true): PublicLiveSource | null {
  const [source, setSource] = useState<PublicLiveSource | null>(null);

  useEffect(() => {
    if (!active) return;
    let mounted = true;
    const refresh = () => {
      void fetchPublicLiveSource().then((next) => {
        if (mounted) setSource(next);
      });
    };
    refresh();
    const interval = window.setInterval(refresh, 30_000);
    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, [active]);

  return active ? source : null;
}
