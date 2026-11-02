/* ============================== RENDU ==============================
   4 calques : décor du thème (statique) · ambiance animée · carte (statique) · jeu (dynamique).
   Les calques statiques ne sont redessinés que lorsqu'ils changent. */
const View = { w: 0, h: 0, dpr: 1, scale: 1, ox: 0, oy: 0, top: 0, bottom: 0 };

const Render = {
  cv: {}, cx: {}, hq: true, time: 0, alpha: 1, shakeA: 0, flashA: 0, flashC: '#fff',
  dirtyBg: true, dirtyMap: true, themeKey: 'theme-cyber', theme: THEMES['theme-cyber'], amb: [], rain: null,
  init() {
    for (const k of ['bg', 'fx', 'map', 'game']) { this.cv[k] = $('cv-' + k); this.cx[k] = this.cv[k].getContext('2d'); }
    window.addEventListener('resize', () => { clearTimeout(this._rt); this._rt = setTimeout(() => this.resize(), 90); });
    this.applyQuality();
  },
  applyQuality() {
    const q = Store.s.quality;
    this.hq = q === 'high' || (q === 'auto' && !Perf.degraded);
    FX.setCaps(this.hq);
    this.cv.fx.style.display = this.hq ? 'block' : 'none';
    this.resize();
  },
  resize() {
    View.w = window.innerWidth; View.h = window.innerHeight;
    View.dpr = Math.min(window.devicePixelRatio || 1, this.hq ? 2 : 1);
    for (const k in this.cv) {
      const c = this.cv[k];
      c.width = Math.round(View.w * View.dpr); c.height = Math.round(View.h * View.dpr);
      c.style.width = View.w + 'px'; c.style.height = View.h + 'px';
    }
    this.fit();
    this.dirtyBg = this.dirtyMap = true;
    this.initAmbient();
    UI.onResize();
  },
  fit() {
    const hud = $('hud'), dock = $('dock');
    View.top = hud.classList.contains('hidden') ? 0 : hud.offsetHeight;
    View.bottom = dock.classList.contains('hidden') ? 0 : dock.offsetHeight;
    if (!G) { View.scale = 1; View.ox = 0; View.oy = 0; return; }
    const W = G.map.C * TILE, H = G.map.R * TILE, pad = View.w < 640 ? 6 : 14;
    const aw = View.w - pad * 2, ah = View.h - View.top - View.bottom - pad * 2;
    View.scale = Math.max(.15, Math.min(aw / W, ah / H));
    View.ox = Math.round((View.w - W * View.scale) / 2);
    View.oy = Math.round(View.top + pad + (ah - H * View.scale) / 2);
    Spr.setK(View.scale * View.dpr);
    $('bossbar').style.top = (View.top + 8) + 'px';
    $('missions').style.top = (View.top + 8) + 'px';
    $('evchip').style.top = (View.top + 8) + 'px';
    $('mp').style.top = (View.top + (View.w < 640 ? 50 : 8)) + 'px';   // téléphone : sous la ligne des missions
  },
  setTheme(key) {
    if (!THEMES[key]) key = 'theme-cyber';
    this.themeKey = key; this.theme = THEMES[key];
    document.body.className = key + (Store.s.crt ? '' : ' no-crt');
    this.dirtyBg = this.dirtyMap = true;
    this.initAmbient();
  },
  shake(a) { if (Store.s.shake && !(G && G.demo)) this.shakeA = Math.max(this.shakeA, a); },
  flash(a, col) {
    if (!Store.s.shake) a *= .35;
    if (G && G.demo) a *= .25;
    if (a > this.flashA) { this.flashA = a; this.flashC = col || '#fff'; }
  },
  frame(now) {
    this.time = now;
    if (this.dirtyBg) this.drawBg();
    if (this.dirtyMap) this.drawMap();
    if (this.hq) this.drawAmbient(now);
    this.drawGame(now);
  },

  /* ---------- décor de fond ---------- */
  drawBg() {
    this.dirtyBg = false;
    const c = this.cx.bg, W = View.w, H = View.h, T = this.theme, rng = mulberry32(7);
    if (W < 4 || H < 4) return;
    c.setTransform(View.dpr, 0, 0, View.dpr, 0, 0);
    let g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, T.top); g.addColorStop(1, T.bot);
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    const stars = (n, a) => {
      for (let i = 0; i < n; i++) { c.fillStyle = `rgba(255,255,255,${(rng() * a).toFixed(2)})`; const s = rng() < .1 ? 2 : 1; c.fillRect(rng() * W, rng() * H, s, s); }
    };
    const neb = (x, y, r, col, a) => { const gg = c.createRadialGradient(x, y, 0, x, y, r); gg.addColorStop(0, rgba(col, a)); gg.addColorStop(1, rgba(col, 0)); c.fillStyle = gg; c.fillRect(x - r, y - r, r * 2, r * 2); };
    switch (this.themeKey) {
      case 'theme-cyber': {
        stars(240, .8);
        const sr = Math.min(W, H) * .3, sx = W * .5, sy = H * .64;
        const sun = Spr.mk(sr * 2, sr * 2, x => {
          const gg = x.createLinearGradient(0, 0, 0, sr * 2);
          gg.addColorStop(0, '#ffe066'); gg.addColorStop(.5, '#ff2bd6'); gg.addColorStop(1, '#5a00a8');
          x.fillStyle = gg; circ(x, sr, sr, sr); x.fill();
          x.globalCompositeOperation = 'destination-out';
          for (let i = 0; i < 9; i++) x.fillRect(0, sr * (1.05 + i * .11), sr * 2, 2 + i * 1.4);
        }, 1);
        neb(sx, sy, sr * 2.2, '#ff2bd6', .18);
        c.globalAlpha = .6; c.drawImage(sun, sx - sr, sy - sr); c.globalAlpha = 1;
        const hz = H * .66;
        c.fillStyle = '#04011a'; c.fillRect(0, hz, W, H - hz);
        c.strokeStyle = 'rgba(255,43,214,.25)'; c.lineWidth = 1; c.beginPath();
        for (let i = -24; i <= 24; i++) { c.moveTo(W / 2 + i * 14, hz); c.lineTo(W / 2 + i * W * .1, H); }
        for (let k = 0; k < 16; k++) { const y = hz + Math.pow(k / 15, 2.2) * (H - hz); c.moveTo(0, y); c.lineTo(W, y); }
        c.stroke();
        c.strokeStyle = 'rgba(0,243,255,.4)'; c.fillStyle = '#060120'; c.beginPath(); c.moveTo(0, hz);
        for (let x = 0; x <= W + 1; x += W / 26) c.lineTo(x, hz - rng() * H * .13 * (Math.abs(x - W / 2) > W * .22 ? 1 : .25));
        c.lineTo(W, hz); c.closePath(); c.fill(); c.stroke();
        break;
      }
      case 'theme-matrix': {
        c.font = '14px monospace';
        for (let x = 4; x < W; x += 18) {
          const len = 4 + (rng() * 22 | 0), y0 = rng() * H * 1.2;
          for (let k = 0; k < len; k++) { c.fillStyle = `rgba(0,255,102,${(.13 * (1 - k / len)).toFixed(3)})`; c.fillText(String.fromCharCode(0x30A0 + (rng() * 96 | 0)), x, y0 - k * 16); }
        }
        neb(W / 2, H / 2, Math.max(W, H) * .6, '#00ff66', .07);
        break;
      }
      case 'theme-crimson': {
        neb(W / 2, H * 1.15, H * 1.1, '#ff3c14', .45);
        for (let i = 0; i < 16; i++) neb(rng() * W, rng() * H, 80 + rng() * 240, '#3c000a', .4);
        stars(90, .4);
        c.strokeStyle = 'rgba(255,46,85,.12)'; c.lineWidth = 1; c.beginPath();
        for (let i = 0; i < 8; i++) { let x = rng() * W, y = H; c.moveTo(x, y); while (y > H * .4) { x += rnd(-30, 30); y -= rnd(20, 50); c.lineTo(x, y); } }
        c.stroke();
        break;
      }
      case 'theme-void': {
        stars(280, .9);
        c.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 8; i++) neb(rng() * W, rng() * H, 150 + rng() * 320, i % 2 ? '#c04dff' : '#00a8ff', .1 + rng() * .1);
        c.globalCompositeOperation = 'source-over';
        const bx = W * .5, by = H * .5, br = Math.min(W, H) * .09;
        for (let i = 0; i < 6; i++) {
          c.strokeStyle = rgba(i % 2 ? '#ff9cf5' : '#c04dff', .28 - i * .035); c.lineWidth = br * .2;
          c.beginPath(); c.ellipse(bx, by, br * (1.6 + i * .4), br * (.45 + i * .11), -.25, 0, TAU); c.stroke();
        }
        neb(bx, by, br * 1.8, '#c04dff', .55);
        c.fillStyle = '#000'; circ(c, bx, by, br); c.fill();
        break;
      }
      case 'theme-solar': {
        const sx = W * .86, sy = H * .16, sr = Math.min(W, H) * .16;
        neb(sx, sy, sr * 5, '#ff8c00', .5);
        g = c.createRadialGradient(sx - sr * .3, sy - sr * .3, 0, sx, sy, sr);
        g.addColorStop(0, '#fff3c0'); g.addColorStop(.5, '#ffae00'); g.addColorStop(1, '#ff5e00');
        c.fillStyle = g; circ(c, sx, sy, sr); c.fill();
        for (let i = 0; i < 12; i++) { c.fillStyle = `rgba(255,120,0,${(.025 + rng() * .04).toFixed(3)})`; c.fillRect(0, H * .45 + i * H * .045, W, 2 + rng() * 7); }
        stars(60, .3);
        break;
      }
    }
  },

  /* ---------- ambiance animée (particules d'écran) ---------- */
  initAmbient() {
    const W = View.w, H = View.h, A = [];
    const n = { 'theme-cyber': 46, 'theme-matrix': 36, 'theme-crimson': 70, 'theme-void': 110, 'theme-solar': 60 }[this.themeKey] || 40;
    for (let i = 0; i < n; i++) A.push({ x: Math.random() * W, y: Math.random() * H, v: rnd(.3, 1.2), s: rnd(.6, 2.2), p: Math.random() * TAU, a: Math.random() * TAU, r: 0 });
    this.amb = A;
    if (this.themeKey === 'theme-matrix' && !this.rain) {
      this.rain = [];
      for (let i = 0; i < 6; i++) this.rain.push(Spr.mk(16, 352, x => {
        x.font = 'bold 14px monospace'; x.textAlign = 'center';
        for (let k = 0; k < 22; k++) {
          x.fillStyle = k === 21 ? '#d8ffe4' : `rgba(0,255,102,${((k / 22) * .6).toFixed(2)})`;
          x.fillText(String.fromCharCode(0x30A0 + (Math.random() * 96 | 0)), 8, 14 + k * 16);
        }
      }, 1));
    }
  },
  drawAmbient(now) {
    const c = this.cx.fx, W = View.w, H = View.h, A = this.amb, t = now * .001;
    c.setTransform(View.dpr, 0, 0, View.dpr, 0, 0); c.clearRect(0, 0, W, H);
    c.globalCompositeOperation = 'lighter';
    switch (this.themeKey) {
      case 'theme-cyber':
        for (const p of A) {
          p.y -= p.v * .25; p.x += Math.sin(t + p.p) * .2;
          if (p.y < -10) { p.y = H + 10; p.x = Math.random() * W; }
          c.globalAlpha = .3 + .3 * Math.sin(t * 2 + p.p); const s = p.s * 4;
          c.drawImage(Spr.glow(p.p > 3 ? '#ff2bd6' : '#00f3ff'), p.x - s, p.y - s, s * 2, s * 2);
        }
        break;
      case 'theme-matrix':
        c.globalCompositeOperation = 'source-over';
        for (let i = 0; i < A.length; i++) {
          const p = A[i];
          p.y += p.v * 2.6;
          if (p.y - 352 > H) { p.y = -rnd(0, 300); p.x = Math.floor(Math.random() * W / 18) * 18 + 4; }
          c.globalAlpha = .5; c.drawImage(this.rain[i % 6], p.x, p.y - 352, 16, 352);
        }
        break;
      case 'theme-crimson':
        for (const p of A) {
          p.y -= p.v * .7; p.p += .03; p.x += Math.sin(p.p) * .5;
          if (p.y < -10) { p.y = H + 10; p.x = Math.random() * W; }
          c.globalAlpha = .45 + .45 * Math.sin(t * 3 + p.a); const s = p.s * 3;
          c.drawImage(Spr.glow(p.a > 3 ? '#ff9500' : '#ff2e55'), p.x - s, p.y - s, s * 2, s * 2);
        }
        break;
      case 'theme-void': {
        const bx = W * .5, by = H * .5, rMin = Math.min(W, H) * .09, rMax = Math.max(W, H) * .6;
        for (const p of A) {
          if (!p.r) p.r = rnd(rMin * 1.3, rMax);
          p.a += 3 / p.r; p.r -= .12;
          if (p.r < rMin) p.r = rMax;
          const x = bx + Math.cos(p.a) * p.r, y = by + Math.sin(p.a) * p.r * .45;
          c.globalAlpha = clamp(rMin * 3 / p.r, .15, .9); const s = p.s * 2.4;
          c.drawImage(Spr.glow(p.p > 3 ? '#00e5ff' : '#c04dff'), x - s, y - s, s * 2, s * 2);
        }
        break;
      }
      case 'theme-solar':
        for (const p of A) {
          p.x -= p.v * .8; p.y += p.v * .35;
          if (p.x < -10 || p.y > H + 10) { p.x = W + 10; p.y = Math.random() * H * .7; }
          c.globalAlpha = .35 + .3 * Math.sin(t * 2 + p.p); const s = p.s * 3;
          c.drawImage(Spr.glow('#ffae00'), p.x - s, p.y - s, s * 2, s * 2);
        }
        break;
    }
    c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
  },

  /* ---------- carte statique ---------- */
  drawMap() {
    this.dirtyMap = false;
    const c = this.cx.map, cv = this.cv.map;
    c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, cv.width, cv.height);
    if (!G) return;
    const M = G.map, s = View.scale * View.dpr, A = this.theme.accent, W = M.C * TILE, H = M.R * TILE;
    c.setTransform(s, 0, 0, s, View.ox * View.dpr, View.oy * View.dpr);
    c.shadowColor = A; c.shadowBlur = 26 * View.dpr; c.fillStyle = 'rgba(3,6,13,.8)'; c.fillRect(0, 0, W, H); c.shadowBlur = 0;
    c.fillStyle = 'rgba(255,255,255,.022)';
    for (let y = 0; y < M.R; y++) for (let x = (y & 1); x < M.C; x += 2) c.fillRect(x * TILE, y * TILE, TILE, TILE);
    c.strokeStyle = rgba(A, .07); c.lineWidth = 1 / View.scale; c.beginPath();
    for (let x = 1; x < M.C; x++) { c.moveTo(x * TILE, 0); c.lineTo(x * TILE, H); }
    for (let y = 1; y < M.R; y++) { c.moveTo(0, y * TILE); c.lineTo(W, y * TILE); }
    c.stroke();
    c.fillStyle = rgba(A, .2);
    for (let y = 1; y < M.R; y++) for (let x = 1; x < M.C; x++) c.fillRect(x * TILE - 1, y * TILE - 1, 2, 2);
    c.strokeStyle = rgba(A, .5); c.lineWidth = 2; c.strokeRect(0, 0, W, H);
    c.strokeStyle = A; c.lineWidth = 3; const k = 20;
    for (const [x, y, sx, sy] of [[0, 0, 1, 1], [W, 0, -1, 1], [W, H, -1, -1], [0, H, 1, -1]]) {
      c.beginPath(); c.moveTo(x + sx * k, y); c.lineTo(x, y); c.lineTo(x, y + sy * k); c.stroke();
    }
    // tous les tracés dans le même chemin canvas : la jonction d'une fourche se fond proprement
    const line = () => {
      c.beginPath();
      for (const { drawPts: P } of M.P) { c.moveTo(P[0][0], P[0][1]); for (let i = 1; i < P.length; i++) c.lineTo(P[i][0], P[i][1]); }
    };
    c.lineJoin = 'round'; c.lineCap = 'round';
    line(); c.strokeStyle = rgba(A, .1); c.lineWidth = TILE * 1.22; c.stroke();
    line(); c.shadowColor = A; c.shadowBlur = 14 * View.dpr; c.strokeStyle = rgba(A, .65); c.lineWidth = TILE * .9; c.stroke(); c.shadowBlur = 0;
    line(); c.strokeStyle = '#04070e'; c.lineWidth = TILE * .8; c.stroke();
    line(); c.strokeStyle = rgba(A, .06); c.lineWidth = TILE * .5; c.stroke();
    line(); c.strokeStyle = 'rgba(255,255,255,.07)'; c.lineWidth = 1.5; c.setLineDash([6, 10]); c.stroke(); c.setLineDash([]);
    for (let y = 0; y < M.R; y++) for (let x = 0; x < M.C; x++)
      if (M.cells[y * M.C + x] === 2) this.drawRock(c, (x + .5) * TILE, (y + .5) * TILE, x * 31 + y * 17 + 5);
  },
  drawRock(c, x, y, seed) {
    const r = mulberry32(seed), n = 6 + (r() * 3 | 0);
    c.save(); c.translate(x, y); c.rotate(r() * TAU);
    c.beginPath();
    for (let i = 0; i < n; i++) { const a = i / n * TAU, rr = 9 + r() * 6; i ? c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : c.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); }
    c.closePath();
    const g = c.createLinearGradient(-12, -12, 12, 12); g.addColorStop(0, '#4d5467'); g.addColorStop(1, '#191d27');
    c.fillStyle = g; c.fill(); c.strokeStyle = 'rgba(160,175,200,.35)'; c.lineWidth = 1; c.stroke();
    c.strokeStyle = 'rgba(0,0,0,.45)'; c.beginPath(); c.moveTo(-4, -3); c.lineTo(2, 1); c.lineTo(1, 6); c.stroke();
    c.fillStyle = rgba(this.theme.accent, .55); c.fillRect(r() * 8 - 4, r() * 8 - 4, 2, 2);
    c.restore();
  },

  /* ---------- calque de jeu ---------- */
  drawGame(now) {
    const c = this.cx.game, cv = this.cv.game;
    c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, cv.width, cv.height);
    if (!G) return;
    let sx = 0, sy = 0;
    if (this.shakeA > .4) { sx = (Math.random() - .5) * this.shakeA; sy = (Math.random() - .5) * this.shakeA; this.shakeA *= .88; } else this.shakeA = 0;
    const s = View.scale * View.dpr;
    c.setTransform(s, 0, 0, s, (View.ox + sx) * View.dpr, (View.oy + sy) * View.dpr);
    this.drawFlow(c, now);
    this.drawPortals(c, now);
    this.drawUnder(c, now);
    this.drawEventsUnder(c, now);
    this.drawTraps(c, now);
    this.drawTowers(c, now);
    this.drawFusePairs(c, now);
    this.drawShadows(c);
    this.drawEnemies(c, false);
    this.drawBeams(c, now);
    this.drawEnemies(c, true);
    this.drawAdditive(c);
    this.drawDrops(c);
    this.drawOver(c, now);
    this.drawEventsOver(c, now);
    if (G.wallets) this.drawCoop(c, now);
    this.drawFloats(c);
    if (G.ev) {
      const col = EVENTS[G.ev.k].c;
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.fillStyle = rgba(col, G.ev.k === 'blood' ? .07 : .035); c.fillRect(0, 0, cv.width, cv.height);
      c.strokeStyle = rgba(col, .18 + .12 * Math.sin(now * .006)); c.lineWidth = 8 * View.dpr; c.strokeRect(0, 0, cv.width, cv.height);
    }
    if (G.overdriveT > 0) {
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.strokeStyle = rgba('#ffae00', .25 + .15 * Math.sin(now * .01)); c.lineWidth = 10 * View.dpr; c.strokeRect(0, 0, cv.width, cv.height);
    }
    if (this.flashA > .02) {
      c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = this.flashA; c.fillStyle = this.flashC;
      c.fillRect(0, 0, cv.width, cv.height); c.globalAlpha = 1; this.flashA *= .88;
    } else this.flashA = 0;
  },
  drawFlow(c, t) {
    const M = G.map, gap = 54, off = (t * .045) % gap, A = this.theme.accent;
    c.globalCompositeOperation = 'lighter';
    c.strokeStyle = rgba(A, .32); c.lineWidth = 2; c.lineCap = 'round'; c.lineJoin = 'round';
    c.beginPath();
    M.P.forEach((P, pi) => {
      for (let d = off; d < P.mergeDist; d += gap) {
        Path.posAt(d, _pt, pi);
        const ca = Math.cos(_pt.a), sa = Math.sin(_pt.a), x = _pt.x, y = _pt.y;
        c.moveTo(x - ca * 3 - sa * 5, y - sa * 3 + ca * 5); c.lineTo(x + ca * 3, y + sa * 3); c.lineTo(x - ca * 3 + sa * 5, y - sa * 3 - ca * 5);
      }
    });
    c.stroke();
    c.globalCompositeOperation = 'source-over';
  },
  drawPortals(c, t) {
    const M = G.map, [xx, xy] = M.exit, sec = this.theme.sec, A = this.theme.accent, k = t * .002;
    for (const P of M.P) {
      const [ex, ey] = P.entry;
      c.lineWidth = 2.5; c.strokeStyle = rgba(sec, .85);
      for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(ex, ey, 15, k + i * TAU / 3, k + i * TAU / 3 + 1.3); c.stroke(); }
      c.strokeStyle = rgba(sec, .45); c.lineWidth = 1.5; c.beginPath(); c.arc(ex, ey, 9, -k * 1.5, -k * 1.5 + 4); c.stroke();
    }
    const ratio = G.lives / G.maxLives, col = ratio > .5 ? A : ratio > .25 ? '#ffae00' : '#ff2a6d', pul = 1 + Math.sin(t * .005) * .08;
    c.save(); c.translate(xx, xy); c.rotate(k * .5);
    polyPath(c, 6, 17 * pul, 0); c.fillStyle = 'rgba(5,8,15,.92)'; c.fill(); c.strokeStyle = col; c.lineWidth = 2; c.stroke();
    polyPath(c, 6, 10 * pul, Math.PI / 6); c.strokeStyle = rgba(col, .6); c.lineWidth = 1.5; c.stroke();
    c.restore();
    c.globalCompositeOperation = 'lighter';
    c.drawImage(Spr.glow(col), xx - 15, xy - 15, 30, 30);
    for (const P of M.P) c.drawImage(Spr.glow(sec, false), P.entry[0] - 12, P.entry[1] - 12, 24, 24);
    c.globalCompositeOperation = 'source-over';
  },
  rangeCircle(c, x, y, r, col, fa, sa, dash) {
    if (r <= 0) return;
    c.beginPath(); c.arc(x, y, r, 0, TAU);
    c.fillStyle = rgba(col, fa); c.fill();
    c.strokeStyle = rgba(col, sa); c.lineWidth = 1.5;
    if (dash) c.setLineDash([6, 6]);
    c.stroke();
    if (dash) c.setLineDash([]);
  },
  supportTiles(c, tx, ty, lvl, col) {
    c.fillStyle = col; c.globalAlpha = .22;
    for (const [dx, dy] of NBZ[lvl]) {
      const x = tx + dx, y = ty + dy;
      if (x < 0 || y < 0 || x >= G.map.C || y >= G.map.R) continue;
      c.fillRect(x * TILE + 2, y * TILE + 2, TILE - 4, TILE - 4);
    }
    c.globalAlpha = 1;
  },
  drawUnder(c) {
    const sel = UI.sel, h = UI.hover, A = this.theme.accent, M = G.map;
    if (G.recycling) {
      const r = G.recycling, x = (r.tx + .5) * TILE, y = (r.ty + .5) * TILE;
      c.strokeStyle = '#39ff88'; c.lineWidth = 3;
      c.beginPath(); c.arc(x, y, 16, -Math.PI / 2, -Math.PI / 2 + (1 - r.t / 60) * TAU); c.stroke();
    }
    if (sel) {
      this.rangeCircle(c, sel.cx, sel.cy, sel.range, A, .06, .55, false);
      if (sel.d.support) this.supportTiles(c, sel.tx, sel.ty, Towers.reach(sel), '#39ff88');
      c.strokeStyle = '#ffffff'; c.lineWidth = 1.5; c.strokeRect(sel.tx * TILE + 1, sel.ty * TILE + 1, TILE - 2, TILE - 2);
    }
    if (UI.selDebris) { const d = UI.selDebris; c.strokeStyle = '#ffffff'; c.lineWidth = 1.5; c.strokeRect(d.tx * TILE + 1, d.ty * TILE + 1, TILE - 2, TILE - 2); }
    if (h.inside && !h.touch && !UI.placing && !UI.targeting && h.tx >= 0 && h.ty >= 0 && h.tx < M.C && h.ty < M.R) {
      const ht = Towers.at(h.tx, h.ty);
      if (ht && ht !== sel) {
        this.rangeCircle(c, ht.cx, ht.cy, ht.range, '#ffffff', .03, .3, true);
        if (ht.d.support) this.supportTiles(c, ht.tx, ht.ty, Towers.reach(ht), '#39ff88');
      }
      if (M.cells[h.ty * M.C + h.tx] !== 1) { c.fillStyle = 'rgba(255,255,255,.06)'; c.fillRect(h.tx * TILE, h.ty * TILE, TILE, TILE); }
    }
  },
  drawTowers(c, t) {
    const od = G.overdriveT > 0;
    for (const tw of G.towers) {
      const x = tw.cx, y = tw.cy, d = tw.d, off = tw.stun > 0 || tw.over;
      if (d.kind === 'radar' && !off) {
        c.fillStyle = rgba(d.color, .07); c.beginPath(); c.moveTo(x, y); c.arc(x, y, tw.range, tw.spin - .55, tw.spin); c.closePath(); c.fill();
      }
      if ((tw.oc || od) && !off && d.kind !== 'support') {
        c.strokeStyle = od ? 'rgba(255,174,0,.85)' : rgba('#ff3355', .45 + .3 * Math.sin(t * .012));
        c.lineWidth = 2; c.beginPath(); c.arc(x, y, 21.5, 0, TAU); c.stroke();
      }
      // apparition / amélioration : petit rebond
      const age = t - tw.born, pop = age >= 0 && age < 340;
      if (pop) { const k = age / 340 - 1, s = 1 + 2.70158 * k * k * k + 1.70158 * k * k; c.save(); c.translate(x, y); c.scale(s, s); c.translate(-x, -y); }
      c.drawImage(Spr.base(tw.key), x - 32, y - 32, 64, 64);
      const rot = d.spinHead ? tw.spin : (d.kind === 'support' ? 0 : tw.ang + Math.PI / 2);
      c.save(); c.translate(x, y);
      if (rot) c.rotate(rot);
      if (tw.recoil > .2) c.translate(0, tw.recoil);
      if (off) c.globalAlpha = .45;
      c.drawImage(Spr.head(tw.key), -32, -32, 64, 64);
      drawHeadExtras(c, d, t, off, this.hq);
      c.restore();
      if (pop) c.restore();
      if (tw.heat > 1) {
        const p = tw.heat / 100;
        c.fillStyle = 'rgba(0,0,0,.75)'; c.fillRect(x - 12, y + 19, 24, 4);
        c.fillStyle = tw.over ? '#777' : p > .8 ? '#ff3355' : p > .5 ? '#ffae00' : '#39ff88';
        c.fillRect(x - 11.5, y + 19.5, 23 * p, 3);
      }
      if (tw.level > 1) {
        const n = Math.min(9, tw.level - 1), maxed = tw.level >= (d.kind === 'support' ? 5 : 10), om = tw.level - 10;
        if (om > 0) {
          c.fillStyle = '#ff4df0';
          for (let i = 0; i < om; i++) { const a = Math.PI / 2 + (i - (om - 1) / 2) * .3; c.beginPath(); c.arc(x + Math.cos(a) * 27, y + Math.sin(a) * 27, 2.2, 0, TAU); c.fill(); }
        }
        for (let i = 0; i < n; i++) {
          const a = -Math.PI / 2 + (i - (n - 1) / 2) * .25;
          c.fillStyle = maxed ? '#ffd23f' : i >= 4 ? '#4df3ff' : '#39ff88';
          c.fillRect(x + Math.cos(a) * 22 - 1.5, y + Math.sin(a) * 22 - 1.5, 3, 3);
        }
      }
      // spécialisation : losange doré ; choix en attente : losange qui clignote
      if (tw.spec != null || (!G.demo && Towers.needsSpec(tw) && ((t / 300) | 0) % 2)) {
        c.fillStyle = '#ffd23f'; c.beginPath(); c.moveTo(x + 15, y + 9); c.lineTo(x + 19, y + 13); c.lineTo(x + 15, y + 17); c.lineTo(x + 11, y + 13); c.closePath(); c.fill();
        c.strokeStyle = '#000'; c.lineWidth = 1; c.stroke();
      }
      if (tw.stun > 0) {
        c.fillStyle = '#fff35c'; c.font = 'bold 13px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillText(TXT('⚡'), x + 14, y - 13);
      }
    }
  },
  drawTraps(c, t) {
    for (const tr of G.traps) {
      if (tr.ang === undefined) { const pi = Math.max(0, tr.dists.findIndex(d => d !== undefined)); Path.posAt(tr.dists[pi] || 0, _pt, pi); tr.ang = _pt.a; }
      const age = t - tr.born, s = age >= 0 && age < 250 ? .6 + .4 * age / 250 : 1;
      c.save(); c.translate(tr.x, tr.y); c.scale(s, s);
      if (tr.type === 'barricade') c.rotate(tr.ang + Math.PI / 2);
      if (tr.hitT > 0) c.translate(rnd(-1, 1), rnd(-1, 1));
      drawTrapShape(c, tr.type, ((t / 400) | 0) % 2 === 0);
      c.restore();
      if (tr.type === 'barricade' && tr.hp < tr.max) {
        const p = Math.max(0, tr.hp / tr.max);
        c.fillStyle = 'rgba(0,0,0,.75)'; c.fillRect(tr.x - 14, tr.y - 20, 28, 4);
        c.fillStyle = p > .5 ? '#ffae00' : '#ff2a6d'; c.fillRect(tr.x - 13.5, tr.y - 19.5, 27 * p, 3);
      }
    }
  },
  // indice visuel : deux tourelles voisines peuvent fusionner (vif si le plan est acquis)
  drawFusePairs(c, t) {
    const P = G.fusePairs; if (!P || !P.length) return;
    const pulse = .5 + .5 * Math.sin(t * .006);
    for (const p of P) {
      if (p.a.dead || p.b.dead) continue;
      const mx = (p.a.cx + p.b.cx) / 2, my = (p.a.cy + p.b.cy) / 2, s = p.owned ? 4.5 + pulse * 1.5 : 3;
      c.beginPath(); c.moveTo(mx, my - s); c.lineTo(mx + s, my); c.lineTo(mx, my + s); c.lineTo(mx - s, my); c.closePath();
      if (p.owned) {
        c.globalCompositeOperation = 'lighter';
        c.drawImage(Spr.glow(p.col), mx - 11, my - 11, 22, 22);
        c.globalCompositeOperation = 'source-over';
        c.fillStyle = '#ffffff'; c.fill(); c.strokeStyle = p.col; c.lineWidth = 1.5; c.stroke();
      } else {
        c.fillStyle = 'rgba(255,43,214,.35)'; c.fill();
      }
    }
  },
  drawShadows(c) {
    c.fillStyle = 'rgba(0,0,0,.35)';
    const a = this.alpha;
    for (const e of G.enemies) {
      if (!e.alive || !e.air) continue;
      const x = e.px + (e.x - e.px) * a, y = e.py + (e.y - e.py) * a;
      c.beginPath(); c.ellipse(x + 5, y + 13, e.r * .9, e.r * .4, 0, 0, TAU); c.fill();
    }
    const P = Shots.pool;
    for (let i = 0; i < P.n; i++) {
      const p = P.a[i];
      if (p.k === 1) { c.beginPath(); c.ellipse(p.px + (p.x - p.px) * a, p.py + (p.y - p.py) * a, 4, 2, 0, 0, TAU); c.fill(); }
    }
  },
  drawEnemies(c, air) {
    const al = this.alpha;
    for (const e of G.enemies) {
      if (!e.alive || e.air !== air) continue;
      const x = e.px + (e.x - e.px) * al, y = e.py + (e.y - e.py) * al;
      const spr = Spr.enemy(e.type, e.elite), sz = spr.width / Spr.k, hs = sz / 2;
      const hidden = hid(e), ga = e.phased ? .12 : hidden ? .22 : 1;
      c.globalAlpha = ga;
      if (e.d.rot) { c.save(); c.translate(x, y); c.rotate(e.ang); c.drawImage(spr, -hs, -hs, sz, sz); c.restore(); }
      else c.drawImage(spr, x - hs, y - hs, sz, sz);
      if (e.hitT > 0 && !hidden) {
        c.globalCompositeOperation = 'lighter'; c.globalAlpha = .45;
        c.drawImage(Spr.glow('#ffffff', false), x - e.r * 1.3, y - e.r * 1.3, e.r * 2.6, e.r * 2.6);
        c.globalCompositeOperation = 'source-over'; c.globalAlpha = ga;
      }
      if (e.freezeT > 0) {
        c.fillStyle = 'rgba(170,230,255,.45)'; c.strokeStyle = 'rgba(220,250,255,.9)'; c.lineWidth = 1;
        roundRect(c, x - e.r - 3, y - e.r - 3, e.r * 2 + 6, e.r * 2 + 6, 3); c.fill(); c.stroke();
      } else if (e.slowT > 0) {
        c.strokeStyle = 'rgba(110,200,255,.75)'; c.lineWidth = 1.5; c.beginPath(); c.arc(x, y, e.r + 3, 0, TAU); c.stroke();
      }
      if (e.shield > 0) {
        c.strokeStyle = 'rgba(77,243,255,.9)'; c.lineWidth = 2;
        c.beginPath(); c.arc(x, y, e.r + 5, -Math.PI / 2, -Math.PI / 2 + TAU * e.shield / e.maxShield); c.stroke();
      }
      if (e.d.mega) {
        const rr = e.r + 10 + Math.sin(performance.now() * .004) * 3;
        c.strokeStyle = rgba(e.d.color, .55); c.lineWidth = 2; c.setLineDash([10, 8]); c.lineDashOffset = -performance.now() * .03 * (e.mph & 1 ? -1 : 1);
        c.beginPath(); c.arc(x, y, rr, 0, TAU); c.stroke(); c.setLineDash([]);
        if (e.inv > 0) {
          c.globalCompositeOperation = 'lighter'; c.globalAlpha = .35 + .25 * Math.sin(performance.now() * .02);
          c.drawImage(Spr.glow('#ffffff', false), x - e.r * 2, y - e.r * 2, e.r * 4, e.r * 4);
          c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
          c.save(); c.translate(x, y); c.strokeStyle = 'rgba(255,255,255,.9)'; c.lineWidth = 2.5; polyPath(c, 6, e.r + 14, performance.now() * .002); c.stroke(); c.restore();
        }
      }
      if (e.markT > 0 && !hidden) {
        const r = e.r + 7, q = 4;
        c.strokeStyle = 'rgba(255,60,90,.85)'; c.lineWidth = 1.2; c.beginPath();
        c.moveTo(x - r, y - r + q); c.lineTo(x - r, y - r); c.lineTo(x - r + q, y - r);
        c.moveTo(x + r - q, y - r); c.lineTo(x + r, y - r); c.lineTo(x + r, y - r + q);
        c.moveTo(x + r, y + r - q); c.lineTo(x + r, y + r); c.lineTo(x + r - q, y + r);
        c.moveTo(x - r + q, y + r); c.lineTo(x - r, y + r); c.lineTo(x - r, y + r - q);
        c.stroke();
      }
      if (e.hp < e.maxHp && !hidden) {
        const w = Math.max(16, e.r * 2), p = Math.max(0, e.hp / e.maxHp);
        c.fillStyle = 'rgba(0,0,0,.75)'; c.fillRect(x - w / 2 - 1, y - e.r - 9, w + 2, 4);
        c.fillStyle = p > .5 ? '#39ff88' : p > .25 ? '#ffae00' : '#ff2a6d'; c.fillRect(x - w / 2, y - e.r - 8.5, w * p, 3);
      }
      c.globalAlpha = 1;
    }
  },
  drawBeams(c, t) {
    let any = false;
    const al = this.alpha;
    for (const tw of G.towers) {
      const e = tw.beam;
      if (!e || !e.alive || tw.d.kind !== 'beam' || tw.over || tw.stun > 0) continue;
      if (!any) { c.globalCompositeOperation = 'lighter'; c.lineCap = 'round'; any = true; }
      const ex = e.px + (e.x - e.px) * al, ey = e.py + (e.y - e.py) * al;
      const mx = tw.cx + Math.cos(tw.ang) * 18, my = tw.cy + Math.sin(tw.ang) * 18;
      const f = .75 + .25 * Math.sin(t * .04 + tw.id), w = 1 + tw.ramp * .5;
      c.strokeStyle = tw.d.color;
      c.beginPath(); c.moveTo(mx, my); c.lineTo(ex, ey);
      c.globalAlpha = .22 * f; c.lineWidth = 9 * w; c.stroke();
      c.globalAlpha = .85; c.lineWidth = 2.5 * w; c.stroke();
      c.strokeStyle = '#ffffff'; c.globalAlpha = .9; c.lineWidth = 1; c.stroke();
      c.globalAlpha = 1;
      const gs = 14 + tw.ramp * 5;
      c.drawImage(Spr.glow(tw.d.color), ex - gs / 2, ey - gs / 2, gs, gs);
      c.drawImage(Spr.glow(tw.d.color), mx - 8, my - 8, 16, 16);
    }
    if (any) { c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1; }
  },
  drawAdditive(c) {
    const P = FX.parts, hq = this.hq, al = this.alpha;
    for (let i = 0; i < P.n; i++) {
      const p = P.a[i]; if (!p.sm) continue;
      const k = p.life / p.max;
      c.globalAlpha = k * .55; c.fillStyle = p.col;
      c.beginPath(); c.arc(p.x, p.y, p.sz * (1.8 - k * .8), 0, TAU); c.fill();
    }
    c.globalAlpha = 1;
    c.globalCompositeOperation = 'lighter';
    for (const v of G.vortices) {
      const a = Math.min(1, v.life / 20, (v.max - v.life) / 10 + .2);
      c.globalAlpha = a * .8; c.drawImage(Spr.glow(v.col, false), v.x - v.r, v.y - v.r, v.r * 2, v.r * 2);
      c.globalAlpha = a; c.strokeStyle = v.col; c.lineWidth = 2;
      for (let i = 0; i < 4; i++) { const r = v.r * (.3 + i * .18), s = v.a * (1.7 - i * .3) + i * 1.3; c.beginPath(); c.arc(v.x, v.y, r, s, s + 2.2); c.stroke(); }
    }
    c.globalAlpha = 1;
    const S = Shots.pool;
    for (let i = 0; i < S.n; i++) {
      const p = S.a[i], sz = p.sz * 3.2;
      const x = p.px + (p.x - p.px) * al, y = (p.py + (p.y - p.py) * al) - (p.k === 1 ? p.h : 0);
      c.drawImage(Spr.glow(p.col), x - sz, y - sz, sz * 2, sz * 2);
    }
    c.lineCap = 'round'; c.lineJoin = 'round';
    const L = FX.lines;
    for (let i = 0; i < L.n; i++) {
      const l = L.a[i], a = l.life / l.max;
      c.strokeStyle = l.col; c.globalAlpha = a; c.lineWidth = l.w * (.6 + a * .4);
      c.beginPath(); c.moveTo(l.pts[0], l.pts[1]);
      for (let k = 1; k < l.np; k++) c.lineTo(l.pts[k * 2], l.pts[k * 2 + 1]);
      c.stroke();
    }
    const R = FX.rings;
    for (let i = 0; i < R.n; i++) {
      const r = R.a[i], k = 1 - r.life / r.max, e = 1 - (1 - k) * (1 - k);
      c.globalAlpha = 1 - k; c.strokeStyle = r.col; c.lineWidth = r.w * (1 - k * .5);
      c.beginPath(); c.arc(r.x, r.y, Math.max(0, r.r0 + (r.r1 - r.r0) * e), 0, TAU); c.stroke();
    }
    for (let i = 0; i < P.n; i++) {
      const p = P.a[i]; if (p.sm) continue;
      c.globalAlpha = p.life / p.max;
      if (hq) { const s = p.sz * 2.2; c.drawImage(Spr.glow(p.col), p.x - s, p.y - s, s * 2, s * 2); }
      else { c.fillStyle = p.col; c.fillRect(p.x - p.sz / 2, p.y - p.sz / 2, p.sz, p.sz); }
    }
    for (const tw of G.towers) {
      if (tw.flash <= 0 || tw.d.kind === 'beam' || tw.d.kind === 'pulse' || tw.d.kind === 'cone') continue;
      const s = 6 + tw.flash * 2.5, mx = tw.cx + Math.cos(tw.ang) * 20, my = tw.cy + Math.sin(tw.ang) * 20;
      c.globalAlpha = tw.flash / 5; c.drawImage(Spr.glow(tw.d.color), mx - s, my - s, s * 2, s * 2);
    }
    c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
  },
  /* ---------- événements aléatoires ---------- */
  drawEventsUnder(c, t) {
    for (const k of G.craters) {
      const a = Math.min(1, k.life / 240);
      const g = c.createRadialGradient(k.x, k.y, 0, k.x, k.y, k.r);
      g.addColorStop(0, `rgba(8,5,3,${(.75 * a).toFixed(3)})`); g.addColorStop(.7, `rgba(30,14,6,${(.45 * a).toFixed(3)})`); g.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = g; c.beginPath(); c.arc(k.x, k.y, k.r, 0, TAU); c.fill();
      if (k.life > 600) { c.strokeStyle = rgba('#ff8a3d', (k.life - 600) / 300 * .7); c.lineWidth = 2; c.beginPath(); c.arc(k.x, k.y, k.r * .55, 0, TAU); c.stroke(); }
    }
    const rf = G.rift;
    if (rf) {
      const life = rf.T - rf.t, sc = Math.min(1, life / 30, rf.t / 40), r = 30 * sc;
      c.save(); c.translate(rf.x, rf.y);
      const g = c.createRadialGradient(0, 0, 0, 0, 0, r * 1.6); g.addColorStop(0, 'rgba(0,0,0,.9)'); g.addColorStop(.45, rgba('#c43dff', .55)); g.addColorStop(1, rgba('#c43dff', 0));
      c.fillStyle = g; c.beginPath(); c.arc(0, 0, r * 1.6, 0, TAU); c.fill();
      c.strokeStyle = '#e9a8ff'; c.lineWidth = 2;
      for (let i = 0; i < 3; i++) { c.rotate(t * .003 + i * 2.1); c.beginPath(); c.ellipse(0, 0, r, r * .45, 0, 0, Math.PI * 1.3); c.stroke(); }
      c.restore();
    }
    for (const p of G.pods) {
      if (p.age < 50) continue;
      const left = 1 - (p.age - 50) / 720, blink = left < .25 && (t % 300 < 150);
      c.save(); c.translate(p.x, p.y);
      c.strokeStyle = rgba('#39ff88', .5 + .3 * Math.sin(t * .008)); c.lineWidth = 2;
      c.beginPath(); c.arc(0, 0, 22 + 3 * Math.sin(t * .006), 0, TAU); c.stroke();
      c.strokeStyle = blink ? '#ff2a6d' : '#39ff88'; c.lineWidth = 3;
      c.beginPath(); c.arc(0, 0, 26, -Math.PI / 2, -Math.PI / 2 + left * TAU); c.stroke();
      c.fillStyle = '#1a2230'; c.strokeStyle = '#9fb0cc'; c.lineWidth = 1.5;
      c.beginPath(); c.moveTo(-10, 12); c.lineTo(-12, -4); c.lineTo(-6, -13); c.lineTo(6, -13); c.lineTo(12, -4); c.lineTo(10, 12); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = blink ? '#ff2a6d' : '#39ff88'; c.fillRect(-7, -2, 14, 4);
      c.fillStyle = '#ffffff'; c.globalAlpha = .6 + .4 * Math.sin(t * .01); c.fillRect(-2, -10, 4, 4); c.globalAlpha = 1;
      c.restore();
    }
  },
  drawEventsOver(c, t) {
    // astéroïdes : cible au sol puis rocher en flammes
    for (const m of G.meteors) {
      const W = m.warn || 70;
      if (m.t > W) continue;
      const k = m.t / W, r = m.big ? 95 : 68, mc = m.sab ? '#ff2a6d' : '#ff8a3d';
      c.strokeStyle = rgba(mc, .35 + .55 * (1 - k)); c.lineWidth = m.sab === 2 ? 3 : 2; c.setLineDash([7, 6]); c.lineDashOffset = t * .05;
      c.beginPath(); c.arc(m.x, m.y, r * (.6 + .4 * k), 0, TAU); c.stroke(); c.setLineDash([]);
      c.fillStyle = rgba(mc, .08 + .12 * (1 - k)); c.beginPath(); c.arc(m.x, m.y, r * .6, 0, TAU); c.fill();
      if (m.sab === 2) {
        c.font = '900 22px Bahnschrift,"Segoe UI",sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillStyle = 'rgba(0,0,0,.7)'; c.fillText(Math.ceil(m.t / 60), m.x + 1, m.y - 37); c.fillStyle = '#ff2a6d'; c.fillText(Math.ceil(m.t / 60), m.x, m.y - 38);
        c.strokeStyle = rgba('#ff2a6d', .9); c.lineWidth = 2; c.strokeRect(m.x - 22, m.y - 22, 44, 44);
      }
      if (m.t > 70) continue;   // le rocher n'apparaît qu'à la fin de l'avertissement
      const kk = m.t / 70, hx = m.x + 260 * kk, hy = m.y - 420 * kk, sz = m.sab === 2 ? 18 : m.big ? 11 : 7;
      const g = c.createLinearGradient(hx, hy, hx + 70, hy - 113);
      g.addColorStop(0, 'rgba(255,190,90,.9)'); g.addColorStop(1, 'rgba(255,90,20,0)');
      c.strokeStyle = g; c.lineWidth = sz * 1.6; c.lineCap = 'round';
      c.beginPath(); c.moveTo(hx, hy); c.lineTo(hx + 70, hy - 113); c.stroke();
      c.fillStyle = '#fff2c4'; c.beginPath(); c.arc(hx, hy, sz, 0, TAU); c.fill();
      c.fillStyle = rgba('#ff8a3d', .5); c.beginPath(); c.arc(hx, hy, sz * 1.8, 0, TAU); c.fill();
    }
    for (const b of G.bolts) {
      if (b.t > 40 || (t % 160 < 60)) continue;
      c.strokeStyle = rgba('#fff35c', .7); c.lineWidth = 2; c.setLineDash([4, 5]);
      c.beginPath(); c.arc(b.x, b.y, 60, 0, TAU); c.stroke(); c.setLineDash([]);
      c.fillStyle = rgba('#fff35c', .1); c.beginPath(); c.arc(b.x, b.y, 60, 0, TAU); c.fill();
    }
    for (const p of G.pods) {
      if (p.age >= 50) continue;
      const k = 1 - p.age / 50, y = p.y - 320 * k * k;
      c.fillStyle = rgba('#ffae00', .7); c.beginPath(); c.moveTo(p.x - 6, y + 10); c.lineTo(p.x, y + 26 + Math.random() * 8); c.lineTo(p.x + 6, y + 10); c.fill();
      c.fillStyle = '#1a2230'; c.strokeStyle = '#9fb0cc'; c.lineWidth = 1.5; c.fillRect(p.x - 9, y - 12, 18, 22); c.strokeRect(p.x - 9, y - 12, 18, 22);
      c.strokeStyle = rgba('#39ff88', .4); c.setLineDash([4, 4]); c.beginPath(); c.arc(p.x, p.y, 22 * (1 - k * .5), 0, TAU); c.stroke(); c.setLineDash([]);
    }
    const C = G.comet;
    if (C && C.trail.length >= 4) {
      const T = C.trail; c.lineCap = 'round';
      for (let i = 2; i < T.length; i += 2) {
        const a = 1 - i / T.length;
        c.strokeStyle = `rgba(159,232,255,${(a * .8).toFixed(3)})`; c.lineWidth = 14 * a + 2;
        c.beginPath(); c.moveTo(T[i - 2], T[i - 1]); c.lineTo(T[i], T[i + 1]); c.stroke();
      }
      c.fillStyle = '#ffffff'; c.beginPath(); c.arc(T[0], T[1], 9, 0, TAU); c.fill();
      c.fillStyle = 'rgba(159,232,255,.35)'; c.beginPath(); c.arc(T[0], T[1], 20, 0, TAU); c.fill();
    }
  },
  drawCoop(c, t) {
    for (const tw of G.towers) if (tw.owner != null) {
      const x = tw.tx * TILE + 2, y = tw.ty * TILE + 2;
      c.fillStyle = MP_COL[tw.owner]; c.beginPath(); c.moveTo(x, y); c.lineTo(x + 8, y); c.lineTo(x, y + 8); c.closePath(); c.fill();
    }
    if (!Net.coop) return;
    for (const k in MP.curs) {
    const u = MP.curs[k]; if (t - u.t > 2500) continue;
    u.sx += (u.x - u.sx) * .35; u.sy += (u.y - u.sy) * .35;
    const col = MP_COL[k], nm = MP.name(+k), tx = Math.floor(u.sx / TILE), ty = Math.floor(u.sy / TILE);
    if (u.k) { c.strokeStyle = rgba(col, .8); c.lineWidth = 1.5; c.setLineDash([4, 3]); c.strokeRect(tx * TILE + 2, ty * TILE + 2, TILE - 4, TILE - 4); c.setLineDash([]); }
    c.strokeStyle = col; c.lineWidth = 2;
    c.beginPath(); c.arc(u.sx, u.sy, 9, 0, TAU); c.moveTo(u.sx - 15, u.sy); c.lineTo(u.sx - 5, u.sy); c.moveTo(u.sx + 5, u.sy); c.lineTo(u.sx + 15, u.sy);
    c.moveTo(u.sx, u.sy - 15); c.lineTo(u.sx, u.sy - 5); c.moveTo(u.sx, u.sy + 5); c.lineTo(u.sx, u.sy + 15); c.stroke();
    c.font = '700 11px Bahnschrift,"Segoe UI",sans-serif'; c.textAlign = 'left'; c.textBaseline = 'middle';
    c.fillStyle = 'rgba(0,0,0,.7)'; c.fillText(nm, u.sx + 14, u.sy - 13); c.fillStyle = col; c.fillText(nm, u.sx + 13, u.sy - 14);
    }
  },
  drawDrops(c) {
    for (const d of G.drops) {
      const bob = d.fly ? 0 : Math.sin(d.ph) * 3;
      c.globalAlpha = d.life < 120 && !d.fly ? (d.life % 20 < 10 ? .35 : 1) : 1;
      c.drawImage(Spr.drop(d.type), d.x - 14, d.y - 14 + bob, 28, 28);
      if (!d.fly) {
        c.strokeStyle = rgba(Drops.col[d.type], .5); c.lineWidth = 1;
        c.beginPath(); c.arc(d.x, d.y + bob, 12 + Math.sin(d.ph * 1.5) * 2, 0, TAU); c.stroke();
      }
    }
    c.globalAlpha = 1;
  },
  drawOver(c, t) {
    // marqueur d'atterrissage du Sauteur
    for (const e of G.enemies) {
      if (!e.alive || !e.leapTo) continue;
      Path.posAt(e.leapTo, _pt, e.pi);
      const k = 1 - e.tD / 60, r = 30 - k * 10;
      c.strokeStyle = rgba(e.d.color, .5 + .5 * k); c.lineWidth = 2.5; c.setLineDash([6, 5]); c.lineDashOffset = -t * .06;
      c.beginPath(); c.arc(_pt.x, _pt.y, r, 0, TAU); c.stroke(); c.setLineDash([]);
      c.beginPath(); c.moveTo(e.x, e.y); c.lineTo(_pt.x, _pt.y); c.globalAlpha = .35; c.stroke(); c.globalAlpha = 1;
    }
    for (const s of G.strikes) {
      const k = 1 - s.t / s.max, r = s.r * (1.6 - k * .6);
      c.strokeStyle = rgba(s.col, .4 + k * .5); c.lineWidth = 2;
      c.setLineDash([8, 6]); c.lineDashOffset = -t * .05;
      c.beginPath(); c.arc(s.x, s.y, r, 0, TAU); c.stroke(); c.setLineDash([]);
      c.beginPath(); c.moveTo(s.x - r * .4, s.y); c.lineTo(s.x + r * .4, s.y); c.moveTo(s.x, s.y - r * .4); c.lineTo(s.x, s.y + r * .4); c.stroke();
      c.fillStyle = rgba(s.col, .06 + k * .14); c.beginPath(); c.arc(s.x, s.y, s.r, 0, TAU); c.fill();
    }
    if (Lock.ghosts.length && Net.coop) {
      const k = .35 + .2 * Math.sin(performance.now() / 120);
      for (const g of Lock.ghosts) {
        if (!TOWERS[g.k]) continue;
        const x = (g.x + .5) * TILE, y = (g.y + .5) * TILE;
        c.globalAlpha = k; c.drawImage(Spr.base(g.k), x - 32, y - 32, 64, 64); c.drawImage(Spr.head(g.k), x - 32, y - 32, 64, 64); c.globalAlpha = 1;
        c.strokeStyle = rgba(MP_COL[Net.me] || '#00f3ff', .8); c.lineWidth = 1.5; c.setLineDash([4, 4]);
        c.strokeRect(g.x * TILE + 2, g.y * TILE + 2, TILE - 4, TILE - 4); c.setLineDash([]);
      }
    }
    const h = UI.hover, M = G.map;
    if (UI.placing && UI.placing.startsWith('trap:') && h.inside && h.tx >= 0 && h.ty >= 0 && h.tx < M.C && h.ty < M.R) {
      const type = UI.placing.slice(5), ok = Traps.canPlace(h.tx, h.ty) && Traps.count(type) < TRAPS[type].max, rich = G.money >= Traps.cost(type);
      const x = (h.tx + .5) * TILE, y = (h.ty + .5) * TILE, col = ok && rich ? '#39ff88' : '#ff2a6d';
      c.fillStyle = rgba(col, .18); c.fillRect(h.tx * TILE, h.ty * TILE, TILE, TILE);
      c.strokeStyle = col; c.lineWidth = 1.5; c.strokeRect(h.tx * TILE + 1, h.ty * TILE + 1, TILE - 2, TILE - 2);
      if (ok) {
        if (type === 'mine') this.rangeCircle(c, x, y, TRAPS.mine.r, '#ff5544', .06, .5, true);
        c.globalAlpha = .7; c.save(); c.translate(x, y); drawTrapShape(c, type, true); c.restore(); c.globalAlpha = 1;
      }
    } else if (UI.placing && h.inside && h.tx >= 0 && h.ty >= 0 && h.tx < M.C && h.ty < M.R) {
      const key = UI.placing, d = TOWERS[key], ok = Towers.canPlace(h.tx, h.ty), rich = G.money >= Towers.costOf(key);
      const x = (h.tx + .5) * TILE, y = (h.ty + .5) * TILE, col = ok && rich ? '#39ff88' : '#ff2a6d';
      c.fillStyle = rgba(col, .16); c.fillRect(h.tx * TILE, h.ty * TILE, TILE, TILE);
      c.strokeStyle = col; c.lineWidth = 1.5; c.strokeRect(h.tx * TILE + 1, h.ty * TILE + 1, TILE - 2, TILE - 2);
      if (ok) {
        this.rangeCircle(c, x, y, d.range * G.mod.range, rich ? this.theme.accent : '#ff2a6d', .06, .6, true);
        if (d.support) this.supportTiles(c, h.tx, h.ty, Towers.reachOf(key), '#39ff88');
        for (const [dx, dy] of NB4) {
          const o = Towers.at(h.tx + dx, h.ty + dy);
          if (o && Fusion.recipeFor(key, o.key)) {
            c.strokeStyle = '#ff2bd6'; c.lineWidth = 2; c.setLineDash([4, 3]);
            c.strokeRect(o.tx * TILE + 2, o.ty * TILE + 2, TILE - 4, TILE - 4); c.setLineDash([]);
          }
        }
        c.globalAlpha = .65;
        c.drawImage(Spr.base(key), x - 32, y - 32, 64, 64); c.drawImage(Spr.head(key), x - 32, y - 32, 64, 64);
        c.globalAlpha = 1;
      }
    }
    if (UI.targeting && h.inside) {
      const a = ABILS[UI.targeting], r = a.radius;
      c.strokeStyle = a.color; c.lineWidth = 2; c.setLineDash([10, 6]); c.lineDashOffset = t * .04;
      c.beginPath(); c.arc(h.wx, h.wy, r, 0, TAU); c.stroke(); c.setLineDash([]);
      c.fillStyle = rgba(a.color, .1); c.fill();
      c.beginPath(); c.moveTo(h.wx - 12, h.wy); c.lineTo(h.wx + 12, h.wy); c.moveTo(h.wx, h.wy - 12); c.lineTo(h.wx, h.wy + 12); c.stroke();
    }
  },
  drawFloats(c) {
    const F = FX.floats; if (!F.n) return;
    c.textAlign = 'center'; c.textBaseline = 'middle';
    const inv = 1 / Math.min(1, Math.max(.55, View.scale));
    let font = '';
    for (let i = 0; i < F.n; i++) {
      const f = F.a[i], a = f.life / f.max, pop = f.life > f.max - 8 ? 1.25 : 1;
      const ft = `800 ${Math.round(f.sz * inv * pop)}px Bahnschrift,"Segoe UI",sans-serif`;
      if (ft !== font) { c.font = ft; font = ft; }
      c.globalAlpha = a < .35 ? a / .35 : 1;
      c.fillStyle = 'rgba(0,0,0,.7)'; c.fillText(f.t, f.x + 1, f.y + 1.5);
      c.fillStyle = f.col; c.fillText(f.t, f.x, f.y);
    }
    c.globalAlpha = 1;
  }
};

