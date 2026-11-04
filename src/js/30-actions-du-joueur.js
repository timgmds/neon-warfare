/* ============================== ACTIONS DU JOUEUR ==============================
   Tout ce qui modifie la partie à l'initiative d'un joueur passe par ici. En solo l'action s'exécute aussitôt ;
   en coopération elle est horodatée et exécutée au même tick sur les deux machines (lockstep).
   Les arguments sont de simples valeurs (coordonnées, identifiants) : ils voyagent sur le réseau. */
const Act = {
  H: {
    build: (k, x, y) => Towers.build(k, x, y),
    trap: (k, x, y) => Traps.build(k, x, y),
    untrap: (x, y) => { const tr = Traps.at(x, y); if (tr) Traps.remove(tr, true); },
    up: (x, y) => { const t = Towers.at(x, y); return !!t && Towers.upgrade(t); },
    sell: (x, y) => { const t = Towers.at(x, y); if (t && Act.owns(t)) Towers.sell(t); },
    spec: (x, y, i) => { const t = Towers.at(x, y); if (t) Towers.setSpec(t, i); },
    strat: (x, y, i) => { const t = Towers.at(x, y); if (t) { t.strat = i; t.aimT = 0; } },
    // ennemi désigné : visé en priorité par les tourelles en ciblage FOCUS (de tous les joueurs en coopération)
    focus: id => { G.focus = id | 0; for (const t of G.towers) if (t.strat === 4) t.aimT = 0; },
    // coopération : don de crédits ou d'éléments à un partenaire
    gift: (to, cur, n) => {
      n = Math.floor(n);
      if (!G.wallets || G.actor == null || to === G.actor || !(to >= 0 && to < G.wallets.length) || (G.gone && G.gone[to]) || !(n > 0)) return false;
      if (cur === 'm') { if (G.wallets[G.actor] < n) return false; G.wallets[G.actor] -= n; G.wallets[to] += n; }
      else if ((cur === 'p' || cur === 'a' || cur === 'q') && G.resW && G.resW[G.actor] && G.resW[to]) {
        const F = G.resW[G.actor], T = G.resW[to]; if ((F[cur] | 0) < n) return false; F[cur] -= n; T[cur] = (T[cur] | 0) + n;
      } else return false;
      const what = cur === 'm' ? fmt(n) + '¢' : n + ' ' + RES[cur].i;
      if (to === Net.me) { UI.toast('Cadeau !', `${MP.esc(MP.name(G.actor))} vous donne <b>${what}</b>.`, MP_COL[G.actor], 4); Sfx.play('coin'); }
      else if (G.actor === Net.me) { UI.toast('Don envoyé', `${what} pour ${MP.esc(MP.name(to))}.`, MP_COL[to], 2.5); Sfx.play('coin'); }
      return true;
    },
    oc: (x, y, on) => {
      const t = Towers.at(x, y); if (!t || t.d.kind === 'support' || t.d.kind === 'radar') return;
      t.oc = !!on; FX.float(t.cx, t.cy - 20, t.oc ? 'SURCADENCE' : 'NORMAL', t.oc ? '#ff3355' : '#cfe3ff', 11);
    },
    unjam: (x, y) => { const t = Towers.at(x, y); return !!t && Towers.unjam([t]); },
    unjamAll: () => Towers.unjam(Towers.jammed()),
    fuse: (x, y, x2, y2) => {
      const a = Towers.at(x, y), b = Towers.at(x2, y2); if (!a || !b) return;
      const r = Fusion.recipeFor(a.key, b.key); if (r) Fusion.fieldFuse(a, b, r);
    },
    research: id => { const r = RECIPES.find(x => x.r === id); return !!r && Fusion.research(r); },
    skill: id => Skills.buy(id),
    abil: (k, x, y) => { if (G.abil[k] <= 0 && Abil.unlocked(k)) Abil.use(k, x, y); },
    wave: () => Waves.launch(),
    recycle: (x, y) => Recycle.start(x, y),
    card: i => Cards.pick(i),
    reroll: () => Cards.reroll(),
    drop: id => Drops.grab(id),
    pod: id => Events.open(id),
    slot: lvl => Casino.spin(lvl),
    bet: (k, pi) => Casino.bet(k, pi),
    speed: v => Game.setSpeed(v),
    auto: on => { G.autoWave = !!on; if (G.phase === 'prep') G.autoT = 480; UI.refreshAuto(); },
    leave: p => { (G.gone || (G.gone = {}))[p] = 1; },
    back: p => { if (G.gone) delete G.gone[p]; },   // retour d'un joueur, appliqué au même tick chez tous
    giveup: () => { if (!G.net) Game.gameOver(); },   // abandon (enregistré dans le replay)   // départ d'un joueur, appliqué au même tick chez tous
    // coopération : pause pour tous, demandée par n'importe quel joueur (G.paused = numéro du joueur + 1)
    mpause: on => { G.paused = on ? (G.actor != null ? G.actor : 0) + 1 : 0; UI.refreshMpPause(); }
  },
  do(type, ...a) {
    if (!G || G.over) return false;
    if (G.replay) { if (performance.now() - (UI.rpT || 0) > 2500) { UI.rpT = performance.now(); UI.toast('Replay', 'Lecture seule : vous regardez une partie enregistrée.', '#9fb0cc', 2); } return false; }
    if (G.paused && type !== 'mpause') { UI.toast('Partie en pause', 'Reprenez la partie pour agir.', '#9fb0cc', 2); return false; }
    if (Net.coop) return Lock.push(type, a);
    Replay.note(type, a);
    return this.run(null, type, a);
  },
  run(p, type, a) {
    const h = this.H[type]; if (!h) return false;
    if (G.paused && type !== 'mpause' && type !== 'leave') return false;
    const prev = G.actor; G.actor = p;
    try { return h(...a); } finally { G.actor = prev; if (Net.coop) UI.afterAct(type, p); }
  },
  // l'action en cours vient-elle de ce poste ? (pour n'afficher erreurs et sélections qu'à son auteur)
  mine() { return !Net.coop || G.actor == null || G.actor === Net.me; },
  // la tourelle d'un joueur parti appartient à tout le monde (on peut la vendre, l'argent va au vendeur)
  owns(t, p = G.actor != null ? G.actor : Net.me) { return !Net.coop || t.owner == null || t.owner === p || !!(G.gone && G.gone[t.owner]); }
};

