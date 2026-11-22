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
  mode: 'hls',
  hlsUrl: '',
  embedUrl: '',
  externalUrl: '',
  title: 'TV+ Afrique',
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

export async function fetchPublicLiveSource(): Promise<PublicLiveSource> {
  try {
    const response = await fetch('/api/live-stream', { cache: 'no-store' });
    if (!response.ok) return offlineLiveSource;
    const body = await response.json();
    return resolvePublicLiveSource(body?.data);
  } catch {
    return offlineLiveSource;
  }
}
