-- News 24/7 — agrégateur RSS
-- Les sources sont stockées à des fines internes : elles ne sont jamais
-- exposées dans le bandeau ni dans l'API publique.

create table if not exists public.rss_sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  url text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.news_feed (
  id uuid primary key default gen_random_uuid(),
  guid text not null unique,
  title text not null,
  link text not null,
  description text,
  published_at timestamptz,
  source_id uuid references public.rss_sources(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_news_feed_published on public.news_feed(published_at desc);
create index if not exists idx_news_feed_created on public.news_feed(created_at desc);

alter table public.rss_sources enable row level security;
alter table public.news_feed enable row level security;

drop policy if exists "public read news feed" on public.news_feed;
create policy "public read news feed" on public.news_feed for select using (true);

-- rss_sources : aucune politique publique, gestion réservée à la clé secrète.
