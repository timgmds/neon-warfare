/* ============================== STATUTS & DÉGÂTS ============================== */
// ennemi invisible ou hors d'atteinte (furtif non révélé, sous un voile, déphasé)
const hid = e => e.phased || ((e.stealth || e.veilT > 0) && e.revealT <= 0);
const Status = {
  slow(e, f, t) {
    if (e.d.noSlow) return;
    if (e.boss) t *= .5;
    if (e.d.slowRes) f = 1 - (1 - f) * e.d.slowRes;
    if (e.slowT <= 0 || f < e.slowF) e.slowF = f;
    if (t > e.slowT) e.slowT = t;
  },
  burn(e, dps, t, src) {
    if (e.burnT <= 0 || dps >= e.burnDps) { e.burnDps = dps; e.burnSrc = src; }
    if (t > e.burnT) e.burnT = t;
  },
  apply(e, tw) {
    if (!tw || !e.alive) return;
    const d = tw.d;
    if (d.slow) this.slow(e, Math.max(.15, 1 - (1 - d.slow.f) * G.mod.slow * (tw.sm.slow || 1)), d.slow.t);
    if (d.burn) this.burn(e, Towers.burnDps(tw), d.burn.t, tw);
  }
};

/* crédits : un seul portefeuille en solo ; en coopération chaque joueur a le sien (G.wallets).
   gain(v, p) : p = joueur bénéficiaire ; null = revenu commun, partagé entre les joueurs. */
const COOP = { share: .6, hp: 1.75, start: .75 };
/* versus : plus brutal qu'en solo, et une escalade (+5 % de PV par vague après la 12) pour que la partie finisse toujours par trancher */
// fin de partie : niveaux Oméga (11 à 15, 1 abyssite chacun) et Recherche Oméga (plasma), une fois le Léviathan repoussé (vague 50)
const OMEGA = { from: 50, max: 15, dmg: 1.35, cost: 1.5, abyss: 1, ars: .08, arsCost: 3, arsStep: 1, refine: 12, refStep: 4 };
// paliers de ressources : crédits (I), nanites (II), plasma (III, boss et élites), abyssite (IV, méga-boss puis boss après la vague 50)
const RES = {
  n: { i: '◈', c: '#00ffaa', n: 'nanites' },
  p: { i: '✺', c: '#ff8a3d', n: 'plasma' },
  a: { i: '⬟', c: '#b48cff', n: 'abyssite' }
};
// fusions T3 (plasma) et T4 (abyssite) : le plan au Labo et chaque pose coûtent des éléments rares, selon la difficulté.
// plan : index = palier. pose : [base, pas] par palier → la n-ième tourelle de ce palier déjà en jeu coûte base + pas × n
// (la première est donc bon marché, c'est l'accumulation qui coûte cher ; revendre fait redescendre le prix)
const ELEM_COST = {
  recrue:    { plan: [0, 0, 0, 3, 2], pose: { 3: [-1, 1], 4: [0, 1] } },
  standard:  { plan: [0, 0, 0, 5, 3], pose: { 3: [0, 1], 4: [0, 2] } },
  hardcore:  { plan: [0, 0, 0, 7, 4], pose: { 3: [1, 1], 4: [0, 3] } },
  cauchemar: { plan: [0, 0, 0, 9, 5], pose: { 3: [1, 2], 4: [0, 4] } }
};
// coopération : G.res lit et écrit la réserve du joueur qui agit (ou du joueur local), comme G.money
function bindRes() {
  const W = G.resW, cur = () => W[G.actor != null ? G.actor : Net.me] || W[0], o = { sp: G.res.sp || 0, sa: G.res.sa || 0 };
  for (const k of ['p', 'a', 'ref']) Object.defineProperty(o, k, { get() { return cur()[k] || 0; }, set(v) { cur()[k] = v; }, enumerable: true });
  G.res = o;
}
const Res = {
  get(c) { return c === 'p' ? G.res.p : c === 'a' ? G.res.a : G.nanites; },
  take(c, v) { if (c === 'p') G.res.p -= v; else if (c === 'a') G.res.a -= v; else G.nanites -= v; },
  gain(c, v, x, y) {
    if (!(v > 0)) return;
    const first = !G.res['s' + c];
    // coopération : un butin (boss, élite) revient en entier à chaque joueur présent ; une action ne crédite que son auteur
    if (G.resW && G.actor == null) { G.resW.forEach((w, i) => { if (!(G.gone && G.gone[i])) w[c] = (w[c] || 0) + v; }); }
    else G.res[c] += v;
    G.res['s' + c] = 1;
    if (G.demo) return;
    if (x != null) FX.float(x, y, `+${v} ${RES[c].i}`, RES[c].c, 17);
    if (first) UI.toast(c === 'p' ? 'Nouvel élément : plasma ✺' : 'Nouvel élément : abyssite ⬟',
      c === 'p' ? 'Lâché par les boss, parfois par les élites, ou raffiné à partir de nanites. Il débloque le <b>palier III</b> de l\'arbre de compétences (touche K).'
        : `Arrachée au Léviathan, puis aux boss après la vague ${Towers.omFrom()}. Elle débloque le <b>palier IV</b> de l\'arbre et paie les <b>niveaux Oméga</b> des tourelles.`, RES[c].c, 7);
  },
  tag(c, v) { return `<b style="color:${RES[c].c};font-family:var(--mono)">${v} ${RES[c].i}</b>`; },
  // butin d'élément (boss, élites, méga-boss) : multiplié en partie perso, la fraction devient une chance
  drop(c, v, x, y) {
    const m = G.cus ? G.cus.elem : 1;
    if (m !== 1) { v *= m; v = Math.floor(v) + (sr() < v % 1 ? 1 : 0); }
    this.gain(c, v, x, y);
  }
};
const SAB_SHIELD = 30;   // versus : secondes de protection contre les sabotages après en avoir subi un
const VERSUS = { hp: 1.3, esc: 1.05, escFrom: 12, lives: .7, money: .85, elite: 1.5, sendHp: 1.1, prep: 600, first: 1200 };
function gain(v, p = G.actor) {
  if (G.wallets && p == null && !Net.coop) p = Net.me;   // partenaire parti : tout revient au joueur restant
  if (G.wallets) {
    if (p != null) G.wallets[p] += v;
    else for (let i = 0; i < G.wallets.length; i++) if (!(G.gone && G.gone[i])) G.wallets[i] += Math.round(v * COOP.share);
  } else G.money += v;
  G.stats.gold += v;
}

