-- TV+ Afrique — schéma initial (Supabase / Postgres 15+)
-- À exécuter dans le SQL Editor Supabase ou via `supabase db push`.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Tables éditoriales
-- ---------------------------------------------------------------------------
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.articles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  summary text not null,
  body text,
  category_slug text not null references public.categories(slug) on update cascade,
  image_url text,
  author text,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  featured boolean not null default false,
  kind text check (kind in ('live', 'alert', 'video', 'direct')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.fil_actu (
  id uuid primary key default gen_random_uuid(),
  article_slug text not null references public.articles(slug) on delete cascade,
  time_label text not null,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.videos (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  category_slug text not null references public.categories(slug) on update cascade,
  image_url text,
  duration text not null default '00:00',
  description text,
  published_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.programs (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  host text,
  slot text not null,
  category text not null,
  image_url text,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.podcasts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  category_slug text not null references public.categories(slug) on update cascade,
  image_url text,
  duration text not null default '00 min',
  description text,
  published_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.channels (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  tagline text,
  kind text not null default 'TNT',
  image_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.testimonials (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  place text not null,
  image_url text,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Tables de service
-- ---------------------------------------------------------------------------
create table if not exists public.newsletter_subscriptions (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  newsletter text not null default 'Récap Actu',
  created_at timestamptz not null default now(),
  unique (email, newsletter)
);

create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  subject text not null,
  message text not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
create index if not exists idx_articles_status_published on public.articles(status, published_at desc);
create index if not exists idx_articles_category on public.articles(category_slug);
create index if not exists idx_articles_search on public.articles using gin (to_tsvector('french', title || ' ' || summary));
create index if not exists idx_fil_actu_position on public.fil_actu(position);
create index if not exists idx_videos_published on public.videos(published_at desc);
create index if not exists idx_newsletter_created on public.newsletter_subscriptions(created_at desc);
create index if not exists idx_contacts_created on public.contacts(created_at desc);

drop trigger if exists trg_articles_updated on public.articles;
create trigger trg_articles_updated before update on public.articles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.categories enable row level security;
alter table public.articles enable row level security;
alter table public.fil_actu enable row level security;
alter table public.videos enable row level security;
alter table public.programs enable row level security;
alter table public.podcasts enable row level security;
alter table public.channels enable row level security;
alter table public.testimonials enable row level security;
alter table public.newsletter_subscriptions enable row level security;
alter table public.contacts enable row level security;

-- Lecture publique du contenu publié
drop policy if exists "public read categories" on public.categories;
create policy "public read categories" on public.categories for select using (true);

drop policy if exists "public read published articles" on public.articles;
create policy "public read published articles" on public.articles for select using (status = 'published');

drop policy if exists "public read fil actu" on public.fil_actu;
create policy "public read fil actu" on public.fil_actu for select using (true);

drop policy if exists "public read videos" on public.videos;
create policy "public read videos" on public.videos for select using (published_at is not null);

drop policy if exists "public read programs" on public.programs;
create policy "public read programs" on public.programs for select using (true);

drop policy if exists "public read podcasts" on public.podcasts;
create policy "public read podcasts" on public.podcasts for select using (published_at is not null);

drop policy if exists "public read channels" on public.channels;
create policy "public read channels" on public.channels for select using (true);

drop policy if exists "public read testimonials" on public.testimonials;
create policy "public read testimonials" on public.testimonials for select using (published = true);

-- Écriture publique limitée aux formulaires (pas de lecture)
drop policy if exists "public subscribe newsletter" on public.newsletter_subscriptions;
create policy "public subscribe newsletter" on public.newsletter_subscriptions
  for insert to anon, authenticated with check (
    email ~ '^[^@]+@[^@]+\.[^@]+$' and length(email) <= 200
  );

drop policy if exists "public send contact" on public.contacts;
create policy "public send contact" on public.contacts
  for insert to anon, authenticated with check (
    length(name) between 2 and 100 and
    email ~ '^[^@]+@[^@]+\.[^@]+$' and
    length(message) between 10 and 4000
  );

-- Les écritures éditoriales passent exclusivement par la clé secrète (service role),
-- qui contourne RLS côté serveur.
