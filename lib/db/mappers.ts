import type { Story } from '../data';
import type { ArticleRow, CategoryRow, FilActuRow } from './types';
import { relativeTime } from './format';

const CATEGORY_LABELS: Record<string, string> = {
  politique: 'Politique',
  international: 'International',
  'police-justice': 'Police-Justice',
  societe: 'Société',
  economie: 'Économie',
  tech: 'Tech',
  sport: 'Sport',
  culture: 'Culture',
  environnement: 'Environnement',
};

export function categoryLabel(slug: string): string {
  return CATEGORY_LABELS[slug] ?? slug.charAt(0).toUpperCase() + slug.slice(1);
}

export function mapArticle(row: ArticleRow): Story {
  return {
    slug: row.slug,
    shortId: row.short_id ?? undefined,
    category: categoryLabel(row.category_slug),
    title: row.title,
    summary: row.summary,
    image: row.image_url ?? '',
    time: relativeTime(row.published_at ?? row.created_at),
    sourceUrl: row.source_url ?? undefined,
    publishedAt: row.published_at ?? undefined,
    updatedAt: row.updated_at ?? undefined,
    wordCount: row.word_count,
    readingTime: row.reading_time,
    kind: row.is_alert ? 'alert' : (row.kind ?? undefined),
    featured: row.featured,
    countryCode: row.country_code,
    province: row.province,
    robots: row.robots,
    seoTitle: row.seo_title,
    seoDescription: row.seo_description,
    tags: row.tags ?? [],
  };
}

export function mapCategory(row: CategoryRow): string {
  return row.name;
}

export function mapFilActu(
  row: FilActuRow,
  article: Pick<ArticleRow, 'title' | 'summary' | 'image_url' | 'category_slug'>,
) {
  return {
    time: row.time_label,
    category: categoryLabel(article.category_slug),
    title: article.title,
    summary: article.summary,
    slug: row.article_slug,
    image: article.image_url ?? undefined,
  };
}
