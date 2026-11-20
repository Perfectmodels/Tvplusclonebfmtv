-- Slug public pour chaque dépêche du fil News 24/7.

alter table public.news_feed add column if not exists slug text unique;

update public.news_feed
set slug = regexp_replace(
  regexp_replace(
    lower(translate(title, 'ÀÁÂÃÄÅàáâãäåÉÈÊËéèêëÎÏîïÔÕÖÙÚÛÜùúûüÇç', 'AAAAAAaaaaaaEEEEeeeeIIiiOOOOUUUUuuuuCc')),
    '[^a-z0-9]+', '-', 'g'
  ),
  '^-|-$', '', 'g'
) || '-' || substr(id::text, 1, 8)
where slug is null;
