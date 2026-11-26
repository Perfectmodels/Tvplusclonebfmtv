-- TV+ Admin — statuts éditoriaux, médiathèque, journal d'audit et rôles.

alter table public.articles drop constraint if exists articles_status_check;
alter table public.articles add constraint articles_status_check
  check (status in ('draft', 'review', 'scheduled', 'published', 'archived'));

alter table public.articles add column if not exists seo_title text;
alter table public.articles add column if not exists seo_description text;
alter table public.articles add column if not exists scheduled_at timestamptz;
alter table public.articles add column if not exists updated_by uuid references auth.users(id) on delete set null;
alter table public.articles add column if not exists deleted_at timestamptz;

create table if not exists public.media (
  id uuid primary key default gen_random_uuid(),
  file_name text not null,
  storage_path text not null unique,
  public_url text not null,
  mime_type text not null,
  size_bytes bigint not null default 0,
  width integer,
  height integer,
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  actor_email text,
  action text not null,
  entity text not null,
  entity_id text,
  details jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_media_created on public.media(created_at desc);
create index if not exists idx_audit_created on public.audit_logs(created_at desc);
create index if not exists idx_articles_status on public.articles(status);
create index if not exists idx_articles_deleted on public.articles(deleted_at);

alter table public.media enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists "public read media" on public.media;
create policy "public read media" on public.media for select using (true);

insert into storage.buckets (id, name, public) values ('media', 'media', true)
  on conflict (id) do nothing;

-- Le rôle est vérifié côté serveur via profiles.role (reader | admin).
drop policy if exists "admin read audit" on public.audit_logs;
create policy "admin read audit" on public.audit_logs for select to authenticated using (false);
