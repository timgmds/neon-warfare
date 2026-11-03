/* Outil de développement — n'est PAS nécessaire pour jouer.
   Test de déterminisme : la coopération (lockstep), les replays et la vérification des scores en ligne reposent tous
   sur le fait qu'une même graine et les mêmes actions donnent exactement la même partie.
   Le test joue quelques parties avec un joueur scripté (pose, amélioration, compétences, protocoles, vagues), puis les
   rejoue depuis leur enregistrement et compare l'empreinte de l'état (celle que la coopération compare en réseau).
   Usage (console du navigateur, jeu servi en http, depuis le menu) :
     const s = document.createElement('script'); s.src = 'dev/test-determinisme.js'; document.head.appendChild(s);
     await Determinisme.run()        // quelques secondes ; renvoie un tableau OK / ÉCART par scénario */
window.Determinisme = {
  // un joueur simple mais varié, entièrement déterministe : il ne lit que l'état de la partie
  play() {
    const M = G.map, keys = UI.hotkeys.filter(k => TOWERS[k]);
    if (G.offer) Act.do('card', G.tick % 3);
    for (let n = 0; n < 3; n++) {
      let done = false;
      for (let y = 1; y < M.R - 1 && !done; y++) for (let x = 1; x < M.C - 1 && !done; x++) {
        if (M.cells[y * M.C + x] !== 0 || Towers.at(x, y)) continue;
        if (![[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => M.cells[(y + dy) * M.C + x + dx] === 1)) continue;
        const k = keys[(x + y + G.waveNum) % keys.length];
        if (G.money >= Towers.costOf(k)) done = !!Act.do('build', k, x, y);
        else done = true;
      }
    }
    for (const t of G.towers.slice(0, 4)) if (G.money > Towers.upCost(t) * 2) Act.do('up', t.tx, t.ty);
    for (const id in SKILLS) if (Skills.reqOk && Skills.reqOk(id) && Res.get(Skills.cur(id)) >= Skills.cost(id)) { Act.do('skill', id); break; }
    if (G.towers[0]) Act.do('strat', G.towers[0].tx, G.towers[0].ty, G.waveNum % 4);
  },
  live(opts, waves) {
    Game.newGame(opts.diff || 'standard', opts);
    UI.closeAll();
    while (!G.over && G.waveNum < waves) {
      this.play();
      Act.do('wave');
      let n = 0;
      while (!G.over && G.phase !== 'prep' && n++ < 60000) {
        if (G.offer) Act.do('card', 0);
        // de temps en temps, un ennemi désigné pour les tourelles en ciblage FOCUS
        if (n % 300 === 150) { const e = G.enemies.find(x => x.alive); if (e) Act.do('focus', e.id); if (G.towers[1]) Act.do('strat', G.towers[1].tx, G.towers[1].ty, 4); }
        Game.update();
      }
    }
    const out = { rec: JSON.parse(JSON.stringify(G.rec)), tick: G.tick, hash: Lock.hash(), wave: G.waveNum, kills: G.stats.kills, towers: G.towers.length };
    Game.quit(false);
    return out;
  },
  replay(rec, tick) {
    const o = rec.o, rp = { a: rec.a, i: 0, end: null, v: rec.v, mul: 1, paused: false, rec, headless: true };
    Demo.busy = true;
    try {
      Game.newGame(o.diff, { seed: o.seed, portrait: o.portrait, gm: o.gm, cus: o.cus, map: o.map, perks: o.perks, doctrine: o.doctrine,
        events: o.events, autoWave: o.autoWave, daily: !!o.daily, dailyDate: o.daily || undefined, replay: rp });
      while (G.tick < tick && !G.over) { Replay.feed(); if (G.over) break; Game.update(); }
    } finally { Demo.busy = false; }
    const out = { hash: Lock.hash(), wave: G.waveNum, kills: G.stats.kills, towers: G.towers.length };
    G = null; Game.state = 'menu'; FX.clear(); Shots.pool.clear();
    return out;
  },
  async run(waves = 8) {
    const g = MapGen.generate(31337, false);
    const cmap = Editor.toData(Editor.fromMap({ C: g.C, R: g.R, c: Array.from(g.cells, v => v === 2 ? '2' : '0').join(''), p: g.paths.map(P => P.flat()) }), 'Test');
    const S = [
      ['Standard, graine 1', { diff: 'standard', seed: 1 }],
      ['Hardcore, graine 777', { diff: 'hardcore', seed: 777 }],
      ['Défi du jour', { diff: 'standard', daily: true }],
      ['Chaos (événements)', { diff: 'standard', seed: 4242, gm: 'chaos' }],
      ['Carte perso', { diff: 'standard', seed: 9, map: cmap }]
    ];
    const res = [];
    const keepDemo = Store.s.demo; Store.s.demo = false; Demo.stop();
    for (const [name, o] of S) {
      await new Promise(r => setTimeout(r, 0));
      try {
        const a = this.live(Object.assign({}, o), waves), b = this.replay(a.rec, a.tick), c = this.replay(a.rec, a.tick);
        const ok = a.hash === b.hash && b.hash === c.hash && a.kills === b.kills && a.towers === b.towers;
        res.push({ scénario: name, résultat: ok ? 'OK' : 'ÉCART', vague: a.wave, éliminations: a.kills, tourelles: a.towers, actions: a.rec.a.length, empreintes: [a.hash, b.hash, c.hash].join(' / ') });
      } catch (e) { res.push({ scénario: name, résultat: 'ERREUR', détail: String(e && e.message || e) }); G = null; Game.state = 'menu'; }
    }
    Store.s.demo = keepDemo; UI.showMenu();
    console.table(res);
    return res;
  }
};
