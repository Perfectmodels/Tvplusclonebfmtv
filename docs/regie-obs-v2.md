# TV+ Afrique V2 — régie Direct, RESTREAM, RTMP, SRT et WHIP

## Trois rôles distincts

1. **Production/encodeur** : OBS, ATEM, vMix, caméra, Restream Studio.
2. **Ingestion et multidiffusion** : Restream, Castr, Wowza, Mux, Cloudflare Stream ou serveur RTMP/SRT/WHIP externe. Les comptes et droits propres à chaque diffuseur sont requis.
3. **Lecture publique** : lecteur Restream iframe (si disponible dans l'abonnement), YouTube/Facebook/Vimeo/Dailymotion/Twitch intégré, ou HLS HTTPS .m3u8.

Un déploiement Vercel **ne devient pas un serveur RTMP** et ne redistribue pas lui-même les flux. Les paramètres source/destination enregistrés dans la régie ne lancent aucun stream ; ils documentent l'exploitation.

## Restream Studio ou OBS → TV+ Afrique

1. Restream : créer un flux « RTMP / Encoder » ou ouvrir Studio.
2. Pour OBS RTMPS : dans Restream, obtenir URL serveur et clé ; saisir ces paramètres dans OBS → Paramètres → Stream. Les paramètres se configurent également dans la régie TV+ pour faciliter le suivi, mais **le stockage seul n'envoie aucune vidéo**.
3. En cas de WHIP : choisir WHIP comme service OBS, coller l'URL WHIP dans OBS ; le bearer token reste vide si Restream le prescrit. Ne jamais traiter l'URL WHIP comme un lien de lecture public.
4. Si l'abonnement Restream prend en charge « Embed Player » : ajouter cette destination sur Restream, recopier le code iframe dans **Régie TV+ → Lecteur visible → Restream**. L'API extrait uniquement l'attribut `src` et valide le domaine `player.restream.io`.
5. Sinon, choisir une URL HLS publiquement lisible ou un lecteur d'une plateforme de diffusion autorisant les iframes (YouTube, etc.).
6. Tester et seulement ensuite activer la case « Afficher le lecteur public » ; fermer le direct après diffusion.

Le lecteur Restream peut afficher son état hors ligne indépendamment de TV+ ; son activation n'est pas un indicateur temps réel de l'encodeur.

## Compatibilités enregistrables

Restream, YouTube, Facebook, Instagram, TikTok, Twitch, LinkedIn, Kick, X, Dailymotion, Vimeo, Restream Studio, StreamYard, Castr, Mux, Cloudflare Stream, Wowza, Livepeer, OBS, vMix et serveur personnalisé.

Les accès RTMP/RTMPS/SRT/WHIP dépendent des comptes et formules. Il n'existe pas d'API universelle pour lancer toutes les plateformes d'un seul clic. Certaines plateformes exigent une configuration OAuth dans leur interface ; TikTok LIVE n'a pas d'iframe public garanti.

## Sécurité des clés et endpoints

- Les adresses de serveurs et les clés sont chiffrées via **Supabase Vault** dans la table privée `live_stream_targets`.
- Les endpoints API sont réservés à la permission `schedule.manage`, puis utilisent le rôle service côté serveur pour les fonctions SQL.
- Aucun secret n'est renvoyé au navigateur : seuls les booléens `has_endpoint` et `has_key` sont transmis. Un secret peut être remplacé ou effacé sans être récupéré.
- `live_stream_targets` possède RLS active, aucun accès SELECT aux rôles anon/authenticated. Les procédures de Vault ont un droit d'exécution service_role uniquement.
- Le profil Restream WHIP trouvé dans l'ancien champ public a été déplacé dans Vault et désactivé dans la table des anciens liens.
- L'URL de lecteur HLS/iframe est **publique** : elle ne doit pas contenir de clé d'émission. Les tokens d'embarquement fournis par une plateforme peuvent devenir visibles côté visiteur.

## Critères de validation

- Enregistrer un profil serveur avec RTMPS et une clé : il apparaît comme « protégé » dans l'interface.
- Modifier le profil sans renseigner de clé : l'ancienne est conservée.
- Remplacer la clé : la valeur n'est jamais redonnée par GET.
- Supprimer le profil : le secret associé est effacé de Vault.
- Une URL WHIP dans un champ « lien public » est rejetée.
- Un iframe Restream valide est normalisé en URL HTTPS intégrable.
- Activer la source sans lancement chez le fournisseur ne doit pas annoncer une diffusion réellement en cours.
- Tester OBS → Restream → lecteur public, y compris son/synchronisation et version mobile.

## Documentation fournisseurs

- Restream RTMPS : https://support.restream.io/en/articles/8523770-encrypt-your-stream-with-rtmps
- Restream WHIP : https://support.restream.io/en/articles/11780279-how-to-stream-to-restream-using-whip
- Restream lecteur web : https://support.restream.io/en/articles/4996608-stream-to-your-website
- YouTube RTMPS : https://support.google.com/youtube/answer/10364924
