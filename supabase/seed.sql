-- Catégories de TV Plus (aucune rubrique régionale).
-- Les articles réels sont insérés par la migration 0004_real_gabon_news.sql.

insert into public.categories (slug, name, description) values
  ('politique', 'Politique', 'L’actualité politique au Gabon'),
  ('international', 'International', 'L’actualité internationale'),
  ('police-justice', 'Police-Justice', 'Faits divers et justice'),
  ('societe', 'Société', 'L’actualité de la société'),
  ('economie', 'Économie', 'Économie et entreprises'),
  ('tech', 'Tech', 'Numérique et innovation'),
  ('sport', 'Sport', 'Le sport gabonais et international'),
  ('culture', 'Culture', 'Culture et création'),
  ('environnement', 'Environnement', 'Forêts, climat et biodiversité')
on conflict (slug) do nothing;
