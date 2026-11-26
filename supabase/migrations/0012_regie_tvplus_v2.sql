-- TV+ Afrique V2 : configuration de régie, destinations et programmation vidéo.
-- Les clés RTMP/RTMPS et tokens des plateformes ne sont jamais stockés ici.
alter table public.site_live_settings
  add column if not exists player_platform text not null default 'hls',
  add column if not exists playback_url text not null default '',
  add column if not exists description text not null default '',
  add column if not exists starts_at timestamptz,
  add column if not exists ends_at timestamptz,
  add column if not exists standby_message text not null default 'Le direct reprendra prochainement.';

create table if not exists public.live_distribution_channels (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  platform text not null check (platform in (
    'youtube','facebook','tiktok','twitch','dailymotion','vimeo',
    'restream','mux','cloudflare','wowza','castr','custom'
  )),
  watch_url text not null default '',
  enabled boolean not null default false,
  position integer not null default 0,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists live_distribution_channels_position_idx
  on public.live_distribution_channels(position,name);
drop trigger if exists live_distribution_channels_updated on public.live_distribution_channels;
create trigger live_distribution_channels_updated before update on public.live_distribution_channels
  for each row execute function public.set_updated_at();
alter table public.live_distribution_channels enable row level security;
grant select,insert,update,delete on public.live_distribution_channels to authenticated;
drop policy if exists live_distribution_manage on public.live_distribution_channels;
create policy live_distribution_manage on public.live_distribution_channels
  for all to authenticated
  using ((select public.has_permission('schedule.manage')))
  with check ((select public.has_permission('schedule.manage')));

alter type public.video_platform add value if not exists 'facebook';
alter type public.video_platform add value if not exists 'vimeo';
alter type public.video_platform add value if not exists 'dailymotion';

alter table public.episodes
  add column if not exists source_url text not null default '',
  add column if not exists publish_at timestamptz,
  add column if not exists thumbnail_url text not null default '';
create index if not exists episodes_publish_queue_idx on public.episodes(publish_at)
  where status='draft' and publish_at is not null;

alter table public.shows
  add column if not exists host_name text not null default '',
  add column if not exists frequency text not null default '';

alter table public.homepage_ad_slots
  add column if not exists starts_at timestamptz,
  add column if not exists ends_at timestamptz;

-- Active les replays programmés depuis PostgreSQL, même si personne ne consulte le site.
-- Les lignes restent privées tant que le statut n'est pas 'published'.
select cron.schedule(
  'tvplus-v2-publish-replays',
  '* * * * *',
  $$update public.episodes set status='published'
      where status='draft' and publish_at is not null and publish_at<=now()$$
);
