import { readFileSync, writeFileSync } from 'node:fs';

const news = JSON.parse(readFileSync('/private/var/folders/ch/6221702s6dz3jcxyklqp2hk00000gn/T/opencode/real-news.json', 'utf8'));
const keys = ['politique', 'international', 'police-justice', 'societe', 'economie', 'tech', 'sport', 'culture', 'environnement'];
const labels = { politique: 'Politique', international: 'International', 'police-justice': 'Police-Justice', societe: 'Société', economie: 'Économie', tech: 'Tech', sport: 'Sport', culture: 'Culture', environnement: 'Environnement' };
const images = { politique: '1529107386315-e1a2ed48a620', international: '1517457373958-b7bdd4587205', 'police-justice': '1497366754035-f200968a6e72', societe: '1521737604893-d14cc237f11d', economie: '1454165804606-c3d57bc86b40', tech: '1519389950473-47ba0277781c', sport: '1461896836934-ffe607ba8211', culture: '1492684223066-81342ee5ff30', environnement: '1441974231531-c6227db76b6e' };
const esc = (s) => String(s ?? '').replace(/'/g, "''");
const img = (id, w = 900) => `https://images.unsplash.com/photo-${id}?w=${w}&q=80&fit=crop`;
const slug = (s) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);
const all = keys.flatMap((k) => (news[k] ?? []).map((n) => ({ ...n, key: k, image: img(images[k]) })));

const videos = all.slice(0, 12).map((n) => `  ('${slug(n.title)}-v', '${esc(n.title)}', '${n.key}', '${n.image}', '${new Date(n.publishedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}', '${esc(n.title)}', '${esc(n.link)}', '${n.publishedAt}')`).join(',\n');
const podcasts = all.slice(12, 18).map((n) => `  ('${slug(n.title)}-p', '${esc(n.title)}', '${n.key}', '${n.image}', 'Podcast', '${esc(n.title)}', '${esc(n.link)}', '${n.publishedAt}')`).join(',\n');
const programs = [
  ['Première édition', 'La rédaction', '06h00 – 08h30', 'Information', images.politique, 'Toute l’actualité du Gabon pour bien commencer la journée.'],
  ['Le fil info', 'La rédaction', '09h00 – 12h00', 'Information', images.societe, 'L’information en continu, minute par minute.'],
  ['Midi 15h', 'La rédaction', '12h00 – 15h00', 'Information', images.economie, 'Le grand rendez-vous d’information de la mi-journée.'],
  ['Le décryptage', 'La rédaction', '15h00 – 17h00', 'Décryptage', images.politique, 'Comprendre les grands dossiers du jour.'],
  ['TV Plus Non-stop', 'La rédaction', '17h00 – 19h00', 'Information', images.international, 'Les dernières informations et les réactions en direct.'],
  ['Le journal du sport', 'La rédaction', '19h00 – 20h00', 'Sport', images.sport, 'Résultats, analyses et interviews.'],
].map(([name, host, slot, cat, image, desc]) => `  ('${slug(name)}', '${esc(name)}', '${host}', '${slot}', '${cat}', '${img(image)}', '${esc(desc)}')`).join(',\n');
const channels = [
  ['tv-plus-gabon', 'TV Plus Gabon', 'La chaîne d’information en continu', 'TNT', images.politique],
  ['tv-plus-afrique', 'TV Plus Afrique', 'L’information au-delà des frontières', 'TNT', images.international],
  ['le-fil-info', 'Le fil info', 'L’actualité en continu', 'Web', images.societe],
].map(([s, n, t, k, image]) => `  ('${s}', '${esc(n)}', '${esc(t)}', '${k}', '${img(image, 700)}')`).join(',\n');
const topics = all.filter((_, i) => [0, 4, 12, 14].includes(i)).map((n, i) => `  (${i + 1}, '${esc(n.title.slice(0, 60))}', '${esc(n.link)}')`).join(',\n');

