import { readFileSync } from 'node:fs';

const news = readFileSync(new URL('../lib/rss/news.ts', import.meta.url), 'utf8');
const cron = readFileSync(new URL('../app/api/cron/refresh-rss/route.ts', import.meta.url), 'utf8');
const sources = JSON.parse(readFileSync(new URL('../data/rss-sources.json', import.meta.url), 'utf8'));

const failures = [];
if (sources.length !== 43) failures.push('Les 43 sources configurées ne sont pas toutes conservées.');
if (sources.filter((source) => source.active).length !== 41) failures.push('Les 41 sources actives ne sont pas préservées.');
if (sources.filter((source) => source.active && source.priority).length > 12) failures.push('Trop de sources prioritaires.');
if (!news.includes('unstable_cache')) failures.push('Le cache serveur du flux RSS est absent.');
if (news.includes("from('news24_items')") || news.includes("from('news_feed')") || news.includes('getServerSupabase')) failures.push('Le lecteur RSS interroge encore Supabase.');
if (!cron.includes('status: 410')) failures.push('L’ancien cron RSS ne renvoie pas 410.');
if (failures.length) {
  for (const message of failures) console.error('ECHEC:', message);
  process.exitCode = 1;
} else {
  console.log('Architecture RSS vérifiée : 43 sources, 41 actives, cache serveur, zéro requête Supabase pour News 24/7.');
}
