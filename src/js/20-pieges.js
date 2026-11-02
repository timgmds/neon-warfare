/* ============================== PIÈGES (mines et barricades sur le chemin) ============================== */
const Traps = {
  cost(type) { return Math.round(TRAPS[type].cost * G.mod.cost); },
  count(type) { return G.traps.filter(t => t.type === type).length; },
  at(tx, ty) { return G.traps.find(t => t.tx === tx && t.ty === ty) || null; },
  canPlace(tx, ty) {
    const M = G.map;
    if (tx < 0 || ty < 0 || tx >= M.C || ty >= M.R || M.cells[ty * M.C + tx] !== 1 || this.at(tx, ty)) return false;
    // ni sur les premières cases d'une entrée, ni juste devant le noyau
    for (const P of M.P) { const d = P.tdist.get(ty * M.C + tx); if (d !== undefined && (d < 3.4 * TILE || d > P.total - 2.5 * TILE)) return false; }
    return true;
  },
  build(type, tx, ty) {
    const T = TRAPS[type];
    if (!this.canPlace(tx, ty)) { Sfx.play('error'); return null; }
    if (this.count(type) >= T.max) { UI.toast(T.name, `Maximum ${T.max} en même temps sur la carte.`, T.color, 2.5); Sfx.play('error'); return null; }
    const c = this.cost(type);
    if (G.money < c) { UI.noMoney(); return null; }
    G.money -= c;
    // la puissance suit la vague en cours (ou à venir pendant la préparation)
    const m = Waves.hpMul(Math.max(1, G.waveNum + (G.phase === 'prep' ? 1 : 0)));
    const tr = { type, tx, ty, x: (tx + .5) * TILE, y: (ty + .5) * TILE, cost: c, born: performance.now(), hitT: 0,
      dists: G.map.P.map(P => P.tdist.get(ty * G.map.C + tx)), dmg: type === 'mine' ? 110 * m : 0, hp: 0, max: 0 };
    if (type === 'barricade') tr.max = tr.hp = 280 * m;
    G.traps.push(tr);
    FX.ring(tr.x, tr.y, T.color, 26, 18, 2); FX.spark(tr.x, tr.y, T.color, 8, 2);
    Sfx.play('build');
    return tr;
  },
  remove(tr, refund) {
    const i = G.traps.indexOf(tr); if (i >= 0) G.traps.splice(i, 1);
    if (refund) { const v = Math.floor(tr.cost * .5); gain(v); G.stats.gold -= v; FX.float(tr.x, tr.y - 12, '+' + v, '#ffd23f', 12); Sfx.play('sell'); }
  },
  update() {
    for (let i = G.traps.length - 1; i >= 0; i--) {
      const tr = G.traps[i];
      if (tr.hitT > 0) tr.hitT--;
      if (tr.type !== 'mine') continue;
      for (const e of G.enemies) {
        if (!e.alive || e.air || e.phased || d2(e.x, e.y, tr.x, tr.y) > (14 + e.r) * (14 + e.r)) continue;
        G.traps.splice(i, 1);
        if (e.d.sapper) { FX.float(tr.x, tr.y - 14, 'DÉSAMORCÉE', '#c8a26b', 11); FX.spark(tr.x, tr.y, '#c8a26b', 10, 2); Sfx.play('error', .5); }
        else this.explode(tr);
        break;
      }
    }
  },
  explode(tr) {
    const r = TRAPS.mine.r;
    Combat.splash(tr.x, tr.y, r, tr.dmg, null, false, true, .5);
    FX.ring(tr.x, tr.y, '#ff5544', r * 1.2, 26, 4); FX.ring(tr.x, tr.y, '#ffffff', r * .6, 16, 2);
    FX.spark(tr.x, tr.y, '#ffae00', 26, 5, 34, 3); FX.spark(tr.x, tr.y, '#ff5544', 14, 3);
    if (Render.hq) for (let i = 0; i < 5; i++) FX.smoke(tr.x + rnd(-10, 10), tr.y + rnd(-10, 10), 55, rnd(5, 8));
    Render.shake(6); Sfx.play('boom');
    G.stats.mines = (G.stats.mines || 0) + 1;
  },
  // barricades : distance maximale que l'ennemi peut atteindre ce tick ; il entame la barricade qui l'arrête
  block(e, nd) {
    let lim = Infinity, hit = null;
    for (const tr of G.traps) {
      if (tr.type !== 'barricade') continue;
      const bd = tr.dists[e.pi]; if (bd === undefined) continue;
      const stop = bd - TILE * .45 - e.r * .5;
      if (e.dist <= stop + 2 && nd > stop && stop < lim) { lim = stop; hit = tr; }
    }
    if (hit) {
      hit.hp -= e.maxHp * .003 * (e.boss ? 1.5 : 1) * (e.d.sapper ? 10 : 1); hit.hitT = 3;
      if (hit.hp <= 0) {
        this.remove(hit, false);
        FX.ring(hit.x, hit.y, '#ffae00', 40, 22, 3); FX.spark(hit.x, hit.y, '#ffae00', 20, 4); FX.float(hit.x, hit.y - 16, 'BARRICADE DÉTRUITE', '#ffae00', 11);
        Render.shake(4); Sfx.play('boom', .5);
        return Infinity;
      }
    }
    return lim;
  }
};