const sql = `-- Données applicatives TV Plus + authentification
-- Toutes les données éditoriales proviennent de flux RSS publics.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  role text not null default 'reader' check (role in ('reader', 'admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.newsletter_formats (
  id text primary key,
  name text not null,
  frequency text not null,
  description text not null
);

create table if not exists public.practical_services (
  id text primary key,
  name text not null,
  description text not null,
  href text not null,
  icon text not null
);

create table if not exists public.tv_schedule (
  id text primary key,
  time_label text not null,
  title text not null,
  category text not null,
  is_live boolean not null default false
);

create table if not exists public.site_topics (
  id int primary key,
  label text not null,
  link text not null
);

alter table public.videos add column if not exists source_url text;
alter table public.podcasts add column if not exists source_url text;

alter table public.profiles enable row level security;
alter table public.newsletter_formats enable row level security;
alter table public.practical_services enable row level security;
alter table public.tv_schedule enable row level security;
alter table public.site_topics enable row level security;

drop policy if exists "own profile read" on public.profiles;
create policy "own profile read" on public.profiles for select to authenticated using (auth.uid() = id);
drop policy if exists "own profile update" on public.profiles;
create policy "own profile update" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "public read newsletter formats" on public.newsletter_formats;
create policy "public read newsletter formats" on public.newsletter_formats for select using (true);
drop policy if exists "public read practical services" on public.practical_services;
create policy "public read practical services" on public.practical_services for select using (true);
drop policy if exists "public read tv schedule" on public.tv_schedule;
create policy "public read tv schedule" on public.tv_schedule for select using (true);
drop policy if exists "public read site topics" on public.site_topics;
create policy "public read site topics" on public.site_topics for select using (true);

-- Profil automatique à l'inscription
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

truncate table public.videos, public.podcasts, public.programs, public.channels, public.newsletter_formats, public.practical_services, public.tv_schedule, public.site_topics;

insert into public.videos (slug, title, category_slug, image_url, duration, description, source_url, published_at) values
${videos}
on conflict (slug) do nothing;

insert into public.podcasts (slug, title, category_slug, image_url, duration, description, source_url, published_at) values
${podcasts}
on conflict (slug) do nothing;

insert into public.programs (slug, name, host, slot, category, image_url, description) values
${programs}
on conflict (slug) do nothing;

insert into public.channels (slug, name, tagline, kind, image_url) values
${channels}
on conflict (slug) do nothing;

insert into public.newsletter_formats (id, name, frequency, description) values
  ('n1', 'Le Récap Actu', 'Chaque soir', 'L’essentiel de la journée en cinq minutes.'),
  ('n2', 'Le Brief Politique', 'Chaque matin', 'Les coulisses et les décisions du pouvoir.'),
  ('n3', 'Économie Express', 'Deux fois par semaine', 'Les chiffres et les tendances à connaître.'),
  ('n4', 'Le Décryptage', 'Chaque semaine', 'Un grand dossier, éclairé par nos journalistes.');

insert into public.practical_services (id, name, description, href, icon) values
  ('s1', 'Programme TV', 'La grille des programmes TV Plus.', '/programme-tv', 'tv'),
  ('s2', 'Canaux TV', 'Trouvez votre chaîne chez votre opérateur.', '/canaux-tv', 'channels'),
  ('s3', 'Newsletters', 'Recevez l’info dans votre boîte mail.', '/newsletters', 'mail'),
  ('s4', 'Podcasts', 'Écoutez nos contenus en différé.', '/podcasts', 'audio'),
  ('s5', 'Vidéos', 'Toutes nos vidéos et reportages.', '/videos', 'video'),
  ('s6', 'Contact', 'Une information, une question, un signalement.', '/contacts', 'contact');

insert into public.tv_schedule (id, time_label, title, category, is_live) values
  ('t1', '06h00', 'Première édition', 'Information', false),
  ('t2', '09h00', 'Le fil info', 'Information', false),
  ('t3', '12h00', 'Midi 15h', 'Information', false),
  ('t4', '15h00', 'Le décryptage', 'Décryptage', false),
  ('t5', '17h00', 'TV Plus Non-stop', 'Information', true),
  ('t6', '19h00', 'Le journal du sport', 'Sport', false);

insert into public.site_topics (id, label, link) values
${topics}
on conflict (id) do nothing;
`;

writeFileSync('supabase/migrations/0005_app_data.sql', sql);
console.log('APP_DATA_GENERATED');
