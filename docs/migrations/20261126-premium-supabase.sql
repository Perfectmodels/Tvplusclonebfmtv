-- Direct Premium : catalogue, réglages et grille 100 % Supabase.
-- À exécuter dans le SQL Editor du projet Supabase de production.

create table if not exists public.premium_plans (
  slug text primary key,
  name text not null,
  amount integer not null check (amount > 0),
  duration_minutes integer not null check (duration_minutes > 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.premium_settings (
  id integer primary key check (id = 1),
  checkout_enabled boolean not null default false,
  golive_confirmed boolean not null default false,
  checkout_hosts text not null default '',
  return_origin text not null default '',
  updated_at timestamptz not null default now()
);

insert into public.premium_plans (slug, name, amount, duration_minutes, active)
values ('direct-24h', 'Accès direct 24 h', 500, 1440, true)
on conflict (slug) do update set name = excluded.name, amount = excluded.amount,
  duration_minutes = excluded.duration_minutes, active = true;

insert into public.premium_settings (id, checkout_enabled, golive_confirmed, checkout_hosts, return_origin)
values (1, false, false, '', '')
on conflict (id) do nothing;

-- Grille quotidienne de secours (visible tant que la régie n’a pas saisi ses créneaux).
insert into public.program_slots (weekday, start_time, title, kind)
select w.weekday, s.start_time, s.title, s.kind
from (values (1),(2),(3),(4),(5),(6),(0)) as w(weekday)
cross join (values
  ('06:00', 'Le réveil TV+', 'magazine'),
  ('12:00', 'Le journal de la mi-journée', 'information'),
  ('17:00', 'L’actualité en continu', 'information'),
  ('20:00', 'Le grand rendez-vous', 'magazine'),
  ('22:00', 'Débat et analyses', 'debat')
) as s(start_time, title, kind)
where not exists (select 1 from public.program_slots);

alter table public.premium_plans enable row level security;
alter table public.premium_settings enable row level security;

drop policy if exists "Premium plans are public" on public.premium_plans;
create policy "Premium plans are public" on public.premium_plans for select using (true);

drop policy if exists "Premium settings are public" on public.premium_settings;
create policy "Premium settings are public" on public.premium_settings for select using (true);
