create table if not exists public.tvplus_public_signals (
 topic text primary key check(topic in ('articles','media','replays')),
 revision bigint not null default 0 check(revision>=0),
 changed_at timestamptz not null default now()
);
alter table public.tvplus_public_signals enable row level security;
revoke all on public.tvplus_public_signals from public, anon, authenticated;
grant select on public.tvplus_public_signals to anon, authenticated;
create policy tvplus_public_signals_read on public.tvplus_public_signals for select to anon, authenticated using (true);
insert into public.tvplus_public_signals(topic) values ('articles'),('media'),('replays') on conflict do nothing;
create schema if not exists tvplus_internal;
revoke all on schema tvplus_internal from public, anon, authenticated;
create function tvplus_internal.signal_public_change() returns trigger language plpgsql security definer set search_path='' as $$
declare before_public boolean:=false; after_public boolean:=false; before_row jsonb; after_row jsonb; signal_topic text:=tg_argv[0];
begin
 if tg_op<>'INSERT' then
  before_row:=to_jsonb(old);
  before_public:=coalesce(before_row->>'status'='published',false) and case when signal_topic='replays' then coalesce((before_row->>'is_paid')::boolean,false)=false else coalesce((before_row->>'published_at')::timestamptz<=now(),false) end;
 end if;
 if tg_op<>'DELETE' then
  after_row:=to_jsonb(new);
  after_public:=coalesce(after_row->>'status'='published',false) and case when signal_topic='replays' then coalesce((after_row->>'is_paid')::boolean,false)=false else coalesce((after_row->>'published_at')::timestamptz<=now(),false) end;
 end if;
 if before_public or after_public then
  update public.tvplus_public_signals set revision=revision+1,changed_at=clock_timestamp() where topic=signal_topic and changed_at<clock_timestamp()-interval '2 seconds';
 end if;
 return null;
end;
$$;
revoke all on function tvplus_internal.signal_public_change() from public, anon, authenticated;
create trigger tvplus_articles_signal after insert or delete or update of status,title,slug,content_html,published_at,is_alert on public.articles for each row execute function tvplus_internal.signal_public_change('articles');
create trigger tvplus_media_signal after insert or delete or update of status,title,description,source_url,thumbnail_url,published_at on public.editorial_media for each row execute function tvplus_internal.signal_public_change('media');
create trigger tvplus_replays_signal after insert or delete or update of status,title,description,source_url,thumbnail_url,is_paid on public.episodes for each row execute function tvplus_internal.signal_public_change('replays');
alter publication supabase_realtime add table public.tvplus_public_signals;