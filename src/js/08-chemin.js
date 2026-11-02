/* ============================== CHEMIN ============================== */
/* Une carte peut avoir plusieurs tracés (M.P). Chaque ennemi suit le sien (e.pi).
   Les tuiles se suivent à 1 case d'écart, la distance d'une tuile i vaut donc (1,5 + i) cases. */
const Path = {
  ctr: ([x, y]) => [(x + .5) * TILE, (y + .5) * TILE],
  points(T, tail) {
    const c = this.ctr, pts = [], a = c(T[0]), b = c(T[1]);
    pts.push([a[0] - (b[0] - a[0]) * 1.5, a[1] - (b[1] - a[1]) * 1.5], a);
    for (let i = 1; i < T.length - 1; i++) {
      const p = T[i - 1], q = T[i], r = T[i + 1];
      if (q[0] - p[0] !== r[0] - q[0] || q[1] - p[1] !== r[1] - q[1]) pts.push(c(q));
    }
    const y = c(T[T.length - 1]), z = c(T[T.length - 2]);
    pts.push(y);
    if (tail) pts.push([y[0] + (y[0] - z[0]) * 1.5, y[1] + (y[1] - z[1]) * 1.5]);
    return pts;
  },
  one(T, C, mergeAt) {
    const pts = this.points(T, true), n = pts.length;
    const P = { tiles: T, wp: pts, n, px: new Float32Array(n), py: new Float32Array(n), dx: new Float32Array(n), dy: new Float32Array(n),
      len: new Float32Array(n), cum: new Float32Array(n), ang: new Float32Array(n), tdist: new Map() };
    let acc = 0;
    for (let i = 0; i < n; i++) {
      P.px[i] = pts[i][0]; P.py[i] = pts[i][1]; P.cum[i] = acc;
      if (i < n - 1) {
        const dx = pts[i + 1][0] - pts[i][0], dy = pts[i + 1][1] - pts[i][1], l = Math.hypot(dx, dy) || 1;
        P.dx[i] = dx; P.dy[i] = dy; P.len[i] = l; P.ang[i] = Math.atan2(dy, dx); acc += l;
      }
    }
    P.ang[n - 1] = P.ang[n - 2];
    P.total = acc;
    P.entry = this.ctr(T[0]); P.exit = this.ctr(T[T.length - 1]);
    T.forEach(([x, y], i) => P.tdist.set(y * C + x, (1.5 + i) * TILE));
    // tronçon propre d'une branche (avant la jonction) : c'est lui qu'on dessine
    P.mergeDist = mergeAt != null ? (1.5 + mergeAt) * TILE : acc;
    P.drawPts = mergeAt != null ? this.points(T.slice(0, mergeAt + 1), false) : pts;
    return P;
  },
  build(M) {
    const main = M.paths[0], key = ([x, y]) => y * M.C + x, onMain = new Set(main.map(key));
    M.P = M.paths.map((T, pi) => {
      let merge = null;
      if (pi > 0) for (let i = 0; i < T.length; i++) if (onMain.has(key(T[i]))) { merge = i; break; }
      return this.one(T, M.C, merge);
    });
    M.exit = M.P[0].exit;
  },
  place(e) {
    const P = G.map.P[e.pi]; let s = e.seg;
    while (s < P.n - 2 && e.dist > P.cum[s + 1]) s++;
    while (s > 0 && e.dist < P.cum[s]) s--;
    e.seg = s;
    const t = (e.dist - P.cum[s]) / P.len[s];
    e.x = P.px[s] + P.dx[s] * t; e.y = P.py[s] + P.dy[s] * t; e.ang = P.ang[s];
    e.rem = P.total - e.dist;
  },
  posAt(dist, out, pi = 0) {
    const P = G.map.P[pi] || G.map.P[0]; dist = clamp(dist, 0, P.total);
    let lo = 0, hi = P.n - 2;
    while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (P.cum[mid] <= dist) lo = mid; else hi = mid - 1; }
    const t = (dist - P.cum[lo]) / P.len[lo];
    out.x = P.px[lo] + P.dx[lo] * t; out.y = P.py[lo] + P.dy[lo] * t; out.a = P.ang[lo];
    return out;
  }
};

