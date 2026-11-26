# Référencement TV+ Afrique

## Audit initial du 25 novembre 2026

Base de travail `a632b6c`, branche de production `integration/lws-api-v3`. Le déploiement public Vercel sert le catalogue éditorial MySQL LWS. Le dépôt utilise Vercel Blob pour la médiathèque et Groq pour les fonctions rédactionnelles.

| Priorité | Constat | Traitement |
| --- | --- | --- |
| Critique | Une mesure de l’indexation effective exige une propriété Search Console vérifiée. Le nombre d’articles publiés et le nombre d’URL indexées sont des mesures différentes. | Le module affiche le total du catalogue et aucun chiffre d’indexation externe. |
| Élevée | Le sitemap monolithique parcourt jusqu’à 250 pages du catalogue. Une mesure publique a retourné 2 262 812 octets et un TTFB de 5,63 s. | Index en une lecture paginée mise en cache, puis fichiers indépendants de 200 articles. |
| Élevée | Le titre SEO existait, mais l’auteur des liens courts était systématiquement la rédaction et les routes courtes et longues généraient leurs métadonnées séparément. | Générateur commun et signature réelle si elle existe. Redirection permanente des anciens chemins conservée. |
| Élevée | Le site n’émet ni flux RSS maison ni sitemap Actualités. | Flux publié limité à 40 articles. Sitemap Actualités limité aux articles publiés dans les dernières 48 heures du premier lot de 200. |
| Moyenne | Le JSON-LD article est local à une vue. Les émissions ont des métadonnées génériques. | Graphe NewsArticle et BreadcrumbList, et métadonnées canoniques pour les émissions. |
| Moyenne | L’éditeur propose des champs SEO sans diagnostic détaillé. | Score explicable sur 100, calculé en direct, et suggestions Groq à appliquer manuellement. |
| Moyenne | La performance mobile réelle, les données Discover, les liens entrants et les mentions ne sont pas mesurables depuis le dépôt. | Accès externes et collecte à prévoir. |
| Faible | La découverte RSS n’était pas déclarée dans les métadonnées publiques. | Déclaration RSS sur le site et les articles. |

## Utilisation rédactionnelle

Dans **Articles → Modifier → SEO et partage**, ouvrez le contrôle interne pour consulter le score et ses critères. Les suggestions Groq s’appuient sur le titre et les 7 000 premiers caractères du corps. Les titres SEO, la description et les mots-clés peuvent être appliqués au formulaire et modifiés avant enregistrement. Le résumé, la légende sociale et les questions restent des propositions à relire. Le score est une aide interne à la relecture. Le processus de publication garde ses règles habituelles.

Dans **Pilotage → SEO et visibilité**, les responsables disposant de `articles.review` retrouvent les compteurs du catalogue, un contrôle sur les 20 publications les plus récentes et les liens d’indexation. La génération IA réutilise les permissions de l’éditeur et le quota rédactionnel existant.

## Exploitation

- `/sitemap.xml` expose l’index. `/sitemap-pages.xml` regroupe les routes publiques retenues, les rubriques et les émissions. `/sitemap-articles-N.xml` liste les publications et les URL d’images HTTPS ou HTTP. `/sitemap-news.xml` expose les publications récentes horodatées.
- `/rss.xml` diffuse les articles de TV+ Afrique. Le fil News 24/7 continue d’agréger les sources externes.
- Le catalogue SEO garde un cache Next.js de 120 secondes marqué `public-articles`. Les réponses XML peuvent être mises en cache en périphérie. Les écritures éditoriales invalident le catalogue et les sorties principales. La propagation peut prendre le temps de revalidation en périphérie.
- Variables existantes utilisées : `NEXT_PUBLIC_SITE_URL`, `LWS_EDITORIAL_API_URL`, `GROQ_API_KEY`, `GROQ_MODEL`, `BLOB_READ_WRITE_TOKEN`, `AUTH_SESSION_SECRET` et limites IA facultatives. Configurez l’origine canonique de production dans Vercel. Utilisez une origine de préproduction et une protection d’accès pour les essais.
- Cette tranche n’exige aucune migration MySQL. Aucun changement de données ou de fournisseur.
- Avant production, vérifier le build de préproduction, tester avec un rédacteur les états brouillon, publication, désactivation et archivage, valider les XML et les aperçus, vérifier les données structurées publiques, mesurer les performances mobiles, puis obtenir l’autorisation explicite de déployer. Soumettre l’index via une propriété Search Console vérifiée après mise en ligne.

## Vérification et feuille de route

- `node --test tests/seo.test.mjs` contrôle l’échappement, les dates, le score et les liens.
- `node tests/seo-http.cjs` utilise un catalogue de test pour contrôler l’index, la pagination XML et de l’archive, la fenêtre Actualités, le RSS, la signature, le JSON-LD, la canonique, la redirection et le refus d’une génération sans authentification.
- La mesure avant intervention est un relevé ponctuel du sitemap public. Après intervention, le mécanisme de l’index a été vérifié avec des données de test. Les temps de réponse du futur déploiement et les Core Web Vitals au 75e percentile restent à mesurer en préproduction puis sur données terrain.
- L’archive des actualités est paginée et dispose de canoniques distinctes. Une page hors limites déclenche le rendu not-found de Next.js. En rendu diffusé, la réponse peut conserver le statut HTTP 200 avec une directive noindex. Priorités suivantes : canoniques et limites de pagination des rubriques et pays, rendez-vous de mesure Lighthouse et CrUX, validation Google des données structurées, puis comptes Search Console et GA4. Les sitemaps des auteurs, provinces et vidéos devront s’appuyer sur des pages publiques pérennes. L’indexation vidéo requiert des pages vidéo dédiées et les métadonnées réelles de chaque vidéo.
- Les connecteurs d’audience, IndexNow, suivi des backlinks, alertes, rapports historiques et campagnes payantes restent à intégrer. Les propriétés vérifiées, droits API et comptes fournisseurs sont nécessaires pour la mesure réelle. Aucun budget n’a été engagé. Les boutiques ne sont à intégrer qu’avec une application identifiée.
- L’audit complet de la base, des permissions de publication et du maillage reste à mener sur une copie autorisée. La charte éditoriale, la politique de correction et les profils publics demandent des informations validées par la rédaction.

## Références officielles

- [Sitemaps Google Actualités](https://developers.google.com/search/docs/crawling-indexing/sitemaps/news-sitemap)
- [Construction des sitemaps](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)
- [Données structurées Article](https://developers.google.com/search/docs/appearance/structured-data/article)
- [Google Discover](https://developers.google.com/search/docs/appearance/google-discover)
- [API Metadata de Next.js](https://nextjs.org/docs/app/api-reference/functions/generate-metadata)
