-- Données applicatives TV Plus + authentification
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
  ('gabon-le-fds-met-le-gouvernement-face-a-ses-responsabilites-et-appelle-a-une-ver-v', 'Gabon : Le FDS met le gouvernement face à ses responsabilités et appelle à une véritable rupture politique', 'politique', 'https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=900&q=80&fit=crop', '19:08', 'Gabon : Le FDS met le gouvernement face à ses responsabilités et appelle à une véritable rupture politique', 'https://news.google.com/rss/articles/CBMiywFBVV95cUxQT2FaVGQ5U3RjM1ByRHhiQ3FjMzloUHMzY1FMeXhkbGRkcFg2NE1EQXNGN3RjUVhNa2FyWDZIb0JkVkVsRXRQSXF0cjNNTjRJYkFTbFg1Q3c0V2tUcHdBZmFIa1ppQW9XcUZKSXlIMkdoZ214MUk5QnNmdG5YTnkweHNsTTRqSjNubmF6b2YwS3Q1eWFHQ1JpNDIySmFUOFVLbjltWGR1bFItMWg5NnJKTUxtVmppNlFQRzB2ZU5RU05iV2hRb0RzZjA4aw?oc=5', '2026-11-15T18:08:58.000Z'),
  ('gabon-remaniement-partiel-du-gouvernement-v', 'Gabon: remaniement partiel du gouvernement', 'politique', 'https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=900&q=80&fit=crop', '08:00', 'Gabon: remaniement partiel du gouvernement', 'https://news.google.com/rss/articles/CBMipwFBVV95cUxNODB3YmZITkVpS0o5NnB3aVYwc1IzWWJOS3o4Y0tRdXdEczNfQTRFcENqTjk0S3lDSnplT1l3Y3M0TXA5MlFmbGY1LXlzVU1VV0RhZFoyNUczeWtPN0xMeUJma004bEg5RC0xOHRUcTk4THZqU1dPX1BxNGJldTZBNzhQT3V5MDdQSTFQQ1prV2dMblRmYTdORVJDZzVxal82UV9yemZyNA?oc=5', '2026-10-12T07:00:00.000Z'),
  ('le-gabon-reussit-sa-levee-de-fonds-a-l-international-mais-peine-sur-le-marche-re-v', 'Le Gabon réussit sa levée de fonds à l''international, mais peine sur le marché régional', 'international', 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=900&q=80&fit=crop', '08:00', 'Le Gabon réussit sa levée de fonds à l''international, mais peine sur le marché régional', 'https://news.google.com/rss/articles/CBMi5AFBVV95cUxNbl9VR0JxWGl2M21mTUxZMlBKS3F2WGpGVzZCMUJOX2xSRUsyVmk3Uk91TDhQNUlEbnRSRXVhbXJCc1NXR3otYlAzZmJMTEtFdk9yalFlUW9TZ0Ziems1OVkzRW9wLWNNSnZzOHpxV1Q0aUFJLV8wWUtOUjVUeTFUR3BWN1ByTDZKVTEzU3hWOWtvZ0VSUUItbk9iRnBSYTR6amdWZ0l1T2QyS2F6Qm1mbDJPM2RxMEhLQUZaNU92YUVRMHRaNVZ2eGdJV1Y2aU5hM05pR2dSSWkzMmxtTHF6NlE5WVQ?oc=5', '2026-08-04T07:00:00.000Z'),
  ('senegal-gabon-croissance-les-dossiers-africains-des-assemblees-du-fmi-et-de-la-b-v', 'Sénégal, Gabon, croissance : les dossiers africains des assemblées du FMI et de la Banque mondiale', 'international', 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=900&q=80&fit=crop', '08:00', 'Sénégal, Gabon, croissance : les dossiers africains des assemblées du FMI et de la Banque mondiale', 'https://news.google.com/rss/articles/CBMi6AFBVV95cUxNQW9ERzAxRnpId0Uyb0V6TExjS29FZGxmQkR4aER6WlZSMnI4Sm1QWm5YQlpILWJYeFJvQnNmZUJDbGZtbXVOV1h0cFlPb3o1MS13TTVEZ3dqUlRWVnlHa1hXdm8yRGM5dGxjZ3hpY2Z6Z0ZsUjd2ODhabEdvaXJiZ0JpQ0JJbjMzWElOZlJXVWZERmlub2JmX0hoRmtRaVdCNDdQbldXbEVPUFgwTXZ5SjV6SGtCQWtZaWFHQTgzWmJmT0ppV3dic2JuQjQxdzBWZ1IzeEs1TlBldkk2Q2lkN2dKYlJxa21K?oc=5', '2026-10-12T07:00:00.000Z'),
  ('gabon-l-ancien-ministre-et-ancien-commandant-en-chef-de-la-police-jean-boniface--v', 'Gabon: l’ancien ministre et ancien commandant en chef de la police Jean-Boniface Assélé placé sous mandat de dépôt', 'police-justice', 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=900&q=80&fit=crop', '04:38', 'Gabon: l’ancien ministre et ancien commandant en chef de la police Jean-Boniface Assélé placé sous mandat de dépôt', 'https://news.google.com/rss/articles/CBMiiAJBVV95cUxOeTRKM3NGMzdqM29yWVhHT1VRRlhuOEhqSUtNd1J3R3R3aDctQUpYTm9WZXQya1BKS3hhZ0VnaENuVExRN3NLYnIzUzFtVDZzSHEteE1oQWk0QlhqWDl3YlJtTjNEbFB0RktBbHBjS3BpOFNmZ0sxVmxnMUJ0MjJVZnZjV1Qxc2lIM294cmtqQmRLUTJBY016TGFGSXhmZG5saGFfTGlMMlNWYzNwd2hmWC16eFY4WHdMRjdyc0RmNjZzV3RnVkZxMm4wbkItSW9aWEpOLWJFRjRFSDRNRU4yLV9Ka3U2MElJS2QtdHEwVmFMTTBldTA3UWo1SkVXRVhReXZqZnlnR3E?oc=5', '2026-11-17T03:38:37.000Z'),
  ('corruption-au-gabon-pascaline-bongo-son-titre-ronflant-et-les-affaires-du-presid-v', 'Corruption au Gabon : Pascaline Bongo, «son titre ronflant» et les «affaires du Président» jugés à Paris', 'police-justice', 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=900&q=80&fit=crop', '09:00', 'Corruption au Gabon : Pascaline Bongo, «son titre ronflant» et les «affaires du Président» jugés à Paris', 'https://news.google.com/rss/articles/CBMikAJBVV95cUxOc1c3Ry1RcmVpR2EyMXZKRlN2YlBlaFFOWTI2ZWpQOWtHNVZVZGhMUVd0Y2VUaGkzQk1SMm1DOUlFcEhTcjA0WVdJZEl5N0hCLWRYalJ6ZmJiUzJwUXpDU1Q1cGRKODI0eURKNGJqb3U4dVJFNnh3b25KbjY0cFN3WmRTUWtZUHpjbXhCUDdfVmI4b2lTSzN3endacHB5UTc2UzhPbXNDSUpjQ1FyU3A1RTFHbFVRQjZnR3BDU0VwTHJOWHJWa1Q5dzlCbHFBbGNYQlgzZ09CSTNUcXpRUmhJZ1NIOUFPQktBNzF3OHk2RmFQZm5yay15YmZhUUNVZTNFZnE0aWVYdURCak8yc0EwLQ?oc=5', '2024-02-01T08:00:00.000Z'),
  ('ecole-royale-du-service-de-sante-militaire-du-maroc-une-gabonaise-decroche-un-20-v', 'École Royale du Service de Santé Militaire du Maroc : Une gabonaise décroche un 20/20 en doctorat', 'societe', 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=900&q=80&fit=crop', '13:09', 'École Royale du Service de Santé Militaire du Maroc : Une gabonaise décroche un 20/20 en doctorat', 'https://news.google.com/rss/articles/CBMizwFBVV95cUxQS1FNNkJzMEE0WVdyNFJscHJ4VUxXaWlYOHNxNmxlRmVKQzcwY2ZjRlJyM212UHR4RzNzZi0xcmpVTkJwTFgzVE9sOGc2WVZpVDBWVkF4R19DRS1RazZHTElsekpLNTJNdWd6eTVNbEkyVy1DVWhrN1hlSFZiTkVmdVY4UHZ0NGNpdHFHOVdwb2puUnhOTWh4YXBqTUQzRnY3X3VDZUl5cVZkcXNfOTFnRmg1SjVMaUgyb0pNVnQtVVhMSm5EU0gxYkNHY0hoX1E?oc=5', '2026-11-17T12:09:17.000Z'),
  ('barometre-rse-2025-comilog-premiere-sur-l-education-la-sante-et-le-developpement-v', 'Baromètre RSE 2025 : Comilog première sur l’éducation, la santé et le développement socio-économique', 'societe', 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=900&q=80&fit=crop', '08:00', 'Baromètre RSE 2025 : Comilog première sur l’éducation, la santé et le développement socio-économique', 'https://news.google.com/rss/articles/CBMiwgFBVV95cUxNbGpJSWdmeWotRU1menY1dGRiS2pHN2hjRHA3YnBOTGN3TE1DdFBaX2ZQWk00Ulo4OGRjTHZxb2xkb2dqVjc3NlB6TGRIazd1TENkNTRQcUxsT2hqZFR5MkJWWE5QSHZtSk5JWDBXVVR6ZTYwZElZeDlkNlFqMU16eTlnRjlpMHUwSDZ0aTZkSHdGeUlLelpQbnRJSHRlX0hka2dBaU9vSGhEejRVdzN2S01tUW02SDRwQ3lCSVJhdHNwUQ?oc=5', '2026-03-27T07:00:00.000Z'),
  ('gabon-ces-femmes-qui-font-l-economie-v', 'Gabon : ces femmes qui font l’économie', 'economie', 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=900&q=80&fit=crop', '08:00', 'Gabon : ces femmes qui font l’économie', 'https://news.google.com/rss/articles/CBMimgFBVV95cUxQYXBzc1U2Rm4wbDlfTWZQUTVKZE9HNjVoVVZWQkNFQTBGQnBTX2F3ZWJqLUM4eEYwQmZ2bzF3UjZ4bXVjM0tPZVZvZUtJUVdYYXZNNi1uTHBVWm5mbFYzOVBGQUJoX0Rob3prNnZuLUdXQ2xCRF9Pam10UnltVERtZ2xISVpGVWp4OTNTcnVfVDVNUTRuZHplUjZR?oc=5', '2026-10-04T07:00:00.000Z'),
  ('gabon-le-secteur-informel-controle-t-il-l-economie-nationale-les-chiffres-qui-fo-v', 'Gabon : Le secteur informel contrôle t-il l’économie nationale ? Les chiffres qui font peur…', 'economie', 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=900&q=80&fit=crop', '08:00', 'Gabon : Le secteur informel contrôle t-il l’économie nationale ? Les chiffres qui font peur…', 'https://news.google.com/rss/articles/CBMitwFBVV95cUxPVlUtalJuM1RUX2Yydm9fR0hScUZ3dktPYUFqSFlPTFVFVlVONERLM0RCZ1FGSUZ4eXF4ZExFSG12RW51QlpQMm9EYWRKTVhDTTNWd1UzcFVHQndjNVlzazljR1RzVTY2cHVIY2Q4aC1ITzVkeDBwa1FvRkJhaDFxYVlHZnhjQmx3bEpxWGpBLUR5YzI5M1pNVTVBTTNDV1pHTkRnTDBteXFjZk4zM3czbVRScndoRTQ?oc=5', '2026-10-01T07:00:00.000Z'),
  ('ia-securite-education-le-gabon-elargit-sa-cooperation-numerique-avec-huawei-v', 'IA, sécurité, éducation : le Gabon élargit sa coopération numérique avec Huawei', 'tech', 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=900&q=80&fit=crop', '13:10', 'IA, sécurité, éducation : le Gabon élargit sa coopération numérique avec Huawei', 'https://news.google.com/rss/articles/CBMixwFBVV95cUxOb1JzaHpoNE1aMEtXb1JwelhFcWpLQW9aRzYzdkRNUGVVc2F1Wl9iX19VakRIdC1WN0lHMER5enF2MWpaWEdubmwtUTZwTndVeVZkYTBuMmwwbWNxcUQ3ZHlvTXppcjgxLXl2VFJDSEZsMXZzNmM5SllTVlZ1bGJZLWtNLWg4cnAxUVM2VVhGSUdQZ0xoNm8wb2pOWFlXZUYxQkEwaW1KTG1HQmhIR3Q5bHN6dFFXTjV1MWw3RWhfaWZtOUNIVHZZ?oc=5', '2026-11-09T12:10:00.000Z'),
  ('gabon-digital-week-2026-le-gabon-au-c-ur-de-la-technologie-v', 'Gabon Digital Week 2026 : le Gabon au cœur de la technologie', 'tech', 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=900&q=80&fit=crop', '08:00', 'Gabon Digital Week 2026 : le Gabon au cœur de la technologie', 'https://news.google.com/rss/articles/CBMi5gFBVV95cUxNYURCUW51eWZfTGFLa1dSN1Q4OEE4MVcwY0ljSDVPZHZmaGdzSElXZWZaeUgwTEc0dTZJREI3T1JmR0lFM0tkX2hMS2h5M2RuWGp1bEFnNWs0bGVXQ1BGSjdHRUw4NmtwMHlzTFQwWDBfcExFUkpzZmtMWkpEZlJqYS0tTjFhM0FpSzNHYkVHWHJTMkpDYmJCQk4xVDFWREYxUVZIaWNCXzkxeW85NXpJQV9QcFlTbVVscXdfYXIwbUxUU095aDlHdUxjX0FqR1NSaUpTMWhwZlh4cEh3aC1Ucm1GNmZ1QQ?oc=5', '2026-10-26T07:00:00.000Z')
on conflict (slug) do nothing;

insert into public.podcasts (slug, title, category_slug, image_url, duration, description, source_url, published_at) values
  ('football-denis-bouanga-porte-toujours-le-gabon-et-le-los-angeles-fc-p', 'Football. Denis Bouanga porte toujours le Gabon et le Los Angeles FC', 'sport', 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=900&q=80&fit=crop', 'Podcast', 'Football. Denis Bouanga porte toujours le Gabon et le Los Angeles FC', 'https://news.google.com/rss/articles/CBMi7wFBVV95cUxPZncweW5wcHg2bVBFaXJpMUZzOXR4R1JNMXIyejV6djdSeTMzZGlTdmR3RkhMZUxmRHNhc21sRE41QmxiczN6NkprRlRPSlVjZU00cFZaVFNtRUU0aHQ5OVlqbWNBMTN2R1l2T3lKeGgxb00wMkFBX3JhZEtuNFJYa3dLcDF5dl80MncydHN4U25heG54TnZzeS1Nay1ob1FtT0hMaEh2dEJPc01nMGM2VC1VSGhpakhpcEYzMmZOZ1dkX0hpMG16THlQSXROaC0wc2hEVGh1UkUyTGhRdWVuVFVFR3luMTh4RmxCTHNwcw?oc=5', '2026-11-19T12:12:02.000Z'),
  ('ea-guingamp-du-temps-de-jeu-pour-averlant-avec-le-gabon-le-bilan-des-internation-p', 'EA Guingamp. Du temps de jeu pour Averlant avec le Gabon… Le bilan des internationaux de novembre 2026', 'sport', 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=900&q=80&fit=crop', 'Podcast', 'EA Guingamp. Du temps de jeu pour Averlant avec le Gabon… Le bilan des internationaux de novembre 2026', 'https://news.google.com/rss/articles/CBMinAJBVV95cUxOVVZ5Tjh6TDhYLXA1Z19Ka25EdGwzSUg3X1F4MElGOEplc0ozWXdhNS1MTFlHOU1hTmNmUDZBakc3TVRoeXZCM1hVX21CbkFxcGY3UENHcmVid293a3JtQzMtR1dDTllwZDMybENJbUNfbEtUYm1UWEFHNGQyVUM2Nk9BSXpoTlBWYWJ1TElDZ1E5X05pMDVRbHJVZkl4eGJ4SlpsQUx3b3JfWUlOQmw4RllpY1pwdG9TNDE1UnJWYlpWX0N1ckxHSmt3QUQ0cW9Mend3cEZ0dVFaSS1UWGI1akdrTGY1bHJGMURlYURaWFRka3lwZWVlZnBoQkw3ZEpGbnFkeHNDYnR5NVhsMVlfcVBKZmhQejFNZXBCcw?oc=5', '2026-11-18T07:58:53.000Z'),
  ('gabon-piratage-culturel-la-litterature-au-chapitre-de-la-mort-la-musique-connait-p', 'Gabon. Piratage culturel: la littérature au chapitre de la mort, la musique connaît déjà la chanson', 'culture', 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=900&q=80&fit=crop', 'Podcast', 'Gabon. Piratage culturel: la littérature au chapitre de la mort, la musique connaît déjà la chanson', 'https://news.google.com/rss/articles/CBMi7gFBVV95cUxNSXhZdDN1Sk8wN3VMbEZDQjBqUVpQaGQxOXZ4S1Q3cG5WZ2JaV25PSTZ3Szc3QklUUnN1d2gyTmNDYnRHNk1PYnBrekhpSEZ5bmYtQVdmSzNMa2xXckVKb2U1ZkM5ZVpvcEUxdm5mVFp0UXcyQk9qU0x2Q1J4ZUpzdVJKVTJpLWRrV1p4cVVXX3NXZHduV19WSUZkWEdKUVRPeUV2Q3VwM2xDVHNyRnQyUm5yY3liRFVsRHg4NzBGZ3ROb0pFWXJEMTczN05EY1Z1X2lpVldVV0RhQ1JjSm01LWk4ZjdSUFdqNnUtZW13?oc=5', '2026-10-10T07:00:00.000Z'),
  ('reminiscence-quatrieme-album-de-l-artiste-gabonaise-tita-nzebi-p', '"Réminiscence", quatrième album de l''artiste gabonaise Tita Nzebi', 'culture', 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=900&q=80&fit=crop', 'Podcast', '"Réminiscence", quatrième album de l''artiste gabonaise Tita Nzebi', 'https://news.google.com/rss/articles/CBMitwFBVV95cUxOWWZVQ01WeU5yRmNBNFU5NUxsLU10aGhoN1Zqc0Q5X0pZckxBQlNneVJDZXBNOVRLSHo1Q0pnc0ZDSnpUdU9FQXJmbEpTbTVxcC11ZHJXRnVUWVotdDdjTXlIQnhudFJ2RGd3c2FVMzFUbnBmaGVsYzg2SjJ0aTByMEpBOWFpMnlhQnRPNEN3UENJQ2RCU2VfOUQ1SEpmUGV6aFVIRTBGLTUtV0QwN2dsTkJSaE8wOFk?oc=5', '2026-08-11T07:00:00.000Z'),
  ('gabon-un-projet-de-170-millions-d-euros-lance-pour-proteger-la-nature-et-les-com-p', 'Gabon: un projet de 170 millions d''euros lancé pour protéger la nature et les communautés locales', 'environnement', 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=900&q=80&fit=crop', 'Podcast', 'Gabon: un projet de 170 millions d''euros lancé pour protéger la nature et les communautés locales', 'https://news.google.com/rss/articles/CBMi3AFBVV95cUxPSmhRRDJkSWJFWjh6b1lCdkl2RXFRZGtkNzVVRGxRWEVXdVd6Uk9uZEtWcnprY0JaZEJPQmUwcFp5b0ZfaDNJRDlDRDB4d1VRSFg5ZGdxdHlQNklmQnQ1c3JJYlR0Mkx2SG5IRXJJeFRIalZCUlFqVFdobGpOWThfTWJWZU5PT2N3NTRFNmRCSzdNcWxTYl95c1NQUXFhaW5PV2ZsVUZVMWZUWktnamdxbVVXbzNyODkyblNDbFNVTHlyM3ZBWTM0UzByZ2lsaHRKUWZTX2xpcXpDb2Zl?oc=5', '2026-08-29T07:00:00.000Z'),
  ('elephant-de-foret-dans-le-parc-national-de-loango-au-gabon-p', 'Éléphant de forêt dans le parc national de Loango, au Gabon', 'environnement', 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=900&q=80&fit=crop', 'Podcast', 'Éléphant de forêt dans le parc national de Loango, au Gabon', 'https://news.google.com/rss/articles/CBMitgFBVV95cUxPbEtYeWYtZllXMS1ibGdsaWVKS1MwbTEwTWJMdmdfbnV6RGI4WmwxMjJGRmJTZWFlTkU0eksxQ0ZEQlR6dXgzZXVoS2syY040Zzd6RTJtSS11RmpOU0RoRDl5N2p0cHM3OWE4NFE0OTZUUzdJay1JMU53RDhKZkdmV0lhWTAyTVZES0tJRGtHd0lRQkVCNjhoUEk3T2JVTTA3Q1poZExNUTVkRmp1ZTZTQ1dveVlEUQ?oc=5', '2024-09-13T07:00:00.000Z')
on conflict (slug) do nothing;

insert into public.programs (slug, name, host, slot, category, image_url, description) values
  ('premiere-edition', 'Première édition', 'La rédaction', '06h00 – 08h30', 'Information', 'https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=900&q=80&fit=crop', 'Toute l’actualité du Gabon pour bien commencer la journée.'),
  ('le-fil-info', 'Le fil info', 'La rédaction', '09h00 – 12h00', 'Information', 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=900&q=80&fit=crop', 'L’information en continu, minute par minute.'),
  ('midi-15h', 'Midi 15h', 'La rédaction', '12h00 – 15h00', 'Information', 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=900&q=80&fit=crop', 'Le grand rendez-vous d’information de la mi-journée.'),
  ('le-decryptage', 'Le décryptage', 'La rédaction', '15h00 – 17h00', 'Décryptage', 'https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=900&q=80&fit=crop', 'Comprendre les grands dossiers du jour.'),
  ('tv-plus-non-stop', 'TV Plus Non-stop', 'La rédaction', '17h00 – 19h00', 'Information', 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=900&q=80&fit=crop', 'Les dernières informations et les réactions en direct.'),
  ('le-journal-du-sport', 'Le journal du sport', 'La rédaction', '19h00 – 20h00', 'Sport', 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=900&q=80&fit=crop', 'Résultats, analyses et interviews.')
on conflict (slug) do nothing;

insert into public.channels (slug, name, tagline, kind, image_url) values
  ('tv-plus-gabon', 'TV Plus Gabon', 'La chaîne d’information en continu', 'TNT', 'https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=700&q=80&fit=crop'),
  ('tv-plus-afrique', 'TV Plus Afrique', 'L’information au-delà des frontières', 'TNT', 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=700&q=80&fit=crop'),
  ('le-fil-info', 'Le fil info', 'L’actualité en continu', 'Web', 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=700&q=80&fit=crop')
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
  (1, 'Gabon : Le FDS met le gouvernement face à ses responsabilité', 'https://news.google.com/rss/articles/CBMiywFBVV95cUxQT2FaVGQ5U3RjM1ByRHhiQ3FjMzloUHMzY1FMeXhkbGRkcFg2NE1EQXNGN3RjUVhNa2FyWDZIb0JkVkVsRXRQSXF0cjNNTjRJYkFTbFg1Q3c0V2tUcHdBZmFIa1ppQW9XcUZKSXlIMkdoZ214MUk5QnNmdG5YTnkweHNsTTRqSjNubmF6b2YwS3Q1eWFHQ1JpNDIySmFUOFVLbjltWGR1bFItMWg5NnJKTUxtVmppNlFQRzB2ZU5RU05iV2hRb0RzZjA4aw?oc=5'),
  (2, 'Gabon: l’ancien ministre et ancien commandant en chef de la ', 'https://news.google.com/rss/articles/CBMiiAJBVV95cUxOeTRKM3NGMzdqM29yWVhHT1VRRlhuOEhqSUtNd1J3R3R3aDctQUpYTm9WZXQya1BKS3hhZ0VnaENuVExRN3NLYnIzUzFtVDZzSHEteE1oQWk0QlhqWDl3YlJtTjNEbFB0RktBbHBjS3BpOFNmZ0sxVmxnMUJ0MjJVZnZjV1Qxc2lIM294cmtqQmRLUTJBY016TGFGSXhmZG5saGFfTGlMMlNWYzNwd2hmWC16eFY4WHdMRjdyc0RmNjZzV3RnVkZxMm4wbkItSW9aWEpOLWJFRjRFSDRNRU4yLV9Ka3U2MElJS2QtdHEwVmFMTTBldTA3UWo1SkVXRVhReXZqZnlnR3E?oc=5'),
  (3, 'Football. Denis Bouanga porte toujours le Gabon et le Los An', 'https://news.google.com/rss/articles/CBMi7wFBVV95cUxPZncweW5wcHg2bVBFaXJpMUZzOXR4R1JNMXIyejV6djdSeTMzZGlTdmR3RkhMZUxmRHNhc21sRE41QmxiczN6NkprRlRPSlVjZU00cFZaVFNtRUU0aHQ5OVlqbWNBMTN2R1l2T3lKeGgxb00wMkFBX3JhZEtuNFJYa3dLcDF5dl80MncydHN4U25heG54TnZzeS1Nay1ob1FtT0hMaEh2dEJPc01nMGM2VC1VSGhpakhpcEYzMmZOZ1dkX0hpMG16THlQSXROaC0wc2hEVGh1UkUyTGhRdWVuVFVFR3luMTh4RmxCTHNwcw?oc=5'),
  (4, 'Gabon. Piratage culturel: la littérature au chapitre de la m', 'https://news.google.com/rss/articles/CBMi7gFBVV95cUxNSXhZdDN1Sk8wN3VMbEZDQjBqUVpQaGQxOXZ4S1Q3cG5WZ2JaV25PSTZ3Szc3QklUUnN1d2gyTmNDYnRHNk1PYnBrekhpSEZ5bmYtQVdmSzNMa2xXckVKb2U1ZkM5ZVpvcEUxdm5mVFp0UXcyQk9qU0x2Q1J4ZUpzdVJKVTJpLWRrV1p4cVVXX3NXZHduV19WSUZkWEdKUVRPeUV2Q3VwM2xDVHNyRnQyUm5yY3liRFVsRHg4NzBGZ3ROb0pFWXJEMTczN05EY1Z1X2lpVldVV0RhQ1JjSm01LWk4ZjdSUFdqNnUtZW13?oc=5')
on conflict (id) do nothing;
