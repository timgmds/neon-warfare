/* ============================== CARTES PERSO & ÉDITEUR ==============================
   Une carte perso : { n: nom, C, R, c: cases (chaîne, '2' = débris), p: tracés [x0, y0, x1, y1, …] }.
   Tracé 0 : le chemin principal, d'un bord à un autre (le noyau est sur sa dernière case). Les suivants : des entrées
   en plus, qui partent d'un bord et rejoignent le chemin principal ; leur fin reprend celle du chemin principal,
   exactement comme les cartes « en fourche » du générateur.
   Elles se jouent en solo et en multijoueur (l'hôte envoie la carte), mais ne comptent ni pour les records ni pour
   les succès, l'XP et les fragments, comme la Partie perso : un chemin taillé sur mesure rendrait tout trop facile. */
const CMaps = {
  MAX: 24, MIN: 20,
  list() { return Store.data.maps || (Store.data.maps = []); },
  // code de partage : les débris y sont notés par leur position (r), plus court que la grille entière
  code(m) {
    const r = []; for (let i = 0; i < m.c.length; i++) if (m.c[i] === '2') r.push(i);
    return 'NWM1:' + B64.enc(JSON.stringify({ n: m.n, C: m.C, R: m.R, r, p: m.p }));
  },
  read(txt) {
    const s = String(txt || '').trim(), k = s.indexOf('NWM1:');
    if (k < 0) return null;
    try {
      const m = JSON.parse(B64.dec(s.slice(k + 5).split(/\s/)[0]));
      if (m && Array.isArray(m.r) && m.C * m.R > 0 && m.C * m.R < 2000) { const c = new Array(m.C * m.R).fill('0'); for (const i of m.r) if (i >= 0 && i < c.length) c[i] = '2'; m.c = c.join(''); delete m.r; }
      return this.check(m) ? m : null;
    } catch (e) { return null; }
  },
  // structure et règles : même contrôle pour une carte enregistrée, reçue par code ou par le réseau
  check(m) {
    if (!m || m.C !== MapGen.C || m.R !== MapGen.R || typeof m.c !== 'string' || m.c.length !== m.C * m.R) return false;
    if (!Array.isArray(m.p) || !m.p.length || m.p.length > 3 || !m.p.every(f => Array.isArray(f) && f.every(v => Number.isInteger(v)))) return false;
    m.n = String(m.n || 'Carte perso').slice(0, 24);
    return !Editor.validate(Editor.fromMap(m)).err;
  },
  // carte de jeu, au même format que MapGen.generate
  toMap(m, portrait) {
    const C = m.C, R = m.R, cells = new Uint8Array(C * R);
    for (let i = 0; i < C * R; i++) if (m.c.charCodeAt(i) === 50) cells[i] = 2;
    const paths = m.p.map(f => { const t = []; for (let i = 0; i + 1 < f.length; i += 2) t.push([f[i], f[i + 1]]); return t; });
    for (const P of paths) for (const [x, y] of P) cells[y * C + x] = 1;
    const map = { C, R, cells, paths };
    return portrait ? MapGen.transpose(map) : map;
  },
  save(m) {
    const L = this.list(), i = L.findIndex(x => x.n === m.n);
    if (i >= 0) L.splice(i, 1);
    L.unshift(m); if (L.length > this.MAX) L.length = this.MAX;
    Store.save();
  },
  remove(n) { Store.data.maps = this.list().filter(x => x.n !== n); Store.save(); },
  // vignette : les tracés sur fond sombre
  thumb(cv, m, css = 58) {
    const dpr = Math.min(2, window.devicePixelRatio || 1), h = css * m.R / m.C;
    cv.width = Math.round(css * dpr); cv.height = Math.round(h * dpr);
    const x = cv.getContext('2d'), T = cv.width / m.C;
    x.fillStyle = '#04070e'; x.fillRect(0, 0, cv.width, cv.height);
    x.lineCap = x.lineJoin = 'round'; x.lineWidth = T * .7;
    m.p.forEach((f, k) => {
      x.strokeStyle = k ? '#ff2bd6' : '#00f3ff'; x.beginPath();
      for (let i = 0; i + 1 < f.length; i += 2) x[i ? 'lineTo' : 'moveTo']((f[i] + .5) * T, (f[i + 1] + .5) * T);
      x.stroke();
    });
  }
};

