import { readFileSync, writeFileSync } from 'node:fs';

const news = JSON.parse(readFileSync('/private/var/folders/ch/6221702s6dz3jcxyklqp2hk00000gn/T/opencode/real-news.json', 'utf8'));
const categories = [
  ['Politique', 'politique', '1529107386315-e1a2ed48a620'],
  ['International', 'international', '1517457373958-b7bdd4587205'],
  ['Police-Justice', 'police-justice', '1497366754035-f200968a6e72'],
  ['Société', 'societe', '1521737604893-d14cc237f11d'],
  ['Économie', 'economie', '1454165804606-c3d57bc86b40'],
  ['Tech', 'tech', '1519389950473-47ba0277781c'],
  ['Sport', 'sport', '1461896836934-ffe607ba8211'],
  ['Culture', 'culture', '1492684223066-81342ee5ff30'],
  ['Environnement', 'environnement', '1441974231531-c6227db76b6e'],
];
const esc = (s) => String(s ?? '').replace(/'/g, "''");
const slugify = (s) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);
const img = (id) => `https://images.unsplash.com/photo-${id}?w=1100&q=80&fit=crop`;

const all = categories.flatMap(([cat, key, image]) =>
  (news[key] ?? []).map((item) => ({ slug: slugify(item.title), category: cat, key, image: img(image), title: item.title, link: item.link, publishedAt: item.publishedAt })),
);

const values = all.map((a) =>
  `  ('${esc(a.slug)}', '${esc(a.title)}', '${esc(a.title)}', '${esc(a.key)}', '${esc(a.image)}', 'published', now(), '${esc(a.link)}')`,
).join(',\n');

const filValues = all.slice(0, 12).map((a, i) =>
  `  ('${esc(a.slug)}', '${String(17 - Math.floor(i / 3)).padStart(2, '0')}h${String((i * 7) % 60).padStart(2, '0')}', ${i + 1})`,
).join(',\n');

const sql = `-- Remplacement des contenus fictifs par des actualités gabonaises réelles (RSS)
-- Suppression de la rubrique Régions et du canal Radio.

alter table public.articles add column if not exists source_url text;

delete from public.articles where category_slug = 'regions';
delete from public.categories where slug = 'regions';
delete from public.channels where slug = 'tv-plus-radio';

-- Le contenu éditorial fictif est intégralement remplacé.
delete from public.articles;
delete from public.fil_actu;
delete from public.testimonials;
delete from public.videos;
delete from public.podcasts;
delete from public.programs;
delete from public.channels;

insert into public.articles (slug, title, summary, category_slug, image_url, status, published_at, source_url) values
${values}
on conflict (slug) do nothing;

insert into public.fil_actu (article_slug, time_label, position) values
${filValues}
on conflict do nothing;
`;

writeFileSync('supabase/migrations/0004_real_gabon_news.sql', sql);
console.log('MIGRATION_GENERATED', all.length, 'articles');
