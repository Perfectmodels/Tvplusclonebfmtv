import { categorySlug } from './categories';

const editorialOrder = [
  'politique', 'economie', 'societe', 'sport', 'culture', 'international',
  'justice', 'education', 'sante', 'environnement', 'technologie', 'faits-divers', 'actualite',
];

export function navigationCategories(categories: string[]) {
  const bySlug = new Map(categories.map((category) => [categorySlug(category), category]));
  return editorialOrder.flatMap((slug) => {
    const label = bySlug.get(slug);
    return label ? [label] : [];
  });
}
