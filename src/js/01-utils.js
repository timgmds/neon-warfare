/* ============================== UTILS ============================== */
const VERSION = '10.4';
const TILE = 40;
const TICK_MS = 1000 / 60;
const TAU = Math.PI * 2;
const $ = id => document.getElementById(id);
const clamp = (v, a, b) => v < a ? a : (v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const rnd = (a, b) => a + Math.random() * (b - a);
const rndi = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
/* hasard de la SIMULATION : son état vit dans G.rs, si bien que deux machines (coop) ou une sauvegarde
   recalculent exactement la même partie. Le hasard purement visuel (particules, sons) reste sur Math.random. */
function sr() {
  if (!G) return Math.random();
  let t = G.rs = (G.rs + 0x6D2B79F5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const srnd = (a, b) => a + sr() * (b - a);
const srndi = (a, b) => Math.floor(a + sr() * (b - a + 1));
const spick = arr => arr[Math.floor(sr() * arr.length)];
const d2 = (ax, ay, bx, by) => { const dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; };
const angDiff = (a, b) => { let d = (a - b) % TAU; if (d > Math.PI) d -= TAU; else if (d < -Math.PI) d += TAU; return d; };
const turnTo = (a, b, k) => a - angDiff(a, b) * k;
const NB4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const NB8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
// zone des tourelles de soutien, cran par cran : 4 voisins → 8 (diagonales) → 12 (cases à 2 en ligne droite) → 20 (losange complet)
const NB12 = NB8.concat([[2, 0], [-2, 0], [0, 2], [0, -2]]);
const NB20 = NB12.concat([[2, 1], [2, -1], [-2, 1], [-2, -1], [1, 2], [-1, 2], [1, -2], [-1, -2]]);
const NBZ = [NB4, NB8, NB12, NB20];
const TXT = s => s + '︎'; // force la présentation texte (pas d'emoji)

function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const _rgbCache = {};
function hexRgb(h) {
  if (_rgbCache[h]) return _rgbCache[h];
  let s = h.replace('#', '');
  if (s.length === 3) s = s.split('').map(c => c + c).join('');
  const n = parseInt(s, 16);
  return (_rgbCache[h] = [n >> 16 & 255, n >> 8 & 255, n & 255]);
}
function rgba(h, a) { const c = hexRgb(h); return `rgba(${c[0]},${c[1]},${c[2]},${a})`; }
function shade(h, k) { const c = hexRgb(h); return `rgb(${(c[0] * k) | 0},${(c[1] * k) | 0},${(c[2] * k) | 0})`; }
function fmt(n) {
  n = Math.floor(n);
  if (n >= 1e9) return (n / 1e9).toFixed(2) + 'G';
  if (n >= 1e6) return (n / 1e6).toFixed(n >= 1e7 ? 1 : 2) + 'M';
  if (n >= 1e5) return Math.floor(n / 1e3) + 'k';
  if (n >= 1e4) return (n / 1e3).toFixed(1) + 'k';
  return '' + n;
}
function weightedIndex(weights, r = Math.random) {
  let s = 0; for (const w of weights) s += w;
  let x = r() * s;
  for (let i = 0; i < weights.length; i++) { x -= weights[i]; if (x <= 0) return i; }
  return weights.length - 1;
}
function roundRect(x, X, Y, w, h, r) {
  x.beginPath(); x.moveTo(X + r, Y); x.arcTo(X + w, Y, X + w, Y + h, r); x.arcTo(X + w, Y + h, X, Y + h, r);
  x.arcTo(X, Y + h, X, Y, r); x.arcTo(X, Y, X + w, Y, r); x.closePath();
}
function polyPath(x, n, r, rot = 0, inner = 0) {
  x.beginPath();
  const m = inner ? n * 2 : n;
  for (let i = 0; i < m; i++) {
    const a = rot + i * TAU / m, rr = inner && (i & 1) ? inner : r;
    i ? x.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : x.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  x.closePath();
}

/* Pool d'objets réutilisables : zéro allocation pendant le jeu */
class Pool {
  constructor(factory, cap) { this.f = factory; this.a = []; this.n = 0; this.cap = cap; }
  get() {
    if (this.n >= this.cap) return null;
    let o = this.a[this.n];
    if (!o) { o = this.f(); this.a[this.n] = o; }
    this.n++; return o;
  }
  free(i) { const l = --this.n; if (i !== l) { const t = this.a[i]; this.a[i] = this.a[l]; this.a[l] = t; } }
  clear() { this.n = 0; }
}

