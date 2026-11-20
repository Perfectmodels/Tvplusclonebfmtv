-- Signalement éditorial : alerte info et mise à la une.
alter table public.articles add column if not exists is_alert boolean not null default false;

-- Les anciennes alertes (kind = 'alert') deviennent des alertes info.
update public.articles set is_alert = true where kind = 'alert' and is_alert = false;

create index if not exists idx_articles_alert_featured on public.articles(is_alert, featured, published_at desc);
