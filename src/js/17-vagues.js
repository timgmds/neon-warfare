/* ============================== VAGUES ============================== */
const Waves = {
  // croissance polynomiale douce, puis exponentielle au-delà de la vague 40 (l'infini doit finir par céder)
  hpBase(k) { return (1 + .25 * k + .022 * k * k) * Math.pow(1.05, k) * Math.pow(1.075, Math.max(0, k - 22)) * Math.pow(1.03, Math.max(0, k - 45)); },
  hpMul(n) {
    const k = n - 1, fork = G.map.P && G.map.P.length > 1 ? .9 : 1;   // deux chemins à couvrir : ennemis un peu moins robustes
    // au-delà de la vague 50, croissance fixe de 13 % par vague : la vague 100 reste atteignable
    const base = k <= 49 ? this.hpBase(k) : this.hpBase(49) * Math.pow(1.13, k - 49);
    return base * G.diff.hp * fork * (G.net === 'coop' ? COOP.hp * (G.np || 2) / 2 : G.net === 'versus' ? VERSUS.hp * Math.pow(VERSUS.esc, Math.max(0, n - VERSUS.escFrom)) : 1);
  },
  bossEv() { return G.cus ? G.cus.boss : 5; },
  // hasard reproductible : une carte donnée produit toujours les mêmes vagues (aperçu fiable, Défi du jour équitable)
  rng(n, salt = 0) { return mulberry32((G.seed ^ Math.imul(n + 1, 2654435761) ^ salt) >>> 0); },
  plan(n) {
    const R = this.rng(n), mega = n % 50 === 0, boss = mega || n % this.bossEv() === 0 || (G.gm === 'rush' && n >= 3);
    let th = WTHEMES[0];
    if (mega) th = { id: 'mega', name: 'Alerte rouge', countMul: .45 };
    else if (boss) th = { id: 'boss', name: 'Alerte Boss', countMul: .65 };
    else if (n > 3) { const pool = WTHEMES.filter(t => (t.from || 1) <= n); th = pool[weightedIndex(pool.map(t => t.w), R)]; }
    const budget = (8 + n * 3.8 + n * n * .09) * (th.countMul || 1) * G.mut.count;
    const avail = Object.keys(ENEMIES).filter(k => ENEMIES[k].from <= n);
    const wts = avail.map(k => (k === 'drone' ? 2.2 : 1) * ((th.mod && th.mod[k]) || 1) * (ENEMIES[k].from === n ? .6 : 1));
    const list = []; let spent = 0;
    while (spent < budget && list.length < 400) { const k = avail[weightedIndex(wts, R)]; list.push(k); spent += ENEMIES[k].w; }
    // regroupe les ennemis en paquets du même type : vagues plus lisibles
    const counts = {}; for (const k of list) counts[k] = (counts[k] || 0) + 1;
    const left = Object.assign({}, counts), order = [];
    let keys = Object.keys(left);
    while (keys.length) {
      const k = keys[Math.floor(R() * keys.length)], take = Math.min(left[k], 3 + Math.floor(R() * 5));
      for (let i = 0; i < take; i++) order.push(k);
      left[k] -= take; if (!left[k]) delete left[k];
      keys = Object.keys(left);
    }
    return { n, name: th.name, theme: th.id, list: order, counts, bosses: boss ? this.bossesFor(n) : [], hpMul: this.hpMul(n) * (th.hpMul || 1) * G.mut.hp, gapMul: th.gapMul || 1 };
  },
  bossesFor(n) {
    if (n % 50 === 0) { const m = [(n / 50) % 2 ? 'leviathan' : 'omega']; if (n >= 150) m.push(BOSS_ORDER[(n / 50) % BOSS_ORDER.length]); return m; }
    const rush = G.gm === 'rush', k = rush ? n - 3 : Math.floor(n / this.bossEv()) - 1, c = rush ? (n >= 30 ? 3 : n >= 15 ? 2 : 1) : n >= 40 ? 3 : n >= 20 ? 2 : 1, out = [];
    for (let i = 0; i < c; i++) out.push(BOSS_ORDER[(k + i) % BOSS_ORDER.length]);
    return out;
  },
  // PV totaux estimés d'une vague (sans les invocations ni les fragments)
  totalHp(P) {
    const n = P.n, ep = n >= (G.mut.elite > 1 ? 4 : 6) ? Math.min(.3, .05 + n * .004) * G.mut.elite * (G.net === 'versus' ? VERSUS.elite : 1) : 0;
    let h = 0;
    for (const k of P.list) { const d = ENEMIES[k]; h += d.hp + (d.shield || 0); }
    h *= 1 + 2 * ep;
    for (const b of P.bosses) { const d = EDEF(b); h += (d.hp + (d.shield || 0)) * G.mut.bossHp * G.mod.bossHp; }
    return h * P.hpMul * G.mod.ehp;
  },
  canLaunch() { return !!G && !G.over && (G.phase === 'prep' || G.spawnQ.length === 0); },
  earlyBonus(n) { return Math.round(15 + n * 3); },
  launch() {
    if (!this.canLaunch()) return;
    const early = G.phase === 'combat', P = G.preview, n = P.n;
    G.waveNum = n;
    const hpm = P.hpMul * (G.curse || 1);
    if (G.curse) { G.curse = 0; if (!G.demo) UI.toast('Malédiction', 'Les ennemis de cette vague ont +15 % de PV.', '#8a93a8', 3); }
    const w = { n, left: 0, leaks: 0, hpMul: hpm, t0: G.tick };
    G.waves[n] = w;
    const base = G.tick + 40, gap = Math.max(11, 30 - n * .35) * P.gapMul, R = this.rng(n, 0x5eed);
    const eliteP = n >= (G.mut.elite > 1 ? 4 : 6) ? Math.min(.3, .05 + n * .004) * G.mut.elite * (G.net === 'versus' ? VERSUS.elite : 1) : 0;
    let t = base, pi = 0;
    const nP = G.map.P.length;
    for (let i = 0; i < P.list.length; i++) {
      const type = P.list[i];
      // sur une carte en fourche, chaque paquet d'ennemis choisit son entrée
      if (nP > 1 && (i === 0 || P.list[i - 1] !== type)) pi = Math.floor(R() * nP);
      G.spawnQ.push({ at: Math.round(t), type, elite: R() < eliteP, wave: n, hpMul: hpm, pi });
      w.left++;
      const same = i + 1 < P.list.length && P.list[i + 1] === type;
      t += gap * (ENEMIES[type].spd > 2 ? .55 : 1) * (same ? 1 : 2.2) * (.85 + R() * .3);
    }
    P.bosses.forEach((b, i) => { G.spawnQ.push({ at: Math.round(base + (t - base) * .4 + i * 150), type: b, wave: n, hpMul: hpm, pi: Math.floor(R() * nP) }); w.left++; });
    G.spawnQ.sort((a, b) => a.at - b.at);
    for (const tw of G.towers) tw.fresh = false;
    G.phase = 'combat';
    if (early) {
      const eb = this.earlyBonus(n);
      gain(eb);
      UI.toast('Appel anticipé', `+${eb} crédits de prime de risque.`, '#ffd23f', 2.5);
      Missions.on('early');
    }
    if (P.bosses.length) {
      UI.banner(`VAGUE ${n}`, (n % 50 === 0 ? 'ALERTE ROUGE · ' : 'ALERTE BOSS · ') + P.bosses.map(b => BOSSES[b].name).join(' + '), '#ff2a6d');
      Sfx.play('alarm');
    } else {
      UI.banner(`VAGUE ${n}`, P.name.toUpperCase(), null);
      Sfx.play('wave');
    }
    if (G.net === 'versus' && n === VERSUS.escFrom + 1 && !G.demo) UI.toast('ESCALADE', 'À partir de maintenant, les ennemis gagnent <b>+5 % de PV à chaque vague</b>. Tenez plus longtemps que les autres !', '#ff2a6d', 6);
    G.preview = this.plan(n + 1);
    Events.onLaunch(n);
    UI.onPreview();
    if (UI.sel) UI.renderPanel();
    if (!G.demo) Music.intensity = 1;
  },
  update() {
    const Q = G.spawnQ;
    while (Q.length && Q[0].at <= G.tick) {
      const s = Q.shift();
      const e = Enemies.spawn(s.type, { hpMul: s.hpMul, elite: s.elite, wave: s.wave, pi: s.pi || 0, dist: s.dist });
      if (s.from != null) { e.from = s.from; e.u = s.u; }
      if (s.bmul) { e.bounty *= s.bmul; if (s.dist) { FX.spark(e.x, e.y, '#c43dff', 10, 3); e.px = e.x; e.py = e.y; } }
    }
    for (const k in G.waves) { const w = G.waves[k]; if (w.left <= 0) this.cleared(w); }
    if (G.phase === 'prep' && G.autoWave && !G.over && --G.autoT <= 0) this.launch();
  },
  cleared(w) {
    delete G.waves[w.n];
    G.lastDur = G.tick - w.t0; G.lastMc = w.mc || 0; G.leakHist.push(w.leaks > 0); if (G.leakHist.length > 3) G.leakHist.shift();
    Casino.resolve(w);
    G.tokens = G.tokens.map(() => Casino.TOKENS);
    const tb = Cards.tick();
    const bonus = Math.round((40 + w.n * 10) * G.mod.waveBonus * tb.cash), nano = Math.round((1 + Math.floor(w.n / 10) + (w.n % 5 === 0 ? 2 : 0)) * G.mut.nano) + tb.nano + G.mod.nanoW;
    gain(bonus, null); G.nanites += nano;
    let extra = '';
    if (G.income) { gain(G.income); extra += ` · revenu +${G.income}`; }
    if (G.mod.towerCash && G.towers.length) { const v = G.mod.towerCash * G.towers.length; gain(v, null); extra += ` · fonds de guerre +${v}`; }
    if (G.gm === 'sandbox') { G.money = Math.max(G.money, 99999); G.nanites = Math.max(G.nanites, 999); G.res.p = Math.max(G.res.p, 999); G.res.a = Math.max(G.res.a, 999); G.res.q = Math.max(G.res.q || 0, 999); }
    if (G.sendStock) G.sendStock = {};
    if (G.mod.interest > 0) {
      const cap = 40 * w.n; let it = 0;
      if (G.wallets) G.wallets.forEach((m, i) => { const v = Math.min(Math.floor(m * G.mod.interest), cap); G.wallets[i] += v; it = Math.max(it, v); });
      else { it = Math.min(Math.floor(G.money * G.mod.interest), cap); G.money += it; }
      if (it > 0) { G.stats.gold += it; extra += ` · intérêts +${it}`; }
    }
    if (G.mod.regen > 0 && G.lives < G.maxLives) {
      const r = Math.min(G.mod.regen, G.maxLives - G.lives);
      G.lives += r; extra += ` · coque +${r}`;
    }
    if (w.n % 5 === 0) { G.recycle++; extra += ' · +1 recyclage'; }
    if (w.leaks === 0) G.stats.clean++;
    UI.toast(`Vague ${w.n} repoussée`, `+${bonus} crédits · +${nano} nanite${nano > 1 ? 's' : ''}${extra}`, '#39ff88', 3);
    Sfx.play('coin');
    if (w.n >= 10) Ach.unlock('wave10');
    if (w.n >= 25) Ach.unlock('wave25');
    if (w.n >= 50) Ach.unlock('wave50');
    if (w.n >= 100) Ach.unlock('wave100');
    if (w.n >= 30 && G.daily) Ach.unlock('daily30');
    if (w.n >= 30 && Net.coop) Ach.unlock('coop30');
    if (w.n === Towers.omFrom() && G.gm !== 'sandbox') UI.toast('Niveaux Oméga débloqués', `Vos tourelles peuvent monter jusqu'au niveau ${OMEGA.max} (+35 % de dégâts par niveau, ${OMEGA.abyss} abyssite ⬟ par niveau), et la Recherche Oméga (en bas de l'arbre, touche K) augmente les dégâts de toutes les tourelles contre du plasma.`, '#ff4df0', 7);
    if (w.n >= 10 && G.stats.leaks === 0) Ach.unlock('noleak');
    if (w.n >= 15 && (G.diffKey === 'hardcore' || G.diffKey === 'cauchemar')) Ach.unlock('hard15');
    if (w.n >= 15 && G.daily) Ach.unlock('daily');
    if (w.leaks === 0) Missions.on('clean');
    Cmd.gain((4 + 2 * Math.floor(w.n / 5)) * Cmd.mult());
    Missions.fill();
    if (w.n % 2 === 0) Cards.offer();   // un protocole toutes les 2 vagues : des choix qui pèsent, sans inflation
    while (G.cx.bc > 0) { G.cx.bc--; Cards.offer(); }   // Pacte des titans
    if (Object.keys(G.waves).length === 0 && G.spawnQ.length === 0) {
      G.phase = 'prep'; G.autoT = G.net === 'versus' ? VERSUS.prep : 480; Music.intensity = 0;
      if (G.net === 'versus') UI.buildBar();
      SaveSys.save();
    }
  }
};

