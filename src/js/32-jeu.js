/* ============================== JEU ============================== */
const Game = {
  state: 'menu', speed: 1, acc: 0, slowT: 0,
  makeState(diffKey, map, seed) {
    G = {
      diffKey, diff: DIFFS[diffKey], seed, rs: seed ^ 0x5bd1e995, map, towers: [], tgrid: new Array(map.C * map.R).fill(null), enemies: [], drops: [],
      strikes: [], vortices: [], spawnQ: [], waves: {}, money: 0, lives: 0, maxLives: 0, nanites: 0, res: { p: 0, a: 0, q: 0, ref: 0 }, recycle: 0, waveNum: 0,
      cus: null, paused: 0, pst: {}, phase: 'prep', autoT: 480, tick: 0, nextId: 1, combo: 0, comboT: 0, overdriveT: 0, skills: {}, unlocked: new Set(),
      abil: { orbital: 0, emp: 0, overdrive: 0 }, used: {}, recycling: null, over: false, boss: null, seen: [], freshBp: null, mod: null,
      daily: null, mutKeys: [], mut: makeMut([]), demo: false, fusePairs: [],
      doctrine: 'standard', missions: [], cards: {}, timed: [], cardQ: 0, offer: null, xpRun: 0, cmdStart: null, traps: [], cx: {},
      gm: 'classic', tstats: {}, waveDmg: {}, mLast: null, actor: null, autoWave: !!Store.s.autoWave, wallets: null, net: null,
      tokens: [3, 3], slot: [], bets: [], jpot: 500, curse: 0, lastDur: 0, lastMc: 0, leakHist: [], betsWon: 0,
      events: Store.s.events !== false, evQ: null, ev: null, evSpd: 1, evCount: 0, meteors: [], bolts: [], pods: [], craters: [], comet: null, rift: null,
      stats: { kills: 0, gold: 0, maxCombo: 0, leaks: 0, bosses: 0, built: 0, fusions: 0, clean: 0, missions: 0 }
    };
    Path.build(map);
    return G;
  },
  newGame(diffKey, opts = {}) {
    Demo.stop();
    let pk = opts.perks || Store.data.meta.perks;
    const diff = DIFFS[diffKey];
    const daily = opts.daily ? dailyInfo(opts.dailyDate || undefined) : null;
    const seed = daily ? daily.seed : opts.seed != null ? opts.seed : (Math.random() * 2147483647) | 0;
    const portrait = opts.portrait != null ? opts.portrait : View.w < View.h * .9;
    this.makeState(diffKey, MapGen.generate(seed, portrait), seed);
    G.perks = pk; G.net = opts.mp || null; G.portrait = !!portrait;
    // coopération : Héritage d'équipe et doctrines de tous les joueurs (une doctrine en double ne compte qu'une fois)
    if (G.net === 'coop' && opts.perksBy) {
      pk = G.perks = teamPerks(opts.perksBy);
      G.docs = [...new Set(Object.values(opts.docs || {}).filter(k => DOCTRINES[k] && k !== 'standard'))].sort();
    }
    G.gm = GMODES[opts.gm] && !opts.daily ? opts.gm : 'classic';
    if (G.gm === 'chaos') { G.mutKeys = ['chaos']; G.mut = makeMut(G.mutKeys); }
    if (opts.events != null) G.events = opts.events;
    if (opts.autoWave != null) G.autoWave = opts.autoWave;
    if (daily) { G.daily = daily.date; G.mutKeys = daily.mutKeys; G.mut = makeMut(daily.mutKeys); }
    if (G.gm === 'custom') Custom.apply(opts.cus || Custom.get());
    const dk = opts.doctrine != null ? opts.doctrine : Store.data.doctrine;
    const D = opts.doctrine != null ? DOCTRINES[dk] || DOCTRINES.standard : DOCTRINES[dk] && DOCTRINES[dk].lvl <= Store.data.cmd.lvl ? DOCTRINES[dk] : DOCTRINES.standard;
    G.doctrine = D === DOCTRINES.standard ? 'standard' : dk;
    const DL = G.docs ? G.docs.map(k => DOCTRINES[k]) : [D], dsum = f => DL.reduce((a, d) => a + (d[f] || 0), 0);
    G.money = Math.round((diff.money + 40 * (pk.h_money || 0)) * G.mut.money);
    G.maxLives = G.lives = Math.max(5, Math.round((diff.lives + 15 * (pk.h_lives || 0) + dsum('lives')) * G.mut.lives));
    G.nanites = 3 + 2 * (pk.h_nano || 0) + dsum('nano');
    G.recycle = 2 + (pk.h_recycle || 0);
    for (let i = 0; i < (pk.h_bp || 0); i++) {
      const c = RECIPES.filter(r => TOWERS[r.r].tier === 2 && !G.unlocked.has(r.r));
      if (c.length) G.unlocked.add(spick(c).r);
    }
    G.cmdStart = Object.assign({}, Store.data.cmd);
    if (G.gm === 'rush') G.money = Math.round(G.money * 1.5);
    if (G.cus) Custom.start();
    if (G.gm === 'sandbox') { G.money = 99999; G.nanites = 999; G.res.p = G.res.a = G.res.q = 999; for (const r of RECIPES) G.unlocked.add(r.r); }
    if (G.net === 'coop') {
      // un portefeuille par joueur : G.money désigne celui de l'auteur de l'action (ou du joueur local)
      const S = opts.slots || [0, 1], n = Math.max(...S) + 1;
      // crédits de départ : chacun selon son propre Héritage
      const m0 = i => Math.round((opts.perksBy ? (diff.money + 40 * ((opts.perksBy[i] || {}).h_money || 0)) * G.mut.money : G.money) * COOP.start);
      G.wallets = Array.from({ length: n }, (_, i) => m0(i)); delete G.money;
      // plasma et abyssite : chacun les siens (chaque boss en donne à tous les joueurs présents)
      G.resW = Array.from({ length: n }, () => ({ p: 0, a: 0, q: 0, ref: 0 })); bindRes();
      G.np = S.length; G.gone = {}; for (let i = 0; i < n; i++) if (!S.includes(i)) G.gone[i] = 1;
      G.tokens = Array(n).fill(Casino.TOKENS);
      Object.defineProperty(G, 'money', {
        get() { return this.wallets[this.actor != null ? this.actor : Net.me]; },
        set(v) { this.wallets[this.actor != null ? this.actor : Net.me] = v; }, enumerable: true, configurable: true
      });
    } else if (G.net === 'versus') {
      G.income = 0; G.sendStock = {}; G.autoWave = true; G.autoT = VERSUS.first;
      G.money = Math.round(G.money * VERSUS.money); G.maxLives = G.lives = Math.max(5, Math.round(G.lives * VERSUS.lives));
    }
    Skills.apply();
    G.preview = Waves.plan(1);
    Missions.fill();
    if (opts.replay) { G.replay = opts.replay; G.rec = null; }
    else { Store.data.stats.games++; Replay.record(); }
    this.start(true);
  },
  load() {
    const s = Store.data.save;
    if (!s) return false;
    try {
      Demo.stop();
      this.unpack(s);
      Replay.resumed(s);
      this.start(false);
      if (G.cardQ > 0) { if (!G.offer) G.offer = Cards.roll(); UI.openCards(); }
      return true;
    } catch (e) {
      console.error(e); G = null; SaveSys.clear(); return false;
    }
  },
  unpack(s) {
    {
      const map = { C: s.map.C, R: s.map.R, cells: Uint8Array.from(s.map.cells, ch => +ch), paths: s.map.paths || [s.map.path] };
      this.makeState(s.diffKey, map, s.seed);
      if (s.daily) { G.daily = s.daily; G.mutKeys = s.mutKeys || []; G.mut = makeMut(G.mutKeys); }
      G.portrait = !!s.portrait;
      if (s.gm && GMODES[s.gm]) { G.gm = s.gm; if (G.gm === 'chaos' && !s.daily) { G.mutKeys = ['chaos']; G.mut = makeMut(G.mutKeys); } }
      if (G.gm === 'custom') Custom.apply(s.cus);
      Object.assign(G, { waveNum: s.waveNum, money: s.money, lives: s.lives, maxLives: s.maxLives, nanites: s.nanites, res: Object.assign({ p: 0, a: 0, q: 0, ref: 0 }, s.res), recycle: s.recycle,
        skills: s.skills || {}, seen: s.seen || [], used: s.used || {},
        doctrine: DOCTRINES[s.doctrine] ? s.doctrine : 'standard', missions: (s.missions || []).filter(m => MDEF[m.id]),
        cards: s.cards || {}, timed: s.timed || [], cardQ: s.cardQ || 0, offer: s.offer || null, xpRun: s.xpRun || 0, cx: s.cx || {},
        cmdStart: s.cmdStart || Object.assign({}, Store.data.cmd), waveDmg: s.waveDmg || {} });
      for (const k in s.tstats || {}) if (TOWERS[k]) { const a = s.tstats[k]; G.tstats[k] = { dealt: a[0], kills: a[1], shots: a[2], spent: a[3] }; }
      Object.assign(G.abil, s.abil || {});
      if (s.rs != null) G.rs = s.rs;
      Object.assign(G.stats, s.stats || {});
      G.unlocked = new Set(s.unlocked || []);
      Skills.apply();
      for (const a of s.towers) {
        if (!TOWERS[a[0]]) continue;
        const t = Towers.create(a[0], a[1], a[2], a[3]);
        t.invested = a[4]; t.kills = a[5]; t.dealt = a[6]; t.strat = a[7]; t.oc = !!a[8]; t.fresh = false; t.shots = a[10] || 0;
        if (a[11] > 0) { t.stun = a[11]; t.jamP = 1; }
        if (!s.tstats) { t.ts.dealt += t.dealt; t.ts.kills += t.kills; t.ts.shots += t.shots; t.ts.spent += t.invested; }   // ancienne sauvegarde
        const S = Towers.specs(t); if (a[9] != null && S && S[a[9]]) { t.spec = a[9]; t.sm = S[a[9]]; }
      }
      for (const a of s.traps || []) if (TRAPS[a[0]]) G.traps.push({ type: a[0], tx: a[1], ty: a[2], x: (a[1] + .5) * TILE, y: (a[2] + .5) * TILE,
        dmg: a[3], hp: a[4], max: a[5], cost: a[6], born: 0, hitT: 0, dists: G.map.P.map(P => P.tdist.get(a[2] * G.map.C + a[1])) });
      G.preview = Waves.plan(G.waveNum + 1);
      Missions.fill();
    }
  },
  start(fresh) {
    this.state = 'play'; this.speed = 1; this.acc = 0; this.slowT = 0;
    FX.clear(); Shots.pool.clear();
    Towers.recalc();
    Music.intensity = 0;
    Perf.slow = 0;
    UI.enterGame();
    if (fresh && !G.replay) SaveSys.save();
    if (G.daily) {
      UI.banner(fresh ? 'DÉFI DU JOUR' : 'SYSTÈMES RESTAURÉS', G.mutKeys.map(k => MUTATORS[k].n.toUpperCase()).join(' + '), '#ffd23f');
      if (fresh) UI.toast('Défi du jour · ' + G.daily, G.mutKeys.map(k => `<b>${MUTATORS[k].n}</b> : ${MUTATORS[k].d}`).join('<br>'), '#ffd23f', 8);
    } else UI.banner(fresh ? 'PROTOCOLE ENGAGÉ' : 'SYSTÈMES RESTAURÉS', `${G.diff.name} · VAGUE ${G.waveNum + 1}`, G.diff.color);
  },
  update() {
    G.tick++;
    if (G.paused) return;   // pause en coopération : le temps de jeu est figé, le lockstep continue
    Waves.update(); Abil.update();
    if (G.comboT > 0 && --G.comboT === 0) G.combo = 0;
    Enemies.update();
    if (G.over) return;
    Towers.update(); Shots.update(); Strikes.update(); Traps.update(); Events.update();
    Enemies.compact();
    Drops.update(); Recycle.update();
    FX.update();
  },
  gameOver() {
    if (!G || G.over) return;
    G.over = true; G.lives = 0;
    if (G.demo) { Demo.pending = true; return; }
    if (G.replay) { Music.intensity = 0; setTimeout(() => { if (G && G.replay) Replay.finish(); }, 1200); return; }
    if (G.net) {
      Music.intensity = 0; UI.setPlacing(null); UI.setTargeting(null); UI.deselect();
      const [ex, ey] = G.map.exit;
      for (let i = 0; i < 4; i++) FX.ring(ex, ey, i & 1 ? '#ffffff' : '#ff2a6d', 60 + i * 45, 40 + i * 8, 4);
      FX.spark(ex, ey, '#ff2a6d', 80, 7, 60, 3); Render.flash(.6, '#ff2a6d'); Render.shake(25); Sfx.play('boom'); Sfx.play('leak');
      MP.defeat(); return;
    }
    const frags = G.gm === 'sandbox' || G.gm === 'custom' ? 0 : Math.max(0, Math.floor(((G.waveNum - 1) + G.stats.bosses * 2 + (G.stats.megas || 0) * 25) * G.diff.frag * G.mut.frag * (G.daily ? 1.25 : 1) * (G.gm === 'rush' ? 1.5 : 1)));
    Store.data.meta.frags += frags;
    let best, prev;
    if (G.daily) {
      const D = Store.data.daily || (Store.data.daily = {});
      prev = D[G.daily] || 0; best = G.waveNum > prev;
      if (best) D[G.daily] = G.waveNum;
    } else {
      const rk = G.gm === 'classic' ? G.diffKey : G.diffKey + ':' + G.gm;
      prev = Store.data.records[rk] || 0; best = G.gm !== 'sandbox' && G.gm !== 'custom' && G.waveNum > prev;
      if (best) Store.data.records[rk] = G.waveNum;
    }
    Store.data.stats.kills += G.stats.kills;
    const rid = Date.now();
    Hist.add({ best, rid: G.rec ? rid : 0 });
    Replay.keep(rid);
    Store.data.save = null;
    Store.save();
    Music.intensity = 0;
    UI.setPlacing(null); UI.setTargeting(null); UI.deselect();
    const [x, y] = G.map.exit;
    for (let i = 0; i < 4; i++) FX.ring(x, y, i & 1 ? '#ffffff' : '#ff2a6d', 60 + i * 45, 40 + i * 8, 4);
    FX.spark(x, y, '#ff2a6d', 80, 7, 60, 3);
    Render.flash(.6, '#ff2a6d'); Render.shake(25); Sfx.play('boom'); Sfx.play('leak');
    setTimeout(() => { if (G && G.over) UI.gameOver(frags, best, prev); }, 1600);
  },
  cycleSpeed() { if (Net.versus) { Sfx.play('error'); UI.toast('Vitesse', 'En versus, la vitesse reste à 1x pour les deux joueurs.', '#9fb0cc', 2.5); return; } Act.do('speed', this.speed >= 3 ? 1 : this.speed + 1); },
  setSpeed(v) { this.speed = clamp(v | 0, 1, 3); UI.refreshSpeed(); Sfx.play('ui'); },
  quit(save = true) {
    if (save && G && !G.over && G.phase === 'prep') SaveSys.save();
    G = null; this.state = 'menu'; Music.intensity = 0;
    FX.clear(); Shots.pool.clear();
    Render.dirtyMap = true;
    UI.exitGame();
  }
};

