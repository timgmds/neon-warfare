/* ============================== EFFETS VISUELS (poolés) ============================== */
const FX = {
  parts: new Pool(() => ({ x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, col: '#fff', sz: 2, drag: .92, g: 0, sm: false }), 900),
  rings: new Pool(() => ({ x: 0, y: 0, r0: 0, r1: 0, life: 0, max: 1, col: '#fff', w: 2 }), 160),
  lines: new Pool(() => ({ pts: new Float32Array(24), np: 0, life: 0, max: 1, col: '#fff', w: 2 }), 220),
  floats: new Pool(() => ({ x: 0, y: 0, t: '', col: '#fff', sz: 12, life: 0, max: 1 }), 70),
  setCaps(hq) { this.parts.cap = hq ? 900 : 260; this.floats.cap = hq ? 70 : 40; },
  clear() { this.parts.clear(); this.rings.clear(); this.lines.clear(); this.floats.clear(); },
  part(x, y, vx, vy, life, col, sz, drag = .92, g = 0) {
    const p = this.parts.get(); if (!p) return;
    p.x = x; p.y = y; p.vx = vx; p.vy = vy; p.life = p.max = life; p.col = col; p.sz = sz; p.drag = drag; p.g = g; p.sm = false;
  },
  smoke(x, y, life, sz, col = '#4a5062') {
    const p = this.parts.get(); if (!p) return;
    p.x = x; p.y = y; p.vx = rnd(-.15, .15); p.vy = -rnd(.1, .4); p.life = p.max = life; p.col = col; p.sz = sz; p.drag = .97; p.g = 0; p.sm = true;
  },
  spark(x, y, col, n = 6, spd = 2.5, life = 28, sz = 2.2) {
    if (!Render.hq) n = Math.ceil(n * .4);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU, v = spd * (.25 + Math.random() * .75);
      this.part(x, y, Math.cos(a) * v, Math.sin(a) * v, life * (.6 + Math.random() * .6), col, sz * (.7 + Math.random() * .6));
    }
  },
  ring(x, y, col, r1, life = 22, w = 2, r0 = 4) {
    const r = this.rings.get(); if (!r) return;
    r.x = x; r.y = y; r.r0 = r0; r.r1 = r1; r.life = r.max = life; r.col = col; r.w = w;
  },
  line(x1, y1, x2, y2, col, w, life) {
    const l = this.lines.get(); if (!l) return;
    l.pts[0] = x1; l.pts[1] = y1; l.pts[2] = x2; l.pts[3] = y2; l.np = 2; l.col = col; l.w = w; l.life = l.max = life;
  },
  bolt(x1, y1, x2, y2, col, w, life) {
    const l = this.lines.get(); if (!l) return;
    const n = 7, dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len, amp = Math.min(10, len * .16);
    for (let i = 0; i <= n; i++) {
      const t = i / n, o = (i === 0 || i === n) ? 0 : (Math.random() - .5) * 2 * amp;
      l.pts[i * 2] = x1 + dx * t + nx * o; l.pts[i * 2 + 1] = y1 + dy * t + ny * o;
    }
    l.np = n + 1; l.col = col; l.w = w; l.life = l.max = life;
  },
  float(x, y, t, col, sz = 12) {
    const f = this.floats.get(); if (!f) return;
    f.x = x; f.y = y; f.t = t; f.col = col; f.sz = sz; f.life = f.max = 60;
  },
  update() {
    const P = this.parts;
    for (let i = P.n - 1; i >= 0; i--) {
      const p = P.a[i];
      p.x += p.vx; p.y += p.vy; p.vx *= p.drag; p.vy = p.vy * p.drag + p.g;
      if (--p.life <= 0) P.free(i);
    }
    const R = this.rings; for (let i = R.n - 1; i >= 0; i--) if (--R.a[i].life <= 0) R.free(i);
    const L = this.lines; for (let i = L.n - 1; i >= 0; i--) if (--L.a[i].life <= 0) L.free(i);
    const F = this.floats; for (let i = F.n - 1; i >= 0; i--) { const f = F.a[i]; f.y -= .55; if (--f.life <= 0) F.free(i); }
  }
};

