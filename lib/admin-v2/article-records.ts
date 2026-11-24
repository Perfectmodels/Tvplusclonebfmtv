import 'server-only';
import { getExternalMediaUrl } from '../media-url';
import type { createAuthClient } from '../auth/server';
import type { V2Actor } from '../auth/v2-admin';
import { newsroom } from './lws';

export type ArticleAdminRow = {
  id: string; slug: string; short_code: string; title: string; excerpt?: string;
  status: string; category_id: string; cover_media_id: string | null; author_id: string;
  reviewed_by?: string | null; featured?: boolean; is_alert?: boolean;
  created_at: string; updated_at: string; published_at: string | null;
};
export type EnrichedArticle = ArticleAdminRow & {
  category_name: string; author_name: string; publisher_name: string | null;
  cover_url: string | null; cover_alt: string;
};

type AuthDb = Awaited<ReturnType<typeof createAuthClient>>;

/** Enrichissement MySQL : une seule opération LWS, aucun appel Supabase. */
export async function enrichArticleRowsFromMysql(
  actor: Pick<V2Actor,'id'|'permissions'>,
  rows: ArticleAdminRow[],
): Promise<EnrichedArticle[]> {
  if (!rows.length) return [];
  const ids = {
    profiles: [...new Set(rows.flatMap((row) => [row.author_id, row.reviewed_by]).filter((id): id is string => !!id))],
    categories: [...new Set(rows.map((row) => row.category_id))],
    media: [...new Set(rows.map((row) => row.cover_media_id).filter((id): id is string => !!id))],
  };
  const result = await newsroom<{
    profiles: { id: string; full_name: string | null }[];
    categories: { id: string; name: string }[];
    media: { id: string; media_url: string; original_path: string; alt_text: string }[];
  }>(actor, 'lookups', { ids });
  const profileMap = new Map(result.profiles.map((item) => [item.id, item.full_name || 'Rédaction TV+']));
  const categoryMap = new Map(result.categories.map((item) => [item.id, item.name]));
  const mediaMap = new Map(result.media.map((item) => [item.id, item]));
  return rows.map((row) => {
    const cover = row.cover_media_id ? mediaMap.get(row.cover_media_id) : null;
    return {
      ...row,
      category_name: categoryMap.get(row.category_id) || 'Actualité',
      author_name: profileMap.get(row.author_id) || 'Rédaction TV+',
      publisher_name: row.reviewed_by ? profileMap.get(row.reviewed_by) ?? null : null,
      cover_url: cover ? cover.media_url || cover.original_path : null,
      cover_alt: cover?.alt_text || row.title,
    };
  });
}

/** Agrégation en lots : trois requêtes au maximum, indépendamment du nombre de cartes affichées. */
export async function enrichArticleRows(db: AuthDb, rows: ArticleAdminRow[]): Promise<EnrichedArticle[]> {
  if (!rows.length) return [];
  const mediaIds = [...new Set(rows.map(row => row.cover_media_id).filter((id): id is string => !!id))];
  const profileIds = [...new Set(rows.flatMap(row => [row.author_id,row.reviewed_by]).filter((id): id is string => !!id))];
  const categoryIds = [...new Set(rows.map(row => row.category_id))];
  const [media, profiles, categories] = await Promise.all([
    mediaIds.length ? db.from('media').select('id,bucket,path,imgbb_url,alt').in('id', mediaIds) :
      Promise.resolve({ data: [], error: null }),
    profileIds.length ? db.from('profiles').select('id,full_name').in('id', profileIds) :
      Promise.resolve({ data: [], error: null }),
    categoryIds.length ? db.from('categories').select('id,name').in('id', categoryIds) :
      Promise.resolve({ data: [], error: null }),
  ]);
  if (media.error || profiles.error || categories.error)
    throw new Error('Impossible de charger les informations complémentaires des articles.');
  const mediaMap = new Map((media.data ?? []).map(item => [item.id, item]));
  const profilesMap = new Map((profiles.data ?? []).map(item => [item.id, item.full_name || 'Rédaction TV+']));
  const categoryMap = new Map((categories.data ?? []).map(item => [item.id, item.name]));
  return rows.map(row => {
    const cover = row.cover_media_id ? mediaMap.get(row.cover_media_id) : null;
    const coverUrl = cover
      ? (getExternalMediaUrl(cover) || (cover.bucket && cover.path
          ? db.storage.from(cover.bucket).getPublicUrl(cover.path).data.publicUrl
          : null))
      : null;
    return {
      ...row,
      category_name: categoryMap.get(row.category_id) || 'Actualité',
      author_name: profilesMap.get(row.author_id) || 'Rédaction TV+',
      publisher_name: row.reviewed_by ? profilesMap.get(row.reviewed_by) ?? null : null,
      cover_url: coverUrl,
      cover_alt: cover?.alt || row.title,
    };
  });
}
