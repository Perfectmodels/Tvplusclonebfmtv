# Configuration transitoire MySQL V3

`LWS_EDITORIAL_API_URL` est le commutateur : dès qu'il est renseigné, les modules
raccordés ne retombent **jamais** silencieusement sur Supabase. Une table ou une
colonne manquante renvoie une erreur 503 explicite côté API.

## Modules raccordés à la V3

| Domaine | Lecture | Écriture |
| --- | --- | --- |
| Articles (public + admin) | `resource=articles`, `newsroom.list/get/stats` | `newsroom.create/edit/transition/publish_due` |
| À la une, vidéos, catégories publiques | `resource=articles&highlights=1|video=1`, `resource=categories` | — |
| Émissions et replays | `resource=programs/episodes`, `newsroom.shows.*/episodes.*` | `newsroom.shows.*/episodes.*` |
| Tableau de bord admin-v2 | `newsroom.dashboard`, `newsroom.dashboard.full` | — |
| Profils, rôles et permissions | `newsroom.profile.resolve`, `users.list/authors`, `roles.list` | `newsroom.users.create/update` |
| Rubriques administratives | `newsroom.categories.list` | `newsroom.categories.create/edit/delete` |
| Médiathèque (fiches) | `newsroom.media.list` | `newsroom.media.create/delete` |
| Compteurs de lecture | `newsroom.reads.get` | `newsroom.reads.record` |
| Direct (régie + lecteur public) | `resource=live`, `newsroom.live.get` | `newsroom.live.save` |
| Enrichissement des listes admin | `newsroom.lookups` | — |

Restent volontairement sur Supabase pendant la transition : l'authentification
(session/JWT), les canaux et cibles de diffusion, le coffre Restream et les
stockages de fichiers (Vercel Blob / bucket existant). Le back-office historique
`/admin` n'est pas modifié ; en mode V2 ses URL sont redirigées vers `/admin-v2`.

## Déploiement LWS

1. Sauvegarder V3, comparer `SHOW TABLES` et `SHOW CREATE TABLE` au contrat SQL :
   `upgrade-v3.sql`, `upgrade-programming.sql` et `upgrade-v3-admin.sql`.
   **Ne pas importer aveuglément**, ne jamais DROP, ne pas migrer les données
   historiques sans validation séparée.
2. Renseigner `tvp_live_settings` (ligne `id=1`) et les tables `tvp_profiles` /
   `tvp_roles` **avant** d'activer `LWS_EDITORIAL_API_URL`, sinon les comptes
   administrateurs seront refusés (`profile.resolve` → 403).
   Les permissions de `tvp_roles.permissions` reprennent les clés existantes :
   `articles.read_all`, `articles.create`, `articles.review`,
   `articles.publish_scheduled`, `shows.manage`, `categories.manage`,
   `media.upload`, `media.delete`, `users.manage`, `schedule.manage`, `audit.read`.
3. Déployer **ensemble** `index.php`, `newsroom.php`, `programming.php` et
   `admin.php`. Ne jamais exposer `tvplus-v3-private.php`.
4. Tester : lecture publique, ouverture de session admin, création d'un
   brouillon vidéo, d'une émission, d'un replay, d'une rubrique, ajout d'un
   média, comptage de lecture et bascule du direct — puis vérifier la même
   ligne dans MySQL.
5. Les replays programmés deviennent visibles à échéance ; les articles
   programmés sont publiés par le cron avec `CRON_SECRET` (et non
   `SUPABASE_SECRET_KEY`) quand le drapeau LWS est actif.

## Variables d'environnement Next.js

`LWS_EDITORIAL_API_URL`, `LWS_EDITORIAL_SERVICE_KEY`. Les variables Supabase
restent nécessaires pour l'authentification et le stockage.
