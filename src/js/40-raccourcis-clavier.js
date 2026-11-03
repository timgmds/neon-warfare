/* ============================== RACCOURCIS CLAVIER ==============================
   Chaque commande a ses touches par défaut (codes physiques e.code), que le joueur peut remplacer dans
   Options → Raccourcis clavier ; il peut aussi donner une touche à n'importe quelle tourelle ou piège. */
const KEYDEF = [
  { g: 'PARTIE', id: 'wave', n: 'Lancer / appeler la vague', d: ['Space', 'Enter', 'NumpadEnter'] },
  { g: 'PARTIE', id: 'speed', n: 'Vitesse', d: ['KeyF'] },
  { g: 'PARTIE', id: 'pause', n: 'Pause', d: ['KeyP'] },
  { g: 'PARTIE', id: 'tree', n: 'Arbre de compétences', d: ['KeyK'] },
  { g: 'PARTIE', id: 'lab', n: 'Labo de fusion', d: ['KeyL'] },
  { g: 'PARTIE', id: 'stats', n: 'Analyse de combat', d: ['KeyG'] },
  { g: 'PARTIE', id: 'casino', n: 'Casino', d: ['KeyC'] },
  { g: 'PARTIE', id: 'help', n: 'Manuel', d: ['KeyH'] },
  { g: 'PARTIE', id: 'score', n: 'Classement des joueurs (multijoueur)', d: ['Tab'] },
  { g: 'CAPACITÉS', id: 'orbital', n: 'Frappe orbitale', d: ['KeyQ'] },
  { g: 'CAPACITÉS', id: 'emp', n: 'Cryo-Bombe', d: ['KeyW'] },
  { g: 'CAPACITÉS', id: 'overdrive', n: 'Surcharge', d: ['KeyE'] },
  { g: 'TOURELLE CHOISIE', id: 'up', n: 'Améliorer', d: ['KeyU'] },
  { g: 'TOURELLE CHOISIE', id: 'sell', n: 'Vendre', d: ['KeyX', 'Delete', 'Backspace'] },
  { g: 'TOURELLE CHOISIE', id: 'strat', n: 'Changer de ciblage', d: ['KeyT'] },
  { g: 'TOURELLE CHOISIE', id: 'oc', n: 'Surcadence', d: ['KeyO'] },
  { g: 'TOURELLE CHOISIE', id: 'unjam', n: 'Débrouiller (sinon toutes)', d: ['KeyD'] },
  { g: 'TOURELLE CHOISIE', id: 'recycle', n: 'Recycler le débris', d: ['KeyR'] },
  ...[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => ({ g: 'EMPLACEMENTS DE LA BARRE', id: 'slot' + i, n: 'Emplacement ' + i, d: ['Digit' + (i % 10), 'Numpad' + (i % 10)] }))
];
/* nouveautés affichées une fois, au premier lancement d'une nouvelle version (les plus récentes d'abord) */
const CHANGELOG = [
  { v: '10.1', d: ['Nouveau : l\'éditeur de cartes (menu principal). Tracez le chemin des ennemis d\'un bord à l\'autre, ajoutez jusqu\'à deux entrées qui le rejoignent et des débris à recycler.',
    'Enregistrez vos cartes, partagez-les par code (Éditeur → Code de partage, à coller dans l\'éditeur ou dans le champ « code de carte » de Nouvelle partie).',
    'En multijoueur, l\'hôte choisit la carte dans le salon : aléatoire ou une de ses cartes perso, envoyée aux autres joueurs.',
    'Les cartes perso ne comptent pas pour les records, succès, XP et fragments (comme la Partie perso).'] },
  { v: '10.0', d: ['Refonte graphique « Néon 10 », toujours en 2D : décors animés en WebGL pour les 5 thèmes (soleil synthwave, pluie Matrix, lave, trou noir, soleil en éruption).',
    'Halo lumineux sur les tirs, les explosions et les tourelles.',
    'Tourelles redessinées (socles en relief) et animées : le noyau respire, s\'illumine à chaque tir, et un anneau d\'énergie tourne autour des paliers 2 et plus. Les ennemis laissent une traînée lumineuse.',
    'Titre et grandes annonces (vagues, boss, combos, victoire) en lettrage 3D rétro. Nouvelle interface : fenêtres, boutons et bandeaux.',
    'L\'ancien rendu reste disponible : Options → Style graphique → Classique. En qualité basse, le jeu se passe des effets WebGL.'] },
  { v: '9.23', d: ['Après Oméga : nouvel élément, la quintessence ❂ (phases et défaite d\'Oméga, puis chaque boss après la vague 100).',
    'Arbre : palier V (Annihilation, Surcharge quantique, Dividendes du néant) puis rangs infinis.',
    'Trois canons reliques T5 au Labo : Lance-Néant, Annihilateur et Soleil noir.'] },
  { v: '9.22', d: ['Soutiens : une tourelle ne garde que le meilleur bonus de chaque type de soutien (empiler les Nexus ne sert plus à rien).',
    'Nouveau soutien T3 : l\'Oracle (Nexus + Stase, en plasma) donne critiques et perforation du blindage.',
    'Nouveau soutien T4 : le Cœur abyssal (Oracle + Nexus, en abyssite) donne dégâts, cadence et portée à 12 voisines.'] },
  { v: '9.21', d: ['Léviathan : la régénération de sa 3ᵉ phase passe de 0,7 % à 0,4 % de ses PV par seconde (mesure : elle rendait presque autant de PV que vos tourelles en enlevaient).'] },
  { v: '9.20', d: ['Version en ligne installable comme une application (menu → Installer le jeu), jouable hors ligne.'] },
  { v: '9.19', d: ['Coopération : un joueur déconnecté revient tout de suite (plus besoin d\'attendre la fin de la vague) : il rattrape la partie en accéléré.',
    'Coopération : si l\'hôte quitte la partie, un autre joueur prend le relais et tout le monde continue ensemble.'] },
  { v: '9.18', d: ['Replays : revoyez vos parties solo (🎬 dans Palmarès → Historique ou en fin de partie), en ×1 à ×8, et partagez-les par un code.',
    'Astuces : un conseil la première fois qu\'un élément du jeu apparaît (Labo, fusion, arbre, boss, plasma…), désactivables dans les Options.'] },
  { v: '9.17', d: ['Coopération : chacun apporte sa doctrine (choisie dans le salon) et son Héritage ; les doctrines de l\'équipe s\'additionnent.',
    'Coopération : chacun son plasma et son abyssite ; chaque boss en donne à tous les joueurs présents.',
    'Versus : après un sabotage, 30 s de protection contre les suivants (fini les acharnements à plusieurs).',
    'Maj + T / Maj + U : ciblage ou amélioration de toutes vos tourelles du même type.',
    'Options → Transférer la progression : un code pour passer d\'un appareil à l\'autre.'] },
  { v: '9.16', d: ['Léviathan rééquilibré : coriace mais battable (PV 19 000, bouclier 2 500, ralentissements à 70 %, 4 phases).',
    'Coopération : pause pour tous, même en pleine vague (menu pause).', 'Classement des joueurs : dégâts, éliminations, tourelles (touche Tab, panneau multijoueur, fin de partie).',
    'Coopération : un joueur déconnecté peut revenir avec le code du salon et retrouve sa place à la fin de la vague.',
    'Les tourelles d\'un joueur parti peuvent être vendues par les autres.', 'Cette fenêtre des nouveautés à chaque mise à jour.'] },
  { v: '9.15', d: ['Léviathan renforcé : bouclier, 4ᵉ phase « Raz-de-marée ».'] },
  { v: '9.14', d: ['Raccourcis clavier modifiables, et une touche au choix pour chaque canon (Options → Raccourcis clavier).'] },
  { v: '9.13', d: ['Nexus : 2ᵉ voie « Grand rayonnement » (12 voisins) ; zone des soutiens par crans 4 → 8 → 12 → 20.'] },
  { v: '9.12', d: ['Coopération fluide même avec beaucoup de ping : un joueur lent ne fige plus les autres.'] },
  { v: '9.11', d: ['Partie perso (17 réglages).', 'Pose des T3/T4 au prix progressif, plus de plasma par boss.', 'IEM des astéroïdes et de la foudre à débrouiller contre crédits.'] },
  { v: '9.10', d: ['Fusions T3 et T4 payées en plasma et en abyssite, selon la difficulté.'] },
  { v: '9.9', d: ['Arbre de 30 compétences, plasma et abyssite, raffinerie, niveaux Oméga après le Léviathan.'] },
  { v: '9.8', d: ['Multijoueur : relais de secours quand la liaison directe est impossible.'] },
  { v: '9.7', d: ['Fin de partie rééquilibrée, niveaux Oméga, Recherche Oméga.'] },
  { v: '9.6', d: ['Tourelles brouillées : débrouillage payant (touche D).'] }
];
const News = {
  cmp(a, b) { const A = String(a).split('.').map(Number), B = String(b).split('.').map(Number); for (let i = 0; i < Math.max(A.length, B.length); i++) { const d = (A[i] || 0) - (B[i] || 0); if (d) return d; } return 0; },
  // au démarrage : première visite → rien ; version déjà vue → rien ; sinon les nouveautés depuis la version précédente
  check() {
    const seen = Store.data.seenV;
    Store.data.seenV = VERSION; Store.save();
    if (!Store.data.stats.games || (seen && this.cmp(seen, VERSION) >= 0)) return;
    const L = CHANGELOG.filter(c => (seen ? this.cmp(c.v, seen) > 0 : c.v === VERSION) && this.cmp(c.v, VERSION) <= 0);
    if (L.length) this.show(seen, L);
  },
  show(from, L) {
    $('news-sub').innerHTML = from ? `Version <b>${from}</b> → <b style="color:var(--accent)">${VERSION}</b>` : `Nouvelle version <b style="color:var(--accent)">${VERSION}</b>`;
    $('news-list').innerHTML = L.map(c => `<div class="nv"><h4>v${c.v}${c.v === VERSION ? ' <span class="tag g">NOUVEAU</span>' : ''}</h4><ul>${c.d.map(x => `<li>${x}</li>`).join('')}</ul></div>`).join('');
    UI.open('ov-news');
  }
};
const Keys = {
  wait: null, map: null,
  // touches d'une commande : réglage du joueur (tableau, éventuellement vide) sinon défaut
  of(id) {
    const u = (Store.s.keys || {})[id];
    if (u) return u;
    const d = KEYDEF.find(x => x.id === id);
    return d ? d.d : [];
  },
  build() {
    this.map = new Map();
    for (const d of KEYDEF) for (const c of this.of(d.id)) this.map.set(c, d.id);
    for (const id in Store.s.keys || {}) if (/^(tw|trap):/.test(id)) for (const c of Store.s.keys[id]) this.map.set(c, id);
  },
  act(code) { if (!this.map) this.build(); return this.map.get(code) || null; },
  is(code, id) { return this.act(code) === id; },
  // libellé de la touche principale d'une commande (vide si aucune)
  lbl(id) { const c = this.of(id)[0]; return c ? this.name(c) : ''; },
  name(code) {
    const N = { Space: 'ESPACE', Enter: 'ENTRÉE', NumpadEnter: 'ENTRÉE', Delete: 'SUPPR', Backspace: '⌫', Tab: 'TAB', ShiftLeft: 'MAJ', ShiftRight: 'MAJ D',
      ControlLeft: 'CTRL', ControlRight: 'CTRL D', AltLeft: 'ALT', AltRight: 'ALT GR', ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→',
      Insert: 'INSER', Home: 'DÉBUT', End: 'FIN', PageUp: 'PG ↑', PageDown: 'PG ↓', CapsLock: 'VERR MAJ' };
    if (N[code]) return N[code];
    let m = /^Numpad(\d)$/.exec(code); if (m) return 'PAVÉ ' + m[1];
    m = /^Digit(\d)$/.exec(code); if (m) return m[1];
    if (/^Key[A-Z]$/.test(code) || /^(Semicolon|Comma|Period|Slash|Quote|BracketLeft|BracketRight|Backslash|Minus|Equal|IntlBackslash)$/.test(code)) {
      if (UI.layout) { const v = UI.layout.get(code); if (v) return v.toUpperCase(); }
      if (/^Key/.test(code)) return UI.keyLabel(code);
    }
    return code.replace(/^Numpad/, 'PAVÉ ').toUpperCase();
  },
  set(id, codes) {
    const K = Store.s.keys || (Store.s.keys = {});
    // une touche ne sert qu'à une commande : on la retire de toutes les autres
    for (const c of codes) for (const o of KEYDEF.map(d => d.id).concat(Object.keys(K))) if (o !== id) {
      const cur = this.of(o); if (cur.includes(c)) K[o] = cur.filter(x => x !== c);
    }
    K[id] = codes;
    for (const o in K) if (/^(tw|trap):/.test(o) && !K[o].length) delete K[o];
    Store.save(); this.build(); this.changed();
  },
  reset() { Store.s.keys = {}; Store.save(); this.build(); this.changed(); },
  changed() { if (G && !G.demo) { UI.buildBar(); UI.buildAbils(); UI.refreshAbils(true); if (UI.sel) UI.renderPanel(); } },
  // écran Options → Raccourcis
  render() {
    const box = $('keys-list'), row = (id, n, sub) => {
      const c = this.of(id), w = this.wait === id;
      return `<div class="krow${w ? ' wait' : ''}"><span>${n}${sub ? `<small>${sub}</small>` : ''}</span><span class="kset"><button class="kbtn" data-k="${id}">${w ? 'APPUYEZ SUR UNE TOUCHE…' : c.length ? c.slice(0, 2).map(x => this.name(x)).join(' / ') : '—'}</button><button class="kclr" data-c="${id}" title="Aucune touche" ${c.length ? '' : 'disabled'}>✕</button></span></div>`;
    };
    let h = '', g = '';
    for (const d of KEYDEF) {
      if (d.g !== g) { g = d.g; h += `<div class="kg">${g}</div>`; }
      h += row(d.id, d.n);
    }
    h += `<div class="kg">TOURELLES ET PIÈGES<small>une touche pour sélectionner directement un canon, même s'il change de place dans la barre</small></div>`;
    for (const k in TOWERS) h += row('tw:' + k, `<b style="color:${TOWERS[k].color}">${TOWERS[k].name}</b>`, TOWERS[k].tier >= 2 ? 'T' + TOWERS[k].tier : '');
    for (const t in TRAPS) h += row('trap:' + t, `<b style="color:${TRAPS[t].color}">${TRAPS[t].name}</b>`, 'piège');
    box.innerHTML = h;
    box.querySelectorAll('.kbtn').forEach(b => b.onclick = () => { this.wait = this.wait === b.dataset.k ? null : b.dataset.k; Sfx.play('ui'); this.render(); });
    box.querySelectorAll('.kclr').forEach(b => b.onclick = () => { this.wait = null; this.set(b.dataset.c, []); Sfx.play('ui'); this.render(); });
  },
  open() { this.wait = null; this.render(); UI.open('ov-keys'); },
  // capture de la touche pendant un réglage
  capture(e) {
    e.preventDefault(); e.stopPropagation();
    const id = this.wait; this.wait = null;
    if (e.code !== 'Escape' && e.code !== 'F3' && e.code !== 'Backquote' && e.code) { this.set(id, [e.code]); Sfx.play('upgrade'); }
    this.render();
  }
};

