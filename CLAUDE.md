# Claude Code

Les règles du projet et la façon de travailler avec l'utilisateur sont dans AGENTS.md, partagé avec les autres assistants :

@AGENTS.md

## En plus, pour Claude Code

- Sur cet ordinateur (Windows), `gh` n'est pas dans le PATH : utiliser `"/c/Program Files/GitHub CLI/gh.exe"`. Le compte GitHub actif doit être **BandDiLondon**.
- `ffmpeg` est installé (via winget). Il sert à détourer et convertir les vidéos ; la chouette volante vient d'une vidéo sur fond vert : `chromakey`, puis `despill`, puis WebM VP9 avec transparence.
- Plusieurs sessions Claude peuvent travailler en même temps sur ce dossier. Avant de modifier des fichiers, vérifier `git status` et ne pas écraser le travail d'une autre session.
- Préférer l'outil d'édition aux scripts shell pour modifier du texte français : les apostrophes cassent facilement les commandes.
