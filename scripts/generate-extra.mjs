import { readFileSync, writeFileSync } from 'node:fs';

const news = JSON.parse(readFileSync('/private/var/folders/ch/6221702s6dz3jcxyklqp2hk00000gn/T/opencode/real-news.json', 'utf8'));
const categories = ['politique', 'international', 'police-justice', 'societe', 'economie', 'tech', 'sport', 'culture', 'environnement'];
const images = {
  politique: '1529107386315-e1a2ed48a620', international: '1517457373958-b7bdd4587205',
  'police-justice': '1497366754035-f200968a6e72', societe: '1521737604893-d14cc237f11d',
  economie: '1454165804606-c3d57bc86b40', tech: '1519389950473-47ba0277781c',
  sport: '1461896836934-ffe607ba8211', culture: '1492684223066-81342ee5ff30',
  environnement: '1441974231531-c6227db76b6e',
};
const labels = {
  politique: 'Politique', international: 'International', 'police-justice': 'Police-Justice',
  societe: 'Société', economie: 'Économie', tech: 'Tech', sport: 'Sport', culture: 'Culture', environnement: 'Environnement',
};
const q = (s) => JSON.stringify(s);
const img = (id, w = 900) => `https://images.unsplash.com/photo-${id}?w=${w}&q=80&fit=crop`;
const timeOf = (iso) => new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

const items = categories.flatMap((key) => (news[key] ?? []).map((n) => ({ ...n, key, image: img(images[key]), time: timeOf(n.publishedAt) })));
const mediaLines = (arr) => arr.map((n, i) => `  { id: ${q('m' + i)}, title: ${q(n.title)}, category: ${q(labels[n.key])}, image: ${q(n.image)}, duration: ${q(n.time)}, time: ${q(n.time)}, description: ${q(n.title)}, href: ${q(n.link)} },`).join('\n');

const content = `const img = (id: string, w = 900) => \`https://images.unsplash.com/photo-\${id}?w=\${w}&q=80&fit=crop\`;

export type MediaItem = {
  id: string;
  title: string;
  category: string;
  image: string;
  duration: string;
  time: string;
  description: string;
  href?: string;
};

/** Actualités réelles (RSS) — les « vidéos » et podcasts renvoient vers l'article d'origine. */
export const videos: MediaItem[] = [
${mediaLines(items.slice(0, 12)).replace(/\},$/gm, '},')}
];

export type Program = {
  id: string;
  name: string;
  host: string;
  slot: string;
  category: string;
  image: string;
  description: string;
};

export const programs: Program[] = [
  { id: 'p1', name: 'Première édition', host: 'La rédaction', slot: '06h00 – 08h30', category: 'Information', image: ${q(img(images.politique))}, description: 'Toute l’actualité du Gabon pour bien commencer la journée.' },
  { id: 'p2', name: 'Le fil info', host: 'La rédaction', slot: '09h00 – 12h00', category: 'Information', image: ${q(img(images.societe))}, description: 'L’information en continu, minute par minute.' },
  { id: 'p3', name: 'Midi 15h', host: 'La rédaction', slot: '12h00 – 15h00', category: 'Information', image: ${q(img(images.economie))}, description: 'Le grand rendez-vous d’information de la mi-journée.' },
  { id: 'p4', name: 'Le décryptage', host: 'La rédaction', slot: '15h00 – 17h00', category: 'Décryptage', image: ${q(img(images.politique))}, description: 'Comprendre les grands dossiers du jour.' },
  { id: 'p5', name: 'TV Plus Non-stop', host: 'La rédaction', slot: '17h00 – 19h00', category: 'Information', image: ${q(img(images.international))}, description: 'Les dernières informations et les réactions en direct.' },
  { id: 'p6', name: 'Le journal du sport', host: 'La rédaction', slot: '19h00 – 20h00', category: 'Sport', image: ${q(img(images.sport))}, description: 'Résultats, analyses et interviews.' },
];

export const podcasts: MediaItem[] = [
${mediaLines(items.slice(12, 18))}
];

export const tvSchedule = [
  { time: '06h00', title: 'Première édition', category: 'Information', live: false },
  { time: '09h00', title: 'Le fil info', category: 'Information', live: false },
  { time: '12h00', title: 'Midi 15h', category: 'Information', live: false },
  { time: '15h00', title: 'Le décryptage', category: 'Décryptage', live: false },
  { time: '17h00', title: 'TV Plus Non-stop', category: 'Information', live: true },
  { time: '19h00', title: 'Le journal du sport', category: 'Sport', live: false },
];

export const channels = [
  { name: 'TV Plus Gabon', tagline: 'La chaîne d’information en continu', image: ${q(img(images.politique, 700))}, kind: 'TNT' },
  { name: 'TV Plus Afrique', tagline: 'L’information au-delà des frontières', image: ${q(img(images.international, 700))}, kind: 'TNT' },
  { name: 'Le fil info', tagline: 'L’actualité en continu', image: ${q(img(images.societe, 700))}, kind: 'Web' },
];

export const newsletters = [
  { id: 'n1', name: 'Le Récap Actu', frequency: 'Chaque soir', description: 'L’essentiel de la journée en cinq minutes.' },
  { id: 'n2', name: 'Le Brief Politique', frequency: 'Chaque matin', description: 'Les coulisses et les décisions du pouvoir.' },
  { id: 'n3', name: 'Économie Express', frequency: 'Deux fois par semaine', description: 'Les chiffres et les tendances à connaître.' },
  { id: 'n4', name: 'Le Décryptage', frequency: 'Chaque semaine', description: 'Un grand dossier, éclairé par nos journalistes.' },
];

export const witnesses: {
  id: string; title: string; place: string; category: string; image: string;
}[] = [];

export const practicalServices = [
  { name: 'Programme TV', description: 'La grille des programmes TV Plus.', href: '/programme-tv', icon: 'tv' },
  { name: 'Canaux TV', description: 'Trouvez votre chaîne chez votre opérateur.', href: '/canaux-tv', icon: 'channels' },
  { name: 'Newsletters', description: 'Recevez l’info dans votre boîte mail.', href: '/newsletters', icon: 'mail' },
  { name: 'Podcasts', description: 'Écoutez nos contenus en différé.', href: '/podcasts', icon: 'audio' },
  { name: 'Vidéos', description: 'Toutes nos vidéos et reportages.', href: '/videos', icon: 'video' },
  { name: 'Contact', description: 'Une information, une question, un signalement.', href: '/contacts', icon: 'contact' },
];
`;
writeFileSync('lib/extra.ts', content);
console.log('EXTRA_GENERATED');
