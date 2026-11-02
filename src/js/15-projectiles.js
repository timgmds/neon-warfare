/* ============================== PROJECTILES ============================== */
const Shots = {
  pool: new Pool(() => ({ k: 0, x: 0, y: 0, px: 0, py: 0, vx: 0, vy: 0, sx: 0, sy: 0, tx: 0, ty: 0, h: 0, arc: 0, e: null, last: null,
    dmg: 0, crit: false, src: null, col: '#fff', spd: 8, life: 0, t: 0, dur: 1, splash: 0, ground: false, bounce: 0, sz: 3 }), 700),
  init(p, k, t, x, y, e, dmg, crit) {
    p.k = k; p.x = p.px = x; p.y = p.py = y; p.vx = 0; p.vy = 0; p.e = e; p.last = null; p.tx = e.x; p.ty = e.y;
    p.dmg = dmg; p.crit = crit; p.src = t; p.col = t.d.color; p.splash = (t.d.splash || 0) * G.mod.splash * (t.sm.splash || 1); p.ground = !!t.d.ground;
    p.bounce = t.d.bounce || 0; p.h = 0;
    return p;
  },
  bullet(t, x, y, e, dmg, crit) {
    const p = this.pool.get(); if (!p) return;
    this.init(p, 0, t, x, y, e, dmg, crit); p.spd = t.d.spd || 9; p.life = 100; p.sz = t.d.psz || 2.6;
  },
  shell(t, x, y, e, dmg, crit) {
    const p = this.pool.get(); if (!p) return;
    this.init(p, 1, t, x, y, e, dmg, crit);
    const dist = Math.hypot(e.x - x, e.y - y);
    p.dur = 26 + dist / 9;
    const sp = e.freezeT > 0 ? 0 : e.spd * (e.slowT > 0 ? e.slowF : 1);
    Path.posAt(e.dist + sp * p.dur, _pt, e.pi);
    p.tx = _pt.x; p.ty = _pt.y; p.sx = x; p.sy = y; p.t = 0; p.arc = 30 + dist * .25;
    p.sz = t.d.key === 'magma' ? 5 : 4; p.e = null;
  },
  missiles(t, x, y, e, dmg, crit) {
    const n = t.d.count + (t.sm.missiles || 0), list = Towers._hit, r2 = t.range * t.range;
    list.length = 0;
    for (const o of G.enemies) if (o.alive && o !== e && !hid(o) && d2(o.x, o.y, t.cx, t.cy) <= r2) list.push(o);
    list.sort((a, b) => d2(a.x, a.y, e.x, e.y) - d2(b.x, b.y, e.x, e.y));
    list.unshift(e);
    for (let i = 0; i < n; i++) {
      const p = this.pool.get(); if (!p) return;
      const tg = list[i % Math.min(list.length, n)];
      this.init(p, 2, t, x, y, tg, dmg, crit);
      const a = t.ang + (i - (n - 1) / 2) * .7 + srnd(-.2, .2);
      p.vx = Math.cos(a) * 2.5; p.vy = Math.sin(a) * 2.5; p.spd = 2.5; p.life = 140; p.sz = 2.6;
    }
  },
  vortex(t, e, dmg) {
    const sp = e.freezeT > 0 ? 0 : e.spd * (e.slowT > 0 ? e.slowF : 1);
    Path.posAt(e.dist + sp * 20, _pt, e.pi);
    const d = t.d, vr = d.vr * (t.sm.vr || 1);
    G.vortices.push({ x: _pt.x, y: _pt.y, r: vr, life: d.dur, max: d.dur, dps: dmg, pull: d.pull, src: t, col: d.color, a: 0 });
    FX.ring(_pt.x, _pt.y, d.color, 8, 24, 3, vr * 1.4);
  },
  update() {
    const P = this.pool;
    for (let i = P.n - 1; i >= 0; i--) {
      const p = P.a[i];
      p.px = p.x; p.py = p.y;
      const keep = p.k === 0 ? this.stepBullet(p) : p.k === 1 ? this.stepShell(p) : this.stepMissile(p);
      if (!keep) { p.e = null; p.src = null; p.last = null; P.free(i); }
    }
    this.updateVortices();
  },
  stepBullet(p) {
    if (p.e) { if (p.e.alive) { p.tx = p.e.x; p.ty = p.e.y; } else p.e = null; }
    const dx = p.tx - p.x, dy = p.ty - p.y, dist = Math.hypot(dx, dy);
    if (dist <= p.spd + (p.e ? p.e.r * .5 : 0)) {
      p.x = p.tx; p.y = p.ty;
      this.impact(p);
      if (p.bounce > 0 && p.last) {
        const n = this.nearest(p.x, p.y, 110, p.last, p.ground);
        if (n) { p.e = n; p.bounce--; p.dmg *= .8; p.life = 60; return true; }
      }
      return false;
    }
    p.vx = dx / dist * p.spd; p.vy = dy / dist * p.spd; p.x += p.vx; p.y += p.vy;
    if (Render.hq && p.sz >= 3.5 && (G.tick & 1)) FX.part(p.x, p.y, 0, 0, 12, p.col, p.sz * .6, 1);
    return --p.life > 0;
  },
  impact(p) {
    const s = p.src;
    if (p.splash) {
      Combat.splash(p.x, p.y, p.splash, p.dmg, s, p.crit, p.ground, 0, !!(s && (s.d.slow || s.d.burn)));
      FX.ring(p.x, p.y, p.col, p.splash, 18, 2.2); FX.spark(p.x, p.y, p.col, 10, 3);
      Sfx.play('boom', .45);
      p.last = null;
    } else if (p.e) {
      const e = p.e;
      Combat.hit(e, p.dmg, s, p.crit, s ? s.pierce : 0);
      Status.apply(e, s);
      FX.spark(p.x, p.y, p.col, 3, 1.8, 16);
      p.last = e;
    } else { FX.spark(p.x, p.y, p.col, 2, 1.2, 12); p.last = null; }
  },
  nearest(x, y, r, excl, ground) {
    let best = null, bd = r * r;
    for (const o of G.enemies) {
      if (!o.alive || o === excl || (ground && o.air) || hid(o)) continue;
      const dd = d2(o.x, o.y, x, y);
      if (dd < bd) { bd = dd; best = o; }
    }
    return best;
  },
  stepShell(p) {
    p.t += 1 / p.dur;
    const k = Math.min(1, p.t);
    p.x = lerp(p.sx, p.tx, k); p.y = lerp(p.sy, p.ty, k); p.h = Math.sin(k * Math.PI) * p.arc;
    if (k >= 1) {
      const s = p.src;
      Combat.splash(p.x, p.y, p.splash, p.dmg, s, p.crit, true, 0, !!(s && s.d.burn));
      FX.ring(p.x, p.y, p.col, p.splash * 1.1, 22, 3);
      FX.spark(p.x, p.y, p.col, 14, 3.5, 30, 2.6); FX.spark(p.x, p.y, '#ffffff', 4, 2, 16);
      if (Render.hq) for (let i = 0; i < 4; i++) FX.smoke(p.x + rnd(-8, 8), p.y + rnd(-8, 8), 50, rnd(4, 7));
      Render.shake(2.5); Sfx.play('boom', .55);
      return false;
    }
    if (Render.hq && (G.tick & 1)) FX.part(p.x, p.y - p.h, 0, 0, 14, p.col, 2, 1);
    return true;
  },
  stepMissile(p) {
    if (p.e && !p.e.alive) p.e = this.nearest(p.x, p.y, 160, null, false);
    if (p.e) { p.tx = p.e.x; p.ty = p.e.y; }
    p.spd = Math.min(7.5, p.spd + .18);
    const dx = p.tx - p.x, dy = p.ty - p.y, dist = Math.hypot(dx, dy) || 1;
    p.vx += (dx / dist * p.spd - p.vx) * .16; p.vy += (dy / dist * p.spd - p.vy) * .16;
    p.x += p.vx; p.y += p.vy;
    if (dist < 9 + (p.e ? p.e.r * .5 : 0) || --p.life <= 0) {
      Combat.splash(p.x, p.y, p.splash, p.dmg, p.src, p.crit, false);
      FX.ring(p.x, p.y, p.col, p.splash, 16, 2); FX.spark(p.x, p.y, '#ffaa55', 6, 2.6);
      Sfx.play('boom', .3);
      return false;
    }
    if (Render.hq && (G.tick & 1)) FX.smoke(p.x, p.y, 24, 2.4, '#5a6070');
    return true;
  },
  updateVortices() {
    const V = G.vortices;
    for (let i = V.length - 1; i >= 0; i--) {
      const v = V[i];
      v.life--; v.a += .15;
      const r2 = v.r * v.r;
      for (const o of G.enemies) {
        if (!o.alive || d2(o.x, o.y, v.x, v.y) > r2) continue;
        // aspiration limitée : une fois par tick, et au plus 160 px par ennemi sur toute sa vie
        if (o.pullT !== G.tick && o.pulled < 160) {
          const f = o.boss ? .25 : o.d.heavy ? .2 : o.elite ? .6 : 1, pv = Math.min(v.pull * f, 160 - o.pulled);
          o.pullT = G.tick; o.pulled += pv; o.dist = Math.max(0, o.dist - pv);
        }
        Combat.hit(o, v.dps / 60, v.src, false, 0, true);
      }
      if (Render.hq && (G.tick & 1)) {
        const a = Math.random() * TAU, rr = v.r * rnd(.7, 1.05);
        FX.part(v.x + Math.cos(a) * rr, v.y + Math.sin(a) * rr, -Math.cos(a) * 1.5 + Math.sin(a) * 1.3, -Math.sin(a) * 1.5 - Math.cos(a) * 1.3, 22, v.col, 2, 1);
      }
      if (v.life <= 0) {
        Combat.splash(v.x, v.y, v.r, v.dps * .5, v.src, false, false);
        FX.ring(v.x, v.y, v.col, v.r * 1.3, 22, 3); FX.spark(v.x, v.y, v.col, 16, 3.5);
        V.splice(i, 1);
      }
    }
  }
};

