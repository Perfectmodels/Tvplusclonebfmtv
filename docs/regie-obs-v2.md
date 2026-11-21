# TV+ Afrique V2 — exploitation régie / test OBS Studio

## Ce que le site fait
- **Régie** `/admin-v2/live` : choisir le lecteur HLS/plateforme, afficher ou masquer le direct, programmer la fenêtre d'affichage, gérer les liens vers les diffuseurs.
- **Replays** `/admin-v2/replays` : associer une vidéo publique à une émission, prévisualiser, publier immédiatement ou programmer.
- **Public** `/direct`, `/replays` : lecteur HLS/iframe compatible, replays intégrés.

## Flux technique
`Caméra + micro → OBS Studio (RTMPS) → plateforme de streaming/transcodage → HLS (HTTPS .m3u8) / lecteur de plateforme → site TV+`.

L'application Vercel **n'est pas** un serveur RTMP, ne réalise pas de transcodage et ne distribue pas un flux RTMPS à plusieurs fournisseurs. Pour la multidiffusion, choisir une plateforme d'ingestion/restreaming externe ; chaque chaîne configurée dans la régie est un **lien public** et non un émetteur RTMP.

## Test OBS sans exposer les clés
1. Dans la plateforme de streaming qui a fourni les clés, récupérer l'adresse du serveur **RTMPS** et la clé de diffusion.
2. Dans **OBS → Paramètres → Stream**, choisir le service ou le serveur personnalisé, puis enregistrer la clé uniquement dans OBS. Ne jamais l'ajouter à GitHub, au navigateur ou à un champ TV+.
3. Exemple de profil de test adaptable : H.264, 1280×720 à 30 i/s, CBR 2500–4500 kb/s selon la connexion, intervalle d'image clé 2 s, audio AAC 128–160 kb/s. Les paramètres finaux dépendent du diffuseur et de la bande passante.
4. Démarrer le flux test privé/non répertorié dans OBS, contrôler le retour audio/vidéo côté prestataire.
5. Récupérer **l'URL de lecture publique** compatible du prestataire : fichier `.m3u8` HTTPS (HLS), ou URL vidéo publique prise en charge. Cela **n'est pas** le serveur RTMP.
6. Dans `/admin-v2/live`, configurer la source du lecteur, coller l'URL de **lecture**, enregistrer puis activer le lecteur. Contrôler `/direct` sur desktop et mobile.
7. Arrêter OBS, désactiver le direct dans la régie et vérifier le message d'attente.

## Critères d'acceptation
- L'URL HLS est lisible depuis le navigateur du public, sans blocage CORS ou jeton expiré.
- L'image et le son sont synchronisés ; aucun blocage sur mobile.
- L'option « Désactiver » dans la régie empêche l'affichage du flux public.
- Les dates de fenêtre d'affichage respectent Africa/Libreville (UTC+01).
- Aucune clé de diffusion ni jeton d'administration n'apparaît dans l'HTML, l'API publique ou le dépôt.
- Un replay YouTube/Facebook/TikTok public s'ouvre en lecture intégrée lorsque le fournisseur autorise l'embarquement ; sinon, un lien externe est fourni.

## Limites
- La régie ne provisionne pas de chaînes chez YouTube, Facebook ou TikTok et n'obtient pas automatiquement des clés RTMP. Cela nécessite les comptes et droits propres à chaque diffuseur.
- Les vidéos privées, géobloquées, non embeddables ou dont les droits d'intégration sont désactivés restent soumises aux restrictions du fournisseur.
- TikTok LIVE n'offre pas le même mode d'intégration que les vidéos TikTok publiées : utiliser un lien de consultation externe lorsque l'iframe LIVE n'est pas disponible.
