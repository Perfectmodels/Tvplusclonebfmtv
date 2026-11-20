export type RssSource = { id?: string; name: string; url: string; active?: boolean };

/** Repli si la table rss_sources est indisponible. Les noms restent internes. */
export const DEFAULT_FEEDS: RssSource[] = [
  { name: 'Gabon', url: 'https://news.google.com/rss/search?q=Gabon&hl=fr&gl=FR&ceid=FR:fr' },
  { name: 'Libreville', url: 'https://news.google.com/rss/search?q=Libreville&hl=fr&gl=FR&ceid=FR:fr' },
  { name: 'Afrique', url: 'https://news.google.com/rss/search?q=Afrique&hl=fr&gl=FR&ceid=FR:fr' },
  { name: 'International', url: 'https://news.google.com/rss/search?q=International&hl=fr&gl=FR&ceid=FR:fr' },
  { name: 'RFI Afrique', url: 'https://www.rfi.fr/fr/rss' },
  { name: 'France 24', url: 'https://www.france24.com/fr/rss' },
  { name: 'Gabonreview', url: 'https://www.gabonreview.com/feed/' },
];

export type FeedItem = {
  id: string;
  title: string;
  href: string;
  time: string;
  summary: string;
};

export type NormalizedItem = {
  guid: string;
  title: string;
  link: string;
  description: string;
  publishedAt: string | null;
};
