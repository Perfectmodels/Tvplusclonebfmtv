import { z } from 'zod';
import { ApiError } from '../api/response';
import { renderTiptapHtml } from '../editor/render';
import { parseVideoUrl, videoEmbedUrl } from '../video/providers';
import { revalidatePath, revalidateTag } from 'next/cache';
import { COUNTRY_CODES, GABON_PROVINCES } from '../editor/countries';

export const articlePayload = z.object({
  title: z.string().trim().min(5).max(220),
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(120),
  excerpt: z.string().trim().min(1, 'Le chapeau est requis.').max(2000),
  category_id: z.string().uuid(),
  cover_media_id: z.string().uuid().nullable().optional(),
  content_json: z.unknown(),
  video_url: z.string().trim().max(1300).default(''),
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
  const { video_url, ...fields } = article;
  const doc = { ...(article.content_json as Record<string, unknown>) };
  delete doc.tvplusVideoUrl;
  const video = video_url ? parseVideoUrl(video_url) : null;
  if (video_url && (!video || !['youtube','facebook'].includes(video.platform))) throw new ApiError('Collez un lien vidéo public YouTube ou Facebook valide.', 400);
  if (video) doc.tvplusVideoUrl = video.url;
  const escape = (v:string) => v.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const embed = video ? videoEmbedUrl(video.platform,video.externalId,video.url) : '';
  const player = video && embed ? `<div class="article-video"><iframe src="${escape(embed)}" title="Reportage vidéo" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" allow="fullscreen; picture-in-picture; encrypted-media" allowfullscreen></iframe></div><p><a href="${escape(video.url)}" target="_blank" rel="noopener noreferrer">Voir la vidéo sur ${video.platform === 'youtube' ? 'YouTube' : 'Facebook'}</a></p>` : '';
  const html = player + renderTiptapHtml(doc);
  return {
    ...fields,
    content_json: doc,
    is_video_article: Boolean(video || /class="article-video"/.test(html)),
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

