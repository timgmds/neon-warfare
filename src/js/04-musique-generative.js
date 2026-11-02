/* ============================== MUSIQUE GÉNÉRATIVE ============================== */
const MUSIC_STYLES = { arena: 'Arena 80s', ambient: 'Ambiance', synthwave: 'Synthwave', off: 'Aucune' };
const Music = {
  bpm: 100, step: 0, next: 0, timer: null, intensity: 0, bus: null, rev: null, lead: null,
  /* ARENA : synth-rock années 80 (composition originale). Accords de synthé « cuivré » sur une basse pédale,
     batterie rock à grosse caisse claire, refrain qui pompe en croches, solo saturé façon guitare sur les boss. */
  rBpm: 132,
  // 8 mesures : couplet sur pédale de ré (D, A/D, G/D, A/D) puis refrain (Bm, G, D, A)
  rChords: [[62, 66, 69, 74], [61, 64, 69, 73], [62, 67, 71, 74], [61, 64, 69, 76], [59, 62, 66, 71], [59, 62, 67, 71], [57, 62, 66, 69], [57, 61, 64, 69]],
  rBass: [38, 38, 38, 38, 35, 31, 38, 33],
  rStabs: [[0, 3], [3, 1], [6, 2], [10, 1], [12, 3]],          // [pas, durée] : le riff syncopé du couplet
  rScale: [62, 64, 66, 69, 71, 74, 76, 78, 81, 83, 86, 88],    // ré majeur pentatonique pour le solo
  rTap: [0, 1, 2, 3, 4, 5, 6, 5, 4, 3, 4, 5, 6, 7, 6, 7],      // course en doubles croches sur l'accord
  ld: 5, hold: 0, lastLead: 0,
  prog: [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]], // Am F C G
  // ambiance : accords enrichis (Am9, Fmaj7, Cmaj7, G6) et gamme pentatonique pour les arpèges
  aProg: [[45, 57, 60, 64, 67, 71], [41, 53, 57, 60, 64], [36, 48, 55, 59, 64], [43, 55, 59, 62, 64]],
  aScale: [57, 60, 62, 64, 67, 69, 72, 74, 76, 79],
  boot() {
    if (this.timer || !Sfx.ctx) return;
    this.makeBus(Sfx.ctx, Sfx.musicGain);
    this.next = Sfx.ctx.currentTime + .2;
    this.timer = setInterval(() => this.tick(), 70);
  },
  makeBus(c, out) {
    this.out = out;
    // bus d'écho : donne de l'espace aux notes sans coûter de CPU
    const d = c.createDelay(1), fb = c.createGain(), lp = c.createBiquadFilter(), wet = c.createGain();
    d.delayTime.value = .62; fb.gain.value = .38; lp.type = 'lowpass'; lp.frequency.value = 2000; wet.gain.value = .55;
    d.connect(lp); lp.connect(fb); fb.connect(d); lp.connect(wet); wet.connect(out);
    this.bus = d;
    // réverbe de salle (réponse impulsionnelle générée) : la caisse claire « arena » des années 80
    const len = Math.floor(c.sampleRate * 1.9), ir = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const a = ir.getChannelData(ch); for (let i = 0; i < len; i++) a[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2); }
    const cv = c.createConvolver(), rg = c.createGain();
    cv.buffer = ir; rg.gain.value = .32; cv.connect(rg); rg.connect(out);
    this.rev = c.createGain(); this.rev.gain.value = 1; this.rev.connect(cv);
    // chaîne « guitare » : saturation douce, coupe-haut, écho
    const pre = c.createGain(), ws = c.createWaveShaper(), cut = c.createBiquadFilter(), post = c.createGain();
    const n = 1024, curve = new Float32Array(n);
    for (let i = 0; i < n; i++) { const x = i / (n - 1) * 2 - 1; curve[i] = Math.tanh(x * 5) / Math.tanh(5); }
    pre.gain.value = 1.6; ws.curve = curve; ws.oversample = '2x'; cut.type = 'lowpass'; cut.frequency.value = 3400; cut.Q.value = .9; post.gain.value = .018;
    pre.connect(ws); ws.connect(cut); cut.connect(post); post.connect(out); post.connect(d);
    this.lead = pre;
  },
  tick() {
    const c = Sfx.ctx, st = Store.s.musicStyle;
    if (!c || c.state !== 'running' || Store.s.music <= 0 || st === 'off') { if (c) this.next = c.currentTime + .1; return; }
    if (this.next < c.currentTime - .05) this.next = c.currentTime + .05; // rattrapage après onglet en arrière-plan
    const spb = 60 / (st === 'arena' ? this.rBpm : st === 'synthwave' ? this.bpm : 72) / 4;
    while (this.next < c.currentTime + .3) { this.render(st, this.step, this.next, spb); this.next += spb; this.step++; }
  },
  render(st, step, t, spb) {
    if (st === 'arena') this.playArena(step, t, spb);
    else if (st === 'synthwave') this.play(step, t, spb);
    else this.playAmbient(step, t, spb);
  },
  hr(n) { const h = Math.sin(n * 12.9898 + 78.233) * 43758.5453; return h - Math.floor(h); },
  playArena(step, t, spb) {
    const I = this.intensity, s = step & 15, bar = (step >> 4) & 7, ch = this.rChords[bar], verse = bar < 4;
    // cuivres : riff syncopé au couplet, accords qui pompent en croches au refrain
    if (verse) { for (const [p, d] of this.rStabs) if (p === s) this.brass(bar === 3 && p === 12 ? [62, 64, 69, 76] : ch, t, spb * d, .019, I); }
    else if (I >= 1 ? s % 2 === 0 : s % 4 === 0) this.brass(ch, t, spb * (I >= 1 ? 1.15 : 2.6), s % 4 === 0 ? .018 : .012, I);
    if (bar === 3 && s === 14) this.brass(ch, t, spb * 2, .016, I);   // résolution de l'accord suspendu
    // basse en croches : pédale au couplet, fondamentales au refrain
    if (s % 2 === 0) this.rbass(this.mf(this.rBass[bar] + (!verse && s === 14 ? 12 : 0)), t, spb * 1.7, I ? .062 : .04, I);
    if (I < 1) { if (s % 4 === 2) this.hat(t, .006); if (s === 0 && bar % 4 === 0) this.kick(t, .07); return; }
    // batterie rock
    if (s === 0 || s === 8 || (!verse && s === 11)) this.kick(t, .12);
    if (s === 4 || s === 12) this.rsnare(t, .085);
    if (bar === 7 && s >= 12) this.rsnare(t + spb * .5, .03 + (s - 12) * .012);   // roulement avant la reprise
    if (s % 2 === 0) this.hat(t, s % 4 === 2 ? .016 : .01);
    else if (I >= 2) this.hat(t, .006);
    if (s === 0 && (bar === 0 || bar === 4)) this.crash(t, I >= 2 ? .05 : .035);
    // solo saturé sur les boss
    if (I >= 2) this.solo(step, t, spb, bar);
  },
  brass(notes, t, dur, vol, I) {
    const c = Sfx.ctx, f = c.createBiquadFilter(), g = c.createGain(), end = t + Math.max(dur, .07);
    f.type = 'lowpass'; f.Q.value = 2.2;
    const peak = I >= 1 ? 5600 : 2800, sus = I >= 1 ? 2000 : 1100;
    f.frequency.setValueAtTime(420, t); f.frequency.linearRampToValueAtTime(peak, t + .022); f.frequency.setTargetAtTime(sus, t + .022, .09);
    g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(vol, t + .01); g.gain.setTargetAtTime(vol * .72, t + .01, .1); g.gain.setTargetAtTime(.0001, end, .045);
    const os = [];
    for (const m of notes) for (const det of [-9, 8]) { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = this.mf(m); o.detune.value = det; os.push(o); }
    const sub = c.createOscillator(); sub.type = 'square'; sub.frequency.value = this.mf(notes[0] - 12); os.push(sub);
    for (const o of os) { o.connect(f); o.start(t); o.stop(end + .3); }
    f.connect(g); g.connect(this.out); if (this.rev) { const sg = c.createGain(); sg.gain.value = .35; g.connect(sg); sg.connect(this.rev); }
  },
  rbass(f, t, dur, vol, I) {
    const c = Sfx.ctx, o = c.createOscillator(), o2 = c.createOscillator(), h = c.createGain(), fl = c.createBiquadFilter(), g = c.createGain();
    o.type = 'sawtooth'; o.frequency.value = f; o2.type = 'square'; o2.frequency.value = f / 2; h.gain.value = .55;
    fl.type = 'lowpass'; fl.Q.value = 5; fl.frequency.setValueAtTime(I ? 1500 : 800, t); fl.frequency.exponentialRampToValueAtTime(200, t + dur);
    g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(vol, t + .006); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(fl); o2.connect(h); h.connect(fl); fl.connect(g); g.connect(this.out);
    o.start(t); o2.start(t); o.stop(t + dur + .05); o2.stop(t + dur + .05);
  },
  rsnare(t, vol) {
    const c = Sfx.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(), o = c.createOscillator(), og = c.createGain();
    s.buffer = Sfx.noiseBuf; f.type = 'bandpass'; f.frequency.value = 1800; f.Q.value = .7;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + .24);
    o.type = 'triangle'; o.frequency.setValueAtTime(205, t); o.frequency.exponentialRampToValueAtTime(150, t + .1);
    og.gain.setValueAtTime(vol * .9, t); og.gain.exponentialRampToValueAtTime(.0001, t + .12);
    s.connect(f); f.connect(g); o.connect(og); g.connect(this.out); og.connect(this.out);
    if (this.rev) { g.connect(this.rev); og.connect(this.rev); }
    s.start(t, Math.random() * .5); s.stop(t + .26); o.start(t); o.stop(t + .14);
  },
  crash(t, vol) {
    const c = Sfx.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = Sfx.noiseBuf; s.loop = true; f.type = 'highpass'; f.frequency.value = 4800;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + 1.6);
    s.connect(f); f.connect(g); g.connect(this.out); if (this.rev) g.connect(this.rev);
    s.start(t, Math.random() * .5); s.stop(t + 1.65);
  },
  // solo : marche aléatoire (déterministe) sur la gamme, notes tenues avec vibrato, et course en doubles croches
  solo(step, t, spb, bar) {
    const s = step & 15, sc = this.rScale;
    if (bar === 3 || bar === 7) {
      const ch = this.rChords[bar], arp = [ch[0], ch[1], ch[2], ch[0] + 12, ch[1] + 12, ch[2] + 12, ch[0] + 24, ch[1] + 24];
      this.leadNote(this.mf(arp[this.rTap[s]]), t, spb * .95, .8, false);
      return;
    }
    if (step < this.hold) return;
    const r = this.hr(step);
    if (s % 2 === 1 && r > .3) return;
    const long = (s === 0 || s === 8) && r < .45;
    this.ld = clamp(this.ld + [-2, -1, 1, 2, 1, -1][Math.floor(this.hr(step + .5) * 6)], 2, sc.length - 1);
    if (s === 0) { const tones = this.rChords[bar].map(m => m + 12); let best = this.ld, bd = 99; sc.forEach((m, i) => { if (tones.some(x => (x - m) % 12 === 0) && Math.abs(i - this.ld) < bd) { bd = Math.abs(i - this.ld); best = i; } }); this.ld = best; }
    const dur = long ? spb * 6 : spb * (s % 2 ? .9 : 1.8);
    this.leadNote(this.mf(sc[this.ld]), t, dur, 1, long);
    if (long) this.hold = step + 6;
  },
  leadNote(f, t, dur, vel, vib) {
    const c = Sfx.ctx, o = c.createOscillator(), o2 = c.createOscillator(), g = c.createGain(), p = this.lastLead || f;
    o.type = 'sawtooth'; o2.type = 'square'; o2.detune.value = 7;
    for (const x of [o, o2]) { x.frequency.setValueAtTime(p, t); x.frequency.exponentialRampToValueAtTime(f, t + .028); }
    this.lastLead = f;
    g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(.5 * vel, t + .006); g.gain.setTargetAtTime(.38 * vel, t + .006, .15); g.gain.setTargetAtTime(.0001, t + dur, .04);
    if (vib) {
      const l = c.createOscillator(), lg = c.createGain();
      l.frequency.value = 5.6; lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(f * .022, t + dur * .6);
      l.connect(lg); lg.connect(o.frequency); lg.connect(o2.frequency); l.start(t); l.stop(t + dur + .25);
    }
    o.connect(g); o2.connect(g); g.connect(this.lead);
    o.start(t); o2.start(t); o.stop(t + dur + .25); o2.stop(t + dur + .25);
  },
  mf(m) { return 440 * Math.pow(2, (m - 69) / 12); },
  playAmbient(step, t, spb) {
    const I = this.intensity, s = step & 31, ch = this.aProg[(step >> 5) & 3];
    if (s === 0) {
      // nappe : deux oscillateurs légèrement désaccordés par note, attaque lente
      for (let i = 1; i < ch.length; i++) {
        const f = this.mf(ch[i]);
        this.pad(f * 1.0023, t, spb * 36, .0075); this.pad(f * .9977, t + .03, spb * 36, .0075);
      }
      this.note('sine', this.mf(ch[0]), t, spb * 30, .05, 300, true);
    }
    const every = I >= 2 ? 1 : I >= 1 ? 2 : 4;
    if (s % every === 0) {
      const h = Math.sin(step * 12.9898) * 43758.5453, r = h - Math.floor(h);
      if (r < (I >= 1 ? .8 : .55)) {
        const sc = this.aScale, n = sc[Math.floor(r * 997) % (I >= 2 ? sc.length : 7)] + (I >= 2 && s % 8 === 4 ? 12 : 0);
        this.pluck(this.mf(n), t, I >= 2 ? .024 : .02);
      }
    }
    if (I >= 1 && s % 4 === 0) this.kick(t, .06);
    if (I >= 2 && s % 4 === 2) this.hat(t, .008);
  },
  pad(f, t, dur, vol) {
    const c = Sfx.ctx, o = c.createOscillator(), g = c.createGain(), fl = c.createBiquadFilter();
    o.type = 'triangle'; o.frequency.value = f; fl.type = 'lowpass'; fl.frequency.value = 900;
    g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(vol, t + 1.8); g.gain.setValueAtTime(vol, t + dur * .6); g.gain.linearRampToValueAtTime(.0001, t + dur);
    o.connect(fl); fl.connect(g); g.connect(this.out); o.start(t); o.stop(t + dur + .05);
  },
  pluck(f, t, vol) {
    const c = Sfx.ctx, o = c.createOscillator(), g = c.createGain(), fl = c.createBiquadFilter();
    o.type = 'triangle'; o.frequency.value = f; fl.type = 'lowpass'; fl.frequency.setValueAtTime(3200, t); fl.frequency.exponentialRampToValueAtTime(600, t + .5);
    g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(vol, t + .006); g.gain.exponentialRampToValueAtTime(.0001, t + .9);
    o.connect(fl); fl.connect(g); g.connect(this.out); if (this.bus) g.connect(this.bus);
    o.start(t); o.stop(t + .95);
  },
  play(step, t, spb) {
    const bar = (step >> 4) & 3, s = step & 15, ch = this.prog[bar], I = this.intensity;
    if (s % 2 === 0) {
      const root = ch[0] - 24 + (s % 8 === 6 ? 12 : 0);
      this.note('sawtooth', this.mf(root), t, spb * 1.7, .035 + I * .01, 200 + I * 180);
    }
    if (I >= 1 || s % 4 === 0) {
      const idx = I >= 1 ? s % 3 : (s >> 2) % 3;
      const n = ch[idx] + 12 + (I >= 1 && s >= 8 ? 12 : 0);
      this.note('triangle', this.mf(n), t, spb * .9, .018, 2200);
    }
    if (s === 0) ch.forEach(m => this.note('sine', this.mf(m), t, spb * 16, .014, 1400, true));
    if (I >= 1) {
      if (s % 4 === 0) this.kick(t);
      if (s % 2 === 1) this.hat(t, s % 4 === 3 ? .022 : .012);
    }
    if (I >= 2 && s % 8 === 4) this.snare(t);
  },
  note(type, f, t, dur, vol, cut, slow) {
    const c = Sfx.ctx, o = c.createOscillator(), g = c.createGain(), fl = c.createBiquadFilter();
    o.type = type; o.frequency.value = f; fl.type = 'lowpass'; fl.frequency.value = cut;
    g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(vol, t + (slow ? dur * .3 : .01)); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(fl); fl.connect(g); g.connect(this.out); o.start(t); o.stop(t + dur + .05);
  },
  kick(t, vol = .09) {
    const c = Sfx.ctx, o = c.createOscillator(), g = c.createGain();
    o.frequency.setValueAtTime(130, t); o.frequency.exponentialRampToValueAtTime(40, t + .12);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + .16);
    o.connect(g); g.connect(this.out); o.start(t); o.stop(t + .17);
  },
  hat(t, v) {
    const c = Sfx.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = Sfx.noiseBuf; f.type = 'highpass'; f.frequency.value = 7500;
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.0001, t + .04);
    s.connect(f); f.connect(g); g.connect(this.out); s.start(t, Math.random() * .5); s.stop(t + .05);
  },
  snare(t) {
    const c = Sfx.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = Sfx.noiseBuf; f.type = 'bandpass'; f.frequency.value = 1900;
    g.gain.setValueAtTime(.06, t); g.gain.exponentialRampToValueAtTime(.0001, t + .14);
    s.connect(f); f.connect(g); g.connect(this.out); s.start(t, Math.random() * .5); s.stop(t + .15);
  }
};

