import { z } from 'zod';

export const watchRegions = ['gabon', 'afrique'] as const;
export type WatchRegion = typeof watchRegions[number];

export type WatchItem = {
  id: string;
  title: string;
  source: string;
  href: string;
  summary: string;
  publishedAt: string | null;
  region: WatchRegion;
};

export const remixSchema = z.object({
  title: z.string().trim().min(5).max(200),
  excerpt: z.string().trim().min(15).max(320),
  paragraphs: z.array(z.string().trim().min(10).max(1000)).min(1).max(8),
  keywords: z.array(z.string().trim().min(2).max(65)).max(12),
});

export const watchDraftSchema = remixSchema.extend({
  region: z.enum(watchRegions),
  source: z.string().min(1).max(180),
  href: z.url({ protocol: /^https?$/ }).max(2400),
});

export type WatchDraft = z.infer<typeof watchDraftSchema>;
export const watchDraftKey = 'tvplus:veille:brouillon';
