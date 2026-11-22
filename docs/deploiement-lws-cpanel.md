# Déploiement de TV+ Afrique sur LWS cPanel (Node.js / Passenger)

Ce guide concerne le dépôt `Perfectmodels/Tvplusclonebfmtv`, branche `main`.
Il déploie **l'application web Next.js**. L'hébergement d'un flux RTMP/SRT permanent est une prestation séparée (service vidéo ou VPS).

## 1. Vérifier la formule et créer le sous-domaine

1. Dans LWS cPanel, vérifier la présence de **Setup Node.js App** et d'une version **Node.js 22** compatible avec l'application.
2. Dans **Domains / Sous-domaines**, créer le sous-domaine prévu pour ce site, sans remplacer le site PHP déjà en ligne.
3. Activer le certificat TLS/HTTPS du sous-domaine.
4. Conserver le répertoire Node.js **hors de `public_html`**.

Ne pas utiliser le domaine de production actuel tant que le site Next.js n'a pas été testé.

## 2. Transférer le projet

### Depuis le terminal cPanel (si disponible)

À partir du répertoire personnel du compte cPanel :

```bash
git clone https://github.com/Perfectmodels/Tvplusclonebfmtv.git tvplusclonebfmtv
cd tvplusclonebfmtv
```

Si Git/SSH n'est pas disponible : télécharger le ZIP de la branche `main` depuis GitHub et l'extraire dans `~/tvplusclonebfmtv` via le Gestionnaire de fichiers.

Ne jamais copier `node_modules`, `.next` généré sur un autre système, `.env`, les clés privées ou les données de connexion vers le dépôt GitHub.

## 3. Créer l'application dans Setup Node.js App

| Paramètre | Valeur |
|---|---|
| Node.js version | 22, si proposé par la formule et compatible avec le build |
| Application mode | Production |
| Application root | `tvplusclonebfmtv` (chemin relatif au compte cPanel) |
| Application URL | Sous-domaine HTTPS créé à l'étape 1 |
| Application startup file | `app.js` |

Le dépôt contient un fichier `app.js` utilisant le serveur Next.js et `http.createServer().listen()`. **Passenger** exécute ce fichier et gère le processus. Il n'est pas nécessaire de maintenir `npm run start` ouvert dans un terminal.

Si cPanel a généré un exemple `app.js` (« It works! »), remplacer cet exemple par celui du dépôt.

## 4. Configurer les variables d'environnement

Dans **Environment variables** de Setup Node.js App, saisir les valeurs de l'environnement Supabase actuel. Ne pas recopier la clé fictive de `.env.example`.

```dotenv
SUPABASE_URL=https://<projet>.supabase.co
SUPABASE_PUBLISHABLE_KEY=<cle-publique>
SUPABASE_JWKS_URL=https://<projet>.supabase.co/auth/v1/.well-known/jwks.json
SUPABASE_SCHEMA_MODE=tvplus-v2
```

**Important :** la partie publique peut fonctionner avec la clé publishable et les règles RLS. Mais certaines API administrateur du dépôt, notamment `/api/admin-v2/live/targets`, utilisent `getAdminSupabase()` et requièrent `SUPABASE_SECRET_KEY`. La consigne « laisser vide » de `.env.example` est donc incompatible avec ces fonctions. Résoudre et tester ce point de sécurité/fonctionnement avant d'activer ces API en production. Ne jamais mettre une clé secrète dans une variable `NEXT_PUBLIC_*` ou dans GitHub.

Les variables exposées au navigateur sont construites dans `next.config.ts` : les variables Supabase doivent déjà être renseignées **lors de `npm run build`**.

## 5. Installer et compiler

1. Utiliser **Run NPM Install** dans Setup Node.js App.
2. Dans cPanel Terminal, activer l'environnement Node.js avec la commande exacte fournie par Setup Node.js App.
3. Se placer dans le dossier du projet et exécuter :

```bash
npm run typecheck
npm run build
```

En cas d'échec lié à la mémoire/CPU du mutualisé, construire sur un environnement Linux compatible avec la version de Node.js du serveur et transférer les artefacts adaptés après vérification des modules natifs (notamment `sharp`).

4. Cliquer **Restart** dans Setup Node.js App.

## 6. Vérifier l'application

Contrôler sur le sous-domaine :
- l'accueil et les articles ;
- `/connexion` et `/admin-v2`, avec un compte autorisé ;
- `/api/live-stream` : réponse JSON sans secret ;
- `/direct` et le lecteur flottant de l'accueil ;
- les images, le SEO, les routes API et les journaux cPanel.

Pour les erreurs HTTP 500/503, consulter les **Journaux / Errors** de cPanel (logs Apache et Passenger) : vérifier d'abord le fichier `app.js`, la présence d'un build `.next`, les dépendances et les variables d'environnement.

## 7. Direct vidéo et migration future vers VPS

La régie d'administration est accessible via `/admin-v2/live`.

- `/api/admin-v2/live` enregistre la configuration du **lecteur public** dans `site_live_settings`.
- `/api/live-stream` résout cette configuration.
- `DirectLiveStage` et `HomeLiveDock` consomment tous deux `usePublicLiveSource`, actualisé toutes les 30 secondes.
- Les **profils d'ingestion** RTMP/RTMPS/SRT/WHIP ne constituent pas eux-mêmes un serveur de streaming : OBS, Restream, un prestataire vidéo ou un VPS doit effectivement recevoir et distribuer le signal.
- Pour un flux HLS, fournir un lien HTTPS `.m3u8` accessible depuis le navigateur, avec autorisations CORS adaptées si nécessaire.

Le site peut rester sur LWS pendant que la distribution vidéo est externalisée, puis migrer vers un VPS sans changer le modèle de données du lecteur.

## 8. Mises à jour ultérieures

Si l'installation vient d'un clone Git :

```bash
cd ~/tvplusclonebfmtv
git pull --ff-only origin main
```

Puis réinstaller les dépendances si elles ont changé, exécuter `npm run typecheck` et `npm run build`, et enfin **Restart** dans cPanel. Prévoir une sauvegarde et un retour arrière avant chaque mise à jour de production.

**État :** ce guide et `app.js` préparent le dépôt ; ils ne prouvent pas que le build ait réussi sur l'hébergement LWS. Il faut encore accéder à cPanel pour créer l'application et la tester.
