# Refonte TV+ Afrique — accueil et audiovisuel
## Accueil
À la une avant le Fil actu vertical (10 par page), exclusions du grand article et de l'alerte rédactionnelle, lien Toutes les actualités. Le flux RSS News 24/7 conserve ses sources sous le titre ALERTE INFO : aucun lien externe dans la présentation, cache existant, rafraîchissement à 120 s lorsque l'onglet est visible, zéro lecture/écriture DB du RSS. Les 5 emplacements publicitaires existants sont réutilisés (after-live devient le bandeau dans la colonne latérale). Les articles vidéo ont un bandeau dédié. Interludes Reels, Ligne Rouge, Replay, Reportages, Podcasts après les rubriques, dans cet ordre par défaut. Le back-office /admin-v2/homepage permet de les déplacer et masquer. Les blocs vides ne sont pas affichés.
## Médias
/admin-v2/editorial-media gère brouillons et contenus publiés. Les sources doivent être HTTPS et compatibles. /reels, /videos, /podcasts, /media/:id ; /ligne-rouge sélectionne l'émission existante par slug/titre et ses vrais replays. /articles-video filtre les articles vidéo. Le champ video_source_url est ajouté au formulaire rédaction et rendu par le lecteur compatible. Les génériques (intro_video_url) sont associés aux émissions, affichés dans leur fiche et catalogue, sans lecture automatique sonore. Aucun générique fictif. Les sources existantes doivent être saisies/importées par la rédaction.
## Grille
Préservation de weekday des program_slots, affichage par jour. Convention d'affichage 1=lundi, 7=dimanche (0 également accepté pour dimanche) ; vérifier la convention réelle avant production. La grille ne prétend pas connaître le programme réellement à l'antenne.
## Direct Premium : pas encore de paiement opérationnel
Le lecteur flottant est remplacé par une redirection vers /direct. /api/live-stream est privé, sans cache partagé. L'accès requiert une session et un droit live_entitlements valide, puis une URL de lecture signée délivrée par un service tiers configuré (LIVE_TOKEN_BROKER_URL, LIVE_TOKEN_BROKER_SECRET, LIVE_EMBED_HOSTS). Le broker doit imposer l'authentification de lecture sur le CDN, vérifier l'expiration et délivrer une URL HTTPS éphémère. Aucune URL Restream publique ne doit être utilisée ni exposée. Le contrat actuel attend embedUrl et expiresAt et un TTL court ; valider la durée de session et le renouvellement avec le fournisseur avant activation. L'absence de configuration bloque le lecteur, n'active aucun paiement et ne crée aucun abonnement.
Le fournisseur de paiement, les prix, la devise, les conditions de remboursement, les webhooks signés et idempotents et l'attribution de droits après paiement vérifié restent à choisir/intégrer. Aucun paiement fictif. Vérifier la révocation des accès publics existants à la source Restream et site_live_settings avant publication. 
## Migrations
docs/migrations/20261125-home-media-premium.sql et docs/migrations/20261125-home-layout.sql : à relire et appliquer en environnement de test V2 AVANT le déploiement de cette branche. Ces fichiers n'ont pas été exécutés. La branche utilise toujours l'adaptateur Supabase V2, pas une migration MySQL. Les champs nouveaux sont requis dans les sélections d'articles et d'émissions après migration.
## Recette
- 10 articles/page, page 2 et dernière page, dates et URLs internes, première page sans doublon avec la une, mobile sans overflow.
- Alerte Info conserve RSS, aucun lien cliquable, aucun accès DB.
- Afficher uniquement les médias réellement publiés, pas de doublon d'interlude ; ordre admin persistant.
- Liens des émissions, génériques, vidéos et podcasts valides.
- Vérifier jours de programmation et horaires Libreville.
- Visiteur sans abonnement : 401/403 sur API live, aucun iframe ni URL publique, accès expiré révoqué, service sécurisé testé.
- Vérifier les migrations, npm run typecheck, npm run audit:navigation, npm run feed:check, npm run ads:check, build Next.js et recette visuelle.
- Ne pas fusionner main avant recette et choix du prestataire Premium.
