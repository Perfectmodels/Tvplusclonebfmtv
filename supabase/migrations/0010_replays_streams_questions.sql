-- Replays, diffuseurs externes et questions du public.

create table if not exists public.episodes (
  id uuid primary key default gen_random_uuid(),
  program_id uuid references public.programs(id) on delete set null,
  title text not null,
  description text,
  video_url text,
  thumbnail_url text,
  duration text default '00:00',
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.stream_settings (
  provider text primary key,
  label text not null,
  rtmp_url text,
  stream_key text,
  enabled boolean not null default false,
  instructions text,
  updated_at timestamptz not null default now()
);

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  question text not null,
  status text not null default 'new' check (status in ('new', 'answered', 'archived')),
  answer text,
  created_at timestamptz not null default now()
);

create index if not exists idx_episodes_status on public.episodes(status, published_at desc);
create index if not exists idx_questions_status on public.questions(status, created_at desc);

alter table public.episodes enable row level security;
alter table public.stream_settings enable row level security;
alter table public.questions enable row level security;

drop policy if exists "public read episodes" on public.episodes;
create policy "public read episodes" on public.episodes for select using (status = 'published');

-- stream_settings et questions : écriture/lecture admin via clé secrète,
-- sauf insertion publique de questions autorisée ci-dessous.
drop policy if exists "public ask question" on public.questions;
create policy "public ask question" on public.questions
  for insert to anon, authenticated with check (
    length(name) between 2 and 100 and
    email ~ '^[^@]+@[^@]+\.[^@]+$' and
    length(question) between 10 and 2000
  );

insert into public.stream_settings (provider, label, enabled, instructions) values
  ('obs', 'OBS Studio', false, 'Dans OBS : Réglages > Diffusion, service « Personnalisé ». Collez l’URL RTMP et la clé de flux, puis cliquez sur « Démarrer le direct ».'),
  ('restream', 'Restream', false, 'Dans Restream : Ajouter une destination > RTMP personnalisé. Utilisez l’URL RTMP et la clé fournies ici.'),
  ('streamyard', 'StreamYard', false, 'Dans StreamYard : Destinations > RTMP personnalisé. Collez l’URL et la clé de flux.'),
  ('vmix', 'vMix', false, 'Dans vMix : Settings > Output > RTMP. Renseignez l’URL et le nom de flux (stream key).'),
  ('wirecast', 'Wirecast', false, 'Dans Wirecast : Output > RTMP. Collez l’URL RTMP et la clé de flux.'),
  ('zoom', 'Zoom', false, 'Dans Zoom : Paramètres > Diffusion > Service RTMP personnalisé. Collez l’URL et la clé.'),
  ('youtube', 'YouTube Live', false, 'Utilisez les paramètres de diffusion YouTube ou une destination RTMP externe selon votre configuration.'),
  ('facebook', 'Facebook Live', false, 'Utilisez le Live Producer de Facebook avec une connexion RTMP externe.')
on conflict (provider) do nothing;
