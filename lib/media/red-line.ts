import 'server-only';
import { unstable_cache } from 'next/cache';
import { z } from 'zod';
import { getTvplusV2PublicClient } from '../db/v2-public';

const LEGACY_IMAGE_BASE = 'https://www.tvplusafrique.com/admin/img/uploads/posts/';

const metaSchema = z.object({
  person: z.string().trim().max(160).default(''),
  role: z.string().trim().max(160).default(''),
  quote: z.string().trim().max(2000).default(''),
}).default(() => ({ person: '', role: '', quote: '' }));

export type RedLineItem = {
  id: string;
  quote: string;
  person: string;
  role: string;
  image: string;
  href: string;
  publishedAt: string | null;
  /** Les anciens visuels contiennent déjà citation, nom et fonction. */
  legacy: boolean;
};

function imageUrl(value: string | null | undefined) {
  const raw = String(value ?? '').trim();
  if (/^https:\/\//i.test(raw)) return raw;
  if (/^[\w.-]+\.(?:jpe?g|png|webp)$/i.test(raw)) return LEGACY_IMAGE_BASE + encodeURIComponent(raw);
  return '';
}

/** Les anciennes fiches mettent parfois « nom - fonction » dans la description. */
function attribution(value: string | null | undefined) {
  const parts = String(value ?? '')
    .split(/\r?\n|\s*[|·]\s*|\s+—\s+|\s+-\s+/)
    .map(part => part.trim())
    .filter(Boolean);
  return { person: parts[0] ?? '', role: parts.slice(1).join(' — ') };
}

export const listRedLine = unstable_cache(async (limit = 8, page = 1) => {
  const size = Math.min(100, Math.max(1, limit));
  const start = (Math.max(1, page) - 1) * size;
  const { data, count, error } = await getTvplusV2PublicClient()
    .from('editorial_media')
    .select('id,title,description,thumbnail_url,published_at,studio_meta', { count: 'exact' })
    .eq('kind', 'ligne-rouge')
    .eq('status', 'published')
    .lte('published_at', new Date().toISOString())
    .order('published_at', { ascending: false })
    .range(start, start + size - 1);
  if (error) throw error;

  const items: RedLineItem[] = (data ?? []).map((row: {
    id: string;
    title: string | null;
    description: string | null;
    thumbnail_url: string | null;
    published_at: string | null;
    studio_meta: unknown;
  }) => {
    const meta = metaSchema.safeParse(row.studio_meta).data ?? metaSchema.parse({});
    const fallback = attribution(row.description);
    const rawThumb = String(row.thumbnail_url ?? '').trim();
    return {
      id: row.id,
      quote: meta.quote || String(row.title ?? ''),
      person: meta.person || fallback.person,
      role: meta.role || fallback.role,
      image: imageUrl(rawThumb),
      href: '/ligne-rouge#' + row.id,
      publishedAt: row.published_at,
      legacy: !/^https:\/\//i.test(rawThumb),
    };
  });
  return { items, total: count ?? items.length };
}, ['public-red-line'], { revalidate: 120, tags: ['editorial-media'] });
