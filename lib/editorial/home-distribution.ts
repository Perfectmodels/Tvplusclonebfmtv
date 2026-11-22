import type { Story } from '../data';
import { categorySlug } from '../categories';

type CategoryBlock = { name: string; items: Story[] };

/**
 * Une actualité n'est attribuée qu'à un seul bloc éditorial de l'accueil.
 * Ordre de priorité : alerte > une > titres secondaires > sélection
 * > fil d'actualité > rubriques. L'alerte conserve son rôle de bandeau.
 */
export function distributeHomepageStories(articles: Story[], categories: string[]) {
  const used = new Set<string>();
  const key = (story: Story) => story.shortId || story.slug;
  const available = (story: Story) => !used.has(key(story));
  const claim = (story: Story | undefined) => {
    if (!story || !available(story)) return false;
    used.add(key(story));
    return true;
  };

  const alert = articles.find(story => story.kind === 'alert');
  claim(alert);

  const hero = articles.find(story => story.featured && available(story))
    ?? articles.find(available);
  claim(hero);

  const rail = articles.filter(available).slice(0, 3);
  rail.forEach(claim);

  const selection: Story[] = [];
  const selectedCategories = new Set<string>();
  const chooseForSelection = (story: Story | undefined) => {
    if (!story || !available(story)) return;
    const cat = categorySlug(story.category);
    if (selectedCategories.has(cat)) return;
    claim(story);
    selectedCategories.add(cat);
    selection.push(story);
  };

  // L'actualité mise en avant par la rédaction prime dans la sélection.
  chooseForSelection(articles.find(story => story.featured && available(story)));
  for (const name of categories) {
    const slug = categorySlug(name);
    if (selectedCategories.has(slug)) continue;
    chooseForSelection(articles.find(story => available(story) && categorySlug(story.category) === slug));
  }

  const feed = articles.filter(available).slice(0, 8);
  feed.forEach(claim);

  // Les rubriques conservent leur composant « 1 grande + mini-articles ».
  const blocks: CategoryBlock[] = [];
  for (const name of categories) {
    const slug = categorySlug(name);
    const items = articles.filter(story => available(story) && categorySlug(story.category) === slug).slice(0, 10);
    if (!items.length) continue;
    items.forEach(claim);
    blocks.push({ name, items });
  }

  return { alert, hero, rail, selection, feed, blocks };
}
