import { XMLParser } from 'fast-xml-parser';
import { writeFileSync } from 'node:fs';

const queries = {
  politique: 'Gabon politique gouvernement',
  international: 'Gabon international Afrique',
  'police-justice': 'Gabon justice police',
  societe: 'Gabon société éducation santé',
  economie: 'Gabon économie entreprises',
  tech: 'Gabon numérique technologie',
  sport: 'Gabon sport football',
  culture: 'Gabon culture musique',
  environnement: 'Gabon environnement forêt parcs',
};

const GABON = /gabon|libreville|port-gentil|franceville|lambaréné|lambarene|oyem|nguema|bongo|panthères|bougliers|comilog|gsez|oyem|tchibanga|mouila/i;
const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_', trimValues: true, parseTagValue: false });
const clean = (v) => String(v ?? '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const stripSource = (t) => t
  .replace(/\s+[-|]\s+[^|-]{2,80}$/i, '')
  .replace(/\s+[-|]\s+[^|-]{2,80}$/i, '')
  .replace(/\s*[-|]\s*$/i, '')
  .replace(/\s+[-|]\s+(?:Ouest-France|Lunion\.ga|Gabonreview|Le Monde|RFI|France 24|AFP|Actualités Gabon|L'Union).*$/i, '')
  .replace(/\s+(?:Infos Gabon|Lunion\.ga|Gabonreview|Gabon Actu|Gabonactu|L'Union|Ouest-France|RFI|France 24|AFP|Le Monde|Actualités Gabon|Afrique News|Anadolu| APA)$/i, '')
  .trim();
const slugify = (s) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);

const result = {};
for (const [category, query] of Object.entries(queries)) {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=fr&gl=FR&ceid=FR:fr`;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'TVPlusNews/1.0 RSS aggregator' } });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const doc = parser.parse(await res.text());
    const items = doc?.rss?.channel?.item ?? [];
    const picked = (Array.isArray(items) ? items : [items])
      .map((item) => {
        const title = stripSource(clean(item.title));
        const summary = stripSource(clean(item.description)).slice(0, 280);
        const link = typeof item.link === 'string' ? item.link : '';
        return { slug: slugify(title), title, summary: summary || title, link, publishedAt: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString() };
      })
      .filter((i) => i.title && i.link && GABON.test(i.title + ' ' + i.summary))
      .slice(0, 2);
    result[category] = picked;
    console.log(category, '->', picked.length);
  } catch (e) {
    console.log(category, 'ERROR', e.message);
    result[category] = [];
  }
}
writeFileSync('/private/var/folders/ch/6221702s6dz3jcxyklqp2hk00000gn/T/opencode/real-news.json', JSON.stringify(result, null, 2));
console.log('SAVED');
