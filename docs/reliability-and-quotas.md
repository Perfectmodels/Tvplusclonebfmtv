# TV+ Afrique — haute disponibilité et maîtrise des quotas

## Ce qui est réellement conservé

- Supabase conserve les articles, rubriques, profils, rôles, métadonnées et les informations nécessaires à la rédaction.
- Les 5 carrousels publicitaires et leurs 25 emplacements sont configurés dans `data/homepage-ads.json`, hors base.
- Le **nouveau News 24/7** lit directement les RSS via `lib/rss/news.ts`. Il n'écrit ni ne lit dans Supabase.
- Le direct TV+ lit une **URL HLS externe** depuis `NEXT_PUBLIC_LIVE_STREAM_URL`. Le site Next.js ne rediffuse pas les segments vidéo.

## Protection contre les pics de fréquentation

| Service | Mécanisme | Limite technique |
| --- | --- | --- |
| RSS | 43 sources conservées, 12 prioritaires + 6 tournantes | Maximum 18 sources interrogées par renouvellement |
| RSS | Revalidation du cache de données | 180 secondes |
| RSS | Cache HTTP des sources | 600 secondes |
| RSS | Durée maximale par source | 3,5 secondes |
| RSS | Concurrence des sources | 9 fetchs au maximum par rafraîchissement |
| Flux RSS public | CDN via `/api/news-24-7` | `s-maxage=180`, stale-while-revalidate 600 |
| Liste d'articles TV+ V2 | Data Cache Next.js | 60 secondes |
| Détails d'articles TV+ V2 | Data Cache Next.js | 90 secondes |
| Catégories TV+ V2 | Data Cache Next.js | 600 secondes |
| Emissions TV+ V2 | Data Cache Next.js | 300 secondes |

Les limites de concurrence du collecteur RSS sont **par exécution**, pas un plafond global entre plusieurs instances serverless. La persistance et le partage du cache dépendent de l'infrastructure, et les quotas réels dépendent de l'abonnement.

## En cas d'indisponibilité

- Si une source RSS ne répond pas, on la saute ; les autres continuent.
- Si toutes les sources échouent lors d'un premier chargement, le fil peut être temporairement vide et les autres sections restent visibles.
- Si une requête Supabase d'un bloc public échoue, le reste de la page se charge lorsque cela est possible.
- Les erreurs de page non anticipées affichent une page de récupération et une action Réessayer.
- Les opérations de publication/écriture du **clone** restent indisponibles tant que ses permissions ne sont pas adaptées au schéma TV+ V2.

## Attention à la base déjà en service

Le projet TV+ V2 partagé possède **ses propres tâches planifiées**, indépendantes du nouveau clone. Deux tâches actives, toutes les cinq minutes, semblent liées aux flux d'actualités. Elles peuvent continuer d'enregistrer des dépêches dans Supabase.

Ne pas les supprimer ou les désactiver sans vérifier leur usage dans le site TV+ V2 existant : le clone n'en dépend plus, mais d'autres services peuvent en dépendre.

## Vérifications avant un déploiement

1. `npm run feed:check`, `npm run ads:check`, `npm run typecheck` et `npm run build`.
2. Configurer `SUPABASE_SCHEMA_MODE=tvplus-v2` et les variables Supabase **sur une prévisualisation**, sans clé secrète sur le navigateur.
3. Effectuer un test de charge progressif sur la prévisualisation, mesurer les taux d'erreur et latences plutôt que de promettre « zéro panne ».
4. Surveiller Supabase : taille de la base, Database Egress, connections, CPU, latence, et Vercel : exécutions, bande passante, erreurs.
5. Configurer des alertes de consommation à 70 %, 85 %, 95 %, et un processus de sauvegarde et récupération.
6. Pour une très forte audience ou plusieurs instances, prévoir un **cache distribué / CDN** et un hébergement du HLS adapté à l'audience.

## Vérifier le module

```bash
npm run feed:check
```

Ce contrôle vérifie les sources exportées, la présence du cache et la désactivation du cron d'écriture. Il ne remplace ni les tests de charge ni une mesure réelle des quotas.
