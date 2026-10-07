# NEON WARFARE 8 · Fusion Protocol

Tower defense néon **tenant dans un seul fichier HTML** : aucune dépendance, aucun asset externe,
fonctionne hors-ligne. Double-cliquez sur `neon-warfare.html` et jouez dans n'importe quel navigateur
récent (PC, tablette ou téléphone).

## Jouer

1. Ouvrir `neon-warfare.html` dans un navigateur.
2. **Nouvelle partie** → choisir la difficulté (Recrue, Standard, Hardcore, Cauchemar),
   ou relever le **Défi du jour**.
3. Choisir une tourelle dans la barre du bas (touches `1`…`0`), cliquer sur une case libre,
   puis lancer la vague avec `Espace`.

La partie est sauvegardée automatiquement entre deux vagues (dans le `localStorage` du navigateur).

## Contenu

| | |
|---|---|
| **24 tourelles** | 8 de base, 2 de soutien (Ventilo, Ordi) et **14 fusions** sur 3 paliers (T2 → T3 → Apocalypse T4) |
| **Fusion des canons** | plans achetés au Labo avec des nanites, puis **fusion sur le terrain** de deux tourelles adjacentes (80 % de leur valeur récupérée, niveau moyen conservé) |
| **Arbre de compétences** | 18 compétences en 3 branches (Arsenal, Ingénierie, Logistique), dont 2 qui débloquent des capacités |
| **Capacités** | Frappe Orbitale (ciblée), Cryo-Bombe, Surcharge |
| **Héritage** | progression permanente : fragments gagnés à chaque partie → bonus de départ |
| **Ennemis** | 10 types (blindés, boucliers, furtifs, volants, soigneurs, brouilleurs IEM, téléporteurs, porteurs…), 3 boss, élites |
| **Vagues** | infinies, thématiques (Essaim, Raid aérien, Colonne blindée…), boss toutes les 5 vagues, aperçu de la vague suivante |
| **Défi du jour** | même carte et mêmes 2 mutateurs pour tout le monde ce jour-là, record journalier |
| **Missions** | 3 objectifs courts toujours actifs (abattre des volants, combo, vagues sans fuite…), remplacés dès qu'ils sont accomplis |
| **Protocoles** | toutes les 2 vagues, 1 carte à choisir parmi 3 : bonus, améliorations cumulables ou pactes risque/récompense |
| **Commandant** | niveau permanent et grades (de Recrue à Légende) ; les niveaux débloquent 7 **doctrines** de départ |
| **Chaleur** | surcadence (cadence ×2) qui fait chauffer ; les Ventilos permettent de la tenir |
| **Divers** | 19 succès, 5 thèmes visuels, musique générative, cartes procédurales (portrait/paysage), démo IA en fond de menu |

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
| `K` / `L` / `H` | Arbre de compétences / Labo de fusion / Manuel |
| `Échap`, clic droit | Annuler |
| `F3` | Compteur de performances |

Au tactile : toucher une carte puis une case pour construire, toucher une tourelle pour l'ouvrir.

## Performances

Le jeu vise 60 FPS constants, même sur machine modeste :

- simulation à **pas fixe** (60 ticks/s) découplée de l'affichage, avec rendu interpolé
  (fluide sur écrans 120/144 Hz, vitesse de jeu identique quel que soit l'écran) ;
- **4 calques canvas** : décor et carte ne sont redessinés que lorsqu'ils changent ;
- tourelles, ennemis et halos lumineux **pré-rendus** en sprites (aucun `shadowBlur` par image) ;
- **pools d'objets** pour projectiles et particules (pas de ramasse-miettes en combat) ;
- sons limités en fréquence, HUD mis à jour à 10 Hz uniquement quand une valeur change ;
- qualité **AUTO** qui allège les effets si une machine peine vraiment.

Mesuré : ~1,5 ms de rendu et ~0,1 ms de simulation par tick avec 250 ennemis à l'écran.

## Architecture du fichier

Tout est dans `neon-warfare.html`, organisé en modules :

`Store` (sauvegarde) · `Sfx` / `Music` (Web Audio) · données (`TOWERS`, `RECIPES`, `ENEMIES`,
`SKILLS`, `PERKS`, `MUTATORS`…) · `Spr` (sprites) · `MapGen` / `Path` · `FX` · `Combat` ·
`Enemies` · `Towers` · `Shots` · `Waves` · `Abil` · `Skills` · `Fusion` · `Missions` · `Cmd` · `Cards` · `Game` · `Demo` ·
`Render` · `Input` · `UI` · boucle principale.

Pour ajouter une tourelle : une entrée dans `TOWERS` (+ une recette dans `RECIPES` si c'est une fusion).

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

- **v8.1** : missions, protocoles (cartes), niveau de Commandant et doctrines, combo qui s'emballe,
  ralenti sur les boss, écran de fin « encore une ».
- **v8.0 — Fusion Protocol** : refonte complète de la v7.1 « Scavenger Patch » (voir l'historique git).
