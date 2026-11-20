import { readFileSync, writeFileSync } from 'node:fs';

const news = JSON.parse(readFileSync('/private/var/folders/ch/6221702s6dz3jcxyklqp2hk00000gn/T/opencode/real-news.json', 'utf8'));

const categories = ['Politique', 'International', 'Police-Justice', 'Société', 'Économie', 'Tech', 'Sport', 'Culture', 'Environnement'];
const images = {
  politique: '1529107386315-e1a2ed48a620',
  international: '1517457373958-b7bdd4587205',
  'police-justice': '1497366754035-f200968a6e72',
  societe: '1521737604893-d14cc237f11d',
  economie: '1454165804606-c3d57bc86b40',
  tech: '1519389950473-47ba0277781c',
  sport: '1461896836934-ffe607ba8211',
  culture: '1492684223066-81342ee5ff30',
  environnement: '1441974231531-c6227db76b6e',
};
const categoryOf = (slug) => categories.find((c) => c.toLowerCase() === slug) ?? slug;
const img = (id, w = 1100) => `https://images.unsplash.com/photo-${id}?w=${w}&q=80&fit=crop`.replace(/'/g, "\\'");
const rel = (iso) => {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days <= 0) return 'À l’instant';
  if (days === 1) return 'Hier';
  if (days < 30) return `Il y a ${days} jours`;
  const m = Math.floor(days / 30);
  return m === 1 ? 'Il y a 1 mois' : `Il y a ${m} mois`;
};

const feedKeys = {
  Politique: 'politique', International: 'international', 'Police-Justice': 'police-justice',
  Société: 'societe', Économie: 'economie', Tech: 'tech', Sport: 'sport', Culture: 'culture', Environnement: 'environnement',
};
const short = (s, max = 46) => {
  if (!s || s.length <= max) return s ?? '';
  const cut = s.slice(0, max);
  return cut.slice(0, cut.lastIndexOf(' ')) + '…';
};

const stories = [];
for (const cat of categories) {
  const slug = feedKeys[cat];
  for (const item of news[slug] ?? []) {
    stories.push({
      slug: item.slug,
      category: cat,
      title: item.title,
      summary: item.title,
      image: img(images[slug]),
      time: 'Récemment',
      sourceUrl: item.link,
      publishedAt: item.publishedAt,
    });
  }
}

const q = (s) => JSON.stringify(s);
const storyLines = stories.map((s) => `  { slug: ${q(s.slug)}, category: ${q(s.category)}, title: ${q(s.title)}, summary: ${q(s.summary)}, image: ${q(s.image)}, time: ${q(rel(s.publishedAt))}, sourceUrl: ${q(s.sourceUrl)}, publishedAt: ${q(s.publishedAt)} },`).join('\n');

const filActu = stories.slice(0, 12).map((s) => { const d = new Date(s.publishedAt); const t = Number.isNaN(d.getTime()) ? 'À l’instant' : d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }); return `  { time: ${q(t)}, category: ${q(s.category)}, title: ${q(s.title)}, summary: ${q(s.summary)}, slug: ${q(s.slug)}, image: ${q(s.image)} },`; }).join('\n');

const content = `export const categories = [
${categories.map((c) => `  ${q(c)},`).join('\n')}
];

export type StoryKind = 'live' | 'alert' | 'video' | 'direct';

export type Story = {
  slug: string;
  category: string;
  title: string;
  summary: string;
  image: string;
  time: string;
  kind?: StoryKind;
  featured?: boolean;
  sourceUrl?: string;
  publishedAt?: string;
};

export const topics = [
  ${q(short(stories[0]?.title))},
  ${q(short(stories[8]?.title))},
  ${q(short(stories[12]?.title))},
  ${q(short(stories[14]?.title))},
];

/** Actualités gabonaises réelles, issues de flux RSS publics (2 par rubrique). */
export const stories: Story[] = [
${storyLines}
];

export const topicLinks: Record<string, string> = Object.fromEntries(
  topics.map((topic, i) => [topic, stories[i * 2]?.sourceUrl ?? '/article/' + stories[0].slug]),
);

export const filActu: {
  time: string;
  category: string;
  title: string;
  summary: string;
  slug: string;
  image?: string;
}[] = [
${filActu}
];

export const directChannels = [
  { name: 'TV Plus Gabon', note: 'En direct', image: ${q(img('1519501025264-65ba15a82390', 600))} },
  { name: 'TV Plus Afrique', note: 'En direct', image: ${q(img('1517457373958-b7bdd4587205', 600))} },
  { name: 'Le fil info', note: 'En continu', image: ${q(img('1529107386315-e1a2ed48a620', 600))} },
];

export const sitemapCategories = categories;
`;

writeFileSync('lib/data.ts', content);
console.log('GENERATED', stories.length, 'stories');
