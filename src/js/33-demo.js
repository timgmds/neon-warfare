/* ============================== DÉMO : UNE IA JOUE DERRIÈRE LE MENU ==============================
   Vraie partie simulée en direct. Pendant ses ticks (Demo.busy), sons, notifications,
   succès et sauvegardes sont neutralisés. */
const Demo = {
  busy: false, pending: false, time: 0, nextUnlock: 10, cand: [],
  start() {
    G = null;
    if (!Store.s.demo) { Render.dirtyMap = true; Render.resize(); return; }
    const seed = (Math.random() * 2147483647) | 0;
    Game.makeState('standard', MapGen.generate(seed, View.w < View.h * .9), seed);
    G.demo = true; G.money = 1900; G.maxLives = G.lives = 60; G.waveNum = 5;
    const t2 = RECIPES.filter(r => TOWERS[r.r].tier === 2 && TOWERS[r.r].kind !== 'support').map(r => r.r);
    for (let i = 0; i < 3; i++) G.unlocked.add(t2.splice(Math.floor(Math.random() * t2.length), 1)[0]);
    G.skills = { a1: 2, a2: 1, e1: 2, c1: 1, c3: 1, a6: 1, e6: 1 };
    Skills.apply();
    G.preview = Waves.plan(G.waveNum + 1);
    FX.clear(); Shots.pool.clear();
    Game.acc = 0; this.pending = false; this.time = 0; this.nextUnlock = 10;
    this.scan();
    Render.dirtyMap = true; Render.resize();
  },
  stop() { if (G && G.demo) { G = null; FX.clear(); Shots.pool.clear(); Render.dirtyMap = true; } },
  scan() {
    const M = G.map, pts = [];
    M.P.forEach((P, pi) => { for (let d = 0; d < P.mergeDist; d += 24) { Path.posAt(d, _pt, pi); pts.push(_pt.x, _pt.y); } });
    this.cand = [];
    for (let y = 0; y < M.R; y++) for (let x = 0; x < M.C; x++) {
      if (M.cells[y * M.C + x] !== 0) continue;
      const cx = (x + .5) * TILE, cy = (y + .5) * TILE, c = [0, 0, 0];
      for (let i = 0; i < pts.length; i += 2) {
        const dd = d2(pts[i], pts[i + 1], cx, cy);
        if (dd <= 120 * 120) c[0]++; if (dd <= 180 * 180) c[1]++; if (dd <= 300 * 300) c[2]++;
      }
      this.cand.push({ x, y, c });
    }
  },
  tile(key) {
    const r = TOWERS[key].range, k = r >= 250 ? 2 : r >= 150 ? 1 : 0;
    const ok = this.cand.filter(c => Towers.canPlace(c.x, c.y)).sort((a, b) => b.c[k] - a.c[k]);
    return ok.length ? ok[Math.floor(Math.random() * Math.min(3, ok.length))] : null;
  },
  think() {
    const P = G.preview, has = k => G.towers.some(t => t.key === k);
    if (G.waveNum >= this.nextUnlock) {
      this.nextUnlock += 6;
      const c = RECIPES.filter(r => Fusion.canResearch(r) && TOWERS[r.r].tier <= 3 && TOWERS[r.r].kind !== 'support');
      if (c.length) G.unlocked.add(pick(c).r);
    }
    // l'IA aime montrer la fusion sur le terrain : elle prépare des paires puis les fusionne
    if (Math.random() < .5) {
      for (const r of RECIPES) {
        if (!G.unlocked.has(r.r) || TOWERS[r.a].tier > 1 || TOWERS[r.b].tier > 1) continue;
        const a = G.towers.find(t => t.key === r.a); if (!a || G.money < Towers.costOf(r.b) + 200) continue;
        const nb = NB4.find(([dx, dy]) => Towers.canPlace(a.tx + dx, a.ty + dy));
        if (nb) { Towers.build(r.b, a.tx + nb[0], a.ty + nb[1]); break; }
      }
    }
    for (const p of G.fusePairs) {
      if (!p.owned || p.a.dead || p.b.dead || Math.random() > .5) continue;
      const r = Fusion.recipeFor(p.a.key, p.b.key);
      if (G.money >= Fusion.fieldCost(p.a, p.b, r)) { Fusion.fieldFuse(p.a, p.b, r); break; }
    }
    for (const t of G.towers) if (Towers.needsSpec(t)) Towers.setSpec(t, Math.random() < .5 ? 0 : 1);
    if (G.money > 400 && Math.random() < .4) {
      const P = pick(G.map.P), tl = P.tiles[Math.floor(P.tiles.length * rnd(.25, .8))], type = Math.random() < .7 ? 'mine' : 'barricade';
      if (Traps.count(type) < 2) Traps.build(type, tl[0], tl[1]);
    }
    const base = ['blaster', 'sniper', 'vulcan', 'cryo', 'titan', 'aero', 'inferno', 'blaster'];
    for (let guard = 0; guard < 40; guard++) {
      const want = 6 + G.waveNum * .85;
      let key = null;
      if ((P.counts.spectre || 0) && !has('radar') && !has('stasis')) key = 'radar';
      else if ((P.counts.flyer || 0) > 2 && !has('aero') && !has('swarm')) key = 'aero';
      else if (G.towers.length < want) {
        const fus = [...G.unlocked].filter(k => TOWERS[k].kind !== 'support');
        key = fus.length && Math.random() < .55 ? pick(fus) : pick(base);
      }
      if (key) {
        if (G.money >= Towers.costOf(key)) {
          const tl = this.tile(key);
          if (tl) { const t = Towers.build(key, tl.x, tl.y); if (t && t.d.heat && Math.random() < .2) t.oc = true; continue; }
        } else if (G.towers.length < want * .6) break;
      }
      if (G.money > 500 && Math.random() < .12) {
        const strong = G.towers.filter(t => t.d.tier >= 2 && t.d.kind !== 'support');
        if (strong.length) {
          const s = pick(strong), [dx, dy] = pick(NB4);
          if (Towers.canPlace(s.tx + dx, s.ty + dy)) { Towers.build(Math.random() < .5 ? 'computer' : 'fan', s.tx + dx, s.ty + dy); continue; }
        }
      }
      let up = null;
      for (const t of G.towers) if (t.d.kind !== 'support' && t.level < 10 && (!up || Towers.upCost(t) < Towers.upCost(up))) up = t;
      if (up && Towers.needsSpec(up)) { Towers.setSpec(up, Math.random() < .5 ? 0 : 1); continue; }
      if (up && G.money >= Towers.upCost(up)) { Towers.upgrade(up); continue; }
      break;
    }
  },
  abilities() {
    if (G.abil.orbital <= 0 && G.enemies.length > 6) {
      let best = null, bn = 0;
      for (const e of G.enemies) {
        if (!e.alive) continue;
        let n = 0; for (const o of G.enemies) if (o.alive && d2(o.x, o.y, e.x, e.y) < 10000) n++;
        if (n > bn) { bn = n; best = e; }
      }
      if (best && bn >= 5) Abil.use('orbital', best.x, best.y);
    }
    if (G.boss && G.abil.emp <= 0) Abil.use('emp');
    if (G.enemies.length > 18 && G.abil.overdrive <= 0) Abil.use('overdrive');
  },
  tick() {
    this.time++;
    if (G.phase === 'prep') { this.think(); Waves.launch(); }
    else if (G.tick % 150 === 0) this.think();
    if (G.tick % 60 === 0) this.abilities();
    Game.update();
  },
  frame(dt) {
    Game.acc += dt * 1.4;
    let steps = 0;
    this.busy = true;
    try {
      while (Game.acc >= TICK_MS && steps < 8 && !this.pending) { this.tick(); Game.acc -= TICK_MS; steps++; }
    } finally { this.busy = false; }
    if (steps >= 8) Game.acc = 0;
    Render.alpha = clamp(Game.acc / TICK_MS, 0, 1);
    if (this.pending || this.time > 60 * 60 * 6 || (G.waveNum >= 28 && G.phase === 'prep')) this.start();
  }
};

