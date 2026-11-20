/**
 * Types éditoriaux partagés.
 * Aucune donnée n'est codée en dur : toutes les actualités, rubriques et
 * sujets proviennent de Supabase (voir lib/db/repository.ts).
 */

export const categories: string[] = [];

export type StoryKind = 'live' | 'alert' | 'video' | 'direct';

export type Story = {
  slug: string;
  shortId?: string;
  category: string;
  title: string;
  summary: string;
  image: string;
  time: string;
  kind?: StoryKind;
  featured?: boolean;
  sourceUrl?: string;
  publishedAt?: string;
  updatedAt?: string;
  wordCount?: number;
  readingTime?: number;
};

export const topics: string[] = [];
export const topicLinks: Record<string, string> = {};
export const stories: Story[] = [];

export const filActu: {
  time: string;
  category: string;
  title: string;
  summary: string;
  slug: string;
  image?: string;
}[] = [];

export const directChannels: { name: string; note: string; image: string }[] = [];
export const sitemapCategories: string[] = [];
