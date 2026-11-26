# TV Plus — portail d'actualité Next.js

Portail d'information en continu inspiré des grands sites de télévision d'information (mise en page, navigation, fil actu, directs, alertes). Les actualités gabonaises affichées proviennent de flux RSS publics ; deux titres par rubrique sont stockés en base. Ce projet n'est pas affilié à BFMTV.

## Installation

```bash
npm install
npm run dev
```

Ouvrir http://localhost:3000.

## Pages publiques

- Accueil, recherche, fil info (`/news-24-7`), rubriques et articles
- Direct, vidéos, replay des émissions, podcasts, programme TV, canaux TV
- Newsletters, témoins, pratique, plan du site, à propos
- Mentions légales, CGU, données personnelles, contact, page 404

## Administration

Espace `/admin` réservé aux comptes `admin` (rôles dans `profiles`) : tableau de bord avec statistiques réelles, CRUD articles/rubriques/émissions, médiathèque Supabase Storage, gestion des utilisateurs et paramètres (tendances, flux RSS). Toutes les opérations passent par des Route Handlers protégés (`/api/admin/*`) avec validation Zod, permissions serveur et journalisation dans `audit_logs`.

Pour promouvoir un utilisateur : `node --env-file=.env scripts/promote-admin.mjs <email>`.

La vidéothèque SproutVideo est accessible dans `/admin-v2/videos`. Elle permet de téléverser, renommer et supprimer les vidéos directement depuis le tableau de bord, avec un envoi du fichier au navigateur vers SproutVideo. Voir `docs/sproutvideo-videotheque.md`.

## URL courtes

Chaque article possède un `short_id` de 7 caractères généré côté serveur. L'URL publique définitive est `/a/{shortId}` (ex. `/a/k8P3m2`). Les anciennes URL `/article/{slug}` redirigent en 308. Le shortId est stable après modification du titre et utilisé pour canonical, Open Graph, sitemap et partages. Backfill : `node --env-file=.env scripts/backfill-short-ids.mjs`.

## News 24/7

Un bandeau de fil d’actu alimenté par plusieurs flux RSS est affiché sur toutes les pages. Les sources sont stockées en interne dans `rss_sources` et ne sont jamais affichées ni renvoyées par l’API publique (`/api/news-24-7`).

- Rafraîchissement manuel : `POST /api/cron/refresh-rss` avec l’en-tête `Authorization: Bearer <SUPABASE_SECRET_KEY>`
- Ajout/suppression de flux : `/api/admin/rss-sources` (même autorisation)
- Schéma : `supabase/migrations/0002_news_24_7.sql`, sources par défaut : `supabase/seed-news.sql`

## Composants

`components/` contient les briques réutilisables : en-tête, pied de page, cartes d'article, barre d'alerte, fil d'Ariane, titres de section, lecteur direct, newsletter, badges, pagination, partage et états vides.

## Suite de développement

Remplacer `lib/data.ts` et `lib/extra.ts` par une API ou un CMS, connecter le lecteur vidéo HLS, ajouter authentification et administration, SEO avancé et cache.
