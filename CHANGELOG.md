# Journal des modifications

Toutes les évolutions notables du projet, des plus récentes aux plus anciennes.
Le jeu est publié en continu sur [GitHub Pages](https://banddilondon.github.io/Le-cul-de-chouette/) : chaque entrée correspond à une mise en ligne.

La « version réseau » est celle du protocole du jeu en ligne. Quand elle change, les deux joueurs doivent recharger la page pour pouvoir jouer ensemble.

## 21 octobre 2026

### Sécurité et vie privée
- PeerJS 1.5.4 est désormais copié dans `js/vendor/` avec sa licence MIT, au lieu d'être chargé depuis unpkg. La copie est identique à celle publiée sur unpkg et jsDelivr.
- Les décisions reçues en ligne sont vérifiées : une valeur impossible (mise démesurée, temps de réaction négatif, type de message inconnu…) est remplacée par un choix neutre. La file des messages en attente est bornée.
- Les codes de partie et la graine des dés sont tirés avec le générateur sûr du navigateur.
- Le README et la fenêtre « Jouer en ligne » signalent que l'adresse IP est visible par l'adversaire en ligne. Le README mentionne aussi Google Fonts et le micro.
- Nouvelle section **Crédits** dans le README, et précision de licence pour PeerJS.

### Règles et conseils
- Siroter peut offrir la victoire à un adversaire à 318 points, grâce à son pari d'oiseau (+25). Le conseil prévient, et les ordinateurs ne sirotent plus dans ce cas.
- En cas d'égalité parfaite sur une Chouette-Velute, personne ne marque, comme dans les règles.
- Sur une Suite, celui qui ne crie pas est toujours compté dernier, conformément aux règles écrites.
- Le conseil de sirotage tient compte du pari d'oiseau offert à chaque adversaire (≈ 4,2 pts) : seule une paire de 1 vaut d'être sirotée. Les ordinateurs suivent la même logique, et le tutoriel a été ajusté.
- « Pas de pari » est remplacé par « Oiseau au hasard », puisque parier ne coûte rien.
- Les attentes réseau sont abandonnées proprement quand la connexion coupe.

### Apparence
- Émotions des personnages : Karadoc, Arthur et Perceval rient, pleurent ou enragent selon ce qui leur arrive. En fin de partie, le vainqueur rit et les perdants pleurent.
- Carte d'aperçu Open Graph : le lien s'affiche avec une image sur Facebook, Discord, WhatsApp…

## 20 octobre 2026

### Soirée
- **La chouette volante** traverse la table à chaque Cul de Chouette. La vidéo est détourée, en WebM transparent, avec une image WebP animée pour Safari. On peut la désactiver.
- **De 2 à 4 joueurs** : en solo, 1 à 3 adversaires ordinateur ; en ligne, 2 humains et jusqu'à 2 ordinateurs. Les ordinateurs prennent les mêmes décisions sur les deux appareils. *(Version réseau 3.)*
- **Règles complètes** pour jouer avec de vrais dés : déroulement d'un tour, barèmes, priorités, formules, exemples et table des 56 lancers.
- **Lancer animé** : les dés tournent, rebondissent et s'immobilisent de travers.
- **Jauge de lancer** : trop mou ou trop fort, un dé sort du tapis (−10 pts). *(Version réseau 2.)*
- README réécrit, capture d'écran et licence **CC0 1.0**.
- Favicon en forme de dé.
- **Portraits** des adversaires et six portraits au choix pour les joueurs, transmis en ligne.

### Après-midi
- **Jeu en ligne à deux** : salon avec code et lien d'invitation, connexion directe entre navigateurs (WebRTC via PeerJS), dés tirés d'une graine commune, réflexes chronométrés sur chaque appareil, revanches. *(Version réseau 1.)*
- Correction : les points des dés n'apparaissaient pas dans la fenêtre de réflexe.

### Première version
Le jeu jouable dans le navigateur, contre Karadoc, Arthur ou Perceval :
- toutes les combinaisons, le Sirotage et le pari des oiseaux, la Grelottine, le Civet, la Bévue et la règle des 343 pile ;
- un **tutoriel** aux dés arrangés, des **conseils** à chaque décision, et des réflexes expliqués pas à pas ;
- des **sons** synthétisés, des **cris** prononcés par la synthèse vocale, et l'enregistrement de **vos propres cris** au micro.
