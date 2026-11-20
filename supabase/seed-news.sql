-- Sources RSS par défaut pour le fil News 24/7.
-- Les noms restent internes et ne sont jamais affichés dans le bandeau.

insert into public.rss_sources (name, url, active) values
  ('Gabon', 'https://news.google.com/rss/search?q=Gabon&hl=fr&gl=FR&ceid=FR:fr', true),
  ('Libreville', 'https://news.google.com/rss/search?q=Libreville&hl=fr&gl=FR&ceid=FR:fr', true),
  ('Afrique', 'https://news.google.com/rss/search?q=Afrique&hl=fr&gl=FR&ceid=FR:fr', true),
  ('International', 'https://news.google.com/rss/search?q=International&hl=fr&gl=FR&ceid=FR:fr', true),
  ('RFI Afrique', 'https://www.rfi.fr/fr/rss', true),
  ('France 24', 'https://www.france24.com/fr/rss', true),
  ('Gabonreview', 'https://www.gabonreview.com/feed/', true)
on conflict (url) do nothing;
