-- Déjà appliqué sur le projet Supabase TV+ V2. À répliquer sur les autres environnements.
create table if not exists public.live_stream_targets (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  provider text not null default 'custom',
  direction text not null default 'source' check (direction in ('source','destination')),
  protocol text not null default 'rtmps' check (protocol in ('rtmps','rtmp','srt','whip','platform')),
  endpoint_secret_id uuid,
  stream_key_secret_id uuid,
  watch_url text not null default '',
  enabled boolean not null default false,
  position integer not null default 0 check (position between 0 and 999),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.live_stream_targets enable row level security;
revoke all on public.live_stream_targets from public, anon, authenticated;
grant select,insert,update,delete on public.live_stream_targets to service_role;
create index if not exists idx_live_stream_targets_position on public.live_stream_targets (position,created_at);

create or replace function public.tvplus_save_live_target(
  p_id uuid, p_name text, p_provider text, p_direction text, p_protocol text,
  p_watch_url text, p_enabled boolean, p_position integer, p_notes text,
  p_endpoint text, p_stream_key text,
  p_clear_endpoint boolean, p_clear_key boolean
) returns uuid
language plpgsql security definer set search_path = ''
as $fn$
declare
  v_id uuid;
  v_endpoint_id uuid;
  v_key_id uuid;
begin
  if coalesce(current_setting('request.jwt.claim.role',true),'') <> 'service_role' then
    raise exception 'Service role requis';
  end if;
  if length(trim(p_name)) < 2 or length(p_name)>120 or
     p_direction not in ('source','destination') or
     p_protocol not in ('rtmps','rtmp','srt','whip','platform') then
    raise exception 'Configuration invalide';
  end if;
  if p_id is not null then
    select endpoint_secret_id,stream_key_secret_id into v_endpoint_id,v_key_id
    from public.live_stream_targets where id=p_id for update;
    if not found then raise exception 'Profil de diffusion introuvable'; end if;
    v_id:=p_id;
  else
    v_id:=gen_random_uuid();
  end if;
  if coalesce(p_clear_endpoint,false) and v_endpoint_id is not null then
    delete from vault.secrets where id=v_endpoint_id;
    v_endpoint_id:=null;
  end if;
  if coalesce(p_clear_key,false) and v_key_id is not null then
    delete from vault.secrets where id=v_key_id;
    v_key_id:=null;
  end if;
  if nullif(p_endpoint,'') is not null then
    if v_endpoint_id is null then
      v_endpoint_id:=vault.create_secret(p_endpoint);
    else
      perform vault.update_secret(v_endpoint_id,p_endpoint);
    end if;
  end if;
  if nullif(p_stream_key,'') is not null then
    if v_key_id is null then
      v_key_id:=vault.create_secret(p_stream_key);
    else
      perform vault.update_secret(v_key_id,p_stream_key);
    end if;
  end if;
  if p_id is null then
    insert into public.live_stream_targets
      (id,name,provider,direction,protocol,endpoint_secret_id,stream_key_secret_id,watch_url,enabled,position,notes)
    values
      (v_id,trim(p_name),p_provider,p_direction,p_protocol,v_endpoint_id,v_key_id,p_watch_url,p_enabled,p_position,p_notes);
  else
    update public.live_stream_targets set
      name=trim(p_name), provider=p_provider,direction=p_direction,protocol=p_protocol,
      endpoint_secret_id=v_endpoint_id,stream_key_secret_id=v_key_id,
      watch_url=p_watch_url,enabled=p_enabled,position=p_position,notes=p_notes,
      updated_at=now()
    where id=v_id;
  end if;
  return v_id;
end
$fn$;
revoke all on function public.tvplus_save_live_target(uuid,text,text,text,text,text,boolean,integer,text,text,text,boolean,boolean) from public,anon,authenticated;
grant execute on function public.tvplus_save_live_target(uuid,text,text,text,text,text,boolean,integer,text,text,text,boolean,boolean) to service_role;

create or replace function public.tvplus_delete_live_target(p_id uuid) returns boolean
language plpgsql security definer set search_path=''
as $fn$
declare v_endpoint uuid;v_key uuid;
begin
 if coalesce(current_setting('request.jwt.claim.role',true),'') <> 'service_role' then
   raise exception 'Service role requis';
 end if;
 select endpoint_secret_id,stream_key_secret_id into v_endpoint,v_key
 from public.live_stream_targets where id=p_id for update;
 if not found then return false; end if;
 delete from public.live_stream_targets where id=p_id;
 if v_endpoint is not null then delete from vault.secrets where id=v_endpoint;end if;
 if v_key is not null then delete from vault.secrets where id=v_key;end if;
 return true;
end
$fn$;
revoke all on function public.tvplus_delete_live_target(uuid) from public,anon,authenticated;
grant execute on function public.tvplus_delete_live_target(uuid) to service_role;

-- An existing Restream WHIP ingest URL was placed into the public watch-link column.
-- Transfer it into encrypted Vault storage before clearing the mistaken link.
do $block$
declare v_row record;
begin
 for v_row in select id,name,watch_url,position,notes
   from public.live_distribution_channels
   where watch_url like 'https://live.restream.io/whip/%'
 loop
   insert into public.live_stream_targets
     (name,provider,direction,protocol,endpoint_secret_id,watch_url,enabled,position,notes)
   values
     (v_row.name,'restream','source','whip',
      vault.create_secret(v_row.watch_url),'',false,v_row.position,
      'Import de la configuration WHIP existante. Confirmer les paramètres dans Restream.');
   update public.live_distribution_channels set watch_url='',enabled=false,
     notes='Migré vers la régie sécurisée WHIP',updated_at=now()
   where id=v_row.id;
 end loop;
end
$block$;
