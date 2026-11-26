begin;

alter table public.editorial_media
  add column studio_state text check (studio_state in ('draft','production','review','approved','scheduled','published','archived')),
  add column studio_revision integer not null default 0 check (studio_revision >= 0);

update public.editorial_media
set studio_state = case
  when status = 'published' and published_at > now() then 'scheduled'
  when status = 'published' then 'published'
  when status = 'archived' then 'archived'
  else 'draft'
end
where kind in ('reel','podcast','reportage');

create policy studio_kind_read on public.editorial_media for select to authenticated
  using (kind in ('reel','podcast','reportage') and public.has_permission('studio.' || kind || '_manage'));
create policy studio_kind_insert on public.editorial_media for insert to authenticated
  with check (kind in ('reel','podcast','reportage') and public.has_permission('studio.' || kind || '_manage'));
create policy studio_kind_update on public.editorial_media for update to authenticated
  using (kind in ('reel','podcast','reportage') and public.has_permission('studio.' || kind || '_manage'))
  with check (kind in ('reel','podcast','reportage') and public.has_permission('studio.' || kind || '_manage'));

create function public.guard_audiovisual_studio() returns trigger
language plpgsql set search_path = '' as $$
declare
  previous_state text;
  reviewer boolean;
  permitted boolean;
begin
  if current_user <> 'authenticated' then return new; end if;
  if tg_op = 'UPDATE' then
    if new.kind is distinct from old.kind then
      raise exception 'Le format est immuable.' using errcode = '42501';
    end if;
  end if;
  if new.kind not in ('reel','podcast','reportage') then return new; end if;

  if tg_op = 'INSERT' then
    if new.studio_state is distinct from 'draft' or new.status <> 'draft' or new.published_at is not null then
      raise exception 'Le contenu doit être créé en brouillon.' using errcode = '42501';
    end if;
    new.studio_revision := 1;
  else
    previous_state := case
      when old.studio_state = 'scheduled' and old.published_at <= now() then 'published'
      else coalesce(old.studio_state, case old.status when 'published' then 'published' when 'archived' then 'archived' else 'draft' end)
    end;
    reviewer := public.has_permission('articles.review') or public.has_permission('settings.manage');
    if new.studio_state is not distinct from previous_state then
      permitted := previous_state in ('draft','production')
        and new.status = old.status and new.published_at is not distinct from old.published_at;
    else
      permitted := case previous_state
        when 'draft' then new.studio_state in ('production','review','archived')
        when 'production' then new.studio_state in ('draft','review','archived')
        when 'review' then reviewer and new.studio_state in ('production','approved','archived')
        when 'approved' then reviewer and new.studio_state in ('production','published','scheduled')
        when 'scheduled' then reviewer and new.studio_state in ('production','archived')
        when 'published' then reviewer and new.studio_state in ('production','archived')
        when 'archived' then reviewer and new.studio_state = 'draft'
        else false
      end;
      permitted := permitted and
        (to_jsonb(new) - array['studio_state','studio_revision','status','published_at','updated_at']) =
        (to_jsonb(old) - array['studio_state','studio_revision','status','published_at','updated_at']);

      if new.studio_state in ('review','approved','published','scheduled')
         and (coalesce(old.source_url, '') !~ '^https://[^[:space:]]+$'
           or coalesce(old.thumbnail_url, '') !~ '^https://[^[:space:]]+$'
           or char_length(btrim(old.title)) < 3) then
        raise exception 'Source média compatible et couverture requises.' using errcode = '23514';
      end if;
      new.status := case when new.studio_state in ('published','scheduled') then 'published' else 'draft' end;
      if new.studio_state = 'published' then new.published_at := now();
      elsif new.studio_state = 'scheduled' then
        if new.published_at is null or new.published_at <= now() + interval '1 minute' then
          raise exception 'Date future requise.' using errcode = '23514';
        end if;
      else new.published_at := null;
      end if;
    end if;
    if permitted is distinct from true then
      raise exception 'Modification ou transition non autorisée.' using errcode = '42501';
    end if;
    new.studio_revision := old.studio_revision + 1;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger guard_audiovisual_studio
before insert or update on public.editorial_media
for each row execute function public.guard_audiovisual_studio();

commit;
