/** Slugs SEO réutilisables pour toutes les pages de rubriques. */
export function categorySlug(label: string): string {
  return label.trim().toLowerCase().normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function categoryHref(label: string): string {
  return '/rubrique/' + encodeURIComponent(categorySlug(label));
}

/** Libellés unifiés : les imports legacy et la V3 n'utilisent pas les mêmes accents. */
const CANONICAL_LABELS: Record<string, string> = {
  actualite: 'Actualité', economie: 'Économie', education: 'Éducation', sante: 'Santé',
  societe: 'Société', politique: 'Politique', international: 'International',
  justice: 'Justice', culture: 'Culture', environnement: 'Environnement',
  sport: 'Sport', 'fait-divers': 'Faits divers', 'faits-divers': 'Faits divers',
  technologie: 'Technologie', news24: 'News 24', 'news-24': 'News 24',
};

export function canonicalCategoryLabel(label: string): string {
  return CANONICAL_LABELS[categorySlug(label)] ?? label.trim();
}
