import 'server-only';
import type { V2Actor } from '../auth/v2-admin';
import type { createAuthClient } from '../auth/server';
import { ApiError } from '../api/response';

import { usesLwsCatalog } from '../db/lws-public';
export { usesLwsCatalog };

export async function newsroom<T>(actor: Pick<V2Actor,'id'|'permissions'>, operation: string, params: Record<string, unknown> = {}): Promise<T> {
  // Migration : ne jamais transmettre un acteur Supabase au service privé MySQL.
  throw new ApiError('Module en cours de migration vers Supabase.',503,'UNAVAILABLE');
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
