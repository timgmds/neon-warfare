/* ============================== TUTORIEL GUIDÉ ==============================
   Une vraie partie, guidée pas à pas par une bulle : chaque étape attend que le joueur ait fait l'action
   (ou qu'il clique sur « Suivant » pour les étapes d'explication) et met en valeur le bouton concerné.
   Lancé de lui-même à la toute première partie, et à tout moment depuis le Manuel. */
const TUTO = [
  { t: 'Bienvenue, Commandant !', d: 'Les ennemis vont suivre le chemin lumineux jusqu\'à votre noyau (l\'hexagone). Votre travail : les arrêter avec des tourelles. Commencez par en choisir une dans la barre du bas (ou touche 1).',
    hl: '#bar .bcard', ok: () => !!UI.placing },
  { t: 'Posez-la', d: 'Cliquez sur une case libre au bord du chemin : la zone affichée est sa portée. Au doigt, touchez la case deux fois.',
    hl: '#cv-game', ok: () => G.towers.length >= 1 },
  { t: 'Une deuxième', d: 'Une seule tourelle ne suffira pas. Posez-en une autre, de préférence là où le chemin fait un virage : elle tirera plus longtemps.',
    hl: '#bar .bcard', ok: () => G.towers.length >= 2 },
  { t: 'Lancez la vague', d: 'Prêt ? Lancez la première vague avec le bouton en bas à droite, ou la touche Espace.',
    hl: '#b-wave', ok: () => G.phase === 'combat' || G.waveNum >= 1 },
  { t: 'Ouvrez une tourelle', d: 'Pendant le combat, cliquez sur une de vos tourelles pour voir ses statistiques.',
    hl: '#cv-game', ok: () => !!UI.sel },
  { t: 'Améliorez-la', d: 'Chaque amélioration augmente ses dégâts, sa portée et sa cadence. Cliquez sur AMÉLIORER (ou touche U) dès que vos crédits le permettent.',
    hl: '#tp-up', ok: () => G.towers.some(t => t.level >= 2) },
  { t: 'Nanites et Arbre', d: 'Chaque vague repoussée rapporte des nanites ◈. Elles se dépensent dans l\'Arbre de compétences (bouton ARBRE ou touche K) : des bonus pour toute la partie.',
    hl: '#b-tree', next: 1 },
  { t: 'La fusion', d: 'Deux tourelles différentes posées côte à côte peuvent fusionner en une tourelle bien plus forte, si vous avez son plan. Les plans s\'achètent au Labo de fusion (bouton FUSION ou touche L). Un losange entre deux tourelles signale une fusion possible.',
    hl: '#b-lab', next: 1 },
  { t: 'Vos capacités', d: 'En bas à gauche, trois capacités puissantes avec un temps de recharge : la Frappe orbitale (Q), la Cryo-Bombe (W) et la Surcharge (E). Gardez-les pour les boss, qui arrivent toutes les 5 vagues.',
    hl: '#abils', next: 1 },
  { t: 'À vous de jouer !', d: 'Le reste s\'apprend en jouant : missions en haut à droite, protocoles à choisir, éléments rares, casino… Le Manuel (touche H) explique tout. Bonne défense !',
    hl: null, next: 1, end: 1 }
];

const Tuto = {
  i: -1, el: null,
  on() { return this.i >= 0; },
  // depuis le menu : une partie Recrue toute neuve ; en partie : le guide démarre sur place
  launch() {
    if (Game.state !== 'play' || !G || G.net || G.replay) {
      const go = () => { UI.closeAll(); Game.newGame('recrue', { gm: 'classic' }); this.begin(); };
      if (Store.data.save) UI.confirm('ÉCRASER LA SAUVEGARDE ?', 'Le tutoriel lance une nouvelle partie en Recrue : la partie sauvegardée sera remplacée.', go); else go();
    } else { UI.closeAll(); this.begin(); }
  },
  begin() {
    Store.data.tuto = true; Store.save();
    this.i = 0; this.show();
  },
  stop() {
    this.i = -1; this.mark(null);
    if (this.el) this.el.hidden = true;
  },
  show() {
    const s = TUTO[this.i]; if (!s) { this.stop(); return; }
    const el = this.el || (this.el = $('tuto'));
    el.hidden = false;
    el.innerHTML = `<div class="tn">TUTORIEL · ${this.i + 1} / ${TUTO.length}</div><h4>${s.t}</h4><p>${s.d}</p>
      <div class="row">${s.next ? `<button class="btn prim" id="tu-next">${s.end ? 'TERMINER' : 'SUIVANT'}</button>` : '<span class="tw">En attente de votre action…</span>'}<button class="btn" id="tu-quit">${s.end ? '' : 'PASSER LE TUTORIEL'}</button></div>`;
    if (s.end) $('tu-quit').remove(); else $('tu-quit').onclick = () => { Sfx.play('ui'); this.stop(); };
    if (s.next) $('tu-next').onclick = () => { Sfx.play('ui'); this.step(); };
    this.mark(s.hl);
  },
  step() { this.i++; if (this.i >= TUTO.length) this.stop(); else { Sfx.play('mission'); this.show(); } },
  // met en valeur l'élément à utiliser (plusieurs : cartes de la barre)
  mark(sel) {
    document.querySelectorAll('.tuto-hl').forEach(e => e.classList.remove('tuto-hl'));
    if (!sel) return;
    const L = document.querySelectorAll(sel);
    for (let k = 0; k < Math.min(L.length, sel === '#bar .bcard' ? 2 : 1); k++) L[k].classList.add('tuto-hl');
  },
  // appelé à chaque image par l'interface
  frame() {
    if (this.i < 0) return;
    if (!G || Game.state !== 'play' || G.over || G.net) { this.stop(); return; }
    const s = TUTO[this.i];
    if (s.ok && s.ok()) this.step();
    else if (s.hl && !document.querySelector('.tuto-hl')) this.mark(s.hl);   // le panneau de la tourelle a pu être redessiné
  }
};
