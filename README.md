# Palm City — Midnight Run

Jeu original en vue du dessus, inspiré des jeux urbains des années 1990. Développé avec Canvas et JavaScript, sans dépendance à installer.

## Jouer

Depuis ce dossier :

```sh
python3 -m http.server 8000
```

Ouvrir le serveur dans un navigateur. ZQSD, WASD ou flèches pour se déplacer ; E pour monter ou descendre d'une voiture ; espace pour courir ou freiner ; P ou Échap pour mettre en pause. Les commandes tactiles sont disponibles sur mobile. Le son synthétique est facultatif.

Récupérer la voiture jaune, suivre le repère et ralentir au garage pour toucher la récompense. Les collisions et la conduite dangereuse augmentent l'indice de recherche. Échapper à la police laisse cet indice diminuer. Les livraisons suivantes offrent des récompenses croissantes.

Cette première version propose une ville procédurale, du trafic, des piétons, des collisions, une mini-carte, des poursuites et des contrats de livraison répétables. Aucun serveur applicatif, compte ou service externe n'est requis. La police utilise une poursuite simple et peut être bloquée par les bâtiments. La progression reste limitée à la session. Les polices Google sont facultatives, avec des polices de repli locales.
