-- URL courtes natives des articles : /a/{shortId}

alter table public.articles add column if not exists short_id text unique;

create index if not exists idx_articles_short_id on public.articles(short_id);
