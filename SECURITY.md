# Sécurité

## Signaler une faille

Si vous découvrez une faille de sécurité, **ne la publiez pas dans une issue**, qui est visible par tout le monde.

Signalez-la en privé, depuis l'onglet **Security** du dépôt, avec le bouton **Report a vulnerability**. Le message n'est visible que par le responsable du projet.

Décrivez :
- la faille et ce qu'elle permet de faire ;
- comment la reproduire, étape par étape ;
- la version concernée, c'est-à-dire la date ou le commit.

C'est un projet de fan maintenu bénévolement : il n'y a pas de délai de réponse garanti, mais chaque signalement sera lu.

## Ce qui est concerné

Le jeu publié sur https://banddilondon.github.io/Le-cul-de-chouette/ et le code de ce dépôt, en particulier :
- le jeu en ligne (`js/reseau.js`, et les messages traités dans `js/jeu.js`) ;
- l'enregistrement des cris au micro (`js/cris.js`) ;
- tout ce qui affiche du texte venant d'un autre joueur, comme son nom.

## Limites connues

Ces points sont connus et assumés. Ce ne sont pas des failles à signaler :

- **Le jeu en ligne fonctionne de pair à pair, sans arbitre.** Chaque appareil fait tourner la partie. Les valeurs reçues sont vérifiées pour éviter les plantages, mais un joueur qui modifie son propre navigateur peut tricher : le jeu est conçu pour jouer entre amis.
- **L'adresse IP est visible par l'adversaire en ligne**, comme pour tout appel vidéo ou jeu en pair à pair, ainsi que par le service de mise en relation PeerJS.
- **Les polices viennent de Google Fonts**, qui voit l'adresse IP des visiteurs.
- **Les codes de partie font 5 caractères** (environ 33 millions de possibilités). Une partie n'accepte qu'un seul invité, et le code ne sert que le temps de rejoindre.

## Mesures en place

- Aucun code n'est chargé depuis un autre site que le jeu lui-même : PeerJS est copié dans `js/vendor/`.
- Les décisions reçues en ligne sont vérifiées avant d'être utilisées, et les types de messages inconnus sont ignorés.
- Les noms des joueurs ne sont jamais insérés comme du HTML.
- Les codes de partie et la graine des dés sont tirés avec le générateur sûr du navigateur.
- Les enregistrements du micro restent dans le navigateur et ne sont jamais envoyés.
