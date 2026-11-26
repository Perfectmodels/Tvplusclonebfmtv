import { z } from 'zod';

export const seoSuggestionsSchema = z.object({
  titles: z.array(z.string().trim().min(5).max(100)).length(5),
  description: z.string().trim().min(35).max(165),
  keywords: z.array(z.string().trim().min(2).max(65)).min(1).max(8),
  summary: z.string().trim().min(10).max(500),
  social: z.string().trim().min(10).max(500),
  questions: z.array(z.string().trim().min(5).max(140)).max(4),
});
export type SeoSuggestions = z.infer<typeof seoSuggestionsSchema>;
