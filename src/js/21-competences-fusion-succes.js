/* ============================== COMPÉTENCES / FUSION / SUCCÈS ============================== */
const Skills = {
  rank(id) { return G.skills[id] || 0; },
  reqOk(id) {
    const s = SKILLS[id];
    if (s.req && !s.req.every(([k, r]) => this.rank(k) >= r)) return false;
    if (s.reqAny && !s.reqAny.some(([k, r]) => this.rank(k) >= r)) return false;
    return true;
  },
  cost(id) { const s = SKILLS[id], r = this.rank(id); return r >= s.max ? Infinity : s.cost[r]; },
  cur(id) { return SKILLS[id].cur || 'n'; },
  canBuy(id) { return this.reqOk(id) && this.rank(id) < SKILLS[id].max && Res.get(this.cur(id)) >= this.cost(id); },
  anyBuyable() { for (const id in SKILLS) if (this.canBuy(id)) return true; return Towers.omega() && G.res.p >= this.arsCost(); },
  total() { let s = 0; for (const k in G.skills) if (SKILLS[k]) s += G.skills[k]; return s; },
  // Recherche Oméga : sans limite, +8 % de dégâts par rang, prix croissant
  arsCost() { return OMEGA.arsCost + OMEGA.arsStep * this.rank('ars'); },
  buyArs() {
    if (!Towers.omega()) { if (Act.mine()) Sfx.play('error'); return false; }
    const c = this.arsCost();
    if (G.res.p < c) { if (Act.mine()) Sfx.play('error'); return false; }
    G.res.p -= c; G.skills.ars = this.rank('ars') + 1;
    this.apply(); Towers.recalc();
    if (Act.mine()) Sfx.play('levelup');
    return true;
  },
  // raffinerie : les nanites en trop deviennent du plasma, à un prix qui monte à chaque conversion
  refineCost() { return OMEGA.refine + OMEGA.refStep * (G.res.ref || 0); },
  refine() {
    const c = this.refineCost();
    if (G.nanites < c) { if (Act.mine()) Sfx.play('error'); return false; }
    G.nanites -= c; G.res.ref = (G.res.ref || 0) + 1; Res.gain('p', 1);
    if (Act.mine()) Sfx.play('coin');
    return true;
  },
  buy(id) {
    if (id === 'ars') return this.buyArs();
    if (id === 'refine') return this.refine();
    if (!SKILLS[id] || !this.reqOk(id) || this.rank(id) >= SKILLS[id].max) { Sfx.play('error'); return false; }
    const c = this.cost(id), cu = this.cur(id);
    if (Res.get(cu) < c) { Sfx.play('error'); return false; }
    Res.take(cu, c); G.skills[id] = this.rank(id) + 1;
    if (id === 'c4') { G.maxLives += 15; G.lives += 15; }
    if (id === 'c5') G.recycle += 2;
    this.apply(); Towers.recalc();
    Sfx.play('upgrade');
    Missions.on('skill');
    if (this.total() >= 15) Ach.unlock('scholar');
    if (SKILLS[id].cap) UI.toast('Nouvelle capacité', SKILLS[id].d(1), BRANCHES[SKILLS[id].br].color, 4);
    UI.refreshAbils(true);
    return true;
  },
  // tous les modificateurs de la partie : compétences + Héritage + doctrine + protocoles choisis
  apply() {
    const r = k => G.skills[k] || 0, pk = G.perks || Store.data.meta.perks;
    const DL = (G.docs && G.docs.length ? G.docs : [G.doctrine]).map(k => DOCTRINES[k] || DOCTRINES.standard);
    const m = {
      dmg: (1 + .08 * r('a1')) * (1 + OMEGA.ars * r('ars')) * (1 + .12 * r('a7')) * (1 + .25 * r('a10')), crit: .05 + .04 * r('a2') + .05 * r('a10'), range: 1 + .06 * r('a3'), critDmg: 2 + .5 * r('a4'), pierce: .25 * r('a5'),
      cool: 1 + .25 * r('e1'), cost: 1 - .05 * r('e2'), heat: 1 - .2 * r('e3'), refund: .7 + .1 * r('e4'), support: 1 + .4 * r('e5'),
      bounty: (1 + .1 * r('c1')) * (r('c10') ? 1.25 : 1), interest: .03 * r('c2'), magnet: r('c3') > 0, drop: r('c3') ? 1.5 : 1, regen: 3 * r('c4'),
      recycleMul: r('c5') ? 2 : 1, orbDmg: r('c6') ? 1.75 : 1, orbCd: r('c6') ? .7 : 1,
      abilCd: 1 - .08 * (pk.h_cd || 0), waveBonus: (1 + .25 * (pk.h_bonus || 0)) * (1 + .4 * r('c8')),
      rate: 1 + .08 * r('e7'), splash: 1, burn: 1, slow: 1, chain: 0, espd: 1, ehp: 1, bp: 1,
      exec: .08 * r('a9'), bossDmg: 1 + .25 * r('a8'), fresh: 0, frostDmg: 0, airDmg: 0, armDmg: 0, vet: 0, aegis: 2 * r('c9'),
      prosp: r('c7'), supDiag: r('e8') > 0, stunMul: 1 - .35 * r('e9'), omegaDmg: r('e10') ? 1.5 : OMEGA.dmg, abyssB: r('c10'), vamp: 0, t0cost: 1, choices: 0, bossHp: 1, bossCard: 0,
      earmor: 0, nanoW: 0, towerCash: 0, chainx: 0, revive: 0, omni: 0, lucky: 0,
      kdmg: {}, kcost: {}
    };
    for (const D of DL) {
      for (const k in D.kdmg || {}) m.kdmg[k] = (m.kdmg[k] || 1) * D.kdmg[k];
      for (const k in D.kcost || {}) m.kcost[k] = (m.kcost[k] || 1) * D.kcost[k];
      for (const p of ['dmg', 'heat', 'splash', 'rate', 'espd', 'bp']) if (D[p]) m[p] *= D[p];
      for (const p of ['crit', 'interest', 'regen']) if (D[p]) m[p] += D[p];
    }
    for (const id in G.cards) {
      const c = CARDS[id], s = G.cards[id]; if (!c) continue;
      if (c.mod) for (const p in c.mod) m[p] *= Math.pow(c.mod[p], s);
      if (c.add) for (const p in c.add) m[p] += c.add[p] * s;
    }
    for (const tp of G.timed) { const c = CARDS[tp.id]; if (c && c.ehp) m.ehp *= c.ehp; }
    if (G.cx && G.cx.spec) for (const k in G.cx.spec) m.kdmg[k] = (m.kdmg[k] || 1) * G.cx.spec[k];
    if (G.ev && EVENTS[G.ev.k].mod) { const em = EVENTS[G.ev.k].mod; for (const p in em) m[p] *= em[p]; }
    G.mod = m;
  }
};

