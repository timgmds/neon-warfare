/* ============================== ÉVÉNEMENTS ALÉATOIRES ==============================
   Tirés à chaque lancement de vague (hasard de simulation : identiques en coopération), ils se déclenchent
   quelques secondes plus tard. Les effets à durée passent par G.mod (Skills.apply), les autres sont des entités. */
const Events = {
  onLaunch(n) {
    if (!G.events || G.evQ || n < 3) return;
    const ch = Math.min(.85, (.22 + n * .008) * G.mut.events);
    if (sr() >= ch) return;
    const pool = Object.keys(EVENTS).filter(k => EVENTS[k].from <= Math.max(n, G.mut.events > 1 ? 99 : 0));
    const k = pool[weightedIndex(pool.map(k => EVENTS[k].w), sr)];
    G.evQ = { k, at: G.tick + 240 + Math.floor(sr() * 900) };
  },
  start(k) {
    const E = EVENTS[k], K = EV_KIND[E.t];
    G.evCount = (G.evCount || 0) + 1;
    if (G.evCount >= 10) Ach.unlock('chaos');
    if (!G.demo) {
      UI.banner(`${E.i} ${E.n.toUpperCase()}`, K[0], E.c);
      UI.toast(E.n, E.d, E.c, 5);
    }
    Sfx.play(E.t === 'b' ? 'evgood' : 'evbad');
    if (E.dur) {
      if (G.ev) this.end();
      G.ev = { k, t: E.dur, dur: E.dur };
      if (E.spd) G.evSpd = E.spd;
      Skills.apply(); Towers.recalc();
    }
    const n = Math.max(1, G.waveNum), M = G.map;
    if (k === 'meteor') {
      const cnt = 7 + Math.min(8, Math.floor(n / 4)), al = G.enemies.filter(e => e.alive);
      for (let i = 0; i < cnt; i++) {
        let x, y;
        if (al.length && sr() < .7) { const e = al[Math.floor(sr() * al.length)]; x = e.x + srnd(-40, 40); y = e.y + srnd(-40, 40); }
        else { x = srnd(.5, M.C - .5) * TILE; y = srnd(.5, M.R - .5) * TILE; }
        G.meteors.push({ x: clamp(x, 10, M.C * TILE - 10), y: clamp(y, 10, M.R * TILE - 10), t: 70 + i * 24 + Math.floor(sr() * 16), big: sr() < .2 });
      }
    } else if (k === 'supply') {
      const free = [];
      for (let y = 0; y < M.R; y++) for (let x = 0; x < M.C; x++) if (M.cells[y * M.C + x] === 0 && !G.tgrid[y * M.C + x]) free.push([x, y]);
      const c = free.length ? free[Math.floor(sr() * free.length)] : [M.C >> 1, M.R >> 1];
      G.pods.push({ id: G.nextId++, x: (c[0] + .5) * TILE, y: (c[1] + .5) * TILE, age: 0 });
    } else if (k === 'comet') {
      const pi = Math.floor(sr() * M.P.length);
      G.comet = { pi, d: M.P[pi].total, hit: [], trail: [] };
      Render.shake(6);
    } else if (k === 'rift') {
      const pi = Math.floor(sr() * M.P.length), P = M.P[pi], dist = P.total * srnd(.35, .6), w = G.waves[G.waveNum];
      const types = Object.keys(ENEMIES).filter(t => ENEMIES[t].from <= n && t !== 'carrier');
      const cnt = 6 + Math.floor(n / 3);
      for (let i = 0; i < cnt; i++) {
        G.spawnQ.push({ at: G.tick + 60 + i * 26, type: types[Math.floor(sr() * types.length)], wave: G.waveNum, hpMul: w ? w.hpMul : Waves.hpMul(n), pi, dist, bmul: 1.5 });
        if (w) w.left++;
      }
      G.spawnQ.sort((a, b) => a.at - b.at);
      Path.posAt(dist, _pt, pi);
      G.rift = { x: _pt.x, y: _pt.y, t: 60 + cnt * 26 + 90, T: 60 + cnt * 26 + 90 };
    } else if (k === 'storm') {
      for (let i = 0; i < 9; i++) G.bolts.push({ x: srnd(.5, M.C - .5) * TILE, y: srnd(.5, M.R - .5) * TILE, t: 40 + i * 38 + Math.floor(sr() * 20) });
    }
  },
  end() {
    G.ev = null; G.evSpd = 1;
    Skills.apply(); Towers.recalc();
  },
  update() {
    if (G.evQ && G.tick >= G.evQ.at) { const k = G.evQ.k; G.evQ = null; if (G.phase === 'combat') this.start(k); }
    if (G.ev && --G.ev.t <= 0) this.end();
    const n = Math.max(1, G.waveNum), hm = Waves.hpMul(n);
    // astéroïdes : chute annoncée par une cible, puis impact
    for (let i = G.meteors.length - 1; i >= 0; i--) {
      const m = G.meteors[i];
      if (--m.t > 0) { if (m.t === 60) Sfx.play('meteor'); continue; }
      G.meteors.splice(i, 1);
      if (m.sab) { this.sabHit(m); continue; }
      this.blast(m.x, m.y, m.big ? 95 : 68, (m.big ? 340 : 190) * hm, m.big ? 240 : 150, '#ff8a3d', m.big);
      const tx = Math.floor(m.x / TILE), ty = Math.floor(m.y / TILE), M = G.map, idx = ty * M.C + tx;
      if (tx >= 0 && ty >= 0 && tx < M.C && ty < M.R && M.cells[idx] === 0 && !G.tgrid[idx] && sr() < (m.big ? .6 : .22)) { M.cells[idx] = 2; Render.dirtyMap = true; }
      G.craters.push({ x: m.x, y: m.y, r: m.big ? 46 : 32, life: 900 });
    }
    // foudre
    for (let i = G.bolts.length - 1; i >= 0; i--) {
      const b = G.bolts[i];
      if (--b.t > 0) continue;
      G.bolts.splice(i, 1);
      FX.bolt(b.x + srnd(-30, 30), b.y - 600, b.x, b.y, '#fff35c', 3, 14);
      this.blast(b.x, b.y, 60, 150 * hm, 100, '#fff35c', false);
      Sfx.play('zap');
    }
    // capsules de ravitaillement
    for (let i = G.pods.length - 1; i >= 0; i--) {
      const p = G.pods[i];
      if (++p.age === 50) { FX.ring(p.x, p.y, '#39ff88', 40, 20, 3); FX.spark(p.x, p.y, '#39ff88', 14, 3); Render.shake(4); Sfx.play('build'); }
      if (p.age > 50 + 720) { G.pods.splice(i, 1); FX.spark(p.x, p.y, '#ff2a6d', 16, 3); FX.float(p.x, p.y - 16, 'AUTODESTRUCTION', '#ff2a6d', 11); }
    }
    // comète : remonte le chemin depuis le noyau
    const C = G.comet;
    if (C) {
      C.d -= 9;
      Path.posAt(Math.max(0, C.d), _pt, C.pi);
      C.trail.unshift(_pt.x, _pt.y); if (C.trail.length > 40) C.trail.length = 40;
      const r2 = 34 * 34, dmg = 520 * hm;
      for (const e of G.enemies) if (e.alive && !C.hit.includes(e.id) && d2(e.x, e.y, _pt.x, _pt.y) < r2) { C.hit.push(e.id); Combat.hit(e, e.boss ? dmg * .5 : dmg, null); FX.spark(e.x, e.y, '#9fe8ff', 8, 3); }
      if ((G.tick & 1) === 0) FX.spark(_pt.x, _pt.y, '#9fe8ff', 2, 2, 20);
      if (C.d <= 0) { G.comet = null; FX.ring(_pt.x, _pt.y, '#9fe8ff', 60, 24, 3); }
    }
    if (G.rift && --G.rift.t <= 0) G.rift = null;
    for (let i = G.craters.length - 1; i >= 0; i--) if (--G.craters[i].life <= 0) G.craters.splice(i, 1);
  },
  // météore de sabotage (versus) : ne touche que les tourelles
  sabHit(m) {
    const M = G.map, r = m.big ? 95 : 68, r2 = (r * .75) * (r * .75), stun = m.sab === 2 ? 480 : m.big ? 360 : 240, col = m.sab === 2 ? '#ff2a6d' : '#ff8a3d';
    let changed = false;
    for (const t of G.towers.slice()) {
      const dd = d2(t.cx, t.cy, m.x, m.y);
      if (m.sab === 2 && t.id === m.tid && dd < 30 * 30) {   // pulvérisée
        FX.spark(t.cx, t.cy, t.d.color, 40, 6, 50, 3); FX.float(t.cx, t.cy - 22, 'PULVÉRISÉE', col, 16);
        if (UI.sel === t) UI.deselect();
        Towers.remove(t); changed = true;
        M.cells[t.ty * M.C + t.tx] = 2; Render.dirtyMap = true;
      } else if (dd <= r2) {
        if (t.d.support && !(t.stun > 0)) changed = true;
        t.stun = Math.max(t.stun, Towers.stunFor(stun)); if (t.d.heat) t.heat = 99;
        if (m.sab === 1 && m.big && t.level > 1) {
          t.invested = Math.round(t.invested * (t.level - 1) / t.level); t.level--; changed = true;
          FX.float(t.cx, t.cy - 22, 'NIV -1', col, 14);
        } else FX.float(t.cx, t.cy - 18, 'SONNÉE', '#fff35c', 10);
      }
    }
    if (changed) { Towers.recalc(); if (UI.sel) UI.renderPanel(); }
    const tx = Math.floor(m.x / TILE), ty = Math.floor(m.y / TILE), idx = ty * M.C + tx;
    if (m.sab === 1 && tx >= 0 && ty >= 0 && tx < M.C && ty < M.R && M.cells[idx] === 0 && !G.tgrid[idx] && Math.random() < .5) { M.cells[idx] = 2; Render.dirtyMap = true; }
    G.craters.push({ x: m.x, y: m.y, r: m.big ? 52 : 34, life: 1200 });
    FX.ring(m.x, m.y, col, r * 1.2, 26, 4); FX.ring(m.x, m.y, '#ffffff', r * .6, 16, 2); FX.spark(m.x, m.y, col, m.big ? 40 : 22, m.big ? 6 : 4, 40, 3);
    if (Render.hq) for (let i = 0; i < 6; i++) FX.smoke(m.x + rnd(-16, 16), m.y + rnd(-16, 16), 70, rnd(6, 10));
    Render.shake(m.sab === 2 ? 26 : m.big ? 14 : 8); Render.flash(m.sab === 2 ? .55 : m.big ? .25 : .1, col);
    Sfx.play('boom', m.big ? 1 : .7);
  },
  // impact de zone : blesse les ennemis, sonne et fait chauffer les tourelles proches
  blast(x, y, r, dmg, stun, col, big) {
    const r2 = r * r;
    for (const e of G.enemies) if (e.alive && d2(e.x, e.y, x, y) <= r2) Combat.hit(e, dmg, null);
    const tr2 = (r * .75) * (r * .75), lock = !G.cus || G.cus.jam === 1;
    let rc = false;
    for (const t of G.towers) if (d2(t.cx, t.cy, x, y) <= tr2) {
      if (t.d.support && !(t.stun > 0)) rc = true;
      t.stun = Math.max(t.stun, Towers.stunFor(stun)); if (t.d.heat) t.heat = Math.min(99, t.heat + 35);
      if (lock) t.jamP = 1;   // l'IEM reste jusqu'au débrouillage payant
      FX.float(t.cx, t.cy - 18, lock ? 'HORS LIGNE' : 'SONNÉE', '#fff35c', 10);
    }
    if (rc) Towers.recalc();
    FX.ring(x, y, col, r * 1.2, 26, 4); FX.ring(x, y, '#ffffff', r * .6, 16, 2); FX.spark(x, y, col, big ? 34 : 20, big ? 5.5 : 4, 40, 3);
    if (Render.hq) for (let i = 0; i < 5; i++) FX.smoke(x + rnd(-14, 14), y + rnd(-14, 14), 60, rnd(5, 9));
    Render.shake(big ? 14 : 7); if (big) Render.flash(.25, col);
    Sfx.play('boom', big ? 1 : .7);
  },
  // côté interface : toucher une capsule envoie l'action « ouvrir »
  tapPod(x, y) {
    for (const p of G.pods) if (p.age >= 50 && d2(x, y, p.x, p.y) < 30 * 30) { Act.do('pod', p.id); return true; }
    return false;
  },
  open(id) {
    const i = G.pods.findIndex(p => p.id === id); if (i < 0) return;
    const p = G.pods[i]; G.pods.splice(i, 1);
    const r = sr(), n = Math.max(1, G.waveNum);
    let txt, col = '#39ff88';
    if (r < .5) { const v = Math.round(120 + 30 * n); gain(v); txt = '+' + v + '¢'; col = '#ffd23f'; }
    else if (r < .78) { const v = 3 + Math.floor(n / 8); G.nanites += v; txt = `+${v} ◈`; col = '#00ffaa'; }
    else if (r < .92) { for (const k of Abil.keys) G.abil[k] = 0; txt = 'CAPACITÉS RECHARGÉES'; col = '#00f3ff'; UI.refreshAbils(true); }
    else { const v = Math.min(10, G.maxLives - G.lives); G.lives += v; G.maxLives += 10 - v; G.lives += 10 - v; txt = '+10 ♥'; col = '#ff2a6d'; }
    FX.float(p.x, p.y - 20, txt, col, 16); FX.ring(p.x, p.y, col, 50, 22, 3); FX.spark(p.x, p.y, col, 22, 4);
    Sfx.play('mission');
    Missions.on('pod');
  },
  label() {
    if (G.ev) { const E = EVENTS[G.ev.k]; return { E, p: G.ev.t / G.ev.dur }; }
    if (G.meteors.length) return { E: EVENTS.meteor, p: -1 };
    if (G.bolts.length) return { E: EVENTS.storm, p: -1 };
    if (G.comet) return { E: EVENTS.comet, p: -1 };
    if (G.rift) return { E: EVENTS.rift, p: G.rift.t / G.rift.T };
    if (G.pods.length) return { E: EVENTS.supply, p: Math.max(0, 1 - (G.pods[0].age - 50) / 720) };
    return null;
  }
};

