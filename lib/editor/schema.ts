import { z } from 'zod';
import { slugSchema } from '../api/validate';

export const articleBaseSchema = z.object({
  slug: slugSchema,
  title: z.string().trim().min(5).max(180),
  chapter: z.string().trim().max(300).optional().nullable(),
  summary: z.string().trim().min(10).max(600),
  body: z.string().optional(),
  content_json: z.record(z.string(), z.unknown()).optional().nullable(),
  category_slug: z.string().trim().min(2).max(80),
  country_code: z.string().trim().length(2).default('GA'),
  province: z.string().trim().max(80).optional().nullable(),
  tags: z.array(z.string().trim().min(1).max(40)).max(12).default([]),
  keywords: z.array(z.string().trim().min(1).max(60)).max(12).default([]),
  author: z.string().trim().max(100).optional().nullable(),
  image_url: z.string().url().optional().nullable(),
  source_url: z.string().url().optional().nullable(),
  kind: z.enum(['live', 'alert', 'video', 'direct']).optional().nullable(),
  is_alert: z.boolean().optional(),
  featured: z.boolean().optional(),
  status: z.enum(['draft', 'review', 'needs_correction', 'validated', 'scheduled', 'published', 'archived']).default('draft'),
  seo_title: z.string().trim().max(160).optional().nullable(),
  seo_description: z.string().trim().max(300).optional().nullable(),
  canonical_url: z.string().url().optional().nullable(),
  robots: z.enum(['index,follow', 'noindex,follow', 'noindex,nofollow']).default('index,follow'),
  cover_alt: z.string().trim().max(200).optional().nullable(),
  cover_credit: z.string().trim().max(120).optional().nullable(),
  cover_caption: z.string().trim().max(300).optional().nullable(),
  source_media_id: z.string().uuid().optional().nullable(),
  scheduled_at: z.string().datetime().optional().nullable(),
});

export const articleCreateSchema = articleBaseSchema;

export const articleUpdateSchema = articleBaseSchema.partial().extend({
  expected_version: z.number().int().optional(),
}).refine((value) => Object.keys(value).some((k) => k !== 'expected_version'), {
  message: 'Aucune donnée à mettre à jour.',
});
