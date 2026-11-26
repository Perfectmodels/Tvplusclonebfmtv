import { isPanfilEbo } from '../articles/author-names';

export type AuthorStats = {
  id: string;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  photo_url: string | null;
  is_temporary: boolean;
  total: number;
  published: number;
  drafts: number;
  aliasIds?: string[];
};

export function consolidateAuthorStats(rows: AuthorStats[]): AuthorStats[] {
  const aliases = rows.filter((row) => isPanfilEbo(row.full_name));
  if (!aliases.length) return rows;
  const canonical = aliases.find((row) => row.full_name?.trim().toLowerCase() === 'panfil ebo') ?? aliases[0];
  const combined = aliases.reduce((total, row) => ({
    total: total.total + Number(row.total),
    published: total.published + Number(row.published),
    drafts: total.drafts + Number(row.drafts),
  }), { total: 0, published: 0, drafts: 0 });
  return [
    ...rows.filter((row) => !isPanfilEbo(row.full_name)),
    { ...canonical, ...combined, full_name: 'Panfil Ebo', aliasIds: aliases.filter((row) => row.id !== canonical.id).map((row) => row.id) },
  ].sort((a, b) => b.total - a.total || (a.full_name ?? '').localeCompare(b.full_name ?? '', 'fr'));
}
