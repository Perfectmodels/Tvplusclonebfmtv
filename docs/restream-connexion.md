# TV+ Afrique — connexion directe Restream

La régie `/admin-v2/live` demande seulement la connexion du compte Restream.
La connexion passe par OAuth 2.0, et ne demande ni mot de passe Restream ni clé RTMP.

## Mise en service unique

1. Aller à https://developers.restream.io/apps et créer une application Restream « TV+ Afrique ».
2. Choisir au minimum les scopes `profile.read` et `channels.read`.
3. Enregistrer exactement ce Redirect URI dans l'application Restream :
   `https://tvplusclonebfmtv.vercel.app/api/admin-v2/restream/callback`
4. Dans le projet Vercel `tvplusclonebfmtv`, définir en **Production**, côté serveur uniquement :
   - `RESTREAM_CLIENT_ID` : Client ID de l'application Restream.
   - `RESTREAM_CLIENT_SECRET` : Client Secret de l'application Restream.
   - `RESTREAM_REDIRECT_URI` : déjà configuré pour le domaine de production.
5. Redéployer pour charger ces variables. Dans `/admin-v2/live`, cliquer
   « Connecter mon compte Restream », puis approuver dans Restream.
6. Les chaînes autorisées s'affichent depuis l'API officielle Restream.
7. Pour diffuser Restream sur le site, copier l'iframe « Embed Player » depuis Restream
   et l'enregistrer dans l'unique champ « Code du lecteur Restream ». Ce lecteur est
   dépendant des fonctionnalités offertes par l'abonnement Restream.

## Architecture et sécurité

- Le profil et les chaînes viennent de l'API officielle; aucune fausse connexion locale.
- Le consentement est protégé par un jeton OAuth `state` lié à la session d'administration.
- Les tokens Restream sont chiffrés en AES-256-GCM côté serveur, et la table est protégée
  par RLS pour les rôles disposant de `schedule.manage`.
- La clé de chiffrement est dérivée du Client Secret serveur : sa rotation impose de reconnecter
  le compte Restream.
- Les tokens d'accès sont rafraîchis par le serveur et jamais envoyés au navigateur.
- Le bouton « Déconnecter » révoque les tokens chez Restream puis supprime les identifiants enregistrés.
- Restream gère le flux vidéo. TV+ Afrique n'héberge ni le direct ni les segments HLS sur Vercel.
- Les réglages antérieurs de flux restent inchangés jusqu'à l'enregistrement explicite du nouveau lecteur.
