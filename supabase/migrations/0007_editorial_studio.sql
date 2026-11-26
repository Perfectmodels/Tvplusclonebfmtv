-- Studio éditorial TV+ — contenu structuré, SEO, workflow et révisions.

alter table public.articles drop constraint if exists articles_status_check;
alter table public.articles add constraint articles_status_check
  check (status in ('draft', 'review', 'needs_correction', 'validated', 'scheduled', 'published', 'archived'));

alter table public.articles
  add column if not exists chapter text,
  add column if not exists content_json jsonb,
  add column if not exists content_html text,
  add column if not exists country_code text not null default 'GA',
  add column if not exists province text,
  add column if not exists tags text[] not null default '{}',
  add column if not exists keywords text[] not null default '{}',
  add column if not exists author text,
  add column if not exists canonical_url text,
  add column if not exists robots text not null default 'index,follow',
  add column if not exists cover_alt text,
  add column if not exists cover_credit text,
  add column if not exists cover_caption text,
  add column if not exists source_media_id uuid references public.media(id) on delete set null,
  add column if not exists word_count integer not null default 0,
  add column if not exists reading_time integer not null default 1,
  add column if not exists version integer not null default 1;

create table if not exists public.article_revisions (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.articles(id) on delete cascade,
  version integer not null,
  title text,
  content_json jsonb,
  content_html text,
  changed_by uuid references auth.users(id) on delete set null,
  change_note text,
  created_at timestamptz not null default now(),
  unique (article_id, version)
);

create index if not exists idx_revisions_article on public.article_revisions(article_id, version desc);
create index if not exists idx_articles_scheduled on public.articles(status, scheduled_at);

alter table public.article_revisions enable row level security;
