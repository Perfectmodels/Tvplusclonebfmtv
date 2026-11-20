import { readFileSync } from 'node:fs';

const placements = JSON.parse(readFileSync(new URL('../data/homepage-ads.json', import.meta.url), 'utf8'));
const expected = ['after-hero', 'after-feed', 'after-live', 'after-selection', 'before-newsletter'];
const errors = [];
const ids = new Set();

if (Object.keys(placements).length !== 5) errors.push('Cinq bandeaux sont requis.');
for (const location of expected) {
  const banners = placements[location];
  if (!Array.isArray(banners) || banners.length !== 5) {
    errors.push(`${location}: exactement cinq publicités sont requises.`);
    continue;
  }
  for (const ad of banners) {
    if (!ad.id || ids.has(ad.id)) errors.push(`${location}: identifiant publicitaire absent ou dupliqué.`);
    ids.add(ad.id);
    if (ad.imageUrl && !(ad.imageUrl.startsWith('/') || /^https?:\/\//i.test(ad.imageUrl))) {
      errors.push(`${ad.id}: imageUrl doit être un chemin local ou une URL http(s).`);
    }
    if (ad.imageUrl && !ad.alt?.trim()) errors.push(`${ad.id}: alt requis pour un visuel actif.`);
    if (ad.href && !/^https?:\/\//i.test(ad.href)) errors.push(`${ad.id}: href doit être une URL http(s).`);
    if (ad.href && !ad.imageUrl) errors.push(`${ad.id}: ne pas activer un lien sans visuel.`);
  }
}
if (errors.length) {
  for (const error of errors) console.error('ERREUR:', error);
  process.exitCode = 1;
} else {
  console.log(`Configuration valide : ${expected.length} bandeaux, ${ids.size} emplacements publicitaires.`);
  console.log('Les emplacements sans visuels sont affichés comme espaces publicitaires.');
}
