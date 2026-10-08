# NEON WARFARE 9 · Fusion Protocol

Tower defense néon **tenant dans un seul fichier HTML** : aucune dépendance, aucun asset externe,
fonctionne hors-ligne. Double-cliquez sur `neon-warfare.html` et jouez dans n'importe quel navigateur
récent (PC, tablette ou téléphone). Se joue **seul ou à deux** (versus ou coopération, en réseau).

## Jouer

1. Ouvrir `neon-warfare.html` dans un navigateur.
2. **Nouvelle partie** → choisir la doctrine, le mode (Classique, Boss Rush, Chaos, Bac à sable)
   et la menace (Recrue, Standard, Hardcore, Cauchemar), ou relever le **Défi du jour**.
3. Choisir une tourelle dans la barre du bas (touches `1`…`0`), cliquer sur une case libre,
   puis lancer la vague avec `Espace`.

La partie est sauvegardée automatiquement entre deux vagues (dans le `localStorage` du navigateur).

## Multijoueur

**Menu → Multijoueur.** L'hôte crée un salon et donne son code (`NEON-XXXX`), l'autre joueur le tape.
La partie se joue ensuite **en direct entre les deux navigateurs** (WebRTC) : le serveur public gratuit
de PeerJS ne sert qu'à la mise en relation. Sans internet (réseau local), la **connexion manuelle**
échange deux codes par copier-coller, sans aucun serveur.

| Mode | Principe |
|---|---|
| **Versus** | même carte et mêmes vagues, chacun chez soi. Envoyez des paquets d'ennemis chez l'adversaire depuis la barre du bas : ils coûtent des crédits mais augmentent votre **revenu par vague**. Le dernier debout gagne. |
| **Coopération** | une seule carte, une intégrité commune, **chacun ses crédits** ; nanites, compétences, plans et capacités partagés, protocoles à tour de rôle. Les deux machines calculent la même partie en *lockstep* (actions horodatées) et se resynchronisent toutes seules en cas d'écart. |

Les deux joueurs doivent avoir la même version du fichier. Le multijoueur ne fonctionne pas dans un
aperçu intégré (ex. claude.ai) : ouvrez le fichier directement dans Chrome, Edge ou Firefox, ou servez-le
en ligne (GitHub Pages : `index.html` redirige vers le jeu).

## Contenu

| | |
|---|---|
| **24 tourelles** | 8 de base, 2 de soutien (Ventilo, Ordi) et **14 fusions** sur 3 paliers (T2 → T3 → Apocalypse T4) |
| **Spécialisations** | au niveau 5 (niveau 3 pour le soutien), chaque tourelle choisit **1 voie sur 2** qui change son comportement |
| **Fusion des canons** | plans achetés au Labo avec des nanites, puis **fusion sur le terrain** de deux tourelles adjacentes |
| **Arbre de compétences** | 18 compétences en 3 branches, dont 2 qui débloquent des capacités |
| **Capacités** | Frappe Orbitale (ciblée), Cryo-Bombe, Surcharge |
| **Ennemis** | 22 types (dont régénérateurs, ruches, déphaseurs, nécromants, mastodontes, voileurs…), élites et **6 boss** à mécanique (Colosse, Hydre, Overlord, Scission, Sentinelle, Sauteur), présentés à leur arrivée |
| **Cartes** | procédurales (portrait/paysage), dont la moitié avec **deux chemins** qui se rejoignent |
| **Pièges** | **mines** et **barricades** à poser sur le chemin |
| **Événements aléatoires** | pluie d'astéroïdes, capsule de ravitaillement, ruée vers l'or, surtension, tempête solaire, lune de sang, comète, faille dimensionnelle, orage IEM |
| **Casino néon** | entre les vagues : **machine à sous** (3 jetons, jackpot progressif, malédiction aux trois crânes) et **paris** sur la vague suivante |
| **Modes** | Classique, **Boss Rush** (un boss par vague), **Chaos** (événements en rafale), **Bac à sable** (ressources illimitées) |
| **Défi du jour** | même carte et mêmes 2 mutateurs pour tout le monde ce jour-là, record journalier |
| **Graine libre** | dans Nouvelle partie, un nombre ou n'importe quel mot (`neon`, `Timoti`…) : même texte = même carte et mêmes vagues |
| **Défier un ami** | chaque partie a un **code de carte** (ex. `1A2B3C-L-S`) : saisi dans Nouvelle partie, il redonne la même carte et les mêmes vagues ; historique des 30 dernières parties dans le Palmarès |
| **Missions & protocoles** | 3 objectifs courts toujours actifs ; toutes les 2 vagues, 1 carte à choisir parmi 3 |
| **Progression** | Héritage (bonus permanents), niveau de Commandant et 7 doctrines, 25 succès, Codex de 54 fiches |
| **Analyse de combat** | graphiques de la partie : dégâts, éliminations, tirs et rentabilité par tourelle, dégâts par vague |
| **Musique** | générée en direct : **Arena 80s** (synth-rock, solo saturé sur les boss), Ambiance ou Synthwave |
| **Divers** | annonces de combo et de multi-éliminations, 5 thèmes visuels, démo IA en fond de menu |

