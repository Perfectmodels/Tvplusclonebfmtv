# Migration TV+ Afrique V2 vers PostgreSQL LWS

Snapshot généré le 22 novembre 2026 en lecture seule depuis Supabase.

- Tables applicatives: 25
- Colonnes: 269
- Types ENUM: 7
- Contraintes: 140
- Index hors contraintes: 40
- Triggers: 16
- Politiques RLS: 52
- Fonctions publiques: 14
- Vues: 1

## Limites importantes

Le fichier `schema_v2_snapshot_reference.sql` est **une référence de structure**, pas un script prêt à être exécuté sur LWS : plusieurs clés étrangères, défauts et policies utilisent `auth.users`, `auth.uid()`, des extensions et des fonctions Supabase. Il ne contient aucun enregistrement et aucun secret.

Le dump de données exact requiert une connexion PostgreSQL à Supabase (pg_dump, restauration de test). Le site Next.js utilise Supabase JS et ne peut pas changer de base par une seule variable d'environnement. L'accès PostgreSQL LWS (hôte/port/version/autorisation Vercel) reste à établir.

Ne pas appliquer ces fichiers ni modifier Vercel avant sauvegarde, validation de l'authentification, des médias, de la régie et de la reprise en cas d'échec.
