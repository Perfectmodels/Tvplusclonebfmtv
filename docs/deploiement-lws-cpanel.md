# TV+ Afrique Next.js sur LWS cPanel — recette MySQL V3
Source : Perfectmodels/Tvplusclonebfmtv, branche feat/mysql-only. Ne pas utiliser main pour cette recette. Le serveur MariaDB 11.4.10 et les dernières migrations ont été contrôlés : 16 tables / 16, 21 colonnes / 21. Ces comptages ne prouvent pas la compatibilité des types ni des données de toutes les tables.

## 1. Isolation de la recette
- Conserver le site Laravel historique sur tvplusafrique.com et le site Vercel actuel en ligne.
- Proposer v3.tvplusafrique.com (vérifier sa disponibilité dans Domains, ne pas remplacer un sous-domaine existant). Créer le certificat HTTPS.
- Dans Setup Node.js App : version 22, mode Production (runtime Node), Application root tvplus-next-v3 hors public_html, Application URL sous-domaine de recette, startup app.js.
- Conserver l'API PHP sur son URL HTTPS actuelle. PHP et Node peuvent coexister. Ne pas rediriger le domaine racine ou le chemin de l'API PHP vers Passenger.
- Préférer une copie de recette de MySQL et une instance PHP distincte avec secrets dédiés. La base V3 contient des données réelles : ne pas effectuer de tests d'écriture, d'authentification créatrice ou de publication dessus sans accord et sauvegarde. Le lecteur utilise un broker/lecteur externe ; aucun transit vidéo RTMP/HLS par Next.js.

## 2. Sources
Après création de l'application, arrêter le processus de recette s'il tourne. Dans le Terminal cPanel :
```sh
cd "$HOME"
git clone --single-branch --branch feat/mysql-only https://github.com/Perfectmodels/Tvplusclonebfmtv.git tvplus-next-v3-src
```
Si le dépôt est privé, utiliser Git Version Control et une clé de déploiement en lecture seule ou télécharger l'archive de la branche via GitHub. Ne pas mettre de jeton dans la commande ou l'URL. Le dossier source est distinct de la racine Passenger existante. Transférer les fichiers source dans la racine de recette sans écraser le lien node_modules du sélecteur Node, la configuration ou les autres applications. Exemple depuis le dossier personnel, après avoir vérifié les deux chemins :
```sh
rsync -a --exclude=.git --exclude=node_modules --exclude=.next --exclude='.env*' "$HOME/tvplus-next-v3-src/" "$HOME/tvplus-next-v3/"
```
Ne pas copier .next ou node_modules depuis macOS ou Vercel.

## 3. Configuration
Utiliser deploy/lws/nextjs.env.example comme référence, sans copier de secret dans le dépôt. Renseigner les variables dans Setup Node.js App et, pour le build, dans .env.local privé de l'application (chmod 600) si l'environnement du terminal ne les transmet pas. Utiliser l'URL HTTPS réelle de l'API PHP, le secret du service, une clé de session de 32 caractères minimum, l'origine de recette et les variables Blob/Groq nécessaires. NEXT_PUBLIC_SITE_URL est une donnée publique figée lors de la compilation. Le stockage Blob et le quota IA utilisent encore Vercel Blob : conserver le jeton serveur si souhaité, cela n'exige pas un hébergement Next.js sur Vercel. Les paiements et envois doivent rester désactivés sur la recette. Aucun transfert automatique des secrets Vercel.
Les fichiers PHP de l'API à mettre à niveau sont deploy/lws/editorial/{index.php,newsroom.php,admin.php,programming.php,extras.php,whatsapp.php,payments.php}. Sauvegarder la version actuellement en ligne. Vérifier les sept fichiers par php -l avant de les publier ensemble sur l'API de recette. Ne pas mettre ces fichiers PHP dans phpMyAdmin. Ne pas réexécuter les migrations validées sans raison.

## 4. Compilation
Dans Setup Node.js App, utiliser Run NPM Install. Copier la commande exacte d'activation de l'environnement virtuel affichée par cPanel puis l'exécuter dans Terminal. Installer aussi les dépendances de développement requises pour TypeScript/build (ne pas supprimer le lien node_modules de CloudLinux). Puis :
```sh
cd "$HOME/tvplus-next-v3"
node --version
node scripts/lws-preflight.cjs
npm run typecheck && npm run build
```
Si le préflight ou la compilation échoue, ne pas redémarrer la recette en tant que site de production. Corriger le message exact avant la suite. Ne pas désactiver les contrôles TypeScript. En cas de limite mémoire, compiler sur Linux compatible avec la version Node et les modules natifs du serveur, ou envisager un VPS. Ne pas lancer pm2, npm start ou un serveur permanent séparé : Passenger appelle app.js et intercepte listen. Cliquer Restart dans Setup Node.js App uniquement après un build valide.

## 5. Recette et retour arrière
Vérifier /, les pages article, /api/health, /direct (accès verrouillé), /api/live-stream (401/403 sans droit), /connexion, /admin-v2, catalogue et SEO. Vérifier /api/premium/plans, /admin-v2/premium et /admin-v2/whatsapp avec des droits et une API de test. Les tests d'écriture requièrent une base isolée. Mettre en place le cron LWS pour les articles programmés après validation, avec secret serveur, éviter deux crons concurrents. Pour revenir en arrière, arrêter uniquement l'application de recette, ne pas modifier DNS ni Laravel. Ne déplacer le domaine principal qu'après validation des fonctions, de la sécurité du flux, des quotas, du plan de rollback et autorisation de bascule.
État : préparation du dépôt. Aucun transfert, build LWS, installation API, bascule DNS ni activation de paiement n'est prouvé par ce document.
