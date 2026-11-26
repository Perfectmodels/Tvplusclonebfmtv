/**
 * Types des contenus éditoriaux. Les données sont lues dans Supabase
 * via lib/db/repository.ts ; aucun tableau statique n'est conservé ici.
 */

export type MediaItem = {
  id: string;
  title: string;
  category: string;
  image: string;
  duration: string;
  time: string;
  description: string;
  href?: string;
};

export type Program = {
  id: string;
  slug?: string;
  name: string;
  host: string;
  slot: string;
  category: string;
  image: string;
  description: string;
  introVideoUrl?: string | null;
};

export const videos: MediaItem[] = [];
export const programs: Program[] = [];
export const podcasts: MediaItem[] = [];

export const tvSchedule: { weekday?: number; time: string; title: string; category: string; live: boolean }[] = [];

export const channels: { name: string; tagline: string; image: string; kind: string }[] = [];

export const newsletters: { id: string; name: string; frequency: string; description: string }[] = [];

export const witnesses: {
  id: string;
  title: string;
  place: string;
  category: string;
  image: string;
}[] = [];

export const practicalServices: { name: string; description: string; href: string; icon: string }[] = [];
