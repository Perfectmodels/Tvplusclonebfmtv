const panfilAliases = new Set(['ebo', 'panfil ebo', 'panfil']);

export function isPanfilEbo(name: string | null | undefined): boolean {
  return panfilAliases.has(name?.trim().replace(/\s+/g, ' ').toLowerCase() ?? '');
}

export function editorialAuthorName<T extends string | null | undefined>(name: T): T | 'Panfil Ebo' {
  return isPanfilEbo(name) ? 'Panfil Ebo' : name;
}
