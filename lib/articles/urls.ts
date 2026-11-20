import type { Story } from '../data';

/** Adresse publique définitive d'un article : l'URL courte. */
export function articlePath(story: Pick<Story, 'slug' | 'shortId'>): string {
  return story.shortId ? `/a/${story.shortId}` : `/article/${story.slug}`;
}
