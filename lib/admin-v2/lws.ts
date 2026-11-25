import 'server-only';
import type { V2Actor } from '../auth/v2-admin';
import type { createAuthClient } from '../auth/server';
import { ApiError } from '../api/response';

import { usesLwsCatalog } from '../db/lws-public';
export { usesLwsCatalog };

export async function newsroom<T>(actor: Pick<V2Actor,'id'|'permissions'>, operation: string, params: Record<string, unknown> = {}): Promise<T> {
  const key = process.env.LWS_EDITORIAL_SERVICE_KEY;
  if (!key) throw new ApiError('Connexion à la rédaction indisponible.', 503, 'UNAVAILABLE');
  const endpoint=process.env.LWS_EDITORIAL_API_URL;if(!endpoint)throw new ApiError('API MySQL non configurée.',503,'UNAVAILABLE');
  const url=new URL(endpoint);if(url.protocol!=='https:'||url.username||url.password)throw new ApiError('API LWS HTTPS requise.',503,'UNAVAILABLE');
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

type LwsCategoryRef = { id: string; slug: string; name: string; description: string; position: number; parent_id: string | null };
type LwsMediaRef = {
  id: string; media_url: string; original_path: string; alt_text: string; caption: string;
  credit: string; mime_type: string; width_px: number | null; height_px: number | null;
};

export async function getReferences(
  actor: Pick<V2Actor,'id'|'permissions'>,
  db: Awaited<ReturnType<typeof createAuthClient>>,
  categoryId: string | null | undefined,
  mediaId?: string | null,
) {
  {
    if (!categoryId && !mediaId) return { category: null, media: null };
    const result = await newsroom<{ categories: LwsCategoryRef[]; media: LwsMediaRef[] }>(actor, 'lookups', {
      ids: { categories: categoryId ? [categoryId] : [], media: mediaId ? [mediaId] : [] },
    });
    const category = result.categories.find((item) => item.id === categoryId) ?? null;
    const m = result.media.find((item) => item.id === mediaId) ?? null;
    return {
      category,
      media: m ? {
        id: m.id, original_path: m.original_path, media_url: m.media_url || m.original_path,
        alt_text: m.alt_text, caption: m.caption, credit: m.credit,
        mime_type: m.mime_type, width_px: m.width_px, height_px: m.height_px,
      } : null,
    };
  }
}