const Editor = {
  S: null, tool: 'path', hist: [], cur: null, rockMode: 1, hover: -1, msg: '', ready: false,
  C: () => MapGen.C, R: () => MapGen.R,
  blank() { return { main: [], br: [], rocks: new Uint8Array(MapGen.C * MapGen.R) }; },
  // état d'édition ← carte : le tronçon propre de chaque entrée en plus, et l'indice de sa jonction sur le chemin principal
  fromMap(m) {
    const C = m.C, R = m.R, S = this.blank();
    for (let i = 0; i < C * R; i++) S.rocks[i] = m.c.charCodeAt(i) === 50 ? 1 : 0;
    const tiles = f => { const t = []; for (let i = 0; i + 1 < f.length; i += 2) t.push([f[i], f[i + 1]]); return t; };
    S.main = tiles(m.p[0] || []);
    const key = t => t[1] * C + t[0], idx = new Map(S.main.map((t, i) => [key(t), i]));
    for (const f of m.p.slice(1)) {
      const T = tiles(f), k = T.findIndex(t => idx.has(key(t)));
      let mi = k > 0 ? idx.get(key(T[k])) : -1;
      // la fin de l'entrée doit reprendre exactement la fin du chemin principal
      if (mi >= 0 && (T.length - k !== S.main.length - mi || T.slice(k).some((t, j) => key(t) !== key(S.main[mi + j])))) mi = -1;
      S.br.push({ own: k > 0 ? T.slice(0, k) : T, m: mi });
    }
    return S;
  },
  toData(S, n) {
    const C = MapGen.C, R = MapGen.R, used = this.usedSet(S);
    let c = '';
    for (let i = 0; i < C * R; i++) c += S.rocks[i] && !used.has(i) ? '2' : '0';
    const flat = T => T.flat();
    return { n: String(n || 'Carte perso').slice(0, 24), C, R, c, p: [flat(S.main), ...S.br.map(b => flat(b.own.concat(S.main.slice(b.m))))] };
  },
  usedSet(S) {
    const C = MapGen.C, u = new Set();
    for (const [x, y] of S.main) u.add(y * C + x);
    for (const b of S.br) for (const [x, y] of b.own) u.add(y * C + x);
    return u;
  },
  // une case de bord, et le pas suivant qui rentre dans la carte
  inward(a, b) {
    const dx = b[0] - a[0], dy = b[1] - a[1], C = MapGen.C, R = MapGen.R;
    return (a[0] === 0 && dx === 1) || (a[0] === C - 1 && dx === -1) || (a[1] === 0 && dy === 1) || (a[1] === R - 1 && dy === -1);
  },
  edge(t) { return t[0] === 0 || t[1] === 0 || t[0] === MapGen.C - 1 || t[1] === MapGen.R - 1; },
  validate(S) {
    const C = MapGen.C, R = MapGen.R, M = S.main, seen = new Set();
    const seq = T => {
      for (let i = 0; i < T.length; i++) {
        const [x, y] = T[i];
        if (!(x >= 0 && y >= 0 && x < C && y < R)) return false;
        const k = y * C + x; if (seen.has(k)) return false; seen.add(k);
        if (i && Math.abs(x - T[i - 1][0]) + Math.abs(y - T[i - 1][1]) !== 1) return false;
      }
      return true;
    };
    if (M.length < 2) return { err: 'Tracez le chemin des ennemis : partez d\'un bord de la carte.' };
    if (!seq(M)) return { err: 'Le chemin principal est invalide.' };
    if (!this.inward(M[0], M[1])) return { err: 'Le chemin doit commencer sur un bord et partir vers l\'intérieur.' };
    if (!this.inward(M[M.length - 1], M[M.length - 2])) return { err: 'Menez le chemin jusqu\'à un bord : le noyau se place sur sa dernière case.' };
    if (M.length < CMaps.MIN) return { err: `Chemin trop court : ${M.length} cases, il en faut au moins ${CMaps.MIN}.` };
    if (S.br.length > 2) return { err: 'Trois entrées au maximum.' };
    for (const b of S.br) {
      if (b.own.length < 2 || !seq(b.own)) return { err: 'Une entrée en plus est invalide.' };
      if (!this.inward(b.own[0], b.own[1])) return { err: 'Chaque entrée en plus doit partir d\'un bord vers l\'intérieur.' };
      if (b.m < 0) return { err: 'Chaque entrée en plus doit rejoindre le chemin principal.' };
      const L = b.own[b.own.length - 1], J = M[b.m];
      if (!J || Math.abs(L[0] - J[0]) + Math.abs(L[1] - J[1]) !== 1) return { err: 'Une entrée en plus est mal raccordée.' };
      if (b.m < 2 || b.m > M.length - 4) return { err: 'Une entrée en plus doit rejoindre le chemin loin de son début et du noyau.' };
    }
    return { ok: true };
  },

  /* ---------- fenêtre ---------- */
  open(m) {
    this.S = m ? this.fromMap(m) : this.blank();
    $('ed-name').value = m ? m.n : this.freeName();
    this.hist = []; this.tool = 'path'; this.msg = '';
    this.init();
    UI.open('ov-edit');
    this.tools(); this.list(); this.draw();
    requestAnimationFrame(() => this.draw());
  },
  freeName() { const L = CMaps.list(); let i = L.length + 1; while (L.some(x => x.n === 'Ma carte ' + i)) i++; return 'Ma carte ' + i; },
  init() {
    if (this.ready) return;
    this.ready = true;
    const cv = $('ed-cv');
    cv.addEventListener('pointerdown', e => { e.preventDefault(); const t = this.tile(e); if (!t) return; try { cv.setPointerCapture(e.pointerId); } catch (er) { /* pointeur simulé */ } this.down(t); this.draw(); });
    cv.addEventListener('pointermove', e => {
      const t = this.tile(e), h = t ? t[1] * MapGen.C + t[0] : -1;
      if (this.cur && t) this.move(t);
      if (h !== this.hover || this.cur) { this.hover = h; this.draw(); }
    });
    const up = () => { if (this.cur) { this.cur = null; this.draw(); } };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    cv.addEventListener('pointerleave', () => { this.hover = -1; this.draw(); });
    window.addEventListener('resize', () => { if (UI.stack.includes('ov-edit')) this.draw(); });
    window.addEventListener('keydown', e => {
      if (UI.top() !== 'ov-edit' || e.target.tagName === 'INPUT') return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); this.undo(); }
    });
    $('ed-save').onclick = () => this.save();
    $('ed-play').onclick = () => this.play();
    $('ed-code').onclick = () => { const d = this.data(true); if (d) UI.openXfer('mapexp', d); };
    $('ed-imp').onclick = () => UI.openXfer('mapimp');
  },
  tools() {
    const T = [['path', '✎ CHEMIN', 'Glissez d\'un bord à un autre. Repassez sur vos pas pour revenir en arrière ; cliquez sur une case du chemin pour le reprendre à partir de là.'],
      ['br', '⑂ ENTRÉE EN PLUS', 'Une seconde (ou troisième) entrée : partez d\'un bord libre et rejoignez le chemin principal.'],
      ['rock', '◆ DÉBRIS', 'Débris à recycler (ils bloquent la construction tant qu\'on ne les a pas recyclés).'],
      ['erase', '⌫ GOMME', 'Efface un débris, ou coupe un chemin à partir de la case touchée.']];
    const B = $('ed-tools');
    B.innerHTML = T.map(([k, n, d]) => `<button class="btn${this.tool === k ? ' on' : ''}" data-k="${k}" data-tip="${d}">${n}</button>`).join('') +
      '<span class="ed-sp"></span><button class="btn" data-a="undo" data-tip="Annuler la dernière modification [Ctrl+Z]">↶ ANNULER</button>' +
      '<button class="btn" data-a="rnd" data-tip="Part d\'une carte générée au hasard, à retoucher">⚄ ALÉATOIRE</button>' +
      '<button class="btn danger" data-a="clear">✕ TOUT EFFACER</button>';
    B.querySelectorAll('[data-k]').forEach(b => b.onclick = () => { this.tool = b.dataset.k; Sfx.play('ui'); this.tools(); });
    B.querySelector('[data-a=undo]').onclick = () => this.undo();
    B.querySelector('[data-a=rnd]').onclick = () => {
      this.snap();
      const g = MapGen.generate((Math.random() * 2147483647) | 0, false);
      this.S = this.fromMap({ C: g.C, R: g.R, c: Array.from(g.cells, v => v === 2 ? '2' : '0').join(''), p: g.paths.map(P => P.flat()) });
      this.draw();
    };
    B.querySelector('[data-a=clear]').onclick = () => { this.snap(); this.S = this.blank(); this.msg = ''; this.draw(); };
  },
  list() {
    const L = CMaps.list(), box = $('ed-list'), tabs = $('ed-tabs');
    tabs.hidden = !Online.on();
    tabs.innerHTML = `<button data-k="mine" class="${this.tab !== 'com' ? 'on' : ''}">MES CARTES · ${L.length} / ${CMaps.MAX}</button><button data-k="com" class="${this.tab === 'com' ? 'on' : ''}">COMMUNAUTÉ</button>`;
    tabs.querySelectorAll('button').forEach(b => b.onclick = () => { this.tab = b.dataset.k; Sfx.play('ui'); this.list(); });
    if (this.tab === 'com' && Online.on()) { this.community(); return; }
    $('ed-lh').textContent = `MES CARTES · ${L.length} / ${CMaps.MAX}`; $('ed-lh').hidden = Online.on();
    if (!L.length) { box.innerHTML = '<div class="note" style="padding:6px 0">Aucune carte enregistrée pour l\'instant.</div>'; return; }
    const esc = s => String(s).replace(/[<>&"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' })[c]);
    box.innerHTML = L.map((m, i) => `<div class="ed-it"><canvas></canvas><b title="${esc(m.n)}">${esc(m.n)}</b>
      <button class="btn" data-i="${i}" data-a="e">MODIFIER</button><button class="btn prim" data-i="${i}" data-a="p">JOUER</button>${Online.on() ? `<button class="btn gold" data-i="${i}" data-a="s" title="Publier dans les cartes de la communauté">⇪</button>` : ''}<button class="btn danger" data-i="${i}" data-a="d" title="Supprimer">✕</button></div>`).join('');
    box.querySelectorAll('canvas').forEach((cv, i) => CMaps.thumb(cv, L[i]));
    box.querySelectorAll('button').forEach(b => b.onclick = () => {
      const m = L[+b.dataset.i]; if (!m) return;
      if (b.dataset.a === 'e') this.open(m);
      else if (b.dataset.a === 'p') this.launch(m);
      else if (b.dataset.a === 's') UI.confirm('PUBLIER LA CARTE ?', `« ${esc(m.n)} » sera visible par tous les joueurs dans les cartes de la communauté, avec votre pseudo <b>${esc(MP.myName())}</b>. Une carte publiée ne peut plus être retirée depuis le jeu.`, async () => {
        try { await Online.mapPublish(m, Online.cleanName(MP.myName()) || 'Anonyme'); Sfx.play('coin'); UI.toast('Carte publiée', `« ${esc(m.n)} » est dans les cartes de la communauté.`, '#39ff88', 3); }
        catch (e) { Sfx.play('error'); UI.toast('Publication impossible', 'Pas de connexion, ou la galerie n' + String.fromCharCode(39) + 'est pas encore activée sur le serveur.', '#ff2a6d', 4); }
      });
      else UI.confirm('SUPPRIMER LA CARTE ?', `« ${esc(m.n)} » sera effacée de cet appareil.`, () => { CMaps.remove(m.n); this.list(); });
    });
  },
  // galerie : les dernières cartes publiées par les joueurs
  async community() {
    const box = $('ed-list'), esc = s => String(s).replace(/[<>&"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' })[c]);
    box.innerHTML = '<div class="note" style="padding:6px 0">Chargement…</div>';
    let L;
    try { L = await Online.mapsTop(); } catch (e) { if (this.tab === 'com') box.innerHTML = '<div class="note" style="padding:6px 0">Galerie inaccessible : pas de connexion, ou pas encore activée sur le serveur.</div>'; return; }
    if (this.tab !== 'com' || !UI.stack.includes('ov-edit')) return;
    if (!L.length) { box.innerHTML = '<div class="note" style="padding:6px 0">Aucune carte publiée pour l' + String.fromCharCode(39) + 'instant : partagez la vôtre avec le bouton ⇪ de Mes cartes.</div>'; return; }
    box.innerHTML = L.map((x, i) => `<div class="ed-it"><canvas></canvas><b title="${esc(x.m.n)} — par ${esc(x.a)}">${esc(x.m.n)}<small>par ${esc(x.a)}</small></b>
      <button class="btn prim" data-i="${i}" data-a="p">JOUER</button><button class="btn" data-i="${i}" data-a="c" title="Copier dans Mes cartes, pour la modifier">＋</button></div>`).join('');
    box.querySelectorAll('canvas').forEach((cv, i) => CMaps.thumb(cv, L[i].m));
    box.querySelectorAll('button').forEach(b => b.onclick = () => {
      const x = L[+b.dataset.i]; if (!x) return;
      if (b.dataset.a === 'p') this.launch(x.m);
      else { const m = Object.assign({}, x.m, { n: x.m.n.slice(0, 24) }); CMaps.save(m); Sfx.play('coin'); UI.toast('Carte copiée', `« ${esc(m.n)} » est dans Mes cartes.`, '#39ff88', 3); }
    });
  },
  // la carte en cours, si elle est jouable (sinon le message d'erreur s'affiche)
  data(loud) {
    const v = this.validate(this.S);
    if (v.err) { if (loud) { Sfx.play('error'); this.msg = v.err; this.draw(); } return null; }
    return this.toData(this.S, $('ed-name').value.trim() || this.freeName());
  },
  save() {
    const d = this.data(true); if (!d) return;
    $('ed-name').value = d.n; CMaps.save(d); this.list(); Sfx.play('coin'); Ach.unlock('architect', true);
    UI.toast('Carte enregistrée', `« ${d.n.replace(/</g, '&lt;')} » est dans Mes cartes, et au choix dans le salon multijoueur.`, '#39ff88', 3);
  },
  play() { const d = this.data(true); if (d) this.launch(d); },
  // ouvre « Nouvelle partie » avec cette carte : on y choisit encore doctrine, mode et menace
  launch(m) { UI.pendMap = m; UI.closeAll(); UI.openNew(); },

  /* ---------- édition ---------- */
  tile(e) {
    const r = $('ed-cv').getBoundingClientRect();
    const x = Math.floor((e.clientX - r.left) / r.width * MapGen.C), y = Math.floor((e.clientY - r.top) / r.height * MapGen.R);
    return x >= 0 && y >= 0 && x < MapGen.C && y < MapGen.R ? [x, y] : null;
  },
  snap() { this.hist.push(JSON.stringify({ main: this.S.main, br: this.S.br, rocks: Array.from(this.S.rocks) })); if (this.hist.length > 60) this.hist.shift(); },
  undo() {
    const h = this.hist.pop(); if (!h) return;
    const o = JSON.parse(h); this.S = { main: o.main, br: o.br, rocks: Uint8Array.from(o.rocks) };
    this.msg = ''; Sfx.play('ui'); this.draw();
  },
  key(t) { return t[1] * MapGen.C + t[0]; },
  same(a, b) { return a && b && a[0] === b[0] && a[1] === b[1]; },
  mainIdx(t) { return this.S.main.findIndex(m => this.same(m, t)); },
  // le chemin principal a raccourci : les entrées qui le rejoignaient plus loin ne sont plus raccordées
  detach() { for (const b of this.S.br) if (b.m >= this.S.main.length) b.m = -1; },
  down(t) {
    const S = this.S, k = this.key(t), used = this.usedSet(S);
    this.snap(); this.msg = '';
    if (this.tool === 'rock') {
      if (used.has(k)) { this.hist.pop(); return; }
      this.rockMode = S.rocks[k] ? 0 : 1; S.rocks[k] = this.rockMode; this.cur = { rock: 1 };
    } else if (this.tool === 'erase') {
      this.erase(t); this.cur = { erase: 1 };
    } else if (this.tool === 'path') {
      const i = this.mainIdx(t);
      if (!S.main.length) {
        if (!this.edge(t) || used.has(k)) { this.hist.pop(); this.msg = 'Commencez le chemin sur une case du bord : c\'est par là qu\'arrivent les ennemis.'; return; }
        S.main.push(t); S.rocks[k] = 0;
      } else if (i >= 0) { S.main.length = i + 1; this.detach(); }
      else if (!this.step({ T: S.main }, t)) { this.hist.pop(); this.msg = 'Continuez le chemin depuis sa dernière case (cerclée de blanc), ou touchez une de ses cases pour le reprendre là.'; return; }
      this.cur = { T: S.main };
    } else {
      let b = S.br.find(x => x.own.some(o => this.same(o, t)));
      if (b) { b.own.length = b.own.findIndex(o => this.same(o, t)) + 1; b.m = -1; }
      else if ((b = S.br.find(x => x.m < 0 && this.step({ T: x.own, b: x }, t)))) { /* prolongée */ }
      else if (S.br.length < 2 && this.edge(t) && !used.has(k) && S.main.length) { b = { own: [t], m: -1 }; S.br.push(b); S.rocks[k] = 0; }
      else { this.hist.pop(); this.msg = !S.main.length ? 'Tracez d\'abord le chemin principal.' : S.br.length >= 2 ? 'Deux entrées en plus au maximum : touchez une entrée existante pour la modifier.' : 'Une entrée en plus part d\'une case libre du bord.'; return; }
      this.cur = { T: b.own, b };
    }
  },
  move(t) {
    const c = this.cur, S = this.S, k = this.key(t);
    if (c.rock) { if (!this.usedSet(S).has(k)) S.rocks[k] = this.rockMode; return; }
    if (c.erase) { this.erase(t); return; }
    // on avance case par case vers le pointeur, même si la souris a sauté plusieurs cases
    for (let n = 0; n < 60; n++) {
      const T = c.T, head = c.b && c.b.m >= 0 ? S.main[c.b.m] : T[T.length - 1];
      if (this.same(head, t)) return;
      const dx = t[0] - head[0], dy = t[1] - head[1];
      const nx = Math.abs(dx) >= Math.abs(dy) ? [head[0] + Math.sign(dx), head[1]] : [head[0], head[1] + Math.sign(dy)];
      if (!this.step(c, nx)) return;
    }
  },
  // un pas du tracé vers la case t (voisine de sa tête) : avance, recule, ou raccorde une entrée en plus
  step(c, t) {
    const S = this.S, T = c.T, b = c.b;
    if (b && b.m >= 0) { if (this.same(T[T.length - 1], t)) { b.m = -1; return true; } return false; }
    const L = T[T.length - 1];
    if (Math.abs(t[0] - L[0]) + Math.abs(t[1] - L[1]) !== 1) return false;
    if (T.length > 1 && this.same(T[T.length - 2], t)) { T.pop(); if (!b) this.detach(); return true; }
    if (b) { const mi = this.mainIdx(t); if (mi >= 0) { b.m = mi; return true; } }
    if (this.usedSet(S).has(this.key(t))) return false;
    T.push(t); S.rocks[this.key(t)] = 0;
    return true;
  },
  erase(t) {
    const S = this.S, k = this.key(t), i = this.mainIdx(t);
    if (S.rocks[k]) { S.rocks[k] = 0; return; }
    if (i >= 0) { S.main.length = i; this.detach(); if (!S.main.length) S.br.length = 0; return; }
    const bi = S.br.findIndex(x => x.own.some(o => this.same(o, t)));
    if (bi >= 0) {
      const b = S.br[bi], j = b.own.findIndex(o => this.same(o, t));
      if (j <= 0) S.br.splice(bi, 1); else { b.own.length = j; b.m = -1; }
    }
  },

  /* ---------- dessin ---------- */
  draw() {
    const cv = $('ed-cv'), r = cv.getBoundingClientRect();
    if (!this.S || r.width < 10) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1), C = MapGen.C, R = MapGen.R, S = this.S;
    const W = Math.round(r.width * dpr), H = Math.round(r.width * R / C * dpr);
    if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
    const x = cv.getContext('2d'), T = W / C, A = Render.theme.accent, ctr = t => [(t[0] + .5) * T, (t[1] + .5) * T];
    x.setTransform(1, 0, 0, 1, 0, 0);
    x.fillStyle = '#04070e'; x.fillRect(0, 0, W, H);
    // bande des bords (où commencent et finissent les chemins) et quadrillage
    x.fillStyle = rgba(A, .06);
    x.fillRect(0, 0, W, T); x.fillRect(0, H - T, W, T); x.fillRect(0, T, T, H - 2 * T); x.fillRect(W - T, T, T, H - 2 * T);
    x.strokeStyle = 'rgba(255,255,255,.06)'; x.lineWidth = 1; x.beginPath();
    for (let i = 1; i < C; i++) { x.moveTo(i * T, 0); x.lineTo(i * T, H); }
    for (let j = 1; j < R; j++) { x.moveTo(0, j * T); x.lineTo(W, j * T); }
    x.stroke();
    // débris
    x.save(); x.scale(T / TILE, T / TILE);
    for (let j = 0; j < R; j++) for (let i = 0; i < C; i++) if (S.rocks[j * C + i]) Render.drawRock(x, (i + .5) * TILE, (j + .5) * TILE, i * 31 + j * 17 + 5);
    x.restore();
    // tracés
    const line = (P, col, a = 1) => {
      if (!P.length) return;
      x.globalAlpha = a; x.lineCap = x.lineJoin = 'round';
      const path = () => { x.beginPath(); P.forEach((t, i) => { const [px, py] = ctr(t); i ? x.lineTo(px, py) : x.moveTo(px, py); }); if (P.length === 1) x.lineTo(ctr(P[0])[0] + .01, ctr(P[0])[1]); };
      path(); x.shadowColor = col; x.shadowBlur = 10 * dpr; x.strokeStyle = rgba(col, .5); x.lineWidth = T * .8; x.stroke(); x.shadowBlur = 0;
      path(); x.strokeStyle = '#05080f'; x.lineWidth = T * .62; x.stroke();
      path(); x.strokeStyle = rgba(col, .9); x.lineWidth = Math.max(1.5, T * .1); x.setLineDash([T * .25, T * .3]); x.stroke(); x.setLineDash([]);
      x.globalAlpha = 1;
    };
    for (const b of S.br) line(b.m >= 0 ? b.own.concat([S.main[b.m]]) : b.own, '#ff2bd6', b.m >= 0 ? 1 : .7);
    line(S.main, A);
    // entrées (triangle), noyau (hexagone), têtes de tracé en cours (anneau blanc)
    const tri = (t, col) => {
      const [px, py] = ctr(t); x.fillStyle = col; x.beginPath();
      const d = t[0] === 0 ? [1, 0] : t[0] === C - 1 ? [-1, 0] : t[1] === 0 ? [0, 1] : [0, -1], s = T * .32;
      x.moveTo(px + d[0] * s, py + d[1] * s); x.lineTo(px - d[0] * s - d[1] * s, py - d[1] * s - d[0] * s); x.lineTo(px - d[0] * s + d[1] * s, py - d[1] * s + d[0] * s); x.closePath(); x.fill();
    };
    const ring = t => { const [px, py] = ctr(t); x.strokeStyle = '#fff'; x.lineWidth = Math.max(1.5, T * .08); x.beginPath(); x.arc(px, py, T * .42, 0, TAU); x.stroke(); };
    if (S.main.length) tri(S.main[0], A);
    for (const b of S.br) if (b.own.length) { tri(b.own[0], '#ff2bd6'); if (b.m < 0) ring(b.own[b.own.length - 1]); }
    const v = this.validate(S);
    if (S.main.length > 1 && this.edge(S.main[S.main.length - 1]) && this.inward(S.main[S.main.length - 1], S.main[S.main.length - 2])) {
      const [px, py] = ctr(S.main[S.main.length - 1]);
      x.save(); x.translate(px, py); x.fillStyle = '#ffd23f'; x.shadowColor = '#ffd23f'; x.shadowBlur = 10 * dpr; polyPath(x, 6, T * .4, Math.PI / 6); x.fill(); x.restore();
    } else if (S.main.length) ring(S.main[S.main.length - 1]);
    // case survolée
    if (this.hover >= 0) { x.strokeStyle = 'rgba(255,255,255,.55)'; x.lineWidth = 1.5; x.strokeRect((this.hover % C) * T + 1, ((this.hover / C) | 0) * T + 1, T - 2, T - 2); }
    // état
    let rocks = 0; for (const r0 of S.rocks) rocks += r0;
    const n = S.br.length + (S.main.length ? 1 : 0);
    $('ed-st').innerHTML = `Chemin <b>${S.main.length}</b> cases · <b>${n}</b> entrée${n > 1 ? 's' : ''} · <b>${rocks}</b> débris — ` +
      (this.msg ? `<b class="err">${this.msg}</b>` : v.err ? `<span class="err">${v.err}</span>` : '<b class="ok">✓ Carte jouable</b>');
  }
};
