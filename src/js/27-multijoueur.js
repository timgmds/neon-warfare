/* ============================== MULTIJOUEUR : SALON, VERSUS, COOPÉRATION ============================== */
const MP_COL = ['#00f3ff', '#ffae00', '#ff4dd2', '#7dff4d'];   // couleur de chaque joueur (hôte, puis invités)
// versus : paquets d'ennemis à envoyer chez un adversaire ; chaque envoi augmente votre revenu par vague
const SENDS = {
  swarm:   { n: 'Essaim', type: 'scout', cnt: 10, cost: 45, inc: 3, from: 1 },
  drones:  { n: 'Drones', type: 'drone', cnt: 12, cost: 60, inc: 4, from: 1 },
  armor:   { n: 'Blindés', type: 'tank', cnt: 4, cost: 110, inc: 7, from: 3 },
  fly:     { n: 'Escadrille', type: 'flyer', cnt: 7, cost: 140, inc: 8, from: 4 },
  ghost:   { n: 'Spectres', type: 'spectre', cnt: 6, cost: 160, inc: 9, from: 6 },
  medic:   { n: 'Médics', type: 'medic', cnt: 5, cost: 150, inc: 8, from: 6 },
  carrier: { n: 'Porteurs', type: 'carrier', cnt: 3, cost: 240, inc: 13, from: 8 },
  titan:   { n: 'Colosse', type: 'colosse', cnt: 1, cost: 1100, inc: 40, from: 10 },
  // sabotages : des météores qui s'abattent sur les tourelles de l'adversaire (un par vague)
  meteor:  { n: 'Pluie de météores', sab: 1, i: '☄', c: '#ff8a3d', cnt: 6, cost: 260, inc: 6, from: 4, stock: 1,
             d: '6 météores visent les meilleures tourelles de l\'adversaire : sonnées 4 à 6 s et en surchauffe. Les 2 plus gros leur font <b>perdre un niveau</b>.' },
  crusher: { n: 'Météore géant', sab: 2, i: '✹', c: '#ff2a6d', cnt: 1, cost: 750, inc: 15, from: 10, stock: 1,
             d: 'Un météore colossal s\'écrase sur la tourelle la plus chère de l\'adversaire et la <b>pulvérise</b> (case en ruines), en sonnant ses voisines 8 s. Il a 4 s pour la vendre avant l\'impact.' }
};
// versus : un ennemi envoyé rapporte à son expéditeur selon le temps qu'il survit chez l'adversaire
const SURV = { full: 20, share: .6, leak: .5 };   // 60 % de son prix s'il tient 20 s, +50 % s'il atteint le noyau
const SEND_STOCK = 3;
const EMOTES = ['Bien joué !', 'À l\'aide !', 'Attention, ça arrive !', 'GG', 'Ha ha ha', 'On tient bon !'];

