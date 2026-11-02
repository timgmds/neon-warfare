/* ============================== AUDIO (SFX) ============================== */
const Sfx = {
  ctx: null, master: null, sfxGain: null, musicGain: null, noiseBuf: null, last: {}, voices: 0,
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try { this.ctx = new AC(); } catch (e) { return; }
    const c = this.ctx;
    const comp = c.createDynamicsCompressor();
    comp.threshold.value = -16; comp.ratio.value = 5; comp.attack.value = .003; comp.release.value = .2;
    comp.connect(c.destination);
    this.master = c.createGain(); this.master.gain.value = .9; this.master.connect(comp);
    this.sfxGain = c.createGain(); this.sfxGain.connect(this.master);
    this.musicGain = c.createGain(); this.musicGain.connect(this.master);
    this.applyVolumes();
    const len = c.sampleRate | 0, b = c.createBuffer(1, len, c.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noiseBuf = b;
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
  play(name, vol = 1, pitch = 1) {
    if (!this.ctx || Store.s.sfx <= 0 || this.ctx.state !== 'running' || Demo.busy) return;
    const now = performance.now(), g = this.gap[name] || 40;
    if (this.last[name] && now - this.last[name] < g) return;
    if (this.voices > 26) return;
    this.last[name] = now;
    const fn = this['_' + name];
    if (fn) { try { fn.call(this, this.ctx.currentTime, vol, pitch); } catch (e) { /* ignore */ } }
  },
  osc(type, f0, f1, dur, vol, t, lin) {
    const c = this.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) lin ? o.frequency.linearRampToValueAtTime(f1, t + dur) : o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(vol, t + .006); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g); g.connect(this.sfxGain); o.start(t); o.stop(t + dur + .03);
    this.voices++; o.onended = () => { this.voices--; };
  },
  noise(dur, vol, t, type, f0, f1, q = 1) {
    const c = this.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = this.noiseBuf; s.loop = true; f.type = type; f.Q.value = q;
    f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(this.sfxGain); s.start(t, Math.random() * .5); s.stop(t + dur + .03);
    this.voices++; s.onended = () => { this.voices--; };
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
  _nuke(t, v) { this.osc('sawtooth', 1700, 40, 1.1, .09 * v, t); this.noise(1.3, .28 * v, t + .2, 'lowpass', 2200, 40); }
};

