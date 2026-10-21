# Contribuer au Cul de Chouette

Merci de vouloir améliorer le jeu ! Ce guide explique comment le faire tourner, comment il est organisé, et les pièges à éviter.

## Signaler un problème ou proposer une idée

Ouvrez une **issue** sur GitHub. Pour un bug, indiquez :
- ce que vous faisiez (solo, tutoriel, en ligne, nombre de joueurs) ;
- ce qui s'est passé, et ce que vous attendiez ;
- votre navigateur et votre appareil (ordinateur, téléphone).

Une faille de sécurité ne se signale **pas** dans une issue publique : voir [SECURITY.md](SECURITY.md).

## Faire tourner le jeu

Il n'y a rien à installer ni à compiler : c'est du HTML, du CSS et du JavaScript.

- **Le plus simple** : ouvrez `index.html` dans votre navigateur.
- **Pour le jeu en ligne et le micro**, servez le dossier en local, car certains navigateurs limitent ces fonctions pour les fichiers ouverts directement :
  ```
  python -m http.server 8000
  ```
  puis ouvrez http://localhost:8000. Pour tester le jeu en ligne, ouvrez deux onglets, ou deux navigateurs différents.

## Organisation du code

| Fichier | Rôle |
|---|---|
| `index.html` | La page et toutes ses fenêtres (règles, réglages, salon en ligne…) |
| `css/style.css` | L'apparence |
| `js/sons.js` | Sons synthétisés (Web Audio) et voix (synthèse vocale) |
| `js/cris.js` | Enregistrement des cris au micro, nettoyage et sauvegarde (IndexedDB) |
| `js/tuto.js` | Tutoriel, leçons, textes des réflexes et calcul des conseils |
| `js/reseau.js` | Jeu en ligne : salon, connexion PeerJS, file des messages |
| `js/jeu.js` | Règles, adversaires, déroulement de la partie |
| `js/vendor/` | Copie de PeerJS, à ne pas modifier |

Les scripts sont chargés dans cet ordre : `sons.js`, `cris.js`, `tuto.js`, `reseau.js`, `jeu.js`. Un fichier chargé avant `jeu.js` ne peut pas utiliser ses constantes **au chargement de la page**, seulement pendant la partie.

## Les pièges du jeu en ligne

En ligne, **chaque appareil fait tourner la même partie**. Seules les décisions des joueurs passent par le réseau. Pour que les deux écrans restent identiques :

- **Les dés** se tirent avec `jetPartie()`, jamais avec `Math.random()`.
- **Les décisions de l'ordinateur** utilisent `aleaIA()`, `hasardIA()` ou `choixIA()`, jamais `Math.random()`. Ces tirages viennent de la graine commune.
- **`Math.random()` est réservé à ce qui ne change pas la partie** : animations, ordre des boutons, sons…
- **Une décision d'un joueur** passe par `decider()`, qui l'envoie à l'autre appareil. Ajoutez la vérification de la valeur reçue dans `verifier()`.
- **Si vous ajoutez ou modifiez un message**, augmentez `VERSION` dans `js/reseau.js` et ajoutez le type à `TYPES_JEU`.

## Style du code

- **Tout est en français** : noms de variables et de fonctions, commentaires, textes du jeu.
- Pas de framework ni de dépendance supplémentaire sans en discuter d'abord dans une issue.
- Un texte qui contient un nom de joueur ne doit jamais être inséré avec `innerHTML` tel quel : passez par `textContent`, ou par `formater()` qui neutralise le HTML.
- Les règles écrites (fenêtre « Règles ») et le code doivent dire la même chose. Si vous changez une règle, changez les deux.

## Ajouter un personnage, un portrait ou une émotion

- **Portrait d'un joueur** : une image carrée dans `images/joueurs/<id>.jpg` (320 × 320 px suffisent), puis une ligne dans `PORTRAITS` (`js/jeu.js`).
- **Adversaire ordinateur** : une entrée dans `ADVERSAIRES` (`js/jeu.js`), avec son temps de réaction, son style de jeu et son portrait.
- **Émotions** : trois images `images/emotions/<clé>-rire.jpg`, `-pleurs.jpg` et `-rage.jpg`, puis `emotions: emotionsDe("<clé>")` dans `ADVERSAIRES`.

Gardez les images légères, autour de 40 Ko : elles sont chargées par chaque visiteur.

## Avant de proposer une modification

1. Vérifiez la syntaxe : `node --check js/jeu.js` (et les autres fichiers modifiés).
2. Jouez au moins une partie en solo et une partie du tutoriel.
3. Si vous avez touché au jeu en ligne, jouez une partie entre deux onglets : les scores doivent rester identiques des deux côtés.
4. Ouvrez une **pull request** qui explique ce que vous avez changé et pourquoi.

Les messages de commit sont en français, avec une première ligne courte qui résume le changement.

## Licence

En contribuant, vous acceptez que votre contribution soit publiée sous la même licence que le projet, [CC0 1.0](LICENSE), c'est-à-dire dans le domaine public.
