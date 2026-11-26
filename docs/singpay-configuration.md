# Configuration SingPay — Direct Premium

Ce document est **interne**. Le nom du prestataire ne doit jamais apparaître sur les pages publiques : l’interface parle seulement de « paiement en ligne sécurisé ».

## 1. Tableau de bord SingPay

Dans le compte marchand de production :

1. Récupérer les identifiants de l’application :
   - `Client ID` → `SINGPAY_CLIENT_ID`
   - `Client Secret` → `SINGPAY_CLIENT_SECRET`
   - `Wallet ID` (portefeuille de encaissement) → `SINGPAY_WALLET_ID`
   - `Disbursement ID` (obligatoire en production dans notre code) → `SINGPAY_DISBURSEMENT_ID`
2. Passer le compte en **mode production** et faire confirmer le GoLive par SingPay.
   - `SINGPAY_MODE=production`
   - `SINGPAY_GOLIVE_CONFIRMED=true`
3. Autoriser les hôtes de redirection / de paiement :
   - `gateway.singpay.ga` → `SINGPAY_CHECKOUT_HOSTS`
   - L’origine du site est à déclarer comme URL de retour autorisée : `https://www.tvplusafrique.com`
4. Activer l’interrupteur de paiement :
   - `SINGPAY_ENABLED=true`

L’URL de callback est une **propriété du portefeuille** (`PUT /portefeuille/api/{id}` avec `{ "callbackURL": ... }`). Les URL de succès et d’erreur sont, elles, envoyées dynamiquement à chaque appel `checkout` (voir ci-dessous).

Une fois les variables Vercel récupérées en local, configurer le callback en une commande :

```sh
node --env-file=.env.local scripts/set-singpay-callback.mjs
```

Le script affiche le callback avant/après sans exposer les secrets.

## 2. URL de retour

Le code construit la redirection dans `lib/payments/singpay.ts` :

```ts
back = origin + '/direct/paiement?reference=' + encodeURIComponent(order.reference)
```

Avec `SINGPAY_RETURN_ORIGIN=https://tvplusclonebfmtv.vercel.app` (valeur actuelle de production) :

```text
https://tvplusclonebfmtv.vercel.app/direct/paiement?reference=<REFERENCE>
```

Le callback enregistré sur le portefeuille est :

```text
https://tvplusclonebfmtv.vercel.app/direct/paiement
```

Cette même URL de retour est utilisée pour `redirect_success` et `redirect_error`. Le paramètre `reference` permet à `/direct/paiement` de retrouver la commande et de vérifier son statut auprès de SingPay.

## 3. Variables à poser dans Vercel

Projet : `tvplusclonebfmtv` (scope `goumintiseur10s-projects`), environnement **Production**.

```dotenv
SINGPAY_MODE=production
SINGPAY_ENABLED=true
SINGPAY_GOLIVE_CONFIRMED=true
SINGPAY_CLIENT_ID=...
SINGPAY_CLIENT_SECRET=...
SINGPAY_WALLET_ID=...
SINGPAY_DISBURSEMENT_ID=...
SINGPAY_RETURN_ORIGIN=https://tvplusclonebfmtv.vercel.app
SINGPAY_CHECKOUT_HOSTS=gateway.singpay.ga
```

Ne jamais committer ces valeurs. Après les avoir ajoutées dans Vercel, relancer :

```sh
vercel env pull --environment=production
```

## 4. Contrôles côté application

`paymentConfig()` considère le paiement disponible seulement si :

- identifiants, portefeuille et `disbursement` présents ;
- `SINGPAY_GOLIVE_CONFIRMED=true` en production ;
- `SINGPAY_CHECKOUT_HOSTS` contient au moins un hôte ;
- `SINGPAY_ENABLED=true` ;
- l’origine de retour correspond à l’origine de la requête.

La configuration du lecteur live (`LIVE_*`) est indépendante du paiement : elle n’empêche pas la vente d’un accès. Tant que les conditions SingPay ci-dessus ne sont pas réunies, les formules restent affichées sur `/direct` mais le bouton de paiement est désactivé.

## 5. Catalogue et montant

Le catalogue vient de Supabase (`premium_plans`, `premium_settings`) ; voir `docs/migrations/20261126-premium-supabase.sql`.

Formule officielle : **500 FCFA pour 24 heures** (`slug: direct-24h`, `duration_minutes: 1440`).
