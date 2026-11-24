import 'server-only';
import type { V2Actor } from '../auth/v2-admin';
import type { createAuthClient } from '../auth/server';
import { getExternalMediaUrl } from '../media-url';
import { ApiError } from '../api/response';

export { usesLwsCatalog } from '../db/lws-public';

export async function newsroom<T>(actor: V2Actor, operation: string, params: Record<string, unknown> = {}): Promise<T> {
  const key = process.env.LWS_EDITORIAL_SERVICE_KEY;
  if (!key) throw new ApiError('Connexion à la rédaction indisponible.', 503, 'UNAVAILABLE');
  const url = new URL(process.env.LWS_EDITORIAL_API_URL!);
  url.searchParams.set('resource', 'newsroom');
  const response = await fetch(url, {
    method: 'POST', cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(12000),
    headers: { 'content-type': 'application/json', 'x-tvplus-key': key },
    body: JSON.stringify({ ...params, operation, actor: { id: actor.id, permissions: actor.permissions } }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new ApiError(body.error || 'Service éditorial indisponible.', response.status,
      response.status === 409 ? 'CONFLICT' : response.status === 403 ? 'UNAUTHORIZED' : response.status === 404 ? 'NOT_FOUND' : 'UNAVAILABLE');
  }
  return await response.json() as T;
}

export async function getReferences(db: Awaited<ReturnType<typeof createAuthClient>>, categoryId: string, mediaId?: string | null) {
  const [category, media] = await Promise.all([
    db.from('categories').select('id,slug,name,description,position,parent_id').eq('id',categoryId).single(),
    mediaId ? db.from('media').select('id,path,bucket,imgbb_url,alt,caption,credit,mime_type,width,height').eq('id',mediaId).single()
      : Promise.resolve({ data: null, error: null }),
  ]);
  if (category.error || media.error) throw new ApiError('Rubrique ou média inaccessible.', 400);
  const m = media.data;
  return { category: category.data, media: m ? {
    id:m.id, original_path:m.path, media_url:getExternalMediaUrl(m) || db.storage.from(m.bucket).getPublicUrl(m.path).data.publicUrl,
    alt_text:m.alt, caption:m.caption, credit:m.credit, mime_type:m.mime_type, width_px:m.width, height_px:m.height,
  } : null };
}