const MP = {
  mode: 'versus', diff: 'standard', ready: false, chat: [], ended: false, last: null, live: false,
  pl: {},        // salon : { numéro: { name, ready, v, ping } } (tenu par l'hôte, recopié chez les invités)
  slots: [],     // joueurs de la partie en cours
  opps: {},      // versus : état des adversaires { numéro: { lives, max, wave, kills, inc, over, place } }
  curs: {},      // coopération : curseurs des partenaires
  out: {},       // joueurs partis ou éliminés pendant la partie
  target: null, banned: new Set(), endArgs: null, stT: 0,
  myName() {
    if (!Store.s.name) { Store.s.name = 'Commandant-' + Math.floor(1000 + Math.random() * 9000); Store.save(); }
    return Store.s.name;
  },
  name(p) { return p === Net.me ? this.myName() : (this.pl[p] && this.pl[p].name) || `Joueur ${p + 1}`; },
  esc(s) { return String(s).replace(/[<>&"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' })[c]); },
  others() { return this.slots.filter(p => p !== Net.me); },
  count() { return Object.keys(this.pl).length; },
  // hôte : invités qui participent encore au lockstep
  peersIn() { return this.slots.filter(p => p !== Net.me && !this.out[p]); },
  clear() { this.hostP = 0; this.room = ''; this.mig = 0; this.base = null; this.prevMe = null; this.names = {}; this.migT = 0; clearInterval(this.migI); this.pl = {}; this.slots = []; this.opps = {}; this.curs = {}; this.out = {}; this.chat = []; this.ready = false; this.live = false; this.target = null; this.survAcc = {}; },

  /* ----- salon ----- */
  hosted(lobby) {
    this.clear(); this.banned = new Set();
    this.pl = { [Net.me]: { name: this.myName(), ready: true, v: VERSION, ping: 0, doc: this.myDoc(), perks: this.myPerks() } };
    if (lobby) { UI.mpState = 'lobby'; UI.openMP(); }
  },
  connected() {   // invité : canal ouvert vers l'hôte
    this.clear();
    UI.mpState = 'lobby'; UI.openMP();
    Sfx.play('mission');
  },
  admit(p) {   // hôte : un invité vient d'arriver
    this.pl[p] = { name: 'Joueur ' + (p + 1), ready: false, v: '?', ping: 0 };
    if (UI.mpState !== 'lobby') { UI.mpState = 'lobby'; UI.mpManual = null; }
    Net.sendTo(p, { t: 'cfg', mode: this.mode, diff: this.diff, map: this.cmap ? this.cmap.n : null });
    this.syncRoster();
    Sfx.play('mission');
  },
  syncRoster() {
    if (Net.role !== 'host') return;
    if (this.pl[Net.me]) this.pl[Net.me].name = this.myName();
    Net.send({ t: 'roster', pl: this.pl, code: Net.code });
    if (UI.top() === 'ov-mp') UI.renderMP();
  },
  myDoc() { const k = Store.data.doctrine; return DOCTRINES[k] && DOCTRINES[k].lvl <= Store.data.cmd.lvl ? k : 'standard'; },
  myPerks() { return cleanPerks(Store.data.meta.perks); },
  // doctrine changée dans le salon
  sendMe() {
    if (Net.role === 'host') { this.pl[Net.me].doc = this.myDoc(); this.pl[Net.me].perks = this.myPerks(); this.syncRoster(); }
    else Net.send({ t: 'me', doc: this.myDoc(), perks: this.myPerks() });
  },
  setPing(p, v, rl) { if (this.pl[p]) { this.pl[p].ping = v; this.pl[p].rl = !!rl; } },
  sendCfg() { if (Net.role === 'host') Net.send({ t: 'cfg', mode: this.mode, diff: this.diff, map: this.cmap ? this.cmap.n : null }); },
  unready() { for (const p in this.pl) if (+p) this.pl[p].ready = false; },
  setMode(m) { if (Net.role !== 'host') return; this.mode = m; this.unready(); this.sendCfg(); this.syncRoster(); },
  setDiff(d) { if (Net.role !== 'host') return; this.diff = d; this.unready(); this.sendCfg(); this.syncRoster(); },
  // carte perso de l'hôte (null : carte générée) ; elle part en entier avec le message de lancement
  setMap(m) { if (Net.role !== 'host') return; this.cmap = m || null; this.unready(); this.sendCfg(); this.syncRoster(); },
  toggleReady() { this.ready = !this.ready; Net.send({ t: 'ready', v: this.ready }); UI.renderMP(); },
  allReady() { const G2 = Object.keys(this.pl).filter(p => +p !== Net.me); return G2.length > 0 && G2.every(p => this.pl[p].ready); },
  // hôte : exclure un joueur (il ne pourra pas revenir sous le même nom tant que le salon existe)
  kick(p) {
    if (Net.role !== 'host' || !p || !this.pl[p]) return;
    const n = this.pl[p].name;
    this.banned.add(n.toLowerCase());
    Net.sendTo(p, { t: 'kick' });
    const L = Net.links.find(l => l.adm && l.p === p);
    setTimeout(() => { if (L) { L.open = false; Net.dropLink(L); } this.onLeave(p, 'kick'); }, 250);
    UI.toast('Joueur exclu', `${this.esc(n)} a été exclu du salon.`, '#ff2a6d', 3);
  },
  say(txt) {
    txt = String(txt || '').trim().slice(0, 140); if (!txt) return;
    Net.send({ t: 'chat', s: txt }); this.chat.push([Net.me, txt]); if (this.chat.length > 40) this.chat.shift();
    UI.renderChat();
  },
  emote(i) {
    if (!EMOTES[i]) return;
    Net.send({ t: 'emote', i });
    UI.toast(this.myName(), EMOTES[i], MP_COL[Net.me], 2.5);
  },
  // l'hôte lance la partie : graine, carte, difficulté, règles communes, liste des joueurs
  launch() {
    if (Net.role !== 'host' || !Net.connected) return;
    const coop = this.mode === 'coop';
    const dk = Store.data.doctrine, docOk = DOCTRINES[dk] && DOCTRINES[dk].lvl <= Store.data.cmd.lvl;
    const slots = Object.keys(this.pl).map(Number).sort((a, b) => a - b);
    const o = {
      seed: (Math.random() * 2147483647) | 0, diff: this.diff, mode: this.mode, portrait: View.w < View.h * .9,
      perks: coop ? Object.assign({}, Store.data.meta.perks) : {}, doctrine: coop && docOk ? dk : 'standard',
      docs: coop ? Object.fromEntries(slots.map(p => [p, (this.pl[p] || {}).doc || 'standard'])) : null,
      perksBy: coop ? Object.fromEntries(slots.map(p => [p, (this.pl[p] || {}).perks || {}])) : null,
      events: Store.s.events !== false, autoWave: coop ? !!Store.s.autoWave : true, slots, map: this.cmap || null
    };
    Net.send({ t: 'start', o, pl: this.pl });
    this.begin(o);
  },
  begin(o) {
    UI.closeAll();
    this.ended = false; this.last = o; this.live = true; this.endArgs = null;
    this.hostP = o.host != null ? o.host : 0; this.room = o.room || Net.code; this.base = null;
    this.names = Object.fromEntries((o.slots || []).map(p => [p, this.name(p)]));
    this.slots = o.slots || [0, 1]; this.opps = {}; this.curs = {}; this.out = {}; this.survAcc = {};
    Net.versus = o.mode === 'versus'; Net.coop = o.mode === 'coop';
    const others = this.others();
    this.target = others.find(p => p > Net.me); if (this.target == null) this.target = others[0];
    if (Net.coop) Lock.reset(0);
    Game.newGame(o.diff, { seed: o.seed, portrait: o.portrait, perks: o.perks, doctrine: o.doctrine, docs: o.docs, perksBy: o.perksBy, mp: o.mode, events: o.events, autoWave: o.autoWave, slots: this.slots, map: o.map });
    UI.mpHud(true);
    UI.banner(Net.versus ? 'VERSUS' : 'COOPÉRATION', this.slots.map(p => this.name(p).toUpperCase()).join(' · '), MP_COL[Net.me]);
    const n = this.slots.length;
    if (Net.versus) UI.toast('Versus', `Même carte, mêmes vagues, ${n} joueurs. Envoyez des ennemis chez ${n > 2 ? 'l\'adversaire ciblé (cliquez sur un nom à gauche pour changer de cible)' : 'l\'adversaire'} : chaque envoi augmente votre <b>revenu par vague</b>. Le dernier debout gagne !`, '#ff2a6d', 8);
    else UI.toast('Coopération', `Une seule carte pour ${n} joueurs, une intégrité commune, mais <b>chacun ses crédits, son plasma et son abyssite</b>. Les nanites, compétences et plans sont partagés ; les protocoles se choisissent à tour de rôle. Les ennemis sont plus résistants.`, '#39ff88', 8);
  },
  // appelé par la boucle : statut envoyé aux adversaires (versus), curseur aux partenaires (coop)
  tick(now) {
    if (!Net.on || !G || Game.state !== 'play') return;
    if (now - this.stT > 700) {
      this.stT = now;
      if (Net.versus && !G.over) Net.send({ t: 'st', lives: Math.ceil(G.lives), max: G.maxLives, wave: G.waveNum, kills: G.stats.kills, inc: G.income || 0, dmg: Score.myDmg(), tw: G.towers.length, sh: Math.max(0, ((G.sabSh || 0) - G.tick) / 60) });
      if (Net.versus) this.flushSurv();
    }
    if (Net.coop && Lock.desync) this.resync();
    if (Net.coop && Net.role === 'host') this.tryRejoin();
    if (Net.coop) this.takeBase();
    if (this.rejoining && this.rejoining.k && G.tick >= this.rejoining.k) { this.rejoining = null; UI.toast('De retour !', 'Vous avez rattrapé la partie.', '#39ff88', 4); }
    if (Net.coop && now - (this.curT || 0) > (Net.relayed() ? 250 : 90)) {
      const h = UI.hover;
      if (h.inside && (h.wx !== this.cwx || h.wy !== this.cwy || UI.placing !== this.cpl)) {
        this.curT = now; this.cwx = h.wx; this.cwy = h.wy; this.cpl = UI.placing;
        Net.send({ t: 'cur', x: Math.round(h.wx), y: Math.round(h.wy), k: UI.placing || '' });
      }
    }
  },
  /* ----- versus ----- */
  alive() { return this.others().filter(p => !this.out[p] && !(this.opps[p] && this.opps[p].over)); },
  setTarget(p) { if (this.alive().includes(p)) { this.target = p; Sfx.play('ui'); UI.refreshMP(true); } },
  aim() { const A = this.alive(); if (!A.includes(this.target)) this.target = A.find(p => p > Net.me) ?? A[0] ?? null; return this.target; },
  // coût d'un envoi, qui grimpe avec la vague de l'envoyeur
  sendCost(k) { return Math.round(SENDS[k].cost * (1 + .12 * (Math.max(1, G.waveNum) - 1)) / 5) * 5; },
  stock(k) { return G.sendStock[k] == null ? (SENDS[k].stock || SEND_STOCK) : G.sendStock[k]; },
  canSend(k) { const S = SENDS[k]; return S.from <= Math.max(1, G.waveNum) && this.stock(k) > 0 && !(S.sab && this.shielded(this.aim())); },
  // adversaire protégé des sabotages (il vient d'en subir un) : secondes restantes, d'après son dernier statut
  shielded(p) { const o = this.opps[p]; if (!o || !o.sh) return 0; return Math.max(0, Math.ceil(o.sh - (performance.now() - (o.shT || 0)) / 1000)); },
  sendPack(k) {
    if (!Net.versus || !G || G.over) return;
    const S = SENDS[k], c = this.sendCost(k), to = this.aim();
    if (to == null) return;
    if (S.from > Math.max(1, G.waveNum)) { Sfx.play('error'); UI.toast('Envoi verrouillé', `Disponible à partir de la vague ${S.from}.`, '#9fb0cc', 2.5); return; }
    if (S.sab && this.shielded(to)) { Sfx.play('error'); UI.toast('Cible protégée', `${this.esc(this.name(to))} vient de subir un sabotage : protégé encore ${this.shielded(to)} s.`, '#9fb0cc', 3); return; }
    if (!this.canSend(k)) { Sfx.play('error'); UI.toast('Stock épuisé', 'Les envois se rechargent à chaque vague repoussée.', '#9fb0cc', 2.5); return; }
    if (G.money < c) { UI.noMoney(); return; }
    G.money -= c; G.income += S.inc;
    G.sendStock[k] = this.stock(k) - 1;
    if (!S.sab) G.sentTotal = (G.sentTotal || 0) + S.cnt;
    Net.send({ t: 'send', k, to, c, hp: Waves.hpMul(Math.max(1, G.waveNum)) * VERSUS.sendHp, u: Math.round(c / S.cnt) });
    UI.toast((S.sab ? 'Sabotage : ' : 'Envoi : ') + S.n, `${S.sab ? S.n : S.cnt + ' × ' + EDEF(S.type).name} vers <b style="color:${MP_COL[to]}">${this.esc(this.name(to))}</b> · revenu <b>+${S.inc}¢</b> par vague (total ${G.income}¢)${S.sab ? '' : ' · plus ils survivent, plus ils rapportent'}`, S.sab ? S.c : '#ff2a6d', 2.5);
    Sfx.play('missile'); UI.buildBar(); UI.refreshHUD();
  },
  incoming(m) {
    if (!G || G.over || !Net.versus) return;
    const S = SENDS[m.k]; if (!S) return;
    if (S.sab) {
      // déjà sabotés il y a peu : le sabotage est bloqué et remboursé à son auteur
      if ((G.sabSh || 0) > G.tick) {
        Net.send({ t: 'sabref', to: m.p, k: m.k, c: m.c || 0 });
        UI.toast('Sabotage bloqué', `${this.esc(this.name(m.p))} a tenté un sabotage, mais vous êtes protégé.`, '#39ff88', 3);
        return;
      }
      this.sabotage(S, m.p);
      G.sabSh = G.tick + SAB_SHIELD * 60; this.stT = 0;
      return;
    }
    const nP = G.map.P.length;
    for (let i = 0; i < S.cnt; i++) G.spawnQ.push({ at: G.tick + 45 + i * 16, type: S.type, wave: 0, hpMul: m.hp, pi: i % nP, sent: true, from: m.p, u: m.u || 0 });
    G.spawnQ.sort((a, b) => a.at - b.at);
    G.recvTotal = (G.recvTotal || 0) + S.cnt;
    UI.toast(`⚠ ${this.esc(this.name(m.p))} attaque !`, `${S.cnt} × ${EDEF(S.type).name} arrivent par l'entrée.`, MP_COL[m.p] || '#ff2a6d', 3);
    Sfx.play('alarm', .7);
    for (const P of G.map.P) FX.ring(P.entry[0], P.entry[1], '#ff2a6d', 50, 26, 3);
  },
  // sabotage reçu : météores visant nos tourelles les plus efficaces (ou la plus chère pour le géant)
  sabotage(S, from) {
    const who = `<b style="color:${MP_COL[from]}">${this.esc(this.name(from))}</b>`, M = G.map, T = G.towers.filter(t => !t.dead);
    if (S.sab === 2) {
      const t = T.reduce((a, b) => (!a || b.invested > a.invested ? b : a), null);
      if (!t) return;
      G.meteors.push({ x: t.cx, y: t.cy, t: 240, warn: 240, big: true, sab: 2, tid: t.id });
      UI.toast(`✹ MÉTÉORE GÉANT de ${who} !`, `Il va pulvériser votre <b style="color:${t.d.color}">${t.d.name}</b> dans 4 s. Vendez-la vite pour sauver des crédits !`, S.c, 5);
      Render.flash(.3, S.c);
    } else {
      const L = T.slice().sort((a, b) => b.dealt - a.dealt);
      for (let i = 0; i < S.cnt; i++) {
        const t = L[i];
        const x = t ? t.cx + rnd(-10, 10) : rnd(.5, M.C - .5) * TILE, y = t ? t.cy + rnd(-10, 10) : rnd(.5, M.R - .5) * TILE;
        G.meteors.push({ x, y, t: 100 + i * 26, big: i < 2, sab: 1 });
      }
      UI.toast(`☄ ${who} vous bombarde !`, 'Une pluie de météores fonce sur vos meilleures tourelles.', S.c, 4);
    }
    Sfx.play('alarm', .8);
  },
  // un ennemi reçu meurt ou passe : son expéditeur touche une prime selon le temps qu'il a tenu
  survived(e, leaked) {
    const sec = (G.tick - e.t0) / 60, v = e.u * (SURV.share * Math.min(1, sec / SURV.full) + (leaked ? SURV.leak : 0));
    if (v <= 0) return;
    const A = this.survAcc || (this.survAcc = {});
    A[e.from] = (A[e.from] || 0) + v;
  },
  flushSurv() {
    const A = this.survAcc; if (!A) return;
    for (const p in A) { const v = Math.floor(A[p]); if (v > 0) { Net.send({ t: 'surv', to: +p, v }); A[p] -= v; } }
  },
  // un adversaire est éliminé ou parti : dernier debout ?
  checkWin(why) {
    if (!Net.versus && !(G && G.net === 'versus')) return;
    if (G && !G.over && !this.ended && this.alive().length === 0) this.victory(why);
    this.refreshEnd();
  },
  // partie terminée pour tous ? (éliminé : il ne reste qu'un survivant, le vainqueur)
  matchOver() { if (!this.live || (G && G.net === 'coop')) return true; const a = this.alive().length; return a === 0 || (this.ended && G && G.over && a <= 1 && this.endArgs && !this.endArgs[0]); },
  // fin de partie
  victory(why) {
    if (!G || this.ended) return;
    this.ended = true;
    G.over = true;
    Hist.add({ win: true, vs: this.others().map(p => this.name(p)).join(', ') });
    const frags = 5 + Math.floor(G.waveNum * G.diff.frag) + 3 * Math.max(0, this.slots.length - 2);
    Store.data.meta.frags += frags; Store.data.mpWins = (Store.data.mpWins || 0) + 1; Store.save();
    Ach.unlock('mpwin');
    Music.intensity = 0; Sfx.play('levelup');
    UI.setPlacing(null); UI.setTargeting(null); UI.deselect();
    this.endArgs = [true, why, frags, 1];
    setTimeout(() => UI.mpEnd(true, why, frags, 1), 900);
  },
  defeat() {
    // appelé par Game.gameOver en multijoueur
    if (this.ended) return;
    this.ended = true;
    const place = Net.versus ? this.alive().length + 1 : 0;
    Hist.add({ win: false, vs: this.others().map(p => this.name(p)).join(', ') });
    if (Net.versus) Net.send({ t: 'dead', wave: G.waveNum, kills: G.stats.kills, place });
    const frags = Math.max(0, Math.floor((G.waveNum - 1) * G.diff.frag));
    Store.data.meta.frags += frags; Store.save();
    if (Net.coop) Ach.unlock('mpcoop');
    this.endArgs = [false, Net.coop ? 'coop' : 'versus', frags, place];
    setTimeout(() => UI.mpEnd(false, Net.coop ? 'coop' : 'versus', frags, place), 1600);
  },
  refreshEnd() { if (this.endArgs && UI.top() === 'ov-mpend') UI.mpEnd(...this.endArgs); },
  rematch() { if (Net.role === 'host' && Net.connected) this.launch(); },
  // retour au salon pour tout le monde (changer de mode ou de difficulté sans se reconnecter) : décidé par l'hôte
  toLobby(notify = true) {
    if (notify && Net.role === 'host') Net.send({ t: 'lobby' });
    Net.coop = Net.versus = false; this.live = false;
    UI.mpHud(false);
    if (Game.state === 'play') Game.quit(false);
    this.ready = false; this.unready();
    UI.mpState = Net.on ? 'lobby' : 'home'; UI.openMP();
    if (Net.role === 'host') this.syncRoster();
  },
  leave() {
    Net.send({ t: 'bye' }); Net.flushAll();
    Net.reset();
    UI.mpHud(false);
    if (Game.state === 'play') Game.quit(false);
    UI.closeAll(); UI.showMenu();
  },
  // hôte : place d'un joueur parti, ou dont on n'a plus de nouvelles depuis 5 s (il se reconnecte avant la fin du délai)
  // places reprenables : joueur parti, ou lien muet depuis 5 s (il se reconnecte avant le délai de départ)
  rejoinCands(free) {
    const now = performance.now(), out = [];
    for (const p of this.slots) {
      if (p === Net.me || (this.rejoinQ && this.rejoinQ.has(p))) continue;
      const L = Net.links.find(l => l.adm && l.p === p && l.open);
      if (this.out[p] && !L) out.push(p);
      else if (L && now - (L.lastRx || 0) > 5000) { if (free) { L.open = false; Net.dropLink(L); this.onLeave(p, 'lost'); } out.push(p); }
    }
    return out;
  },
  rejoinSlot(free) { const c = this.rejoinCands(free); return c.length ? c[0] : null; },
  // hôte : présentation d'un joueur qui revient : son ancien numéro, sinon le même nom, sinon la première place libre
  rejoinHello(L, m) {
    const C = this.rejoinCands(true), name = String(m.name || '').slice(0, 24);
    const slot = C.includes(m.prev) ? m.prev : C.find(p => (this.names[p] || '').toLowerCase() === name.toLowerCase()) ?? (C.includes(L.p) ? L.p : C[0]);
    if (slot == null) { Net.raw(L, { t: 'busy' }); setTimeout(() => Net.dropLink(L), 600); return; }
    L.p = slot; L.rj = false; L.adm = true;
    Net.raw(L, { t: 'welcome', you: slot, code: Net.code });
    this.pl[slot] = { name: name || 'Joueur ' + (slot + 1), ready: true, v: m.v || '?', ping: 0, doc: DOCTRINES[m.doc] ? m.doc : 'standard', perks: cleanPerks(m.perks) };
    this.rejoinAdmit(slot);
  },
  // hôte : le joueur revenu reçoit la partie de départ, la photo du dernier moment calme et les trames jouées depuis ;
  // son retour (« back ») est appliqué au même tick chez tout le monde
  rejoinAdmit(p) {
    const B = this.base, name = (this.pl[p] && this.pl[p].name) || this.names[p] || 'Joueur ' + (p + 1);
    if (!this.pl[p]) this.pl[p] = { name, ready: true, v: '?', ping: 0 };
    const o = Object.assign({}, this.last, { host: Net.me, room: this.room });
    if (!B || !Lock.log) {   // pas encore de photo : retour à la fin de la vague (ancienne méthode)
      (this.rejoinQ || (this.rejoinQ = new Set())).add(p);
      Net.sendTo(p, { t: 'start', o, pl: this.pl, rejoin: true });
      this.syncRoster();
      UI.toast('Multijoueur', `${this.esc(name)} revient : il reprendra sa place à la fin de la vague en cours.`, MP_COL[p], 5);
      return;
    }
    delete this.out[p];
    Lock.sys.push(['back', p]);
    Net.sendTo(p, { t: 'start', o, pl: this.pl, rejoin: true });
    Net.sendBig(p, { t: 'catch', s: B.s, t0: B.t, f: [...Lock.log].filter(([k]) => k > B.t), k: Lock.sent });
    Net.send({ t: 'back', who: p });
    this.syncRoster();
    UI.toast('Multijoueur', `${this.esc(name)} est de retour : il rattrape la partie.`, MP_COL[p], 4);
  },
  tryRejoin() {
    if (!this.rejoinQ || !this.rejoinQ.size || Lock.hold || !G || G.over || !this.quiet()) return;
    for (const p of this.rejoinQ) {
      if (!Net.links.some(l => l.adm && l.p === p && l.open)) continue;
      delete this.out[p]; if (G.gone) delete G.gone[p];
      Net.send({ t: 'back', who: p });
      UI.toast('Multijoueur', `${this.esc(this.name(p))} est de retour dans la partie !`, MP_COL[p], 4);
    }
    this.rejoinQ.clear();
    Lock.hold = true; Lock.snapWait = new Set(this.peersIn()); this.quietSnap = true;
    Net.send({ t: 'snap', s: this.snap() });
    this.snapDone();
  },
  // hôte : un invité est parti (départ, coupure ou exclusion)
  onLeave(p, why) {
    if (!this.pl[p]) return;
    const n = this.pl[p].name;
    (this.names || (this.names = {}))[p] = n;
    if (this.rejoinQ) this.rejoinQ.delete(p);
    delete this.pl[p]; delete this.curs[p];
    Net.send({ t: 'left', who: p, why, name: n });
    this.on.left.call(this, { who: p, why, name: n });
    this.syncRoster();
    if (Lock.snapWait) { Lock.snapWait.delete(p); this.snapDone(); }
  },
  // l'hôte a disparu en pleine coopération : le joueur restant de plus petit numéro devient l'hôte (salon <code>M<n>),
  // les autres s'y reconnectent et repartent de sa photo de partie
  migrate() {
    const old = this.hostP || 0, rem = this.slots.filter(p => p !== old && !this.out[p]);
    if (!rem.length || !this.room || !this.base || !Lock.log) return false;
    const nh = Math.min(...rem), gen = (this.mig || 0) + 1, code = this.room.slice(0, 9) + 'M' + gen;
    for (const p of this.slots) if (!this.names[p]) this.names[p] = this.name(p);
    this.mig = gen; this.out[old] = 1; this.hostP = nh; this.prevMe = Net.me; delete this.curs[old];
    const oldName = this.esc(this.name(old));
    if (nh === Net.me) {
      Net.rehost(code);
      Lock.sent = Math.max(Lock.combMax, G.tick + Lock.D - 1); Lock.rq = []; Lock.hold = false;
      Lock.sys.push(['leave', old]);
      for (const p of rem) if (p !== Net.me) this.out[p] = 1;   // ils reviennent un par un
      UI.toast('Vous êtes le nouvel hôte', `${oldName} a quitté la partie : elle continue chez vous, les autres joueurs se reconnectent.`, MP_COL[Net.me], 7);
      return true;
    }
    Net.rejoinRoom(code); Lock.hold = true;
    this.migT = performance.now() + 60000; clearInterval(this.migI);
    this.migI = setInterval(() => this.migTick(), 3000);
    UI.toast('Changement d\'hôte', `${oldName} a quitté la partie : reconnexion chez ${this.esc(this.name(nh))}, le nouvel hôte…`, MP_COL[nh], 7);
    return true;
  },
  migTick() {
    if (!this.migT || !G) { clearInterval(this.migI); this.migT = 0; return; }
    if (Net.connected) return;
    if (performance.now() > this.migT) {   // nouvel hôte introuvable : on continue seul
      clearInterval(this.migI); this.migT = 0; Net.close(); Lock.hold = false; Net.coop = false; this.live = false; UI.mpHud(false);
      UI.toast('Multijoueur', 'Le nouvel hôte est introuvable : vous continuez seul, les tourelles de chacun restent en place.', '#ffd23f', 7);
      return;
    }
    if (Net.sigUp() && !Net.links.some(l => !l.open && performance.now() - l.t0 < 9000)) Net.attempt(1);
  },
  // invité : la connexion avec l'hôte est perdue
  onLost() {
    if (Game.state === 'play' && G && !G.over && G.net === 'coop' && this.live && this.migrate()) return;
    UI.mpHud(false);
    this.live = false;
    if (Game.state === 'play' && G && !G.over && G.net) {
      if (G.net === 'versus') {
        if (this.slots.length <= 2) { UI.toast('Adversaire déconnecté', 'Victoire par forfait.', '#ffd23f', 5); this.victory('forfait'); }
        else UI.toast('Hôte déconnecté', 'Vous êtes coupé des autres joueurs : la partie continue en solo.', '#ffd23f', 6);
      }
      else UI.toast('Hôte déconnecté', 'Vous continuez seul : les tourelles de chacun restent en place.', '#ffd23f', 6);
      Net.coop = false; Net.versus = false;
    } else if (UI.top() === 'ov-mp' || UI.top() === 'ov-mpend') { UI.mpState = 'home'; if (UI.top() === 'ov-mpend') UI.close('ov-mpend'); UI.openMP(); Net.setStatus(this.kicked ? 'L\'hôte vous a exclu du salon.' : 'La connexion avec l\'hôte a été perdue.', true); }
    this.kicked = false;
  },
  // instantané de la partie entre deux vagues (coopération) : tout ce qui influe sur la simulation
  snap() {
    const s = SaveSys.pack();
    const keys = ['tick', 'nextId', 'autoT', 'autoWave', 'tokens', 'jpot', 'bets', 'curse', 'lastDur', 'lastMc', 'leakHist', 'betsWon', 'cardN', 'evCount', 'mLast',
      'perks', 'net', 'events', 'recycling', 'paused', 'pst', 'docs', 'resW', 'combo', 'comboT', 'overdriveT', 'ev', 'evSpd', 'evQ', 'pods', 'craters', 'wallets', 'jpot', 'slot', 'income', 'sendStock', 'np', 'gone'];
    s.x = {}; for (const k of keys) s.x[k] = G[k];
    s.x.drops = G.drops.map(d => Object.assign({}, d));
    s.tw = G.towers.map(t => [t.owner, t.heat, t.over ? 1 : 0, t.cd, t.ang, t.aimT, t.ramp, t.stun, t.fresh ? 1 : 0, t.id, t.jamP ? 1 : 0]);
    return JSON.parse(JSON.stringify(s));
  },
  restore(s) {
    const wasUI = UI.sel ? [UI.sel.tx, UI.sel.ty] : null;
    Game.unpack(s);
    const X = s.x;
    for (const k in X) if (k !== 'wallets') G[k] = X[k];
    G.towers.forEach((t, i) => { const a = s.tw[i]; if (!a) return; [t.owner, t.heat, t.over, t.cd, t.ang, t.aimT, t.ramp, t.stun, t.fresh, t.id, t.jamP] = a; t.over = !!t.over; t.fresh = !!t.fresh; });
    G.rs = s.rs;   // la reconstruction des tourelles consomme du hasard : on remet la graine de l'hôte
    G.missions = (s.missions || []).filter(m => MDEF[m.id]);
    G.preview = Waves.plan(G.waveNum + 1);   // après G.net : les PV dépendent du mode
    if (G.resW) bindRes();
    if (X.wallets) {
      G.wallets = X.wallets.slice(); delete G.money;
      Object.defineProperty(G, 'money', {
        get() { return this.wallets[this.actor != null ? this.actor : Net.me]; },
        set(v) { this.wallets[this.actor != null ? this.actor : Net.me] = v; }, enumerable: true, configurable: true
      });
    }
    Skills.apply(); Towers.recalc(); Fusion.scan && Fusion.scan();
    Render.dirtyMap = true;
    UI.buildBar(); UI.onPreview(); UI.renderMissions(); UI.refreshHUD(); UI.refreshAbils(true); UI.refreshAuto();
    UI.deselect(); if (wasUI) { const t = Towers.at(wasUI[0], wasUI[1]); if (t) UI.select(t); }
  },
  quiet() {
    return G.phase === 'prep' && !G.enemies.length && !G.spawnQ.length && !G.strikes.length && !G.vortices.length && !G.meteors.length && !G.bolts.length && !G.comet && !G.rift && !Shots.pool.n;
  },
  // chaque machine garde une photo de la partie au début de chaque préparation, puis les trames jouées depuis :
  // un joueur qui revient (ou qui rejoint un nouvel hôte) repart de cette photo et rejoue les trames en accéléré
  takeBase() {
    if (!Net.coop || !G || G.over || Lock.hold || this.rejoining || (this.base && this.base.w === G.waveNum) || !this.quiet()) return;
    this.base = { w: G.waveNum, t: G.tick, s: this.snap() };
    Lock.log = new Map(); for (const [k, c] of Lock.comb) if (k > G.tick) Lock.log.set(k, c);
  },
  // l'hôte renvoie l'état complet dès que la partie est calme ; les invités l'appliquent au même tick
  resync() {
    if (Net.role !== 'host' || !Lock.desync || Lock.hold || !G || G.over || !this.quiet()) return;
    Lock.hold = true; Lock.snapWait = new Set(this.peersIn());
    Net.send({ t: 'snap', s: this.snap() });
    this.snapDone();
  },
  snapDone() {
    if (!Lock.snapWait || Lock.snapWait.size || !G) return;
    Lock.reset(G.tick);
    if (!this.quietSnap) UI.toast('Resynchronisé', 'Toutes les parties sont de nouveau identiques.', '#39ff88', 3);
    this.quietSnap = false;
  },
  flagDesync() { if (Lock.desync) return; Lock.desync = true; Net.send({ t: 'desync' }); this.on.desync.call(this); },
  // messages reçus (m.p : numéro de l'expéditeur)
  on: {
    hello(m) {   // hôte : présentation d'un invité
      const P = MP.pl[m.p]; if (!P) return;
      P.name = String(m.name || 'Joueur').slice(0, 24); P.v = m.v || '?';
      P.doc = DOCTRINES[m.doc] ? m.doc : 'standard'; P.perks = cleanPerks(m.perks);
      if (MP.banned.has(P.name.toLowerCase())) { MP.kick(m.p); return; }
      if (m.v !== VERSION) UI.toast('Versions différentes', `${MP.esc(P.name)} a la ${MP.esc(P.v)}, vous la ${VERSION}. Mettez à jour vos fichiers pour éviter les surprises.`, '#ffd23f', 6);
      MP.syncRoster();
    },
    me(m) { const P = MP.pl[m.p]; if (!P || Net.role !== 'host') return; P.doc = DOCTRINES[m.doc] ? m.doc : 'standard'; P.perks = cleanPerks(m.perks); MP.syncRoster(); },
    welcome(m) { Net.me = m.you; Net.code = m.code || Net.code; UI.renderMP(); },
    roster(m) {
      MP.pl = m.pl || {}; if (m.code) Net.code = m.code;
      if (MP.pl[Net.me]) MP.ready = !!MP.pl[Net.me].ready;
      if (UI.top() === 'ov-mp') UI.renderMP();
    },
    full() { MP.kicked = false; Net.setStatus('Salon complet (4 joueurs maximum).', true); },
    busy() { Net.setStatus('Une partie est en cours dans ce salon : réessayez quand ils seront revenus au salon.', true); },
    kick() {
      MP.kicked = true;
      UI.toast('Exclu du salon', 'L\'hôte vous a exclu.', '#ff2a6d', 5);
      if (Game.state === 'play') { UI.mpHud(false); Game.quit(false); }
      Net.reset(); UI.closeAll(); UI.mpState = 'home'; UI.openMP(); Net.setStatus('L\'hôte vous a exclu du salon.', true);
      MP.kicked = false;
    },
    cfg(m) { MP.mode = m.mode; MP.diff = m.diff; MP.mapName = m.map ? String(m.map).slice(0, 24) : null; MP.ready = false; UI.renderMP(); },
    ready(m) { if (MP.pl[m.p]) { MP.pl[m.p].ready = !!m.v; MP.syncRoster(); if (m.v) Sfx.play('ui'); } },
    chat(m) {
      const s = String(m.s || '').slice(0, 140);
      MP.chat.push([m.p, s]); if (MP.chat.length > 40) MP.chat.shift();
      if (UI.top() === 'ov-mp') UI.renderChat(); else UI.toast(MP.esc(MP.name(m.p)), MP.esc(s), MP_COL[m.p], 4);
      Sfx.play('ui');
    },
    emote(m) { if (EMOTES[m.i]) { UI.toast(MP.esc(MP.name(m.p)), EMOTES[m.i], MP_COL[m.p], 3); Sfx.play('mission'); } },
    start(m) {
      if (m.pl) MP.pl = m.pl;
      const mig = MP.mig, room = MP.room;
      MP.migT = 0; clearInterval(MP.migI);
      MP.begin(m.o);
      if (mig) MP.mig = mig;
      if (m.o && m.o.room) MP.room = m.o.room; else if (room) MP.room = room;
      // retour dans une partie en cours : on attend l'état de l'hôte (photo + trames, ou état complet en fin de vague)
      if (m.rejoin) { MP.rejoining = { k: 0 }; Lock.hold = true; UI.toast('Retour en jeu', 'Récupération de la partie en cours…', MP_COL[Net.me], 4); }
    },
    // morceaux d'un gros message
    part(m) {
      const P = MP.parts || (MP.parts = {}), e = P[m.id] || (P[m.id] = { n: m.n, d: [], got: 0 });
      if (e.d[m.i] == null) { e.d[m.i] = m.d; e.got++; }
      if (e.got < e.n) return;
      delete P[m.id];
      let x; try { x = JSON.parse(e.d.join('')); } catch (err) { return; }
      x.p = m.p; const h = MP.on[x.t]; if (h && x.t !== 'part') h.call(MP, x);
    },
    // photo de la partie + trames depuis : on la restaure puis on rejoue en accéléré jusqu'au présent
    catch(m) {
      if (!G || !Net.coop) return;
      MP.restore(m.s); Lock.reset(G.tick);
      for (const [k, c] of m.f || []) Lock.comb.set(k, c);
      Lock.combMax = Math.max(Lock.combMax, m.k);
      MP.base = { w: G.waveNum, t: G.tick, s: m.s }; Lock.log = new Map(m.f || []);
      for (const p in G.gone || {}) MP.out[p] = 1;
      MP.rejoining = { k: m.k };
      Lock.hold = false;
    },
    back(m) { delete MP.out[m.who]; if (MP.names) delete MP.names[m.who]; },
    lobby() { MP.toLobby(false); UI.toast('Multijoueur', 'L\'hôte a ramené tout le monde au salon.', '#9fb0cc', 3); },
    st(m) { MP.opps[m.p] = Object.assign(MP.opps[m.p] || {}, m, { shT: performance.now() }); },
    sabref(m) {   // notre sabotage a été bloqué par la protection de la cible : remboursement complet
      if (m.to !== Net.me || !G || G.over || G.net !== 'versus' || !SENDS[m.k]) return;
      G.money += Math.max(0, m.c || 0); G.income = Math.max(0, (G.income || 0) - SENDS[m.k].inc); G.sendStock[m.k] = MP.stock(m.k) + 1;
      UI.toast('Sabotage bloqué', `${MP.esc(MP.name(m.p))} était déjà protégé : sabotage remboursé.`, '#9fb0cc', 3.5);
      UI.buildBar(); UI.refreshHUD();
    },
    send(m) { if (m.to === Net.me) MP.incoming(m); },
    surv(m) {   // primes de survie de nos envois
      if (m.to !== Net.me || !G || G.over || G.net !== 'versus') return;
      const v = Math.max(0, Math.round(m.v)); if (!v) return;
      G.money += v; G.stats.gold += v; G.survGain = (G.survGain || 0) + v;
      UI.survT = performance.now(); UI.survV = (UI.survV || 0) + v;
    },
    dead(m) {
      MP.opps[m.p] = Object.assign(MP.opps[m.p] || {}, { lives: 0, wave: m.wave, kills: m.kills, over: true, place: m.place });
      if (G && G.net === 'versus' && !G.over) UI.toast('Élimination', `${MP.esc(MP.name(m.p))} est éliminé à la vague ${m.wave}.`, MP_COL[m.p], 3.5);
      MP.checkWin('ko');
    },
    left(m) {
      const p = m.who, n = MP.esc(m.name || MP.name(p)), ing = MP.live && MP.slots.includes(p);
      delete MP.curs[p];
      if (ing && !MP.out[p]) {
        MP.out[p] = 1;
        if (Net.coop && Net.role === 'host') Lock.sys.push(['leave', p]);   // départ appliqué au même tick partout
        if (G && G.net === 'versus') { MP.opps[p] = Object.assign(MP.opps[p] || {}, { over: true, forfeit: true }); MP.checkWin('forfait'); }
      }
      const txt = m.why === 'kick' ? `${n} a été exclu par l'hôte.` : `${n} a quitté ${ing ? 'la partie' : 'le salon'}.`;
      if (p !== Net.me) UI.toast('Multijoueur', txt + (ing && G && G.net === 'coop' ? ' Ses tourelles restent en place.' : ''), '#9fb0cc', 4);
    },
    bye(m) {
      if (Net.role === 'host') { const L = Net.links.find(l => l.adm && l.p === m.p); if (L) { L.open = false; Net.dropLink(L); } MP.onLeave(m.p, 'bye'); }
      else Net.lost();
    },
    cur(m) { const u = MP.curs[m.p]; MP.curs[m.p] = { x: m.x, y: m.y, k: m.k, t: performance.now(), sx: u ? u.sx : m.x, sy: u ? u.sy : m.y }; },
    h(m) {
      // l'hôte compare les empreintes d'état
      const v = Lock.hashes.get(m.k);
      if (v == null) { Lock.pend.set(m.p + ':' + m.k, m.v); if (Lock.pend.size > 120) Lock.pend.delete(Lock.pend.keys().next().value); }
      else if (v !== m.v) MP.flagDesync();
    },
    snap(m) {
      if (!G || !Net.coop) return;
      MP.restore(m.s); Lock.reset(G.tick);
      Net.send({ t: 'snapok' });
      if (MP.rejoining) {
        MP.rejoining = false;
        for (const p in G.gone || {}) MP.out[p] = 1;
        UI.toast('De retour !', 'Vous avez retrouvé votre place dans la partie.', '#39ff88', 4);
      } else if (!MP.out[Net.me]) UI.toast('Resynchronisé', 'Votre partie a été réalignée sur celle de l\'hôte.', '#39ff88', 3);
    },
    snapok(m) { if (Lock.snapWait) { Lock.snapWait.delete(m.p); MP.snapDone(); } },
    desync() { Lock.desync = true; if (G && G.net) G.desync = true; UI.toast('Désynchronisation', 'Les parties ont divergé (navigateurs différents ?). Elles seront réalignées automatiquement entre deux vagues.', '#ffd23f', 6); }
  }
};


