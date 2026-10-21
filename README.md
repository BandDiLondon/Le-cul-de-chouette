# Le Cul de Chouette

Le jeu de dés de *Kaamelott*, dans votre navigateur. De 2 à 4 joueurs : affrontez Karadoc, Arthur et Perceval, ou défiez un ami en ligne.

### ▶ [Jouer maintenant](https://banddilondon.github.io/Le-cul-de-chouette/)

Rien à installer, rien à créer : la page s'ouvre et on joue, sur ordinateur comme sur téléphone.

![Une partie contre Perceval : Chouette de 4, avec le conseil affiché](docs/capture.jpg)

## Comment jouer

On lance les deux **chouettes**, puis le **cul**. Le premier à atteindre **343 points** gagne. Avec la règle des *343 pile*, ce qui dépasse fait reculer : à 340, gagner 5 points ramène à 338.

| Combinaison | Exemple | Ce qui se passe |
|---|---|---|
| **Chouette** | 4 · 4 · 1 | Le carré de la paire : 16 pts. On peut la *siroter*. |
| **Velute** | 2 · 3 · 5 | Deux dés font le troisième : 2 × 5² = 50 pts. |
| **Chouette-Velute** | 3 · 3 · 6 | Tout le monde crie « Pas mou le caillou ! » : le premier empoche la Velute. |
| **Cul de Chouette** | 5 · 5 · 5 | 40 + 10 × la valeur : 90 pts. |
| **Suite** | 3 · 4 · 5 | Tout le monde crie « Grelotte ça picote ! » : le dernier perd 10 pts. |
| **Néant** | 1 · 3 · 6 | Rien… mais on reçoit une Grelottine. |

Et pour pimenter :

- **Le Sirotage** : sur une Chouette, relancez le dé seul pour tenter le Cul de Chouette. Raté, vous perdez la Chouette. Pendant ce temps, l'adversaire parie sur le dé en criant un oiseau (Linotte, Alouette, Fauvette, Mouette, Bergeronnette, Chouette).
- **La Grelottine** : gagnée sur un Néant, elle sert à défier l'adversaire avant son lancer, en misant des points.
- **Le Civet** : une fois par partie, pariez jusqu'à 102 points sur la combinaison que vous allez faire.
- **La Bévue** : pousser le mauvais cri coûte 10 points.
- **Le dé hors du tapis** : avant chaque lancer, arrêtez la jauge dans la zone verte. Trop mou ou trop fort, un dé sort du tapis : 10 points de pénalité, et on relance.

Pas envie de lire ? Le **tutoriel** vous apprend tout en jouant.

## Ce qu'il y a dans le jeu

**Trois adversaires**, chacun avec son style. Prenez-en un, deux ou les trois, pour jouer jusqu'à 4 :

| | Réflexes | Jeu |
|---|---|---|
| **Karadoc** | lents | au petit bonheur |
| **Arthur** | honnêtes | raisonnable |
| **Perceval** | redoutables | le spécialiste, il calcule tout |

**Pour apprendre**
- Un **tutoriel** dont les premiers lancers sont arrangés pour montrer chaque règle, une par une.
- Des **conseils** à chaque décision : les chances, le gain moyen de chaque option, et ce qu'il vaut mieux faire.
- Des **réflexes expliqués** : la première fois, on vous dit quoi crier et pourquoi, puis un compte à rebours ; après chaque duel, le bilan avec les temps de chacun.

**En ligne, de 2 à 4**
- Un joueur crée la partie et envoie le code ou le lien d'invitation ; l'autre le rejoint. Chacun joue sur son appareil.
- Celui qui crée la partie peut ajouter un ou deux adversaires ordinateur : ils jouent exactement de la même façon sur les deux écrans.
- Les deux écrans voient exactement les mêmes dés, et les réflexes restent justes malgré le décalage du réseau.
- Revanches à volonté, le premier joueur alternant à chaque manche.

**L'ambiance**
- Des **portraits** pour les adversaires, et six au choix pour vous.
- Une **chouette** qui traverse la table à chaque Cul de Chouette.
- Des **sons** pour chaque moment : dés qui roulent, hululement de la Chouette, fanfare du Cul de Chouette, poing sur la table…
- Des **cris prononcés** par la voix du navigateur. Les meilleures voix françaises sont dans **Microsoft Edge** (« Denise », « Henri »…).
- **Vos propres cris** : enregistrez-les au micro, pour vous et pour votre adversaire. Ils remplacent la voix de synthèse.

## Jouer sans Internet

Téléchargez le dépôt (**Code › Download ZIP**), décompressez-le et ouvrez `index.html`. Tout fonctionne, sauf le jeu en ligne. Sans connexion, le texte s'affiche simplement dans une police de secours.