const Fusion = {
  // paires de tourelles adjacentes fusionnables (affichées sur la carte), recalculées quand la grille change
  scan() {
    const P = G.fusePairs = [];
    for (const t of G.towers) for (const [dx, dy] of [[1, 0], [0, 1]]) {
      const o = Towers.at(t.tx + dx, t.ty + dy); if (!o) continue;
      const r = this.recipeFor(t.key, o.key);
      if (r) P.push({ a: t, b: o, owned: G.unlocked.has(r.r), col: TOWERS[r.r].color });
    }
  },
  avail(k) { return TOWERS[k].tier <= 1 || G.unlocked.has(k); },
  recipeFor(a, b) { return RECIPES.find(r => (r.a === a && r.b === b) || (r.a === b && r.b === a)); },
  canResearch(r) { return !G.unlocked.has(r.r) && this.avail(r.a) && this.avail(r.b); },
  cur(r) { return Towers.elemOf(r.r) || 'n'; },
  cost(r) { return Towers.elemOf(r.r) ? Towers.elemCost(r.r, true) : Math.max(1, Math.round(r.n * G.mod.bp)); },
  anyResearchable() { return RECIPES.some(r => this.canResearch(r) && Res.get(this.cur(r)) >= this.cost(r)); },
  research(r) {
    if (!this.canResearch(r)) return false;
    const c = this.cost(r), cu = this.cur(r);
    if (Res.get(cu) < c) { Sfx.play('error'); return false; }
    Res.take(cu, c); G.unlocked.add(r.r); G.freshBp = r.r;
    this.scan();
    Missions.on('plan');
    const d = TOWERS[r.r];
    Sfx.play('fuse'); Render.flash(.3, d.color);
    UI.toast('Plan de fusion acquis : ' + d.name, `Constructible depuis la barre. Astuce : placez ${TOWERS[r.a].name} et ${TOWERS[r.b].name} côte à côte pour les fusionner sur le terrain.`, d.color, 6);
    Ach.unlock('fusion1');
    if (d.tier >= 3) Ach.unlock('tier3');
    UI.buildBar();
    return true;
  },
  fieldOptions(t) {
    const out = [];
    for (const [dx, dy] of NB4) {
      const o = Towers.at(t.tx + dx, t.ty + dy); if (!o) continue;
      const r = this.recipeFor(t.key, o.key); if (!r) continue;
      out.push({ o, r, owned: G.unlocked.has(r.r), cost: this.fieldCost(t, o, r) });
    }
    return out;
  },
  fieldCost(a, b, r) { return Math.max(0, Math.round(Towers.costOf(r.r) - .8 * (a.invested + b.invested))); },
  fieldFuse(a, b, r) {
    if (!G.unlocked.has(r.r)) {
      UI.toast('Plan requis', `Synthétisez d'abord le plan ${TOWERS[r.r].name} au Labo de fusion (${Res.tag(this.cur(r), this.cost(r))}).`, '#ff2bd6', 3.5);
      Sfx.play('error'); return;
    }
    const cost = this.fieldCost(a, b, r), ec = Towers.elemCost(r.r);
    if (G.money < cost) { UI.noMoney(); return; }
    if (!Towers.canPay(r.r)) { Towers.elemMissing(r.r); return; }
    G.money -= cost; if (ec) Res.take(Towers.elemOf(r.r), ec);
    const lvl = Math.max(1, Math.floor((a.level + b.level) / 2)), inv = a.invested + b.invested + cost, R = TOWERS[r.r];
    FX.bolt(b.cx, b.cy, a.cx, a.cy, R.color, 3, 20);
    FX.spark(b.cx, b.cy, TOWERS[b.key].color, 16, 3);
    Towers.remove(a); Towers.remove(b);
    const t = Towers.create(r.r, a.tx, a.ty, Math.min(lvl, 10));
    t.invested = inv; t.kills = a.kills + b.kills; t.dealt = a.dealt + b.dealt; t.strat = a.strat; t.fresh = false; t.ts.spent += cost;
    Towers.recalc();
    G.stats.fusions++;
    FX.ring(t.cx, t.cy, R.color, 64, 30, 4); FX.ring(t.cx, t.cy, '#ffffff', 40, 20, 2); FX.spark(t.cx, t.cy, R.color, 30, 4.5);
    Render.flash(.35, R.color); Render.shake(6);
    Sfx.play('fuse'); UI.banner('FUSION', R.name.toUpperCase(), R.color);
    Ach.unlock('field'); if (r.r === 'apocalypse') Ach.unlock('apoc');
    Missions.on('fuse'); Missions.on('level', t.level);
    if (!G.demo && Act.mine()) UI.select(t);
  }
};

