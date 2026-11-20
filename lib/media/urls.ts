/** Ne présente pas un lien d'article RSS comme un lecteur vidéo ou audio. */
export function isPlayableVideoUrl(value?: string): boolean {
  if (!value) return false;
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol)) return false;
    const host = url.hostname.toLowerCase();
    return /(^|\.)(youtube\.com|youtu\.be|vimeo\.com|dailymotion\.com)$/.test(host)
      || /\.(mp4|webm|m3u8)(?:$|\?)/i.test(url.pathname + url.search);
  } catch { return false; }
}
export function isPlayableAudioUrl(value?: string): boolean {
  if (!value) return false;
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol)) return false;
    const host = url.hostname.toLowerCase();
    return /(^|\.)(spotify\.com|soundcloud\.com|deezer\.com|podcasts\.apple\.com)$/.test(host)
      || /\.(mp3|ogg|wav|m4a)(?:$|\?)/i.test(url.pathname + url.search);
  } catch { return false; }
}
