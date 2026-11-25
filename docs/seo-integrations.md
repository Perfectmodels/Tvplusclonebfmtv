# SEO 360 — activation et limites
## Search Console
Activer l'API Search Console dans un projet Google Cloud, créer un compte de service et lui attribuer l'accès lecture sur la propriété vérifiée de TV+ Afrique dans Search Console. Configurer côté serveur uniquement GSC_PROPERTY (identifiant exact de propriété), GSC_CLIENT_EMAIL et GSC_PRIVATE_KEY. Ne jamais publier la clé. La page /admin-v2/seo interroge les canaux web, image, video, news, discover, googleNews pour 28 jours avec un délai de trois jours et cache d'une heure. Une réponse vide n'est pas une preuve de zéro trafic.
## Référencement vidéo
/replays/:id expose une page de visionnage des replays publiés ; sitemap-videos.xml contient au maximum les 500 derniers replays ayant un lecteur pris en charge, une miniature et une date valide. L'indexation dépend de la disponibilité réelle des vidéos. Ne pas inventer durée, transcription ou données de diffusion. Aucun transit vidéo par Vercel.
## Géographie
Les pays et provinces utilisent les champs éditoriaux réellement enregistrés. Les pages vides portent noindex. Le sitemap ne découvre que les territoires présents dans les articles parcourus. Pas de bureau régional fictif ni hreflang sans traductions.
## Assistant rédactionnel
Analyse locale et suggestions extraites du titre, du chapeau et du texte ; score indicatif et explicable. Le connecteur génératif facultatif utilise GROQ_API_KEY et GROQ_SEO_MODEL côté serveur. L’utilisateur autorise explicitement l’envoi du texte ; la réponse est validée et modifiable. Aucun appel génératif n’est effectué pendant la saisie. Configurer les quotas du fournisseur avant activation. Aucun changement automatique du contenu. Les actions sont manuelles, via la sauvegarde existante.
## Restant
- Mesures GA4, Bing, backlinks, GEO et campagnes SEA/SMA/SEM : connecter les comptes et implémenter les API adaptées avant de déclarer ces fonctionnalités actives.
- Activation et recette IA générative, transcriptions, pages auteurs vérifiées, contenus de confiance et politiques éditoriales : nécessitent configuration ou validation de la rédaction.
- ASO : uniquement en présence d'une application native.
- Tests TypeScript, build, validation de preview et inspection Search Console restent nécessaires. Aucun déploiement de production autorisé.
