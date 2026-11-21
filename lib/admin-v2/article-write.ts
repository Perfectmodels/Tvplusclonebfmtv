import { z } from 'zod';
import { ApiError } from '../api/response';
import { renderTiptapHtml } from '../editor/render';
import { revalidatePath, revalidateTag } from 'next/cache';
import { COUNTRY_CODES, GABON_PROVINCES } from '../editor/countries';

export const articlePayload = z.object({
  title: z.string().trim().min(5).max(220),
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(120),
  excerpt: z.string().trim().min(1, 'Le chapeau est requis.').max(2000),
  category_id: z.string().uuid(),
  cover_media_id: z.string().uuid().nullable().optional(),
  content_json: z.unknown(),
  tags: z.array(z.string().trim().min(1).max(65)).max(20).default([]),
  seo_title: z.string().trim().max(200).nullable().optional(),
  seo_description: z.string().trim().max(320).nullable().optional(),
  country_code: z.string().refine(code => COUNTRY_CODES.includes(code), 'Code pays inconnu.').default('GA'),
  province_slug: z.string().trim().max(100).nullable().optional()
    .refine(slug => !slug || GABON_PROVINCES.some(p => p.value === slug), 'Province du Gabon inconnue.'),
  featured: z.boolean().default(false),
  is_alert: z.boolean().default(false),
});

export function cleanArticlePayload(input: unknown) {
  const parsed = articlePayload.safeParse(input);
  if (!parsed.success) throw new ApiError('Champs article invalides.', 400, 'BAD_REQUEST', parsed.error.flatten());
  const article = parsed.data;
  if (!article.content_json || typeof article.content_json !== 'object' ||
      (article.content_json as {type?:string}).type !== 'doc' ||
      JSON.stringify(article.content_json).length > 120_000) {
    throw new ApiError('Le contenu Tiptap est invalide ou trop volumineux.', 400);
  }
  const html = renderTiptapHtml(article.content_json);
  return {
    ...article,
    province_slug: article.country_code === 'GA' ? article.province_slug ?? null : null,
    content_html: html,
    cover_media_id: article.cover_media_id ?? null,
  };
}

export function invalidatePublicArticle(slug?: string) {
  revalidateTag('public-articles');
  revalidatePath('/');
  if (slug) revalidatePath('/article/' + slug);
}

