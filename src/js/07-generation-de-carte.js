/* ============================== GÉNÉRATION DE CARTE ==============================
   Le chemin est tracé sur un treillis (une case sur deux) : deux couloirs ne se
   touchent jamais, ce qui garantit des emplacements de tourelles entre les virages. */
const MapGen = {
  C: 29, R: 15,
  generate(seed, portrait) {
    const rng = mulberry32(seed);
    const C = this.C, R = this.R, LC = 14, LR = 7;
    // une carte sur deux est « en fourche » : une seconde entrée rejoint le chemin principal
    const fork = rng() < .5;
    let best = null, branch = null;
    for (let a = 0; a < 300 && !best; a++) {
      const p = this.walk(rng, LC, LR, fork ? 28 : 30, fork ? 40 : 46);
      if (!p || this.turns(p) < 9) continue;
      if (fork) { const b = this.branch(rng, LC, LR, p); if (!b) continue; branch = b; }
      best = p;
    }
    if (!best) { best = this.serpentine(LC, LR); branch = null; }
    const cells = new Uint8Array(C * R);
    const toTiles = (nodes, closeTo) => {
      const tiles = [[0, 2 * nodes[0][1] + 1]];
      for (let k = 0; k < nodes.length; k++) {
        const [i, j] = nodes[k];
        if (k > 0) { const [pi, pj] = nodes[k - 1]; tiles.push([pi + i + 1, pj + j + 1]); }
        tiles.push([2 * i + 1, 2 * j + 1]);
      }
      if (closeTo) { const [i, j] = nodes[nodes.length - 1], [mi, mj] = closeTo; tiles.push([i + mi + 1, j + mj + 1]); }
      return tiles;
    };
    const main = toTiles(best);
    main.push([C - 1, 2 * best[best.length - 1][1] + 1]);
    const paths = [main];
    if (branch) {
      // tuiles propres à la branche, puis le tronc commun depuis le point de jonction
      const own = toTiles(branch.nodes, best[branch.k]);
      paths.push(own.concat(main.slice(1 + 2 * branch.k)));
    }
    for (const P of paths) for (const [x, y] of P) cells[y * C + x] = 1;
    // débris recyclables
    let count = Math.floor(C * R * .075), guard = 0;
    while (count > 0 && guard++ < 3000) {
      const x = Math.floor(rng() * C), y = Math.floor(rng() * R);
      if (cells[y * C + x] === 0) { cells[y * C + x] = 2; count--; }
    }
    let map = { C, R, cells, paths };
    if (portrait) map = this.transpose(map);
    return map;
  },
  // seconde entrée : marche qui évite le chemin principal et le rejoint dans sa partie centrale
  branch(rng, LC, LR, A) {
    const onA = new Map(); A.forEach(([i, j], k) => onA.set(j * LC + i, k));
    const kMin = Math.floor(A.length * .3), kMax = Math.floor(A.length * .7);
    const starts = []; for (let j = 0; j < LR; j++) if (!onA.has(j * LC) && Math.abs(j - A[0][1]) >= 2) starts.push(j);
    for (let attempt = 0; attempt < 12 && starts.length; attempt++) {
      const sj = starts[Math.floor(rng() * starts.length)];
      const vis = new Uint8Array(LC * LR), path = [[0, sj]], stack = [this.dirs(rng)];
      vis[sj * LC] = 1;
      let steps = 0;
      while (path.length && steps++ < 1500) {
        const [i, j] = path[path.length - 1];
        if (path.length >= 7) {
          for (const [di, dj] of NB4) {
            const k = onA.get((j + dj) * LC + i + di);
            if (i + di >= 0 && i + di < LC && j + dj >= 0 && j + dj < LR && k !== undefined && k >= kMin && k <= kMax) return { nodes: path.slice(), k };
          }
        }
        const opts = stack[stack.length - 1];
        let moved = false;
        if (path.length < 24) while (opts.length) {
          const [di, dj] = opts.shift(), ni = i + di, nj = j + dj;
          if (ni < 0 || nj < 0 || ni >= LC || nj >= LR || vis[nj * LC + ni] || onA.has(nj * LC + ni)) continue;
          vis[nj * LC + ni] = 1; path.push([ni, nj]); stack.push(this.dirs(rng)); moved = true; break;
        }
        if (!moved) { const [bi, bj] = path.pop(); stack.pop(); vis[bj * LC + bi] = 0; }
      }
    }
    return null;
  },
  walk(rng, LC, LR, minN, maxN) {
    const sj = 1 + Math.floor(rng() * (LR - 2));
    const vis = new Uint8Array(LC * LR);
    const path = [[0, sj]]; vis[sj * LC] = 1;
    const stack = [this.dirs(rng)];
    let steps = 0;
    while (path.length && steps++ < 3000) {
      const [i, j] = path[path.length - 1];
      if (i === LC - 1) { if (path.length >= minN) return path; }
      const opts = stack[stack.length - 1];
      let moved = false;
      if (i !== LC - 1 && path.length < maxN) {
        while (opts.length) {
          const [di, dj] = opts.shift(), ni = i + di, nj = j + dj;
          if (ni < 0 || nj < 0 || ni >= LC || nj >= LR || vis[nj * LC + ni]) continue;
          if (ni === LC - 1 && path.length + 1 < minN) continue;
          vis[nj * LC + ni] = 1; path.push([ni, nj]); stack.push(this.dirs(rng)); moved = true; break;
        }
      }
      if (!moved) { const [bi, bj] = path.pop(); stack.pop(); vis[bj * LC + bi] = 0; }
    }
    return null;
  },
  dirs(rng) {
    const pool = [[1, 0, 1], [0, -1, 1.35], [0, 1, 1.35], [-1, 0, .45]], out = [];
    while (pool.length) { const k = weightedIndex(pool.map(p => p[2]), rng); out.push(pool[k]); pool.splice(k, 1); }
    return out;
  },
  turns(p) {
    let t = 0;
    for (let k = 2; k < p.length; k++) {
      const a = [p[k - 1][0] - p[k - 2][0], p[k - 1][1] - p[k - 2][1]], b = [p[k][0] - p[k - 1][0], p[k][1] - p[k - 1][1]];
      if (a[0] !== b[0] || a[1] !== b[1]) t++;
    }
    return t;
  },
  serpentine(LC, LR) {
    const p = [];
    for (let i = 0; i < LC; i++) {
      if (i % 4 === 0) for (let j = 1; j <= LR - 2; j++) p.push([i, j]);
      else if (i % 4 === 2) for (let j = LR - 2; j >= 1; j--) p.push([i, j]);
      else p.push([i, i % 4 === 1 ? LR - 2 : 1]);
    }
    return p;
  },
  transpose(m) {
    const C2 = m.R, R2 = m.C, cells = new Uint8Array(C2 * R2);
    for (let y = 0; y < m.R; y++) for (let x = 0; x < m.C; x++) cells[x * C2 + y] = m.cells[y * m.C + x];
    return { C: C2, R: R2, cells, paths: m.paths.map(P => P.map(([x, y]) => [y, x])) };
  }
};

