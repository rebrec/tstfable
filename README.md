# Sky Dash 🏃💨

Petit jeu de plateforme 2D qui tourne dans le navigateur, propulsé par
[Phaser 3](https://phaser.io/). Tout le jeu — moteur, niveaux, éditeur —
tient dans **un seul fichier HTML autonome** produit par le build
(aucun asset externe : toutes les textures sont générées par code).

## 🎮 Jouer

- **← → / Q D** : se déplacer
- **Espace / ↑ / Z** : sauter (saut à hauteur variable, coyote time)
- **R** : recommencer le niveau
- **Échap** : retour au menu

3 niveaux intégrés à enchaîner : *Premiers pas*, *Les cavernes*, *Le sommet*.
Ramassez les pièces, sautez sur les ennemis, évitez les piques et atteignez
le drapeau !

## ✏️ Éditeur de niveaux intégré

Depuis le menu, ouvrez **Éditeur de niveaux** :

- clic gauche pour placer la tuile sélectionnée, clic droit pour effacer ;
- flèches / molette pour déplacer la vue, boutons `±L` / `±H` pour
  redimensionner le niveau ;
- **▶ Tester** lance le niveau en cours (Échap pour revenir à l'éditeur) ;
- **💾 Sauver** enregistre le niveau dans le navigateur (localStorage) —
  il devient jouable depuis le menu ;
- **⇪ Exporter / ⇩ Importer** : partagez vos niveaux sous forme de JSON.

## 🔧 Développement

```bash
npm install
npm run dev      # serveur de dev Vite
npm run build    # typecheck + bundle → dist/index.html (fichier unique)
```

Le build utilise `vite-plugin-singlefile` : tout le JavaScript et le CSS
sont inlinés dans `dist/index.html`, qui s'ouvre directement dans un
navigateur, sans serveur.

## 🚀 Pipeline GitHub Actions

À chaque push, le workflow [`build.yml`](.github/workflows/build.yml) :

1. installe les dépendances et builde le projet ;
2. vérifie que `dist/index.html` est bien autonome (aucune ressource externe) ;
3. publie le fichier en **artefact** (`game-html`) téléchargeable depuis
   l'onglet *Actions* ;
4. sur la branche `main`, **déploie le jeu sur GitHub Pages**.

> ℹ️ Pour activer le déploiement : *Settings → Pages → Source : GitHub Actions*.
