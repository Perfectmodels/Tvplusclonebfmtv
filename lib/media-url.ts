export const BLOB_MEDIA_BUCKET = 'vercel-blob';

export function isPublicBlobHost(host: string): boolean {
  return /^[a-z0-9]+\.public\.blob\.vercel-storage\.com$/i.test(host);
}

export function getExternalMediaUrl(media: {
  bucket: string;
  path: string;
  imgbb_url: string | null;
}): string | null {
  if (media.bucket !== BLOB_MEDIA_BUCKET) return media.imgbb_url;
  try {
    const url = new URL(media.path);
    if (url.protocol === 'https:' && !url.username && !url.password && !url.port && isPublicBlobHost(url.hostname)) {
      return url.href;
    }
  } catch {
    return null;
  }
  return null;
}
