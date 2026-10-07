/* Outil de développement — n'est PAS nécessaire pour jouer.
   Bot d'équilibrage : simule un joueur « correct » à vitesse maximale pour mesurer
   la courbe de difficulté. Usage (console du navigateur, jeu servi en http) :
     const s = document.createElement('script'); s.src = 'dev/bot.js'; document.head.appendChild(s);
     Bot.batch(['standard', 'hardcore'], 5)   // 5 parties par difficulté
*/
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
  play(G, skill = 1) {
    const P = G.preview;
    const want = ['plasma', 'laser', 'tesla', 'blizzard', 'stasis', 'nova', 'railgun', 'storm', 'singularity', 'apocalypse', 'magma', 'swarm'];
    for (const k of want) { const r = RECIPES.find(x => x.r === k); if (Fusion.canResearch(r) && G.nanites >= Fusion.cost(r)) Fusion.research(r); }
    const sk = ['a1', 'c1', 'e1', 'a1', 'a2', 'a3', 'c1', 'a1', 'c2', 'a2', 'a5', 'a4', 'e2', 'e3', 'c3', 'c4', 'a6', 'e5', 'e4', 'e6', 'c5', 'c6'];
    for (const id of sk) if (Skills.canBuy(id) && G.nanites >= Skills.cost(id) + 4) Skills.buy(id);
    const has = k => G.towers.some(t => t.key === k);
    let guard = 0;
    while (guard++ < 80) {
      let key = null;
      if ((P.counts.spectre || 0) > 0 && !has('radar') && !has('stasis')) key = 'radar';
      else if ((P.counts.flyer || 0) > 2 && G.towers.filter(t => t.key === 'aero').length < 2) key = 'aero';
      const fus = [...G.unlocked].filter(k => TOWERS[k].kind !== 'support').sort((a, b) => TOWERS[b].tier - TOWERS[a].tier);
      const wantTowers = 4 + G.waveNum * .8 * skill;
      if (!key && G.towers.length < wantTowers)
        key = fus.length && Math.random() < .6 ? fus[Math.floor(Math.random() * Math.min(3, fus.length))] : this.order[this.oi % this.order.length];
      if (key && G.money >= Towers.costOf(key)) {
        const tl = this.bestTile(G, key);
        if (tl) { Towers.build(key, tl.x, tl.y); if (this.order[this.oi % this.order.length] === key) this.oi++; continue; }
      }
      if (key && G.towers.length < wantTowers * .75 && G.money < Towers.costOf(key)) break;
      let bt = null, bc = Infinity;
      for (const t of G.towers) {
        if (t.d.kind === 'support' || t.d.kind === 'radar' || t.level >= 10) continue;
        const c = Towers.upCost(t) / (1 + t.d.tier * .5);
        if (c < bc) { bc = c; bt = t; }
      }
      if (bt && G.money >= Towers.upCost(bt)) { Towers.upgrade(bt); continue; }
      break;
    }
  },
  run(diff = 'standard', maxWave = 60, skill = 1) {
    UI.closeAll(); Game.newGame(diff);
    const G = window.NW.G; this.init(G);
    const t0 = performance.now(), log = [];
    while (!G.over && G.waveNum < maxWave) {
      this.play(G, skill); Waves.launch();
      let g = 0, l0 = G.lives;
      while (G.phase === 'combat' && !G.over && g < 80000) {
        Game.update(); g++;
        if (g % 400 === 0 && G.abil.orbital <= 0 && G.enemies.length > 8) { const e = G.enemies.reduce((a, b) => a.dist > b.dist ? a : b); Abil.use('orbital', e.x, e.y); }
        if (G.boss && G.abil.emp <= 0 && Abil.unlocked('emp')) Abil.use('emp');
        if (G.boss && G.abil.overdrive <= 0 && Abil.unlocked('overdrive')) Abil.use('overdrive');
      }
      if (G.lives < l0) log.push(`w${G.waveNum}:-${l0 - G.lives}`);
      // protocoles : le bot prend la première carte proposée (choix neutre, ni optimal ni pire)
      while (G.cardQ > 0 && G.offer) Cards.pick(0);
      UI.closeAll();
    }
    return { diff, wave: G.waveNum, ms: (performance.now() - t0) | 0, towers: G.towers.length, fus: G.unlocked.size, sk: Skills.total(), leaks: log.join(' ') };
  },
  batch(diffs = ['standard'], n = 3, maxWave = 70, skill = 1) {
    const out = [];
    for (const d of diffs) {
      const waves = [];
      for (let i = 0; i < n; i++) { const r = this.run(d, maxWave, skill); waves.push(r.wave); out.push(`${d} w${r.wave} T${r.towers} F${r.fus} S${r.sk} | ${r.leaks}`); }
      out.push(`== ${d} moyenne vague ${(waves.reduce((a, b) => a + b, 0) / n).toFixed(1)} [${waves.join(',')}]`);
    }
    return out;
  }
};