/* statistiques de la partie : par type de tourelle (vendues comprises) et par vague */
const Stats = {
  type(k) { return G.tstats[k] || (G.tstats[k] = { dealt: 0, kills: 0, shots: 0, spent: 0 }); },
  dmg(src, a) {
    if (src) { src.dealt += a; if (src.ts) src.ts.dealt += a; }
    G.waveDmg[G.waveNum] = (G.waveDmg[G.waveNum] || 0) + a;
  }
};

const Combat = {
  hit(e, dmg, src, crit = false, pierce = 0, dot = false) {
    if (!e.alive || e.phased || e.inv > 0) return 0;
    if (src && e.air && src.d.airMult) dmg *= src.d.airMult;
    if (e.markT > 0) dmg *= 1 + e.markV;
    const M = G.mod;
    if (src) {
      if (e.boss) dmg *= M.bossDmg;
      if (M.fresh && e.hp >= e.maxHp) dmg *= 1 + M.fresh;
      if (M.frostDmg && (e.slowT > 0 || e.freezeT > 0)) dmg *= 1 + M.frostDmg;
      if (M.airDmg && e.air) dmg *= 1 + M.airDmg;
      if (M.armDmg && e.armor > 0) dmg *= 1 + M.armDmg;
      if (M.vet && src.level >= 8) dmg *= 1 + M.vet;
    }
    if (e.shield > 0) {
      const s = Math.min(e.shield, dmg);
      e.shield -= s; dmg -= s; e.shCd = 180;
      Stats.dmg(src, s);
      if (dmg <= 0) { if (!dot) e.hitT = 3; return s; }
    }
    if (!dot && e.armor > 0) {
      const a = e.armor * (1 - clamp(pierce + G.mod.pierce, 0, 1));
      dmg = Math.max(dmg * .2, dmg - a);
    }
    e.hp -= dmg;
    Stats.dmg(src, dmg);
    if (M.exec && e.hp > 0 && !e.boss && e.hp < e.maxHp * M.exec) { e.hp = 0; if (Render.hq && Math.random() < .3) FX.float(e.x, e.y - e.r - 6, 'EXÉCUTÉ', '#ff3d5a', 10); }
    if (!dot) {
      e.hitT = 3;
      if (crit) Missions.on('crit');
      if (UI.dmgNums) {
        if (crit) FX.float(e.x + rnd(-5, 5), e.y - e.r - 6, fmt(dmg) + '!', '#ffae00', 15);
        else if (dmg >= e.maxHp * .3 && Math.random() < .5) FX.float(e.x + rnd(-6, 6), e.y - e.r - 4, fmt(dmg), '#ffffff', 11);
      }
    }
    if (e.hp <= 0) Enemies.kill(e, src);
    return dmg;
  },
  splash(x, y, r, dmg, src, crit, ground, pierce = 0, status = false) {
    const arr = G.enemies; let hits = 0;
    for (let i = 0, n = arr.length; i < n; i++) {
      const e = arr[i];
      if (!e.alive || (ground && e.air)) continue;
      const rr = r + e.r * .6;
      if (d2(e.x, e.y, x, y) <= rr * rr) { hits++; this.hit(e, dmg, src, crit, pierce); if (status) Status.apply(e, src); }
    }
    return hits;
  }
};

