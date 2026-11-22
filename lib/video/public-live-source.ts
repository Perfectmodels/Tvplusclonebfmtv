import { DEMO_CHANNEL } from './demo-channel';

export type PublicLiveSource = {
  mode: 'hls' | 'iframe';
  hlsUrl: string;
  embedUrl: string;
  externalUrl: string;
  isDemo: boolean;
  title: string;
  description: string;
  standbyMessage: string;
};

export const demoLiveSource: PublicLiveSource = {
  mode: 'hls',
  hlsUrl: DEMO_CHANNEL.hlsUrl,
  embedUrl: '',
  externalUrl: DEMO_CHANNEL.watchUrl,
  isDemo: true,
  title: DEMO_CHANNEL.name,
  description: 'France 24 — flux externe de démonstration, distinct du direct TV+ Afrique.',
  standbyMessage: '',
};

/**
 * Normalisation UNIQUE pour la page /direct, le lecteur d'accueil flottant
 * et la fenêtre Live. La régie TV+ prévaut toujours sur la démonstration.
 */
export function resolvePublicLiveSource(config: unknown): PublicLiveSource {
  if (!config || typeof config !== 'object') return demoLiveSource;
  const value = config as Record<string, unknown>;
  const hlsUrl = typeof value.hlsUrl === 'string' ? value.hlsUrl : '';
  const embedUrl = typeof value.embedUrl === 'string' ? value.embedUrl : '';
  if (value.enabled !== true || (!hlsUrl && !embedUrl)) return demoLiveSource;
  return {
    mode: embedUrl ? 'iframe' : 'hls',
    hlsUrl,
    embedUrl,
    externalUrl: typeof value.playbackUrl === 'string' ? value.playbackUrl : '',
    isDemo: false,
    title: typeof value.title === 'string' && value.title ? value.title : 'TV+ Afrique',
    description: typeof value.description === 'string' ? value.description : '',
    standbyMessage: typeof value.standbyMessage === 'string' ? value.standbyMessage : '',
  };
}

export async function fetchPublicLiveSource(): Promise<PublicLiveSource> {
  try {
    const response = await fetch('/api/live-stream', { cache: 'no-store' });
    if (!response.ok) return demoLiveSource;
    const body = await response.json();
    return resolvePublicLiveSource(body?.data);
  } catch {
    return demoLiveSource;
  }
}
