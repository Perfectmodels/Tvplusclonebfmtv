# Synchronisation des publications TV+ Afrique

Destination active : projet Supabase eygxwssajyhbnusouwfk, public.articles. MySQL LWS et les archives ne sont pas des destinations de publication.

La tâche horaire doit récupérer les articles complets depuis le domaine historique, en utilisant les pages courtes ou index.php?article=ID&page=detail-article. Ne pas utiliser les seuls extraits des moteurs de recherche. Vérifier titre, texte intégral, chapô, signature, rubrique, date d'origine, couverture HTTPS fonctionnelle et éventuelles vidéos avant l'import.

POST /api/admin-v2/articles/import : session éditoriale existante avec articles.review, requête de même origine. Envoyer source_post_id (nombre), source_author_name, author_id (UUID du rédacteur correspondant), source_category_label, source_cover_url, source_published_at (ISO 8601 avec fuseau) et article (objet articlePayload déjà utilisé par l'éditeur, dont content_json Tiptap complet). Vérifier les doublons de titre en amont, ainsi que les couvertures. Le serveur refuse un auteur non associé, ne réactive ni n'écrase les articles existants et impose le statut published en préservant la date source. Après un succès, le cache des articles est invalidé. Pour un import direct autorisé via le connecteur Supabase, respecter les mêmes contrôles; le cache de lecture se renouvelle automatiquement. Aucun jeton de service supplémentaire n'est nécessaire pour cette route.

Ne jamais transmettre des identifiants de connexion dans les logs ni utiliser un compte fictif pour remplacer une signature. L'API ne récupère pas elle-même les pages historiques. Tester d'abord avec un article complet et autorisé; confirmer sa présence sur /actualites et /a/<source_post_id> avant tout lot.
