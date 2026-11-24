import { XMLParser } from 'fast-xml-parser';
import type { NormalizedItem } from './feeds';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  trimValues: true,
  parseTagValue: false,
});

function text(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (typeof value === 'object' && '#text' in (value as Record<string, unknown>)) {
    return String((value as Record<string, unknown>)['#text'] ?? '');
  }
  return '';
}

function clean(value: string): string {
  return value
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function pickLink(value: unknown): string {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    const alternate = value.find((v) => (v as Record<string, string>)?.['@_rel'] === 'alternate');
    return pickLink(alternate ?? value[0]);
  }
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    return text(obj['@_href'] ?? obj['#text']);
  }
  return '';
}

/** Supprime le suffixe « - Nom du média » ajouté par Google News. */
function stripSourceSuffix(title: string): string {
  return title.replace(/\s+-\s+[^-]{2,60}$/, '').trim();
}

export function parseFeed(xml: string, isGoogleNews = false, summaryLimit = 320): NormalizedItem[] {
  const doc = parser.parse(xml) as Record<string, any>;
  const channel = doc?.rss?.channel ?? doc?.feed ?? {};
  const raw = channel.item ?? channel.entry ?? [];
  const items = Array.isArray(raw) ? raw : [raw];

  return items
    .map((item: Record<string, any>) => {
      let title = clean(text(item.title));
      if (isGoogleNews) title = stripSourceSuffix(title);
      const link = pickLink(item.link ?? item.guid ?? item.id);
      const rawDate = text(item.pubDate ?? item.published ?? item.updated ?? item['dc:date']);
      const parsed = rawDate ? new Date(rawDate) : null;
      const publishedAt = parsed && !Number.isNaN(parsed.getTime()) ? parsed.toISOString() : null;
      const guid = clean(text(item.guid ?? item.id)) || link;
      let description = clean(text(item.description ?? item.summary ?? item.content ?? ''));
      if (isGoogleNews) {
        // Google News ajoute le nom du média à la fin du résumé : on le retire.
        description = description
          .replace(/\s+-\s+[\w.-]+\.[a-z]{2,}(?:\/\S*)?$/i, '')
          .replace(/\s+[\w.-]+\.[a-z]{2,}$/i, '')
          .trim();
      }

      return {
        guid,
        title: title.slice(0, 220),
        link,
        description: description.slice(0, summaryLimit),
        publisher: clean(text(item.source)).slice(0, 120) || undefined,
        publishedAt,
      };
    })
    .filter((item: NormalizedItem) => item.title && item.link);
}
