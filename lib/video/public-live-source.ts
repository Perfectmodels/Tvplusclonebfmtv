export type PublicLiveSource = {
  enabled: boolean;
  mode: 'hls' | 'iframe';
  hlsUrl: string;
  embedUrl: string;
  externalUrl: string;
  title: string;
  description: string;
  standbyMessage: string;
};

/** L'absence de diffusion configurée ne déclenche jamais un flux de secours. */
export const offlineLiveSource: PublicLiveSource = {
  enabled: false,
  mode: 'iframe',
  hlsUrl: '',
  embedUrl: '',
  externalUrl: '',
  title: 'TV+ Afrique en direct',
  description: '',
  standbyMessage: 'Aucun flux n’est actuellement diffusé.',
};

/**
 * Résolution unique des paramètres de la régie pour les trois lecteurs publics.
 * Aucune URL vidéo n'est codée en dur : la source vient de /api/live-stream.
 */
export function resolvePublicLiveSource(config: unknown): PublicLiveSource {
  if (!config || typeof config !== 'object') return offlineLiveSource;
  const value = config as Record<string, unknown>;
  const hlsUrl = typeof value.hlsUrl === 'string' ? value.hlsUrl : '';
  const embedUrl = typeof value.embedUrl === 'string' ? value.embedUrl : '';
  const standbyMessage = typeof value.standbyMessage === 'string' && value.standbyMessage
    ? value.standbyMessage
    : offlineLiveSource.standbyMessage;

  if (value.enabled !== true || (!hlsUrl && !embedUrl)) {
    return { ...offlineLiveSource, standbyMessage };
  }
  return {
    enabled: true,
    mode: embedUrl ? 'iframe' : 'hls',
    hlsUrl,
    embedUrl,
    externalUrl: typeof value.playbackUrl === 'string' ? value.playbackUrl : '',
    title: typeof value.title === 'string' && value.title ? value.title : 'En direct',
    description: typeof value.description === 'string' ? value.description : '',
    standbyMessage,
  };
}

// Les lecteurs sur une même page se partagent une seule requête de configuration.
const CLIENT_CACHE_MS = 2 * 60 * 1000;
let cachedSource: { value: PublicLiveSource; at: number } | null = null;
let inFlight: Promise<PublicLiveSource> | null = null;

export async function fetchPublicLiveSource(): Promise<PublicLiveSource> {
  if (cachedSource && Date.now() - cachedSource.at < CLIENT_CACHE_MS) return cachedSource.value;
  if (inFlight) return inFlight;

  inFlight = (async () => {
    try {
      // Le navigateur peut conserver la petite configuration selon les en-têtes du CDN.
      // Aucun flux vidéo ni jeton Restream ne passe par cette requête.
      const response = await fetch('/api/live-stream');
      if (!response.ok) return offlineLiveSource;
      const body = await response.json();
      const result = resolvePublicLiveSource(body?.data);
      cachedSource = { value: result, at: Date.now() };
      return result;
    } catch {
      return offlineLiveSource;
    }
  })().finally(() => { inFlight = null; });

  return inFlight;
}
