# Le Cul de Chouette

Le jeu de dés de *Kaamelott*, jouable dans le navigateur contre Karadoc, Arthur ou Perceval.

**▶ [Jouer en ligne](https://banddilondon.github.io/Le-cul-de-chouette/)**

Aucune installation : jouez en ligne, ou téléchargez le dépôt et ouvrez `index.html` dans votre navigateur.

## Le jeu

On lance deux dés (les **chouettes**), puis un troisième (le **cul**). Le premier à atteindre **343 points** l'emporte.

| Combinaison | Exemple | Effet |
|---|---|---|
| Chouette | 4 · 4 · 1 | Carré de la paire (16 pts). Peut être sirotée. |
| Velute | 2 · 3 · 5 | Deux fois le carré du plus grand dé (50 pts). |
| Chouette-Velute | 3 · 3 · 6 | Le premier à crier « Pas mou le caillou ! » prend la Velute. |
| Cul de Chouette | 5 · 5 · 5 | 40 + 10 × la valeur (90 pts). |
| Suite | 3 · 4 · 5 | Le dernier à crier « Grelotte ça picote ! » perd 10 pts. |
| Néant | 1 · 3 · 6 | Rien, mais on reçoit une Grelottine. |

Également : le **Sirotage** et le pari des oiseaux, le défi de la **Grelottine**, le **Civet**, la **Bévue** et la règle des **343 pile**. Les règles complètes sont dans le jeu (bouton « Règles »).

## Fonctionnalités

- **Tutoriel** : les premiers lancers sont arrangés pour découvrir chaque règle en jouant.
- **Conseils** : à chaque choix, les chances et le gain moyen de chaque option, avec une recommandation.
- **Réflexes** : préparation, duel chronométré contre l'adversaire, puis bilan détaillé.
- **Trois adversaires** : Karadoc (lent), Arthur (moyen), Perceval (rapide et calculateur).
- **Jeu en ligne à deux** : créez une partie, envoyez le code ou le lien à un ami, chacun joue sur son appareil. Connexion directe entre navigateurs (WebRTC via PeerJS) ; les dés sont tirés d'une graine commune et chaque appareil chronomètre son propre joueur pendant les réflexes.
- **Sons** générés dans le navigateur, sans aucun fichier audio.
- **Voix** : les cris sont prononcés par la synthèse vocale (les voix « Natural » de Microsoft Edge sont les meilleures).
- **Vos propres cris** : enregistrez-les au micro, pour vous et pour l'adversaire.

## Structure

```
index.html        la page
css/style.css     le style
js/sons.js        sons synthétisés et voix
js/cris.js        enregistrement des cris au micro
js/tuto.js        tutoriel et conseils
js/reseau.js      jeu en ligne (salon, connexion, messages)
js/jeu.js         règles et déroulement de la partie
```

## Avertissement

Projet de fan, non officiel et sans but commercial. *Kaamelott* est une œuvre d'Alexandre Astier. Les règles du Cul de Chouette varient d'une table à l'autre : celles-ci reprennent les conventions de fans les plus courantes.
