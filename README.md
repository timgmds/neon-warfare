# NEON WARFARE 9 · Fusion Protocol

Tower defense néon **tenant dans un seul fichier HTML** : aucune dépendance, aucun asset externe,
fonctionne hors-ligne. Double-cliquez sur `neon-warfare.html` et jouez dans n'importe quel navigateur
récent (PC, tablette ou téléphone). Se joue **seul ou de 2 à 4 joueurs** (versus ou coopération, en réseau).

## Jouer

1. Ouvrir `neon-warfare.html` dans un navigateur.
2. **Nouvelle partie** → choisir la doctrine, le mode (Classique, Boss Rush, Chaos, Bac à sable, Partie perso)
   et la menace (Recrue, Standard, Hardcore, Cauchemar), ou relever le **Défi du jour**.
3. Choisir une tourelle dans la barre du bas (touches `1`…`0`), cliquer sur une case libre,
   puis lancer la vague avec `Espace`.

La partie est sauvegardée automatiquement entre deux vagues (dans le `localStorage` du navigateur).

## Multijoueur

**Menu → Multijoueur**, **de 2 à 4 joueurs**. L'hôte crée un salon avec un code au hasard (`NEON-XXXX`) ou
**un code de son choix** (3 à 12 lettres ou chiffres, ex. `NEON-TIMOTI42`), puis les autres le tapent.
Dans le salon, l'hôte voit les joueurs, leur ping, qui est prêt, et peut **exclure** quelqu'un (✕) :
l'exclu ne peut pas revenir sous le même nom tant que le salon existe.
La partie se joue ensuite **en direct** (WebRTC, chaque invité relié à l'hôte, qui relaie). La mise en
relation passe par **quatre serveurs publics gratuits en parallèle** (PeerJS et trois serveurs MQTT : Mosquitto,
Shiftr, EMQX) : si un réseau ou un navigateur en bloque un, les autres prennent le relais, et le salon de l'hôte
affiche combien sont en ligne. Si aucun n'est joignable, le jeu le dit clairement.

**Relais de secours** : si la liaison directe est impossible entre deux réseaux (certaines box, 4G, réseaux
d'entreprise), la partie passe par les serveurs MQTT, en parallèle. Si la liaison directe tombe en cours de partie,
le relais prend la suite sans perte : chaque message est numéroté et renvoyé tant qu'il n'est pas confirmé. La
liaison directe est ensuite retentée automatiquement. En coopération, l'hôte cadence la partie sans jamais
attendre personne : les invités n'envoient que leurs actions, et chacun rejoue les trames de l'hôte avec un petit tampon
qui s'adapte à sa connexion (jeu fluide même à 500 ms de ping, un joueur lent ne fige plus les autres). Un joueur qui ne donne plus aucune nouvelle pendant 20 s est considéré comme parti. Sans internet (réseau local), la **connexion
manuelle** échange deux codes par copier-coller, sans aucun serveur (une invitation par joueur).

| Mode | Principe |
|---|---|
| **Versus** | même carte et mêmes vagues, chacun chez soi. Envoyez des paquets d'ennemis chez l'adversaire **ciblé** (cliquez sur un nom dans le panneau de gauche) : ils coûtent des crédits mais augmentent votre **revenu par vague**. Chaque ennemi envoyé rapporte une **prime de survie** (jusqu'à 60 % de son prix s'il tient 20 s, +50 % s'il atteint le noyau adverse). **Sabotages** une fois par vague : *pluie de météores* (sonne ses meilleures tourelles, deux perdent un niveau) et *météore géant* (pulvérise sa tourelle la plus chère, sauf s'il la vend dans les 4 s). Le dernier debout gagne ; classement affiché en fin de partie. Plus dur qu'en solo : ennemis +30 % de PV, plus d'élites, intégrité -30 %, crédits de départ -15 %, 10 s de préparation, et **escalade** de +5 % de PV par vague dès la vague 13. |
| **Coopération** | une seule carte, une intégrité commune, **chacun ses crédits** ; nanites, compétences, plans et capacités partagés, protocoles à tour de rôle. Ennemis plus résistants selon le nombre de joueurs. Toutes les machines calculent la même partie en *lockstep* (l'hôte fixe l'ordre des actions de chacun ; une tourelle demandée s'affiche aussitôt en fantôme en attendant) et se resynchronisent toutes seules en cas d'écart ; un joueur qui part laisse ses tourelles. |

Tous les joueurs doivent avoir la même version du fichier. Le multijoueur ne fonctionne pas dans un
aperçu intégré (ex. claude.ai) : ouvrez le fichier directement dans Chrome, Edge ou Firefox, ou servez-le
en ligne (GitHub Pages : `index.html` redirige vers le jeu).

## Contenu

| | |
|---|---|
| **24 tourelles** | 8 de base, 2 de soutien (Ventilo, Ordi) et **14 fusions** sur 3 paliers (T2 → T3 → Apocalypse T4) |
| **Spécialisations** | au niveau 5 (niveau 3 pour le soutien), chaque tourelle choisit **1 voie sur 2** qui change son comportement |
| **Fin de partie** | après le Léviathan (vague 50) : **niveaux Oméga** 11 à 15 (+35 % de dégâts par niveau, crédits + 1 abyssite par niveau) et **Recherche Oméga** (+8 % de dégâts pour toutes les tourelles par rang, sans limite, en plasma) ; badge ⚔ qui estime le temps de tir nécessaire contre la vague suivante. Au-delà de la vague 50, les PV progressent de 13 % par vague, de quoi viser la vague 100 |
| **Fusion des canons** | plans achetés au Labo avec des nanites, puis **fusion sur le terrain** de deux tourelles adjacentes |
| **Arbre de compétences** | 30 compétences en 3 branches et 4 paliers : nanites (palier II), **plasma** (palier III) et **abyssite** (palier IV) ; une **raffinerie** transforme les nanites en trop en plasma |
| **Éléments rares** | **plasma ✺** (1 par boss dès la vague 10, 2 dès la 25, 3 dès la 40 ; parfois élites ; raffinerie) et **abyssite ⬟** (arrachée au Léviathan à chaque phase, puis aux boss après la vague 50). Les fusions **T3** demandent du plasma et l'Apocalypse **T4** de l'abyssite, pour le plan au Labo **et** pour chaque pose. Le plan dépend de la difficulté (T3 : 3 / 5 / 7 / 9 ✺, T4 : 2 / 3 / 4 / 5 ⬟) et chaque pose coûte un peu plus que la précédente (Standard : T3 0, 1, 2… ✺ ; T4 0, 2, 4… ⬟) ; revendre fait redescendre le prix |
| **Capacités** | Frappe Orbitale (ciblée), Cryo-Bombe, Surcharge |
| **Ennemis** | 22 types (dont régénérateurs, ruches, déphaseurs, nécromants, mastodontes, voileurs…), élites et **6 boss** à mécanique (Colosse, Hydre, Overlord, Scission, Sentinelle, Sauteur), présentés à leur arrivée |
| **Méga-boss** | vague 50 : **Léviathan** (3 phases : carapace et IEM géante, frénésie et escorte blindée, Abysse qui régénère et neutralise vos meilleures tourelles) ; vague 100 : **Oméga** (4 phases : failles d'élites, distorsions, boucliers miroirs, effondrement, puis 3 Échos). Ensuite toutes les 50 vagues. S'il atteint le noyau, la partie est perdue. |
| **Cartes** | procédurales (portrait/paysage), dont la moitié avec **deux chemins** qui se rejoignent |
| **Pièges** | **mines** et **barricades** à poser sur le chemin |
| **Événements aléatoires** | pluie d'astéroïdes, capsule de ravitaillement, ruée vers l'or, surtension, tempête solaire, lune de sang, comète, faille dimensionnelle, orage IEM. L'IEM des astéroïdes et de la foudre met les tourelles **hors ligne jusqu'au débrouillage payant** |
| **Casino néon** | entre les vagues : **machine à sous** (3 jetons, jackpot progressif, malédiction aux trois crânes) et **paris** sur la vague suivante |
| **Modes** | Classique, **Boss Rush** (un boss par vague), **Chaos** (événements en rafale), **Bac à sable** (ressources illimitées), **Partie perso** (17 réglages : PV, vitesse et nombre d'ennemis, fréquence des boss, crédits, primes, intégrité, nanites, gains et coûts en éléments, ressources de départ, vague des niveaux Oméga, plans offerts, événements, IEM temporaire ou à payer ; sans records ni progression) |
| **Défi du jour** | même carte et mêmes 2 mutateurs pour tout le monde ce jour-là, record journalier |
| **Graine libre** | dans Nouvelle partie, un nombre ou n'importe quel mot (`neon`, `Timoti`…) : même texte = même carte et mêmes vagues |
| **Défier un ami** | chaque partie a un **code de carte** (ex. `1A2B3C-L-S`), affiché en fin de partie avec **Copier** et **Rejouer cette carte** : saisi dans Nouvelle partie, il redonne la même carte et les mêmes vagues ; historique des 30 dernières parties dans le Palmarès, rejouables d'un clic (▶) |
| **Missions & protocoles** | 3 objectifs courts toujours actifs ; toutes les 2 vagues, 1 carte à choisir parmi 3. 48 protocoles en 4 familles (économie, attaque, défense, tactique), 9 pactes et 6 **légendaires** dès la vague 12 |
| **Progression** | Héritage (bonus permanents), niveau de Commandant et 7 doctrines, 27 succès, Codex de 57 fiches |
| **Analyse de combat** | graphiques de la partie : dégâts, éliminations, tirs et rentabilité par tourelle, dégâts par vague |
| **Musique** | générée en direct : **Arena 80s** (synth-rock, solo saturé sur les boss), Ambiance ou Synthwave |
| **Divers** | annonces de combo et de multi-éliminations, 5 thèmes visuels, démo IA en fond de menu |

## Commandes

| Touche | Action |
|---|---|
| `Espace` | Lancer / appeler la vague (prime si appel anticipé) |
| `1` … `0` | Choisir une tourelle (`Maj` + clic pour en poser plusieurs) ; `1` … `4` choisissent un protocole |
| `Q` `W` `E` (`A` `Z` `E` en AZERTY) | Capacités |
| `U` / `X` | Améliorer / vendre la tourelle sélectionnée |
| `T` / `O` | Changer le ciblage / surcadence |
| `D` | Débrouiller contre crédits la tourelle sélectionnée, ou toutes les tourelles brouillées |
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

- **v9.12** : coopération fluide avec une forte latence : l'hôte n'attend plus les invités, messages réduits aux seules actions, tampon de lecture adaptatif et rattrapage en douceur, fantôme immédiat des tourelles posées.
- **v9.11** : Partie perso (17 réglages, gardés d'une partie à l'autre) ; pose des T3/T4 au prix progressif ; plus de plasma par boss après les vagues 25 et 40 ; IEM des astéroïdes et de la foudre à débrouiller contre crédits ; « Recommencer » garde le mode de jeu.
- **v9.10** : fusions T3 et T4 payées en plasma et en abyssite (plan et pose), coûts selon la difficulté.
- **v9.9** : arbre de compétences agrandi (30 compétences, paliers plasma et abyssite), nouveaux éléments rares, raffinerie de nanites, niveaux Oméga après le Léviathan et payés en abyssite.
- **v9.8** : multijoueur fiabilisé : relais de secours par les serveurs MQTT (liaison directe impossible ou coupée), messages numérotés et renvoyés sans perte, liaison directe retentée, avance du lockstep adaptée à la latence.
- **v9.7** : fin de partie rééquilibrée : PV +13 %/vague après la 50 (au lieu d'environ +19 %), niveaux Oméga 11 à 15, Recherche Oméga sans limite, badge de puissance de feu dans l'aperçu de vague.
- **v9.6** : tourelles brouillées (IEM, météores, sabotages) débrouillables contre crédits (panneau, bouton flottant, touche `D`) ; un soutien brouillé suspend son bonus puis repart (il restait bloqué).
- **v9.5** : multijoueur fiabilisé, mise en relation par quatre serveurs en parallèle (PeerJS + MQTT), messages d'erreur précis.
- **v9.4** : sabotages par météores en versus, primes de survie des ennemis envoyés.
- **v9.3** : versus nettement plus dur (ennemis renforcés, escalade dès la vague 13, préparation courte, envois plus costauds).
- **v9.2** : multijoueur jusqu'à 4 joueurs (versus en mêlée avec ciblage et classement, coopération à 4),
  code de salon personnalisé, exclusion de joueurs par l'hôte, invitations manuelles multiples.
- **v9.1** : méga-boss Léviathan (vague 50) et Oméga (vague 100), 26 nouveaux protocoles dont les légendaires,
  code de carte copiable et « Rejouer cette carte » en fin de partie, difficulté relevée (PV, élites, boss multiples dès la vague 20).
- **v9.0** : multijoueur en réseau (versus et coopération), musique Arena 80s, événements aléatoires,
  casino (machine à sous et paris), modes Boss Rush, Chaos et Bac à sable, présentation des boss,
  annonces de combo, simulation déterministe.
- **v8.2** : cartes à deux chemins, spécialisations, 3 nouveaux boss, pièges, Codex, analyse de combat.
- **v8.1** : missions, protocoles, niveau de Commandant et doctrines, écran de fin « encore une ».
- **v8.0 — Fusion Protocol** : refonte complète de la v7.1 « Scavenger Patch » (voir l'historique git).