/* historique des dernières parties (menu Palmarès) */
const Hist = {
  add(extra = {}) {
    if (!G || G.demo) return;
    let mvp = null; for (const k in G.tstats) if (G.tstats[k].dealt > 0 && (!mvp || G.tstats[k].dealt > G.tstats[mvp].dealt)) mvp = k;
    const H = Store.data.hist || (Store.data.hist = []);
    H.unshift(Object.assign({ d: Date.now(), gm: G.gm, diff: G.diffKey, w: G.waveNum, k: G.stats.kills, mvp, net: G.net || '', daily: G.daily || '', code: G.cmap ? '' : Hist.code(), map: G.cmap ? G.cmap.n : undefined }, extra));
    if (H.length > 30) H.length = 30;
    Store.save();
  },
  // code de défi : graine + orientation + difficulté + mode → même carte et mêmes vagues pour un ami
  code(g = G) { return `${g.seed.toString(36).toUpperCase()}-${g.portrait ? 'P' : 'L'}-${g.diffKey[0].toUpperCase()}${g.gm !== 'classic' && g.gm !== 'custom' ? '-' + g.gm[0].toUpperCase() : ''}`; },
  parse(c) {
    const raw = String(c || '').trim(), m = /^([0-9A-Z]+)-([PL])(?:-([RSHC]))?(?:-([CRS]))?$/i.exec(raw.toUpperCase());
    if (!raw) return null;
    // graine libre : un nombre tel quel, ou n'importe quel mot / phrase (« neon », « timg 2026 »…)
    if (!m) return { seed: /^\d{1,9}$/.test(raw) ? +raw : hashStr(raw.toLowerCase()) | 0, portrait: null, diff: null, gm: null, free: raw };
    const diffs = { R: 'recrue', S: 'standard', H: 'hardcore', C: 'cauchemar' }, gms = { C: 'chaos', R: 'rush', S: 'sandbox' };
    return { seed: parseInt(m[1], 36) | 0, portrait: m[2] === 'P', diff: diffs[m[3]] || null, gm: gms[m[4]] || 'classic' };
  }
};

const Ach = {
  unlock(id, meta) {
    if (!ACH[id] || Store.data.ach[id] || (!meta && G && (G.demo || G.replay || G.gm === 'sandbox' || G.gm === 'custom' || G.cmap))) return;
    Store.data.ach[id] = Date.now(); Store.data.meta.frags += 3; Store.save();
    UI.toast('Succès : ' + ACH[id].n, ACH[id].d + ' <span class="frags">+3 ✦</span>', '#ffd23f', 4.5);
    Sfx.play('ach');
  }
};

