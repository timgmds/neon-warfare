/* ============================== AUDIO (SFX) ==============================
   Tout est synthétisé en direct. Style « Néon 10 » (par défaut) : chaque son a plusieurs couches, part dans une
   réverbération générée, se place à gauche ou à droite selon sa position sur la carte et varie un peu à chaque fois
   pour ne pas lasser ; le son s'étouffe quand une fenêtre s'ouvre en pleine partie. Style « Classique » : les sons de la v9. */
const Sfx = {
  ctx: null, master: null, sfxGain: null, musicGain: null, noiseBuf: null, last: {}, voices: 0, rev: null, lp: null, px: null, cur: null, muff: false,
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try { this.ctx = new AC(); } catch (e) { return; }
    const c = this.ctx;
    const comp = c.createDynamicsCompressor();
    comp.threshold.value = -16; comp.ratio.value = 5; comp.attack.value = .003; comp.release.value = .2;
    comp.connect(c.destination);
    // filtre général : grand ouvert en jeu, refermé (son étouffé) quand une fenêtre recouvre la partie
    this.lp = c.createBiquadFilter(); this.lp.type = 'lowpass'; this.lp.frequency.value = 20000; this.lp.Q.value = .5; this.lp.connect(comp);
    this.master = c.createGain(); this.master.gain.value = .9; this.master.connect(this.lp);
    this.sfxGain = c.createGain(); this.sfxGain.connect(this.master);
    this.musicGain = c.createGain(); this.musicGain.connect(this.master);
    this.applyVolumes();
    const len = c.sampleRate | 0, b = c.createBuffer(1, len, c.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noiseBuf = b;
    // réverbération « à porte » des années 80 : un plateau dense de 0,26 s coupé net, en stéréo décorrélée
    const sr = c.sampleRate, n = (sr * .3) | 0, cut = (sr * .26) | 0, ir = c.createBuffer(2, n, sr);
    for (let ch = 0; ch < 2; ch++) {
      const D = ir.getChannelData(ch);
      for (let i = 0; i < n; i++) { const e = i < cut ? Math.min(1, i / (sr * .015)) * (1 - .35 * i / cut) : Math.pow(1 - (i - cut) / (n - cut), 2) * .65; D[i] = (Math.random() * 2 - 1) * e * .45; }
    }
    const cv = c.createConvolver(); cv.buffer = ir;
    const wet = c.createGain(); wet.gain.value = .55;
    this.rev = c.createGain(); this.rev.connect(cv); cv.connect(wet); wet.connect(this.sfxGain);
    // distorsion douce, pour le grain des explosions
    const N = 1024, curve = new Float32Array(N);
    for (let i = 0; i < N; i++) { const x = i / (N - 1) * 2 - 1; curve[i] = Math.tanh(x * 3); }
    this.curve = curve;
    this.bake();
    Music.boot();
  },
  applyVolumes() {
    if (!this.ctx) return;
    const s = Store.s;
    this.sfxGain.gain.value = s.sfx * s.sfx;
    this.musicGain.gain.value = s.music * s.music * .7;
  },
  // délai minimal (ms) entre deux occurrences d'un même son : évite la saturation à haute cadence
  gap: { shot: 55, laser: 110, sniper: 90, rail: 140, zap: 80, boom: 80, mortar: 90, missile: 90, pop: 40, hit: 50, crit: 70, flame: 120,
    freeze: 300, pulse: 120, vortex: 300, coin: 45, ui: 30, build: 60, upgrade: 60, sell: 60, error: 140, leak: 160, wave: 400,
    boss: 800, ach: 600, fuse: 300, nuke: 300, alarm: 1200, mission: 400, levelup: 1000, combo: 200, card: 100,
    evgood: 800, evbad: 800, meteor: 120, spin: 60, jackpot: 1500, reel: 90, lose: 300, win: 300 },
  // réverbération de chaque son en style Néon (0 : sec)
  REV: { shot: .08, laser: .14, sniper: .3, rail: .4, zap: .18, boom: .4, mortar: .22, missile: .2, pop: .14, hit: 0, crit: .2, flame: .1,
    freeze: .5, pulse: .3, vortex: .4, coin: .18, ui: .05, build: .25, upgrade: .4, sell: .2, error: .05, leak: .3, wave: .5, boss: .5,
    ach: .45, fuse: .5, nuke: .5, alarm: .3, mission: .4, levelup: .5, combo: .3, card: .2, evgood: .45, evbad: .4, meteor: .4,
    spin: .1, jackpot: .45, reel: .05, lose: .35, win: .4 },
  neo() { return Store.s.snd !== 'classic'; },
  // sons jamais coupés par l'avalanche des tirs (voix réservées)
  PRIO: new Set(['ui', 'error', 'leak', 'wave', 'boss', 'alarm', 'ach', 'mission', 'levelup', 'upgrade', 'build', 'sell', 'coin', 'fuse', 'nuke', 'evgood', 'evbad', 'jackpot', 'win', 'lose', 'card', 'combo', 'freeze']),
  // gros événements : la musique s'efface un instant (facteur, durée en s)
  DUCK: { boss: [.45, 1.4], nuke: [.5, 1.1], leak: [.6, .5], alarm: [.6, .9], fuse: [.65, .7] },
  BAKE: { shot: .08, pop: .15, hit: .05, crit: .12, zap: .13, laser: .16, missile: .34, mortar: .22 },
  // style Néon : les sons les plus fréquents sont calculés d'avance (3 variantes chacun) ; en jeu, lire un tampon coûte
  // bien moins que construire oscillateurs, filtres et enveloppes à chaque tir
  bake() {
    this.baked = {};
    const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext; if (!OAC) return;
    const live = this.ctx, sr = live.sampleRate;
    for (const nm in this.BAKE) {
      const L = this.baked[nm] = [];
      for (let k = 0; k < 3; k++) {
        let off; try { off = new OAC(1, Math.ceil(sr * (this.BAKE[nm] + .04)), sr); } catch (e) { return; }
        const keep = [this.ctx, this.sfxGain, this.cur];
        this.ctx = off; this.sfxGain = off.destination; this.cur = null; this.baking = true;
        try { this['N_' + nm].call(this, .002, 1, 1); } catch (e) { /* ignore */ }
        [this.ctx, this.sfxGain, this.cur] = keep; this.baking = false;
        off.startRendering().then(b => L.push(b)).catch(() => {});
      }
    }
  },
  duck(f, dur) {
    const g = this.musicGain.gain, t = this.ctx.currentTime, base = Store.s.music * Store.s.music * .7;
    g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.linearRampToValueAtTime(base * f, t + .03); g.linearRampToValueAtTime(base, t + dur);
  },
  // position du prochain son : x sur la carte (le son se place à gauche ou à droite) ; valable pour un seul son
  at(x) { this.px = x; this.pxT = performance.now(); },
  play(name, vol = 1, pitch = 1) {
    const px = this.px != null && performance.now() - this.pxT < 4 ? this.px : null; this.px = null;
    if (!this.ctx || Store.s.sfx <= 0 || this.ctx.state !== 'running' || Demo.busy) return;
    const now = performance.now(), g = this.gap[name] || 40;
    if (this.last[name] && now - this.last[name] < g) return;
    const neo = this.neo();
    if (this.voices > (neo ? 40 : 26) + (neo && this.PRIO.has(name) ? 24 : 0)) return;
    this.last[name] = now;
    this.cur = neo ? { pan: px != null && G ? clamp(px / (G.map.C * TILE) * 2 - 1, -1, 1) * .7 : 0, rev: this.REV[name] || 0 } : null;
    try {
      const B = neo && this.baked && this.baked[name];
      if (B && B.length) {
        // son pré-calculé : une des variantes, hauteur légèrement changée à chaque fois
        const c = this.ctx, s = c.createBufferSource(), g = c.createGain();
        s.buffer = B[(Math.random() * B.length) | 0]; s.playbackRate.value = pitch * this.r(.035); g.gain.value = vol;
        s.connect(g); this.out(g); s.start(); this.voices++; s.onended = () => { this.voices--; };
      } else {
        const fn = (neo && this['N_' + name]) || this['_' + name];
        if (fn) fn.call(this, this.ctx.currentTime, vol, pitch);
      }
      if (neo && this.DUCK[name]) this.duck(this.DUCK[name][0], this.DUCK[name][1]);
    } catch (e) { /* ignore */ }
    this.cur = null;
  },
  // sortie d'une voix : panoramique et départ réverbération selon le son en cours (style Néon)
  out(g) {
    const c = this.ctx, k = this.cur;
    if (!k) { g.connect(this.sfxGain); return; }
    let o = g;
    if (k.pan && c.createStereoPanner) { const p = c.createStereoPanner(); p.pan.value = k.pan; g.connect(p); o = p; }
    o.connect(this.sfxGain);
    if (k.rev && this.rev) { const s = c.createGain(); s.gain.value = k.rev; o.connect(s); s.connect(this.rev); }
  },
  // étouffe le son quand une fenêtre recouvre la partie (appelé à chaque image par l'interface)
  muffle(on) {
    if (!this.ctx || on === this.muff) return;
    this.muff = on;
    const f = this.lp.frequency, t = this.ctx.currentTime;
    f.cancelScheduledValues(t); f.setValueAtTime(f.value, t);
    f.exponentialRampToValueAtTime(on && this.neo() ? 1100 : 20000, t + (on ? .25 : .4));
  },
  osc(type, f0, f1, dur, vol, t, lin) {
    const c = this.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) lin ? o.frequency.linearRampToValueAtTime(f1, t + dur) : o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(vol, t + .006); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g); this.out(g); o.start(t); o.stop(t + dur + .03);
    if (!this.baking) { this.voices++; o.onended = () => { this.voices--; }; }
  },
  // voix complète du style Néon : oscillateur (désaccordé en option) ou bruit, filtre balayé, attaque réglable, distorsion
  v(w, f0, f1, dur, vol, t, o = {}) {
    const c = this.ctx, g = c.createGain();
    let src, src2 = null;
    if (w === 'noise') { src = c.createBufferSource(); src.buffer = this.noiseBuf; src.loop = true; }
    else {
      src = c.createOscillator(); src.type = w; src.frequency.setValueAtTime(f0, t);
      if (f1 !== f0) src.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur * (o.glide || 1));
      if (o.det) { src2 = c.createOscillator(); src2.type = w; src2.detune.value = o.det; src2.frequency.setValueAtTime(f0, t); if (f1 !== f0) src2.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur * (o.glide || 1)); }
    }
    let node = g;
    const a = o.a || .004;
    g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(vol, t + a); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    let head = g;
    if (o.ws) { const ws = c.createWaveShaper(); ws.curve = this.curve; ws.connect(head); head = ws; }
    if (o.f) {
      const f = c.createBiquadFilter(); f.type = o.f[0]; f.Q.value = o.f[3] || .8;
      f.frequency.setValueAtTime(o.f[1], t); f.frequency.exponentialRampToValueAtTime(Math.max(20, o.f[2]), t + dur);
      f.connect(head); head = f;
    }
    src.connect(head); if (src2) src2.connect(head);
    this.out(node);
    if (w === 'noise') src.start(t, Math.random() * .8); else src.start(t);
    src.stop(t + dur + .03); if (src2) { src2.start(t); src2.stop(t + dur + .03); }
    if (!this.baking) { this.voices++; src.onended = () => { this.voices--; }; }
  },
  // petite variation aléatoire (anti-lassitude)
  r(k = .04) { return 1 + (Math.random() * 2 - 1) * k; },
  noise(dur, vol, t, type, f0, f1, q = 1) {
    const c = this.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = this.noiseBuf; s.loop = true; f.type = type; f.Q.value = q;
    f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    s.connect(f); f.connect(g); this.out(g); s.start(t, Math.random() * .5); s.stop(t + dur + .03);
    if (!this.baking) { this.voices++; s.onended = () => { this.voices--; }; }
  },
  _shot(t, v, p) { this.osc('square', 900 * p, 240 * p, .07, .045 * v, t); },
  _laser(t, v) { this.osc('sawtooth', 1300, 900, .12, .025 * v, t); },
  _sniper(t, v) { this.osc('square', 1700, 70, .26, .06 * v, t); this.noise(.14, .08 * v, t, 'highpass', 3500, 900); },
  _rail(t, v) { this.osc('sawtooth', 2600, 40, .55, .07 * v, t); this.noise(.35, .12 * v, t, 'bandpass', 4200, 300, 2); },
  _zap(t, v) { this.osc('sawtooth', 1700 + Math.random() * 700, 280, .13, .035 * v, t, true); this.noise(.09, .05 * v, t, 'highpass', 5200, 2000); },
  _boom(t, v) { this.noise(.5, .2 * v, t, 'lowpass', 1500, 60); this.osc('sine', 130, 30, .42, .16 * v, t); },
  _mortar(t, v) { this.osc('sine', 200, 60, .2, .11 * v, t); this.noise(.12, .06 * v, t, 'lowpass', 900, 200); },
  _missile(t, v) { this.noise(.28, .05 * v, t, 'bandpass', 900, 3200, 3); },
  _pop(t, v, p) { this.osc('triangle', 560 * p, 90 * p, .11, .055 * v, t); },
  _hit(t, v) { this.osc('square', 170, 60, .05, .03 * v, t); },
  _crit(t, v) { this.osc('square', 1500, 2500, .08, .035 * v, t, true); },
  _flame(t, v) { this.noise(.2, .05 * v, t, 'bandpass', 900, 450, 1.2); },
  _freeze(t, v) { this.osc('sine', 2600, 700, .5, .05 * v, t); this.noise(.5, .06 * v, t, 'highpass', 7000, 2500); },
  _pulse(t, v) { this.osc('sine', 280, 900, .25, .05 * v, t); },
  _vortex(t, v) { this.osc('sawtooth', 70, 30, 1.2, .07 * v, t, true); this.osc('sine', 140, 40, 1.2, .05 * v, t); },
  _coin(t, v) { this.osc('square', 1250, 1250, .05, .035 * v, t); this.osc('square', 1870, 1870, .09, .035 * v, t + .05); },
  _ui(t, v) { this.osc('sine', 1100, 1100, .05, .04 * v, t); },
  _build(t, v) { this.osc('triangle', 320, 640, .12, .07 * v, t); this.osc('triangle', 640, 1280, .1, .05 * v, t + .06); },
  _upgrade(t, v) { [520, 780, 1040].forEach((f, i) => this.osc('triangle', f, f * 1.5, .12, .055 * v, t + i * .06)); },
  _sell(t, v) { this.osc('triangle', 900, 300, .18, .06 * v, t); },
  _error(t, v) { this.osc('square', 210, 140, .16, .045 * v, t); },
  _leak(t, v) { this.osc('sawtooth', 320, 80, .38, .09 * v, t); this.noise(.3, .07 * v, t, 'lowpass', 700, 100); },
  _wave(t, v) { [220, 330, 440].forEach((f, i) => this.osc('sawtooth', f, f, .25, .045 * v, t + i * .09)); },
  _boss(t, v) { this.osc('sawtooth', 82, 55, 1.6, .11 * v, t, true); this.osc('sawtooth', 84, 57, 1.6, .09 * v, t, true); this.noise(1.2, .05 * v, t, 'lowpass', 400, 60); },
  _alarm(t, v) { for (let i = 0; i < 3; i++) this.osc('square', 880, 660, .18, .04 * v, t + i * .24, true); },
  _ach(t, v) { [660, 880, 1320].forEach((f, i) => this.osc('triangle', f, f, .22, .055 * v, t + i * .08)); },
  _mission(t, v) { this.osc('triangle', 990, 990, .14, .06 * v, t); this.osc('triangle', 1480, 1480, .3, .06 * v, t + .09); },
  _levelup(t, v) { [523, 659, 784, 1047, 1319].forEach((f, i) => this.osc('square', f, f, .28, .035 * v, t + i * .07)); this.osc('sine', 262, 262, .9, .06 * v, t); },
  _combo(t, v, p) { [0, 4, 7, 12].forEach((s, i) => { const f = 440 * p * Math.pow(2, s / 12); this.osc('sawtooth', f, f * 1.01, .12, .03 * v, t + i * .045); }); },
  _card(t, v) { this.noise(.12, .05 * v, t, 'bandpass', 2500, 5000, 2); },
  _fuse(t, v) { this.osc('sawtooth', 180, 1700, .7, .05 * v, t); this.osc('sine', 90, 900, .7, .08 * v, t); this.noise(.6, .05 * v, t + .1, 'highpass', 2000, 8000); },
  _evgood(t, v) { [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => this.osc('triangle', f, f, .22, .05 * v, t + i * .055)); this.noise(.4, .03 * v, t, 'highpass', 6000, 9000); },
  _evbad(t, v) { for (let i = 0; i < 2; i++) { this.osc('sawtooth', 720, 360, .45, .05 * v, t + i * .5); this.osc('square', 360, 180, .45, .025 * v, t + i * .5); } },
  _meteor(t, v) { this.noise(1.1, .07 * v, t, 'bandpass', 2600, 280, 2.5); this.osc('sine', 900, 120, 1.1, .03 * v, t); },
  _reel(t, v) { this.osc('square', 1900, 1500, .03, .02 * v, t); },
  _win(t, v) { [784, 988, 1175, 1568].forEach((f, i) => this.osc('square', f, f, .12, .035 * v, t + i * .07)); this.osc('triangle', 392, 392, .5, .05 * v, t); },
  _lose(t, v) { [392, 330, 262].forEach((f, i) => this.osc('triangle', f, f * .98, .2, .045 * v, t + i * .13)); },
  _jackpot(t, v) {
    for (let i = 0; i < 14; i++) this.osc('square', 1046 * Math.pow(2, (i % 7) / 12 * 2), 1046 * Math.pow(2, (i % 7) / 12 * 2), .1, .03 * v, t + i * .06);
    [523, 659, 784, 1047].forEach(f => this.osc('sawtooth', f, f, 1.2, .025 * v, t + .85));
    for (let i = 0; i < 10; i++) this.osc('square', 1250 + i * 60, 1250 + i * 60, .05, .02 * v, t + .9 + i * .09);
  },
  /* ----- style Néon 10 : sons en couches ----- */
  N_shot(t, v, p) {
    const k = p * this.r(.05);
    this.v('square', 1050 * k, 300 * k, .065, .028 * v, t, { f: ['lowpass', 4200, 1400] });
    this.v('noise', 0, 0, .03, .045 * v, t, { f: ['highpass', 3200, 1500] });
    this.v('sine', 180 * k, 70 * k, .06, .032 * v, t);
  },
  N_laser(t, v) {
    const k = this.r(.03);
    this.v('sawtooth', 1500 * k, 1050 * k, .14, .02 * v, t, { det: 12, f: ['lowpass', 5200, 1300, 3] });
    this.v('sine', 760 * k, 540 * k, .12, .025 * v, t);
  },
  N_sniper(t, v) {
    this.v('noise', 0, 0, .09, .15 * v, t, { f: ['highpass', 5000, 1400] });
    this.v('sine', 170, 42, .24, .16 * v, t);
    this.v('square', 2500, 1700, .05, .025 * v, t, { f: ['lowpass', 6000, 2500] });
  },
  N_rail(t, v) {
    this.v('sine', 380, 2600, .1, .035 * v, t);
    this.v('sawtooth', 3000, 60, .5, .06 * v, t + .08, { f: ['lowpass', 7000, 400, 2] });
    this.v('noise', 0, 0, .38, .12 * v, t + .08, { f: ['bandpass', 4200, 300, 2] });
    this.v('sine', 90, 35, .4, .12 * v, t + .08);
  },
  N_zap(t, v) {
    for (let i = 0; i < 3; i++) this.v('noise', 0, 0, .035, .11 * v, t + i * .028, { f: ['bandpass', 2500 + Math.random() * 4000, 1800, 4] });
    this.v('sawtooth', 2100 * this.r(.15), 280, .11, .035 * v, t, { f: ['highpass', 900, 600] });
  },
  N_boom(t, v) {
    this.v('sine', 95 * this.r(.06), 30, .5, .22 * v, t);
    this.v('noise', 0, 0, .65, .2 * v, t, { f: ['lowpass', 2600, 70], ws: 1 });
    this.v('noise', 0, 0, .14, .06 * v, t, { f: ['highpass', 3500, 1500] });
  },
  N_mortar(t, v) {
    this.v('sine', 230 * this.r(), 58, .19, .12 * v, t);
    this.v('noise', 0, 0, .15, .08 * v, t, { f: ['lowpass', 1300, 200] });
  },
  N_missile(t, v) {
    this.v('noise', 0, 0, .32, .06 * v, t, { f: ['bandpass', 600, 3800, 3], a: .03 });
    this.v('sawtooth', 280 * this.r(), 900, .26, .012 * v, t, { f: ['lowpass', 2500, 1200] });
  },
  N_pop(t, v, p) {
    const k = p * this.r(.06);
    this.v('triangle', 640 * k, 110 * k, .13, .05 * v, t);
    this.v('noise', 0, 0, .06, .028 * v, t, { f: ['highpass', 7000, 3500] });
    this.v('sine', 1280 * k, 900 * k, .05, .012 * v, t + .01);
  },
  N_hit(t, v) {
    this.v('square', 415, 400, .035, .055 * v, t, { f: ['bandpass', 1200, 1100, 6], a: .001 });
    this.v('square', 587, 570, .035, .055 * v, t, { f: ['bandpass', 1200, 1100, 6], a: .001 });
  },
  N_crit(t, v) {
    this.v('square', 1800, 3000, .06, .025 * v, t, { f: ['lowpass', 6000, 4000] });
    this.v('sine', 3600, 3600, .09, .018 * v, t + .02);
  },
  N_flame(t, v) {
    this.v('noise', 0, 0, .24, .065 * v, t, { f: ['bandpass', 750, 380, .8], a: .02 });
    this.v('noise', 0, 0, .22, .04 * v, t, { f: ['lowpass', 320, 160] });
  },
  N_freeze(t, v) {
    this.v('sine', 3000, 900, .5, .04 * v, t);
    this.v('noise', 0, 0, .55, .05 * v, t, { f: ['highpass', 8000, 3000] });
    [1568, 2349, 3136].forEach((f, i) => this.v('triangle', f, f, .4, .02 * v, t + i * .05));
  },
  N_pulse(t, v) { this.v('sine', 210, 1050, .26, .05 * v, t); this.v('sine', 420, 2100, .2, .016 * v, t + .02); },
  N_vortex(t, v) {
    this.v('sawtooth', 82, 34, 1.25, .07 * v, t, { det: 9, f: ['lowpass', 700, 120, 3], a: .05 });
    this.v('sine', 164, 40, 1.2, .05 * v, t);
  },
  N_coin(t, v) {
    this.v('triangle', 1320, 1320, .06, .052 * v, t);
    this.v('triangle', 1980, 1980, .13, .052 * v, t + .045);
    this.v('sine', 3960, 3960, .1, .01 * v, t + .05);
  },
  N_ui(t, v) { this.v('sine', 1250, 1250, .045, .035 * v, t); this.v('triangle', 2500, 2500, .03, .008 * v, t); },
  N_build(t, v) {
    this.v('noise', 0, 0, .06, .06 * v, t, { f: ['bandpass', 1800, 1500, 6] });
    this.v('sine', 523, 523, .22, .028 * v, t); this.v('sine', 1347, 1347, .16, .016 * v, t);
    this.v('triangle', 330, 660, .14, .05 * v, t + .05);
  },
  N_upgrade(t, v) {
    [523, 784, 1047, 1568].forEach((f, i) => this.v('triangle', f, f * 1.003, .16, .042 * v, t + i * .055, { det: 6 }));
    this.v('noise', 0, 0, .3, .014 * v, t + .1, { f: ['highpass', 7000, 9000], a: .05 });
  },
  N_sell(t, v) { this.v('triangle', 900, 300, .18, .05 * v, t); this.v('triangle', 1320, 1320, .06, .025 * v, t + .1); },
  N_error(t, v) { this.v('square', 220, 150, .15, .035 * v, t, { f: ['lowpass', 1600, 900] }); this.v('square', 208, 142, .15, .025 * v, t, { f: ['lowpass', 1600, 900] }); },
  N_leak(t, v) {
    this.v('sawtooth', 300, 70, .42, .08 * v, t, { f: ['lowpass', 1400, 200, 2] });
    this.v('noise', 0, 0, .32, .07 * v, t, { f: ['lowpass', 800, 100] });
    for (let i = 0; i < 3; i++) this.v('square', 900 + i * 300, 900 + i * 300, .03, .018 * v, t + .05 + i * .05, { f: ['bandpass', 1500, 1500, 3] });
  },
  N_wave(t, v) {
    this.v('noise', 0, 0, .35, .03 * v, t, { f: ['bandpass', 400, 4500, 2], a: .3 });
    [220, 277, 330, 440].forEach(f => this.v('sawtooth', f, f, .7, .022 * v, t + .32, { det: 10, f: ['lowpass', 3200, 500, 2] }));
    this.v('sine', 110, 110, .7, .05 * v, t + .32);
  },
  N_boss(t, v) {
    this.v('sawtooth', 110, 104, 1.7, .07 * v, t, { det: 12, f: ['lowpass', 200, 2200, 3.5], a: .2 });
    this.v('sawtooth', 55, 46, 1.9, .08 * v, t, { det: 14, f: ['lowpass', 900, 160, 4], a: .15, ws: 1 });
    this.v('sine', 41, 33, 1.8, .14 * v, t, { a: .1 });
    this.v('noise', 0, 0, 1.5, .06 * v, t, { f: ['lowpass', 500, 60], a: .2 });
  },
  N_alarm(t, v) { for (let i = 0; i < 3; i++) this.v('square', 880, 660, .2, .035 * v, t + i * .24, { det: 8, f: ['lowpass', 3000, 2000] }); },
  N_nuke(t, v) {
    this.v('sawtooth', 1700, 40, 1.1, .07 * v, t, { f: ['lowpass', 5000, 200] });
    this.v('noise', 0, 0, 1.4, .26 * v, t + .2, { f: ['lowpass', 2400, 40], ws: 1 });
    this.v('sine', 70, 25, 1.3, .2 * v, t + .2);
  },
  _nuke(t, v) { this.osc('sawtooth', 1700, 40, 1.1, .09 * v, t); this.noise(1.3, .28 * v, t + .2, 'lowpass', 2200, 40); }
};

