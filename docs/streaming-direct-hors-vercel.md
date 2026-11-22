# TV+ Afrique — vidéo en direct hors Vercel

## Circuit obligatoire

1. **Ingest :** OBS/vMix -> RTMPS, SRT ou WHIP -> fournisseur vidéo externe (Restream, Cloudflare Stream, Mux, serveur HLS/CDN).
2. **Contrôle :** la régie `/admin-v2/live` enregistre seulement l'URL publique HTTPS HLS `.m3u8` ou l'URL iframe publique du fournisseur dans Supabase (`site_live_settings`).
3. **Métadonnées :** `/api/live-stream` renvoie un JSON léger avec l'adresse du lecteur. Cette API n'ingère, ne retranscode, ne télécharge et ne renvoie aucun segment vidéo.
4. **Lecture :** les navigateurs des visiteurs demandent directement les manifestes, segments et clés HLS au serveur/CDN vidéo externe ou chargent son iframe. Les trois lecteurs (accueil, flottant et `/direct`) utilisent la même URL de la régie.

### Règles techniques

- Ne créez jamais de route `/api/video`, `/api/hls`, `/proxy`, de rewrite ou de Function qui `fetch()` puis relaie les fichiers `.m3u8`, `.ts`, `.m4s`, `.mp4` depuis le serveur vidéo.
- N'enregistrez jamais comme URL de lecture un domaine `*.vercel.app`, ni le domaine du site. La validation de la régie et le résolveur public bloquent ces cas.
- L'adresse d'ingestion RTMP/SRT/WHIP et la clé secrète ne doivent pas être placées dans les champs publics.
- Pour un flux HLS lisible par `hls.js`, le diffuseur doit autoriser les requêtes CORS GET depuis le domaine public du site sur **toutes** les playlists et tous les segments. Les clés, sous-titres et fichiers d'initialisation éventuels doivent aussi être accessibles.
- L'URL du direct peut être protégée par des jetons temporaires générés par le prestataire : le navigateur doit les recevoir de manière autorisée, **sans proxy vidéo Vercel**.
- Le fournisseur/CDN vidéo porte les coûts de diffusion et de transfert vidéo. Vercel facture encore les pages, JavaScript, images, API et autres ressources web qu'il sert.

## Vérification dans Chrome

1. Ouvrez `https://tvplusclonebfmtv.vercel.app/direct`, puis `F12` -> **Réseau / Network**.
2. Filtrez par `m3u8`, `ts`, `m4s`, `mp4` et `media`.
3. Lisez le direct : les requêtes vers les playlists et segments doivent avoir le **domaine du diffuseur / CDN**, jamais `tvplusclonebfmtv.vercel.app`, `v2.tvplusafrique.com`, ni une route `/api` du site.
4. Une requête occasionnelle au `/api/live-stream` est normale : c'est uniquement du JSON de configuration.
5. Vérifiez aussi les erreurs CORS, l'accès aux segments et le chargement du lecteur sur mobile.
6. Dans Vercel Usage, surveillez **Fast Data Transfer**, **Edge Requests**, **Function Invocations** et **Image Optimization** séparément : le streaming externe n'annule pas les coûts du site web.

## Quand vous remplacez le flux France 24

Dans `/admin-v2/live`, remplacez l'URL de lecture par le HLS/iframe public fourni par votre prestataire vidéo. Le code ne contient aucune URL vidéo de secours. Une fois enregistrée, la source est la même sur l'accueil, son lecteur flottant et `/direct`.

Ne relayez du contenu tiers que si vous avez les droits nécessaires.
