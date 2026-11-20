/** Slugs SEO réutilisables pour toutes les pages de rubriques. */
export function categorySlug(label: string): string {
  return label.trim().toLowerCase().normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function categoryHref(label: string): string {
  return '/rubrique/' + encodeURIComponent(categorySlug(label));
}