## Vie privée

Il n'y a ni compte, ni serveur de jeu, ni statistiques.

- Vos réglages et vos cris enregistrés restent **dans votre navigateur**. Ils ne sont envoyés nulle part.
- En ligne, les deux navigateurs se parlent **directement**. Le service gratuit [PeerJS](https://peerjs.com/) sert seulement à les mettre en relation au début de la partie.
- Comme pour un appel vidéo, cette connexion directe rend **votre adresse IP visible par votre adversaire**, ainsi que par le service PeerJS. Jouez en ligne avec des personnes que vous connaissez.
- Les polices d'écriture viennent de **Google Fonts** : comme pour tout site qui les utilise, Google voit l'adresse IP des visiteurs.
- Le micro ne s'allume que lorsque vous cliquez sur « Enregistrer », et il s'éteint quand vous fermez la fenêtre des cris. Les enregistrements s'effacent avec les boutons 🗑 et « Tout effacer ».

## Sous le capot

Du HTML, du CSS et du JavaScript, sans framework ni étape de compilation.

```
index.html        la page et ses fenêtres
css/style.css     l'apparence
js/sons.js        sons synthétisés (Web Audio) et voix (synthèse vocale)
js/cris.js        enregistrement des cris au micro, nettoyage et sauvegarde
js/tuto.js        tutoriel, leçons et calcul des conseils
js/reseau.js      jeu en ligne : salon, connexion, messages
js/jeu.js         règles, adversaires et déroulement de la partie
js/vendor/        copie de PeerJS (licence MIT)
images/           portraits, émotions, chouette volante et icônes
```

Quelques choix :

- **Aucun fichier audio** : chaque son est fabriqué à la volée avec la Web Audio API.
- **Les cris enregistrés** sont débarrassés de leurs silences et mis au même volume, pour partir tout de suite pendant les réflexes. Ils sont conservés dans IndexedDB.
- **En ligne, chaque appareil fait tourner la même partie.** Les dés viennent d'un tirage pseudo-aléatoire à graine commune, et seules les décisions des joueurs passent par le réseau.
- **Les réflexes en ligne** : chaque appareil chronomètre son propre joueur, puis les temps sont comparés. Les cris apparaissent après le même délai aléatoire des deux côtés, pour qu'on ne puisse pas cliquer d'avance.

## Contribuer

- [CONTRIBUTING.md](CONTRIBUTING.md) : faire tourner le jeu, le modifier, les pièges du jeu en ligne.
- [CHANGELOG.md](CHANGELOG.md) : l'historique des évolutions.
- [SECURITY.md](SECURITY.md) : signaler une faille en privé.
- [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) : les règles de bonne conduite.
- [AGENTS.md](AGENTS.md) et [CLAUDE.md](CLAUDE.md) : les consignes pour les assistants de programmation.

## Licence

Domaine public ([CC0 1.0](LICENSE)) : copiez, modifiez, réutilisez ce projet comme vous voulez, sans condition ni obligation de citer.

Cela concerne ce que contient ce dépôt (code, textes, sons, illustrations), avec deux exceptions :
- l'univers de *Kaamelott* : ses noms, personnages et répliques restent à leurs auteurs ;
- la copie de PeerJS dans `js/vendor/`, qui garde sa propre licence MIT.

## Crédits

| Élément | Origine | Licence |
|---|---|---|
| Code, textes, sons et règles du jeu | Ce projet | CC0 1.0 |
| Portraits des personnages et des joueurs, émotions | Générés avec Gemini (Google) | CC0 1.0, dans la mesure où des droits existent |
| Chouette volante | Vidéo générée avec Veo (Google Flow), détourée pour le jeu | CC0 1.0, dans la mesure où des droits existent |
| [PeerJS](https://peerjs.com/) 1.5.4 | Michelle Bu, Eric Zhang et contributeurs | MIT ([texte](js/vendor/LICENSE-peerjs.txt)) |
| Polices [Cinzel](https://fonts.google.com/specimen/Cinzel) et [EB Garamond](https://fonts.google.com/specimen/EB+Garamond) | Natanael Gama ; Georg Duffner et Octavio Pardo, via Google Fonts | SIL Open Font License 1.1 |
| Univers, personnages et répliques de *Kaamelott* | Alexandre Astier | Droits réservés à leurs auteurs |

## Avertissement

Projet de fan, non officiel et sans but commercial. *Kaamelott* est une œuvre d'Alexandre Astier. Les règles du Cul de Chouette varient d'une table à l'autre : celles-ci reprennent les conventions de fans les plus courantes.
