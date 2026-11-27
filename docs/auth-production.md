# Configuration Auth — TV+ Afrique

Projet historique Supabase : eygxwssajyhbnusouwfk. Domaine public Vercel : https://tvplusclonebfmtv.vercel.app.

Dans Authentication > Providers > Email : Enable Email activé, Confirm email désactivé, Secure email change activé. Autoriser les nouvelles inscriptions. Ne pas activer les connexions anonymes.

Authentication > URL Configuration : Site URL = https://tvplusclonebfmtv.vercel.app. Ajouter exactement :
- https://tvplusclonebfmtv.vercel.app/auth/callback
- https://tvplusclonebfmtv.vercel.app/auth/callback?flow=recovery
- https://tvplusclonebfmtv.vercel.app/auth/callback?flow=recovery&next=** (seulement si la conservation de destination est utilisée ; le code valide les chemins autorisés)
- https://tvplusclonebfmtv.vercel.app/reinitialiser-mot-de-passe

Si le domaine principal change, remplacer la valeur NEXT_PUBLIC_SITE_URL dans Vercel et la Site URL Supabase ensemble. Éviter les wildcards de domaine.

Authentication > Email Templates > Reset Password : conserver le lien ConfirmationURL pour le flux PKCE sur le même navigateur ou utiliser le modèle serveur suivant pour un lien indépendant du navigateur :

```html
<h2>Réinitialiser votre mot de passe TV+ Afrique</h2>
<p>Si vous avez demandé un nouveau mot de passe, utilisez ce lien. Sinon ignorez ce message.</p>
<p><a href="{{ .SiteURL }}/auth/callback?type=recovery&amp;token_hash={{ .TokenHash }}">Choisir un nouveau mot de passe</a></p>
```

Configurer SMTP personnalisé et vérifier la livraison réelle. Les e-mails de récupération restent nécessaires même sans confirmation d'inscription. Activer les notifications de changement de mot de passe.

Les comptes du personnel restent administrés séparément. Les droits sont vérifiés en base et ne sont jamais dérivés des métadonnées modifiables par le lecteur.

Validation : inscription d'un nouveau lecteur avec consentement du testeur, connexion, déconnexion, redirection vers le direct, demande de récupération puis ouverture du lien, nouveau mot de passe, connexion et vérification des droits. Aucun secret privé ne doit être exposé au navigateur ou dans ce fichier.
