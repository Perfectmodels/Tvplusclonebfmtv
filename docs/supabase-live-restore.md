# TV+ Afrique — restauration du catalogue et du direct
Le direct seul est payant. Les replays gratuits sont lus depuis episodes, et les identifiants historiques redirigent vers les données PostgreSQL, pas l'ancien site.
Le RPC tvplus_live_payment est réservé à service_role. Tables live_plans, live_payments, live_entitlements, live_payment_settings créées sur Supabase, encaissement fermé et aucune offre inventée.
Pré-requis: configurer SUPABASE_SECRET_KEY (ou SUPABASE_SERVICE_ROLE_KEY) uniquement côté serveur. Migrer et rapprocher les commandes, plans et droits existants de tvplus_v3 avant activation. Tester la recette avec un portefeuille sandbox, vérifier le courtier de lecture du direct, puis obtenir l'autorisation explicite pour le déploiement et l'ouverture des paiements.
Les autres opérations newsroom restent fermées tant que leur portage n'est pas effectué. Aucune publication Vercel/LWS à ce stade. Le code n'a pas été compilé dans cet environnement.
