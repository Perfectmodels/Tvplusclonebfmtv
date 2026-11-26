-- Staged migration for TV+ V2. Review against target schema before executing.
begin;
alter table public.articles add column if not exists video_source_url text;
alter table public.shows add column if not exists intro_video_url text;
create table if not exists public.editorial_media (
 id uuid primary key default gen_random_uuid(),
 kind text not null check (kind in ('reel','reportage','podcast')),
 title text not null check (char_length(title) between 3 and 200),
 description text not null default '',
 category text not null default '',
 source_url text not null,
 thumbnail_url text not null default '',
 duration_seconds integer check (duration_seconds >= 0),
 status text not null default 'draft' check (status in ('draft','published')),
 published_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table public.editorial_media enable row level security;
revoke all on public.editorial_media from anon, authenticated;
grant select on public.editorial_media to anon, authenticated;
grant all on public.editorial_media to service_role;
drop policy if exists editorial_media_public_read on public.editorial_media;
create policy editorial_media_public_read on public.editorial_media for select to anon, authenticated using (status='published' and published_at<=now());
create index if not exists editorial_media_public_idx on public.editorial_media (kind, published_at desc) where status='published';
create table if not exists public.live_entitlements(
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 starts_at timestamptz not null,
 ends_at timestamptz not null check (ends_at>starts_at),
 status text not null default 'active' check (status in ('active','revoked')),
 reference text unique,
 created_at timestamptz not null default now()
);
alter table public.live_entitlements enable row level security;
revoke all on public.live_entitlements from anon,authenticated;
grant select on public.live_entitlements to authenticated;
grant all on public.live_entitlements to service_role;
drop policy if exists live_entitlement_owner on public.live_entitlements;
create policy live_entitlement_owner on public.live_entitlements for select to authenticated using (auth.uid()=user_id);
create index if not exists live_entitlements_user_idx on public.live_entitlements(user_id,ends_at) where status='active';
commit;
-- Before production premium activation: audit all direct public URLs and policies
-- for site_live_settings; rotate/disable publicly accessible streams and replace
-- with provider-enforced signed playback. No public player URL may bypass entitlement.
