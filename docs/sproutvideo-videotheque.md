# Vidéothèque SproutVideo

La vidéothèque du tableau de bord (`/admin-v2/videos`) et les sélecteurs des Replays / du Studio utilisent l’API SproutVideo comme source de vérité. Aucun doublon de métadonnées n’est stocké dans Supabase : le site enregistre seulement l’URL d’embed choisie dans le contenu éditorial (`episodes.source_url` ou `editorial_media.source_url`).

## Configuration

Une seule variable serveur est nécessaire :

```dotenv
SPROUTVIDEO_API_KEY=
```

- La clé se crée dans SproutVideo : **Account → API**.
- Elle ne doit **jamais** être préfixée par `NEXT_PUBLIC_` ni envoyée au navigateur.
- La clé doit être configurée dans l’environnement de production (Vercel/LWS) et en local pour tester les téléversements.
- La clé peut être changée sans redéploiement du code : redéployez ou redémarrez l’application après la mise à jour de la variable.

Vérification rapide côté serveur :

```bash
curl -sS -H "SproutVideo-Api-Key: $SPROUTVIDEO_API_KEY" \
  "https://api.sproutvideo.com/v1/videos?per_page=1" | head
```

## Téléversement direct

Le fichier vidéo ne traverse pas les serveurs Next.js. Le flux est le suivant :

1. Le tableau de bord demande un jeton à usage unique à `POST /api/admin-v2/sproutvideo/upload-token`.
2. Le serveur crée ce jeton avec l’API SproutVideo. Le jeton est limité dans le temps (1 heure) et n’autorise que le titre.
3. Le navigateur envoie le fichier directement à `https://api.sproutvideo.com/v1/videos` avec ce jeton.
4. Le tableau de bord interroge `GET /api/admin-v2/sproutvideo/:id` jusqu’à ce que la vidéo soit `deployed` (prête), puis l’ajoute à la liste.
5. Dans un Replay ou un contenu du Studio, la sélection remplit automatiquement le titre, l’URL d’embed, la durée et la vignette.

Cette approche évite les limites de taille des fonctions serverless et n’expose jamais la clé API.

## API interne

| Méthode | Route | Rôle |
| --- | --- | --- |
| `GET` | `/api/admin-v2/sproutvideo?kind=&page=&pageSize=` | Liste paginée des vidéos prêtes. `kind` est facultatif pour la vidéothèque globale. |
| `POST` | `/api/admin-v2/sproutvideo/upload-token` | Crée un jeton de téléversement à usage unique. Corps : `{ "kind"?: "replay" \| "reel" \| "reportage" }`. |
| `GET` | `/api/admin-v2/sproutvideo/:id?kind=` | Retourne l’état et la progression d’une vidéo (utilisé pendant le traitement). |
| `PATCH` | `/api/admin-v2/sproutvideo/:id` | Renomme une vidéo ou choisit sa vignette. Corps : `{ "kind"?, "title"?: "...", "posterframe_number"?: 0 }`. |
| `DELETE` | `/api/admin-v2/sproutvideo/:id?kind=&force=1` | Supprime la vidéo chez SproutVideo. |

Toutes les routes exigent une session du tableau de bord et une permission adaptée.

## Permissions

- `shows.manage` : accès complet à la vidéothèque et à tous les formats.
- `studio.reel_manage`, `studio.podcast_manage`, `studio.reportage_manage` : accès à la vidéothèque et aux actions pour le format concerné.
- Un sélecteur de Replay exige `shows.manage`.
- Un sélecteur de Reel ou de Reportage exige `shows.manage` ou la permission `studio.<format>_manage` correspondante.

## Gestion et suppression

- **Renommer** modifie le titre chez SproutVideo ; les URL d’embed existantes ne changent pas.
- **Vignette** : SproutVideo génère plusieurs images de couverture ; le bouton « Vignette » permet d’en choisir une directement depuis la bibliothèque.
- **Supprimer** est définitif chez SproutVideo. Avant de supprimer, le serveur compte les `episodes`, `editorial_media` et `articles` qui utilisent encore l’embed. Si des contenus sont concernés, une confirmation supplémentaire est demandée et la suppression est renvoyée avec `force=1`.
- Une vidéo utilisée par un contenu puis supprimée laissera un lecteur vide sur le site public. Le tableau de bord prévient avant l’action.

## Sécurité

- La clé API reste exclusivement côté serveur.
- Les jetons de téléversement sont à usage unique et expirent.
- Les mutations (`POST`, `PATCH`, `DELETE`) vérifient l’origine de la requête (`Origin` / `Sec-Fetch-Site`).
- Les vidéos créées par ce flux sont préconfigurées en **privé côté SproutVideo mais intégrables publiquement** (`privacy: 2`, `requires_signed_embeds: false`), afin de fonctionner dans les iframes du site sans signature.
- Si le compte SproutVideo impose les embeds signés, la vidéo apparaît comme non intégrable dans la bibliothèque : désactivez cette contrainte dans les réglages SproutVideo ou utilisez une clé/configuration adaptée.
- Aucune URL arbitraire n’est récupérée par le serveur : seuls les fichiers choisis par un utilisateur authentifié sont envoyés à SproutVideo.

## Limites et dépannage

- Taille maximale : **5 Go** par vidéo (limite SproutVideo).
- Formats : ceux acceptés par l’offre SproutVideo. Un format refusé renvoie une erreur explicite dans le formulaire.
- Le traitement peut prendre plusieurs minutes selon la durée et la résolution. L’interface affiche la progression et actualise la liste automatiquement.
- Si la vidéothèque ne répond pas, vérifiez `SPROUTVIDEO_API_KEY`, la validité de la clé et les quotas de l’offre SproutVideo.
- Si le téléversement échoue après avoir consommé un jeton, relancez simplement l’opération : un nouveau jeton est créé.

## Fichiers impliqués

- `lib/video/sproutvideo.ts` : client serveur de l’API SproutVideo.
- `app/api/admin-v2/sproutvideo/route.ts` : liste.
- `app/api/admin-v2/sproutvideo/upload-token/route.ts` : jeton de téléversement.
- `app/api/admin-v2/sproutvideo/[id]/route.ts` : détail, renommage, suppression.
- `components/admin/SproutVideoLibrary.tsx` : bibliothèque et téléversement direct.
- `components/admin/SproutVideoPicker.tsx` : sélecteur intégré aux Replays et au Studio.
- `app/admin-v2/videos/page.tsx` : page Vidéothèque.
