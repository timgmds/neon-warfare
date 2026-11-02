/* ============================== MÉGA-BOSS ============================== */
const Mega = {
  enter(e, i, first) {
    const P = e.d.phases[i], mu = G.mut;
    e.mph = i; e.mt = {};
    e.armor = (P.armor + mu.armorAdd + G.mod.earmor) * mu.armor * e.am;
    e.spd = e.spd0 * (P.spd || 1);
    for (const k of ['jam', 'summon', 'drain', 'rift', 'blink', 'aura']) if (P[k]) e.mt[k] = Math.round(P[k].every * (first ? .6 : .4));
    if (first) return;
    Res.drop('a', e.type === 'omega' ? 2 : 1, e.x, e.y - 50);   // chaque phase arrachée au méga-boss rapporte de l'abyssite
    e.inv = 150; e.leapTo = 0; e.slowT = 0; e.freezeT = 0;
    if (P.shieldBack && e.maxShield) e.shield = Math.max(e.shield, e.maxShield * P.shieldBack);
    Render.shake(20); Render.flash(.45, e.d.color); Sfx.play('boss');
    for (let k = 0; k < 3; k++) FX.ring(e.x, e.y, k & 1 ? '#ffffff' : e.d.color, 70 + k * 45, 30 + k * 8, 4);
    if (!G.demo) UI.banner(`PHASE ${i + 1}`, `${e.d.name} · ${P.n.toUpperCase()}`, e.d.color);
  },
  update(e) {
    if (e.inv > 0) e.inv--;
    const D = e.d.phases, P = D[e.mph], nx = D[e.mph + 1], T = e.mt, w = G.waves[e.wave];
    if (nx && e.hp <= e.maxHp * nx.at) { this.enter(e, e.mph + 1); return; }
    if (e.inv > 0) return;
    // régénération plafonnée au seuil de la phase en cours
    if (P.regen && e.hp < e.maxHp * (P.at || 1)) e.hp = Math.min(e.maxHp * (P.at || 1), e.hp + e.maxHp * P.regen / 60);
    // distorsion : marque le point d'arrivée, puis se téléporte
    if (e.leapTo) {
      if (--e.tD <= 0) {
        FX.spark(e.x, e.y, e.d.color, 30, 5); e.dist = Math.max(e.dist, e.leapTo); e.leapTo = 0;
        Path.place(e); e.px = e.x; e.py = e.y;
        FX.ring(e.x, e.y, e.d.color, 90, 26, 4); Render.shake(12); Sfx.play('boom', .7);
      }
      return;
    }
    const due = k => P[k] && --T[k] <= 0 && (T[k] = P[k].every, true);
    if (due('jam')) {
      const r2 = P.jam.r * P.jam.r; let hit = 0;
      for (const t of G.towers) if (t.d.kind !== 'support' && d2(t.cx, t.cy, e.x, e.y) <= r2) { t.stun = Math.max(t.stun, Towers.stunFor(P.jam.t)); hit++; }
      FX.ring(e.x, e.y, '#fff35c', P.jam.r, 34, 4); FX.float(e.x, e.y - e.r - 14, 'IEM GÉANTE', '#fff35c', 15);
      if (hit) Sfx.play('zap');
    }
    if (due('summon')) {
      const S = P.summon;
      for (let k = 0; k < S.n; k++) {
        e.sc = (e.sc || 0) + 1;
        this.add(S.types[e.sc % S.types.length], e, Math.max(0, e.dist - 34 - k * 24), .8, false);
      }
      FX.ring(e.x, e.y, e.d.color, 70, 22, 3);
    }
    if (due('drain')) {   // neutralise les tourelles qui font le plus mal
      const r2 = P.drain.r * P.drain.r;
      const L = G.towers.filter(t => t.d.kind !== 'support' && d2(t.cx, t.cy, e.x, e.y) <= r2).sort((a, b) => b.dealt - a.dealt || a.id - b.id).slice(0, P.drain.n);
      for (const t of L) { t.stun = Math.max(t.stun, Towers.stunFor(P.drain.t)); FX.line(e.x, e.y, t.cx, t.cy, e.d.color, 3, 26); FX.float(t.cx, t.cy - 18, 'DRAINÉE', e.d.color, 11); }
      if (L.length) { Sfx.play('zap', .9); FX.ring(e.x, e.y, e.d.color, P.drain.r, 30, 2); }
    }
    if (due('rift')) {   // faille : des élites surgissent plus loin sur le chemin
      const tot = G.map.P[e.pi].total, at = Math.min(tot - 90, e.dist + srnd(90, 220));
      const pool = Object.keys(ENEMIES).filter(k => ENEMIES[k].from <= G.waveNum && ENEMIES[k].w > 0 && !ENEMIES[k].air);
      for (let k = 0; k < P.rift.n; k++) this.add(spick(pool), e, Math.max(0, at - k * 18), .7, true);
      Path.posAt(at, _pt, e.pi);
      FX.ring(_pt.x, _pt.y, e.d.color, 60, 30, 4); FX.spark(_pt.x, _pt.y, e.d.color, 24, 4); FX.float(_pt.x, _pt.y - 30, 'FAILLE', e.d.color, 14);
    }
    if (due('blink')) {
      e.leapTo = Math.min(G.map.P[e.pi].total - 80, e.dist + P.blink.dist); e.tD = 60;
      FX.float(e.x, e.y - e.r - 14, 'DISTORSION', e.d.color, 15); Sfx.play('alarm', .6);
    }
    if (due('aura')) Enemies.aura(e, P.aura);
  },
  add(type, e, dist, hpf, elite) {
    const w = G.waves[e.wave];
    Enemies.spawn(type, { dist, hpMul: (w ? w.hpMul : 1) * hpf, wave: e.wave, child: true, pi: e.pi, elite });
  }
};

