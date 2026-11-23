-- Restream OAuth credentials are encrypted by the Next.js server before storage.
-- RLS allows only TV+ users with schedule.manage. No anonymous grants.
create table if not exists public.restream_connections (
 id smallint primary key default 1 check (id = 1),
 account_id text not null,
 account_name text not null,
 token_ciphertext text not null,
 expires_at timestamptz not null,
 connected_by uuid not null references auth.users(id),
 updated_at timestamptz not null default now()
);
alter table public.restream_connections enable row level security;
revoke all on table public.restream_connections from PUBLIC, anon, authenticated;
grant select, insert, update, delete on public.restream_connections to authenticated;
drop policy if exists restream_manage_select on public.restream_connections;
drop policy if exists restream_manage_insert on public.restream_connections;
drop policy if exists restream_manage_update on public.restream_connections;
drop policy if exists restream_manage_delete on public.restream_connections;
create policy restream_manage_select on public.restream_connections for select to authenticated using (
 exists (select 1 from public.profiles p join public.roles r on r.key=p.role
         where p.id=(select auth.uid()) and p.is_active=true and 'schedule.manage'=any(r.permissions))
);
create policy restream_manage_insert on public.restream_connections for insert to authenticated with check (
 id=1 and connected_by=(select auth.uid()) and
 exists (select 1 from public.profiles p join public.roles r on r.key=p.role
         where p.id=(select auth.uid()) and p.is_active=true and 'schedule.manage'=any(r.permissions))
);
create policy restream_manage_update on public.restream_connections for update to authenticated using (
 exists (select 1 from public.profiles p join public.roles r on r.key=p.role
         where p.id=(select auth.uid()) and p.is_active=true and 'schedule.manage'=any(r.permissions))
) with check (
 id=1 and connected_by=(select auth.uid()) and
 exists (select 1 from public.profiles p join public.roles r on r.key=p.role
         where p.id=(select auth.uid()) and p.is_active=true and 'schedule.manage'=any(r.permissions))
);
create policy restream_manage_delete on public.restream_connections for delete to authenticated using (
 exists (select 1 from public.profiles p join public.roles r on r.key=p.role
         where p.id=(select auth.uid()) and p.is_active=true and 'schedule.manage'=any(r.permissions))
);