## Commandes

| Touche | Action |
|---|---|
| `Espace` | Lancer / appeler la vague (prime si appel anticipé) |
| `1` … `0` | Choisir une tourelle (`Maj` + clic pour en poser plusieurs) ; `1` `2` `3` choisissent un protocole |
| `Q` `W` `E` (`A` `Z` `E` en AZERTY) | Capacités |
| `U` / `X` | Améliorer / vendre la tourelle sélectionnée |
| `T` / `O` | Changer le ciblage / surcadence |
| `R` | Recycler le débris sélectionné |
| `F` / `P` | Vitesse (1×, 2×, 3×) / pause |
| `K` / `L` / `G` / `C` / `H` | Arbre / Labo de fusion / Analyse de combat / Casino / Manuel |
| `Échap`, clic droit | Annuler |
| `F3` | Compteur de performances |

Au tactile : toucher une carte puis une case pour construire, toucher une tourelle pour l'ouvrir.

## Performances

Le jeu vise 60 FPS constants, même sur machine modeste :

- simulation à **pas fixe** (60 ticks/s) découplée de l'affichage, avec rendu interpolé ;
- simulation **déterministe** (hasard à graine) : base du lockstep de la coopération ;
- **4 calques canvas** : décor et carte ne sont redessinés que lorsqu'ils changent ;
- tourelles, ennemis et halos lumineux **pré-rendus** en sprites ;
- **pools d'objets** pour projectiles et particules ;
- qualité **AUTO** qui allège les effets si une machine peine vraiment.

## Architecture du fichier

Tout est dans `neon-warfare.html`, organisé en modules :

`Store` · `Sfx` / `Music` (Web Audio) · données (`TOWERS`, `RECIPES`, `ENEMIES`, `EVENTS`, `SLOT_SYM`, `SENDS`…) ·
`Spr` · `MapGen` / `Path` · `FX` · `Combat` · `Enemies` · `Towers` · `Shots` · `Traps` · `Waves` · `Abil` · `Skills` ·
`Fusion` · `Missions` · `Cmd` · `Cards` · `Codex` · `Events` · `Casino` · `Net` / `Lock` / `MP` (réseau) · `Act` (actions
du joueur) · `Stats` · `Game` · `Demo` · `Render` · `Input` · `UI` · boucle principale.

Toute action du joueur passe par `Act` avec des arguments sérialisables : en solo elle s'exécute aussitôt,
en coopération elle est horodatée et exécutée au même tick sur les deux machines.

## Outils de développement

`dev/bot.js` n'est pas nécessaire pour jouer : c'est un bot d'équilibrage qui joue des parties
complètes à vitesse maximale. Servir le dossier en HTTP (par ex. `python -m http.server`), ouvrir
le jeu, puis dans la console :

```js
const s = document.createElement('script'); s.src = 'dev/bot.js'; document.head.appendChild(s);
Bot.batch(['standard', 'hardcore'], 5)
```

La console expose aussi `NW` (état du jeu) pour le débogage, par ex. `NW.give(5000, 50)`.

## Historique

- **v9.0** : multijoueur en réseau (versus et coopération), musique Arena 80s, événements aléatoires,
  casino (machine à sous et paris), modes Boss Rush, Chaos et Bac à sable, présentation des boss,
  annonces de combo, simulation déterministe.
- **v8.2** : cartes à deux chemins, spécialisations, 3 nouveaux boss, pièges, Codex, analyse de combat.
- **v8.1** : missions, protocoles, niveau de Commandant et doctrines, écran de fin « encore une ».
- **v8.0 — Fusion Protocol** : refonte complète de la v7.1 « Scavenger Patch » (voir l'historique git).
