/* Outil de développement — n'est PAS nécessaire pour jouer.
   Bot d'équilibrage : simule un joueur « correct » à vitesse maximale pour mesurer la courbe de difficulté,
   en particulier le méga-boss Léviathan (vague 50). Il connaît les nanites, le plasma, l'abyssite, les plans T2/T3/T4,
   la pose payante des T3/T4, l'arbre de compétences, la raffinerie, les niveaux et la Recherche Oméga.
   Usage (console du navigateur, jeu servi en http) :
     const s = document.createElement('script'); s.src = 'dev/bot.js'; document.head.appendChild(s);
     Bot.start(['standard', 'hardcore'], 4, 60)   // 4 parties par difficulté, jusqu'à la vague 60 (en tâche de fond)
     Bot.report()                                  // résultats (à relancer jusqu'à « terminé »)
   Bot.run('standard', 60) joue une partie d'un coup (bloque l'onglet le temps de la partie). */
window.Bot = {
  cov(G, tx, ty, r) {
    const M = G.map, cx = (tx + .5) * TILE, cy = (ty + .5) * TILE; let n = 0;
    M.P.forEach((P, pi) => { for (let d = 0; d < P.mergeDist; d += 20) { Path.posAt(d, _pt, pi); if (d2(_pt.x, _pt.y, cx, cy) <= r * r) n++; } });
    return n;
  },
  init(G) {
    const M = G.map; this.cand = [];
    for (let y = 0; y < M.R; y++) for (let x = 0; x < M.C; x++)
      if (M.cells[y * M.C + x] === 0) this.cand.push({ x, y, c120: this.cov(G, x, y, 120), c200: this.cov(G, x, y, 200), c300: this.cov(G, x, y, 300) });
    this.order = ['blaster', 'blaster', 'cryo', 'blaster', 'sniper', 'titan', 'vulcan', 'sniper', 'aero', 'cryo'];
    this.oi = 0;
  },
  bestTile(G, key) {
    const r = TOWERS[key].range, f = r >= 250 ? 'c300' : r >= 160 ? 'c200' : 'c120';
    let best = null;
    for (const c of this.cand) { if (!Towers.canPlace(c.x, c.y)) continue; if (!best || c[f] > best[f]) best = c; }
    return best;
  },
  // dépenses entre deux vagues
  play(G, skill = 1) {
    const P = G.preview;
    // plans : T2 en nanites, T3 en plasma, T4 en abyssite
    const want = ['plasma', 'laser', 'tesla', 'blizzard', 'stasis', 'railgun', 'magma', 'swarm', 'nova', 'storm', 'singularity', 'apocalypse'];
    for (const k of want) { const r = RECIPES.find(x => x.r === k); if (Fusion.canResearch(r) && Res.get(Fusion.cur(r)) >= Fusion.cost(r)) Fusion.research(r); }
    // compétences : on garde de quoi acheter les plans T3/T4
    const sk = ['a1', 'c1', 'e1', 'a1', 'a2', 'a3', 'c1', 'a1', 'c2', 'a2', 'a5', 'a4', 'e2', 'e3', 'c3', 'c4', 'a6', 'e5', 'e4', 'e6', 'c5', 'c6',
      'a7', 'a8', 'e7', 'c7', 'a7', 'a9', 'e9', 'c8', 'e8', 'c9', 'a10', 'e10', 'c10', 'a10'];
    const keep = { n: 4, p: G.unlocked.has('nova') ? 2 : 6, a: G.unlocked.has('apocalypse') ? 2 : 4 };
    for (const id of sk) { const c = Skills.cur(id); if (Skills.canBuy(id) && Res.get(c) >= Skills.cost(id) + keep[c]) Skills.buy(id); }
    if (G.nanites > 45) Skills.refine();
    if (Towers.omega()) while (G.res.p >= Skills.arsCost() + 3) Skills.buyArs();
    const jam = Towers.jammed(); if (jam.length && G.money >= Towers.unjamCostAll() * 2) Towers.unjam(jam);
    const has = k => G.towers.some(t => t.key === k);
    for (const t of G.towers) if (Towers.needsSpec(t)) Towers.setSpec(t, Math.random() < .5 ? 0 : 1);
    let guard = 0;
    while (guard++ < 100) {
      let key = null;
      if ((P.counts.spectre || 0) > 0 && !has('radar') && !has('stasis')) key = 'radar';
      else if ((P.counts.flyer || 0) > 2 && G.towers.filter(t => t.key === 'aero').length < 2) key = 'aero';
      const fus = [...G.unlocked].filter(k => TOWERS[k].kind !== 'support' && Towers.canPay(k)).sort((a, b) => TOWERS[b].tier - TOWERS[a].tier);
      const wantTowers = 4 + G.waveNum * .8 * skill;
      if (!key && G.towers.length < wantTowers)
        key = fus.length && Math.random() < .6 ? fus[Math.floor(Math.random() * Math.min(3, fus.length))] : this.order[this.oi % this.order.length];
      if (key && G.money >= Towers.costOf(key) && Towers.canPay(key)) {
        const tl = this.bestTile(G, key);
        if (tl) { Towers.build(key, tl.x, tl.y); if (this.order[this.oi % this.order.length] === key) this.oi++; continue; }
      }
      if (key && G.towers.length < wantTowers * .75 && G.money < Towers.costOf(key)) break;
      let bt = null, bc = Infinity;
      for (const t of G.towers) {
        if (t.d.kind === 'support' || t.d.kind === 'radar' || t.level >= Towers.maxLevel(t)) continue;
        if (t.level >= 10 && G.res.a < OMEGA.abyss) continue;
        const c = Towers.upCost(t) / (1 + t.d.tier * .5);
        if (c < bc) { bc = c; bt = t; }
      }
      if (bt && Towers.needsSpec(bt)) { Towers.setSpec(bt, Math.random() < .5 ? 0 : 1); continue; }
      if (bt && G.money >= Towers.upCost(bt)) { Towers.upgrade(bt); continue; }
      break;
    }
  },
  // une vague complète (avec capacités) ; renvoie le suivi du méga-boss s'il y en a un
  wave(G) {
    this.play(G, this.skill); Waves.launch();
    let g = 0; const l0 = G.lives, mega = {};
    while (G.phase === 'combat' && !G.over && g < 120000) {
      Game.update(); g++;
      if (g % 400 === 0 && G.abil.orbital <= 0 && G.enemies.length > 8) { const e = G.enemies.reduce((a, b) => a.dist > b.dist ? a : b); Abil.use('orbital', e.x, e.y); }
      if (G.boss && G.abil.emp <= 0 && Abil.unlocked('emp')) Abil.use('emp');
      if (G.boss && G.abil.overdrive <= 0 && Abil.unlocked('overdrive')) Abil.use('overdrive');
      const m = G.enemies.find(e => e.d.mega);
      if (m) { if (!mega.t0) { mega.t0 = G.tick; mega.type = m.type; mega.hp = m.maxHp + m.maxShield; } mega.ph = Math.max(mega.ph || 0, m.mph + 1); mega.left = m.alive ? m.hp / m.maxHp : 0; mega.alive = m; }
      else if (mega.t0 && !mega.t1) { mega.t1 = G.tick; mega.killed = !G.over; }
    }
    while (G.cardQ > 0 && G.offer) Cards.pick(0);
    return { lost: l0 - G.lives, mega: mega.t0 ? { type: mega.type, s: (((mega.t1 || G.tick) - mega.t0) / 60).toFixed(0), killed: !!mega.killed && !G.over, phase: mega.ph, hpLeft: G.over ? Math.round((mega.left || 0) * 100) + '%' : '0%' } : null };
  },
  newGame(diff, seed) { UI.closeAll(); Game.newGame(diff, { seed }); UI.closeAll(); const G = window.NW.G; this.init(G); return G; },
  summary(G, diff, seed, t0, log, megas) {
    return { diff, seed, wave: G.waveNum, over: G.over, ms: (performance.now() - t0) | 0, towers: G.towers.length, t3: G.towers.filter(t => t.d.tier >= 3).length,
      t4: G.towers.filter(t => t.d.tier >= 4).length, omega: G.towers.filter(t => t.level > 10).length, sk: Skills.total(), p: G.res.p, a: G.res.a, leaks: log.join(' '), megas };
  },
  run(diff = 'standard', maxWave = 60, skill = 1, seed) {
    this.skill = skill; const G = this.newGame(diff, seed), t0 = performance.now(), log = [], megas = [];
    while (!G.over && G.waveNum < maxWave) { const r = this.wave(G); if (r.lost) log.push(`w${G.waveNum}:-${r.lost}`); if (r.mega) megas.push(r.mega); UI.closeAll(); }
    return this.summary(G, diff, seed, t0, log, megas);
  },
  // séries en tâche de fond : une vague à la fois, l'onglet reste réactif
  start(diffs = ['standard'], n = 3, maxWave = 60, skill = 1) {
    this.queue = []; this.results = []; this.skill = skill; this.maxWave = maxWave;
    diffs.forEach(d => { for (let i = 0; i < n; i++) this.queue.push({ d, seed: 1000 + i * 7919 }); });
    this.cur = null; this.done = false; clearTimeout(this.timer); this.step();
    return `${this.queue.length} parties en file`;
  },
  step() {
    if (!this.cur) {
      const q = this.queue.shift();
      if (!q) { this.done = true; return; }
      this.cur = { q, G: this.newGame(q.d, q.seed), t0: performance.now(), log: [], megas: [] };
    }
    const C = this.cur, G = C.G;
    if (!G.over && G.waveNum < this.maxWave) { const r = this.wave(G); if (r.lost) C.log.push(`w${G.waveNum}:-${r.lost}`); if (r.mega) C.megas.push(r.mega); }
    if (G.over || G.waveNum >= this.maxWave) { this.results.push(this.summary(G, C.q.d, C.q.seed, C.t0, C.log, C.megas)); this.cur = null; }
    this.timer = setTimeout(() => this.step(), 0);
  },
  report() {
    const R = this.results || [], by = {};
    for (const r of R) (by[r.diff] || (by[r.diff] = [])).push(r);
    const out = Object.entries(by).map(([d, L]) => {
      const lev = L.map(r => r.megas.find(m => m.type === 'leviathan')).filter(Boolean);
      return { diff: d, parties: L.length, vagues: L.map(r => r.wave).join(','), moyenne: +(L.reduce((a, r) => a + r.wave, 0) / L.length).toFixed(1),
        leviathan: lev.map(m => `${m.killed ? 'tué' : 'perdu'} ${m.s}s ph${m.phase}${m.killed ? '' : ' reste ' + m.hpLeft}`).join(' | ') || '—',
        t3: L.map(r => r.t3).join(','), t4: L.map(r => r.t4).join(','), omega: L.map(r => r.omega).join(',') };
    });
    return { termine: !!this.done, enCours: this.cur ? `${this.cur.q.d} vague ${this.cur.G.waveNum}` : null, reste: (this.queue || []).length, resultats: out };
  }
};
