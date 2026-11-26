# Bandeaux publicitaires de la page d'accueil

La page d'accueil de TV+ Afrique comporte **5 carrousels**, avec **5 emplacements chacun**, soit **25 publicités configurables**.

## Positionnement

| Bandeau | Clé de configuration | Position |
| --- | --- | --- |
| 1 | `after-hero` | Après la Une et le panneau News 24/7 |
| 2 | `after-feed` | Après le Fil Actu |
| 3 | `after-live` | Après le Direct TV+ et les questions |
| 4 | `after-selection` | Après la sélection de la rédaction |
| 5 | `before-newsletter` | Après les rubriques, avant la newsletter |

Le Fil Actu est désormais remonté juste après la Une et le premier bandeau publicitaire. News 24/7 est limité en hauteur avec défilement vertical interne sur ordinateur et sur mobile.

## Configurer les publicités

Ouvrir `data/homepage-ads.json`. Chaque bandeau possède exactement cinq objets :

```json
{
  "id": "homepage-1-1",
  "imageUrl": "/ads/campagne-client-1.webp",
  "href": "https://annonceur.example/campagne",
  "alt": "Description de l'annonce",
  "advertiser": "Nom de l'annonceur"
}
```

Les valeurs sont **des exemples de champs**, pas des annonceurs ni des campagnes créés. Une publicité sans visuel s'affiche comme un espace réservé, sans lien.

- Stocker les visuels sur un hébergement autorisé ou dans `public/ads/` (puis utiliser `/ads/fichier.webp`).
- Utiliser des créations au format **large** (idéalement 1200 × 200 px). Les images sont affichées avec `object-fit: contain` pour ne pas couper les textes et logos sur mobile.
- Renseigner une description alternative (`alt`) pour chaque visuel actif.
- Les liens actifs s'ouvrent dans un nouvel onglet, avec `rel="sponsored noopener noreferrer"`.

## Défilement et accessibilité

Chaque carrousel avance automatiquement toutes les **6 secondes** lorsque son bandeau est à l'écran. Il s'arrête lorsque l'onglet est masqué, au survol, lors de la navigation au clavier, après l'action Pause, ou lorsque l'appareil demande des animations réduites.

Les contrôles permettent : publicité précédente, publicité suivante, sélection parmi cinq points et pause/reprise.

## Vérification

```bash
npm run ads:check
```

Ce script vérifie le nombre exact d'emplacements, l'unicité des identifiants, les URL et les descriptions alternatives des visuels.

### Évolution ultérieure

Pour gérer les publicités dans un tableau de bord, créer une interface d'administration et une table dédiée à la publicité **après revue du schéma Supabase**. La configuration actuelle est volontairement indépendante de la base de données TV+ V2 et ne modifie aucune table.
