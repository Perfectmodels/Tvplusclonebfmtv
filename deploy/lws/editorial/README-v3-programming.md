# Configuration transitoire MySQL V3
Le catalogue articles, les écritures éditoriales, les statistiques, les sujets à la une, émissions et replays passent par LWS_EDITORIAL_API_URL. Aucune écriture de ces modules n'est redirigée vers Supabase lorsque cette URL est renseignée. Authentification, rôles et références de médiathèque restent sur Supabase pendant la transition. Les rubriques administratives, les compteurs de lectures, le direct et les autres modules restent à réconcilier.
1. Sauvegarder V3, vérifier SHOW TABLES et SHOW CREATE TABLE pour tvp_shows, tvp_episodes, tvp_articles, tvp_categories et tvp_media. Comparer au contrat SQL. Ne pas importer aveuglément.
2. Déployer index.php, newsroom.php et programming.php ensemble après validation du schéma. Ne jamais exposer tvplus-v3-private.php.
3. Tester les lectures publiques, les permissions, la création d'un brouillon vidéo, émission et replay, puis la publication avec un compte autorisé; vérifier la même ligne MySQL.
4. Les replays programmés deviennent visibles à leur échéance via le filtre public; l'administration affiche leur statut effectif. Le cron articles appelle MySQL avec CRON_SECRET.
5. Les tables proposées ne migrent pas les données historiques. La migration et la réconciliation du schéma réel sont distinctes.
