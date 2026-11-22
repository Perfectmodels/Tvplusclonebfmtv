/**
 * Source HLS publique pour vérifier le fonctionnement du lecteur.
 * Il ne s'agit jamais d'une diffusion produite par TV+ Afrique.
 * La régie officielle prévaut dès qu'un lecteur TV+ est activé.
 */
export const DEMO_CHANNEL = {
  name: 'France 24 — français',
  hlsUrl: 'https://live.france24.com/hls/live/2037179-b/F24_FR_HI_HLS/master_5000.m3u8',
  watchUrl: 'https://www.france24.com/fr/direct',
  youtubeEmbedUrl: 'https://www.youtube-nocookie.com/embed/live_stream?channel=UCCCPCZNChQdGa9EkATeye4g&autoplay=1&mute=1',
} as const;
