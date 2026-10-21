# Instructions pour les assistants IA

Ce fichier s'adresse aux assistants de programmation (Codex, Claude Code, Cursor, Copilot…) qui travaillent sur ce dépôt.

## Le projet

**Le Cul de Chouette** : le jeu de dés de *Kaamelott*, jouable dans le navigateur, en solo contre des ordinateurs ou en ligne entre amis, de 2 à 4 joueurs.
- Site : https://banddilondon.github.io/Le-cul-de-chouette/ (GitHub Pages, branche `main`)
- Dépôt : https://github.com/BandDiLondon/Le-cul-de-chouette
- HTML, CSS et JavaScript, sans framework ni étape de compilation. Le seul code externe est PeerJS, copié dans `js/vendor/`.

L'organisation des fichiers et les conventions sont décrites dans [CONTRIBUTING.md](CONTRIBUTING.md), et l'historique dans [CHANGELOG.md](CHANGELOG.md).

## Travailler avec l'utilisateur

- **Répondre en français**, toujours. L'utilisateur l'a demandé plusieurs fois.
- **Ne jamais envoyer sur GitHub (`git push`) sans son accord explicite** pour cet envoi-là (il répond « push »). Un accord précédent ne vaut pas pour la suite.
- **Avant chaque commit, lister les fichiers** (`git status --short`) et les ajouter un par un. Jamais `git add -A` ni `git add .` : des fichiers privés traînent dans le dossier.
- **Fichiers privés, à ne jamais publier** (déjà dans `.gitignore`) : `docs/analyseAI.txt`, `sources/` (originaux des images et vidéos), `brouillon-gemini.txt`.
- **Après un envoi**, attendre que GitHub Pages ait fini de publier, puis vérifier sur le site que les fichiers modifiés sont bien servis.
- Messages de commit en français : une première ligne courte, puis le détail si besoin.

## Règles impératives du code

- **Tout est en français** : noms de variables et de fonctions, commentaires, textes du jeu.
- **Jeu en ligne déterministe.** Chaque appareil fait tourner la même partie ; seules les décisions passent par le réseau.
  - Dés : `jetPartie()`. Décisions de l'ordinateur : `aleaIA()`, `hasardIA()`, `choixIA()`. Jamais `Math.random()` pour ce qui change la partie ; `Math.random()` est réservé à l'affichage (animations, ordre des boutons, sons).
  - Toute décision d'un joueur passe par `decider()` et doit être vérifiée dans `verifier()`.
  - Un message ajouté ou modifié : augmenter `VERSION` dans `js/reseau.js` et mettre à jour `TYPES_JEU`.
- **Jamais de texte venant d'un joueur dans `innerHTML`** : utiliser `textContent`, ou `formater()`, qui neutralise le HTML.
- **Les règles écrites et le code disent la même chose.** La fenêtre « Règles » (`index.html`) décrit exactement ce que le jeu applique : changer l'un, c'est changer l'autre.
- **Ordre de chargement** : `sons.js`, `cris.js`, `tuto.js`, `reseau.js`, `jeu.js`. Un fichier chargé avant `jeu.js` n'utilise ses constantes que pendant la partie, jamais au chargement de la page.
- **Images légères** : 320 × 320 px, autour de 40 Ko. Les originaux vont dans `sources/`, qui n'est pas publié.

## Vérifier son travail

- Syntaxe : `node --check js/<fichier>.js` sur chaque fichier modifié.
- Tester dans un vrai navigateur : une partie solo, le tutoriel, et une partie en ligne entre deux navigateurs si le réseau est concerné. Les scores doivent rester identiques des deux côtés.
- Navigateur automatisé (Puppeteer…) : **toujours couper le son** (`--mute-audio`), sinon le jeu joue ses sons sur les haut-parleurs de l'utilisateur.
- Vérifier les affirmations d'une analyse externe dans le code avant de les corriger : plusieurs se sont révélées fausses.
