# Connexion Supabase TV+ V2 (lecture seule)

Projet Supabase existant : `eygxwssajyhbnusouwfk` (PostgreSQL 17, région eu-west-1).
Ce projet ne possède pas le même schéma que les migrations initiales de TVplusclonebfmtv.

## Configuration

Créer un fichier `.env` non versionné :

```dotenv
SUPABASE_URL=https://eygxwssajyhbnusouwfk.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_VOTRE_CLE
SUPABASE_SCHEMA_MODE=tvplus-v2
SUPABASE_SECRET_KEY=
```

Récupérer la clé publishable depuis Supabase > Project Settings > API Keys, et configurer ces variables aussi sur l'hébergeur de ce clone. **Ne jamais publier une clé secrète dans Git ou le navigateur.**

Vérifier la connexion :

```bash
npm ci
npm run db:check:v2
npm run dev
```

## Compatibilité

L'adaptateur `lib/db/v2-public.ts` utilise uniquement le client public soumis aux politiques RLS.
Il fait correspondre `articles.excerpt` à `summary`, `articles.category_id` à `categories.id`, `articles.cover_media_id` à `media.id`, `shows` aux émissions et `news24_items` au fil d'actualité.

Les articles utilisent `/article/{slug}` parce que TV+ V2 n'a pas de colonne `short_id`. Les médias privilégient les URL ImgBB déjà présentes.

Les routes administrateur du clone et son cron RSS sont **désactivés** en mode `tvplus-v2`. Il reste à adapter les écritures, permissions, médiathèque, newsletters et formulaires. Ne pas appliquer les anciennes migrations du clone sur cette base partagée : elles ne sont pas compatibles.
