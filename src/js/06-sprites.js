/* ============================== SPRITES ==============================
   Tout ce qui est coûteux (dégradés, ombres lumineuses) est dessiné UNE fois
   dans des canvas hors-écran, puis simplement copié (drawImage) à chaque image. */
function metal(x, x0, y0, x1, y1, a = '#3b4a68', b = '#131a27') {
  const g = x.createLinearGradient(x0, y0, x1, y1); g.addColorStop(0, a); g.addColorStop(1, b); return g;
}
function circ(x, cx, cy, r) { x.beginPath(); x.arc(cx, cy, r, 0, TAU); }

function drawTowerBase(x, d) {
  const c = d.color;
  x.save();
  if (d.kind === 'support') {
    const big = d.tier >= 2, S = big ? 34 : 31;
    x.shadowColor = c; x.shadowBlur = big ? 14 : 8;
    roundRect(x, -S / 2, -S / 2, S, S, 6);
    x.fillStyle = metal(x, -16, -16, 16, 16, '#1d2638', '#070a11'); x.fill();
    x.shadowBlur = 0; x.lineWidth = 1.5; x.strokeStyle = rgba(c, .7); x.stroke();
    x.fillStyle = c;
    const h = S / 2;
    for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      x.fillRect(sx * h - (sx > 0 ? 6 : 0), sy * h - (sy > 0 ? 2 : 0), 6, 2);
      x.fillRect(sx * h - (sx > 0 ? 2 : 0), sy * h - (sy > 0 ? 6 : 0), 2, 6);
    }
    if (big) { x.setLineDash([3, 3]); circ(x, 0, 0, 21); x.strokeStyle = rgba(c, .45); x.lineWidth = 1; x.stroke(); x.setLineDash([]); }
  } else {
    const R = [16, 0, 17.5, 18.5, 19, 20][d.tier];
    x.shadowColor = c; x.shadowBlur = d.tier >= 2 ? 14 : 8;
    if (d.tier === 0) circ(x, 0, 0, R);
    else if (d.tier === 2) polyPath(x, 8, R, Math.PI / 8);
    else if (d.tier === 3) polyPath(x, 12, R, 0, R - 2.6);
    else polyPath(x, 16, R + 1, 0, R - 1.5);
    const g = x.createRadialGradient(-5, -5, 2, 0, 0, R + 2);
    g.addColorStop(0, '#27344d'); g.addColorStop(1, '#060910');
    x.fillStyle = g; x.fill();
    x.shadowBlur = 0; x.lineWidth = 1.5; x.strokeStyle = d.tier >= 2 ? rgba(c, .55) : '#33415c'; x.stroke();
    circ(x, 0, 0, R - 4.5); x.strokeStyle = rgba(c, .5); x.lineWidth = 1.2; x.stroke();
    x.fillStyle = '#4c5b78';
    for (let i = 0; i < 4; i++) { const a = i * TAU / 4 + Math.PI / 4; circ(x, Math.cos(a) * (R - 2.4), Math.sin(a) * (R - 2.4), 1.2); x.fill(); }
    if (d.tier >= 3) { x.setLineDash([3, 4]); circ(x, 0, 0, R + 3); x.strokeStyle = rgba(c, .65); x.lineWidth = 1.2; x.stroke(); x.setLineDash([]); }
    if (d.tier >= 4) { circ(x, 0, 0, R + 6.5); x.strokeStyle = 'rgba(255,210,63,.55)'; x.lineWidth = 1; x.stroke(); }
    if (d.tier === 5) { circ(x, 0, 0, R + 9); x.strokeStyle = 'rgba(255,240,138,.7)'; x.lineWidth = 1.4; x.setLineDash([2, 3]); x.stroke(); x.setLineDash([]); }
  }
  x.restore();
}

function drawTowerHead(x, d) {
  const c = d.color;
  x.save();
  x.lineJoin = 'round';
  const glowFill = (cx, cy, r, blur = 10) => {
    const g = x.createRadialGradient(cx - r * .3, cy - r * .3, 0, cx, cy, r);
    g.addColorStop(0, '#ffffff'); g.addColorStop(.45, c); g.addColorStop(1, shade(c, .5));
    x.shadowColor = c; x.shadowBlur = blur; x.fillStyle = g; circ(x, cx, cy, r); x.fill(); x.shadowBlur = 0;
  };
  switch (d.head) {
    case 'twin': {
      const big = d.key === 'plasma', bw = big ? 4.2 : 3;
      roundRect(x, -8, -7, 16, 15, 4); x.fillStyle = metal(x, -8, 0, 8, 0); x.fill();
      x.strokeStyle = rgba(c, .85); x.lineWidth = 1; x.stroke();
      x.fillStyle = metal(x, 0, -20, 0, -5, '#a6b8d6', '#3c4a64');
      x.fillRect(-4 - bw / 2, -19, bw, 13); x.fillRect(4 - bw / 2, -19, bw, 13);
      x.shadowColor = c; x.shadowBlur = 7; x.fillStyle = c;
      x.fillRect(-4 - bw / 2, -21, bw, 3); x.fillRect(4 - bw / 2, -21, bw, 3); x.shadowBlur = 0;
      if (big) glowFill(0, 1, 4.5, 12); else { x.fillStyle = c; circ(x, 0, 1, 2.3); x.fill(); }
      break;
    }
    case 'rail': {
      roundRect(x, -6, -6, 12, 13, 3); x.fillStyle = metal(x, -6, 0, 6, 0); x.fill(); x.strokeStyle = rgba(c, .7); x.lineWidth = 1; x.stroke();
      x.fillStyle = '#5a6a86'; x.fillRect(-1.6, -27, 3.2, 22);
      x.fillStyle = '#2a3346'; x.fillRect(-4.2, -21, 2, 15); x.fillRect(2.2, -21, 2, 15);
      x.fillStyle = c; x.shadowColor = c; x.shadowBlur = 7; x.fillRect(-1.6, -28, 3.2, 3); x.shadowBlur = 0;
      x.fillStyle = '#0c1220'; circ(x, 4.5, -1, 2.6); x.fill(); x.strokeStyle = c; x.lineWidth = .9; x.stroke();
      break;
    }
    case 'rail2': {
      roundRect(x, -9, -7, 18, 16, 4); x.fillStyle = metal(x, -9, 0, 9, 0, '#4a5878', '#121826'); x.fill(); x.strokeStyle = rgba(c, .8); x.lineWidth = 1; x.stroke();
      const rg = x.createLinearGradient(0, -29, 0, -4); rg.addColorStop(0, '#dfe8f5'); rg.addColorStop(1, '#3c4760');
      x.fillStyle = rg; x.fillRect(-6.5, -29, 4, 24); x.fillRect(2.5, -29, 4, 24);
      x.shadowColor = '#9fd8ff'; x.shadowBlur = 10; x.fillStyle = 'rgba(190,235,255,.9)'; x.fillRect(-1.2, -28, 2.4, 22); x.shadowBlur = 0;
      x.fillStyle = '#7ab8ff'; for (const y of [-25, -19, -13]) x.fillRect(-7.5, y, 15, 1.8);
      break;
    }
    case 'gatling': {
      const ice = d.key === 'blizzard';
      x.fillStyle = metal(x, -7, 0, 7, 0); circ(x, 0, 2, 7.5); x.fill(); x.strokeStyle = rgba(c, .75); x.lineWidth = 1; x.stroke();
      x.fillStyle = ice ? '#b9d8ea' : '#6f7e98';
      x.fillRect(-5.4, -18, 2.8, 15); x.fillRect(-1.4, -21, 2.8, 18); x.fillRect(2.6, -18, 2.8, 15);
      x.fillStyle = '#262e3e'; x.fillRect(-6.5, -12, 13, 2.6);
      x.fillStyle = c; x.fillRect(-6.5, -6, 13, 1.6);
      if (ice) { x.shadowColor = c; x.shadowBlur = 8; x.fillStyle = '#e8fbff'; x.fillRect(-5.4, -19, 2.8, 2); x.fillRect(-1.4, -22, 2.8, 2); x.fillRect(2.6, -19, 2.8, 2); x.shadowBlur = 0; }
      break;
    }
    case 'orb': {
      x.strokeStyle = '#4b5a78'; x.lineWidth = 2.4; x.beginPath(); x.moveTo(-8, 5); x.lineTo(-5, -10); x.moveTo(8, 5); x.lineTo(5, -10); x.stroke();
      const g = x.createLinearGradient(0, -16, 0, 6); g.addColorStop(0, '#ffffff'); g.addColorStop(1, c);
      x.shadowColor = c; x.shadowBlur = 11; x.fillStyle = g;
      x.beginPath(); x.moveTo(0, -16); x.lineTo(5.5, -4); x.lineTo(0, 6); x.lineTo(-5.5, -4); x.closePath(); x.fill(); x.shadowBlur = 0;
      x.strokeStyle = 'rgba(255,255,255,.65)'; x.lineWidth = .8; x.stroke();
      break;
    }
    case 'dish': {
      x.strokeStyle = '#4b5a78'; x.lineWidth = 2.2; x.beginPath(); x.moveTo(0, 5); x.lineTo(0, -5); x.stroke();
      x.beginPath(); x.ellipse(0, -6, 12, 6, 0, Math.PI, 0); x.closePath();
      x.fillStyle = 'rgba(12,50,30,.95)'; x.fill(); x.strokeStyle = c; x.lineWidth = 1.5; x.stroke();
      x.beginPath(); x.moveTo(0, -6); x.lineTo(0, -15); x.stroke();
      x.shadowColor = c; x.shadowBlur = 9; x.fillStyle = c; circ(x, 0, -16, 2.3); x.fill(); x.shadowBlur = 0;
      break;
    }
    case 'flamer': {
      roundRect(x, -7, -4, 14, 13, 3); x.fillStyle = metal(x, -7, 0, 7, 0, '#5c3a1e', '#211309'); x.fill(); x.strokeStyle = rgba(c, .65); x.lineWidth = 1; x.stroke();
      glowFill(0, 3, 3.6, 8);
      x.fillStyle = '#3a4256'; x.fillRect(-2.6, -17, 5.2, 14);
      x.fillStyle = '#20252f'; x.fillRect(-3.6, -20, 7.2, 3.4);
      x.fillStyle = '#ffcc33'; x.shadowColor = '#ff9900'; x.shadowBlur = 6; circ(x, 0, -21, 1.4); x.fill(); x.shadowBlur = 0;
      break;
    }
    case 'mortar': {
      const big = d.key === 'magma';
      roundRect(x, -9.5, -6, 19, 15, 3); x.fillStyle = metal(x, -9, 0, 9, 0, big ? '#5a2a1e' : '#3b4a68', big ? '#1e0a06' : '#131a27'); x.fill();
      x.strokeStyle = rgba(c, .65); x.lineWidth = 1; x.stroke();
      roundRect(x, -6, -18, 12, 14, 2); x.fillStyle = metal(x, -6, 0, 6, 0, '#76839c', '#2a3242'); x.fill();
      x.beginPath(); x.ellipse(0, -18, 5.6, 2.4, 0, 0, TAU); x.fillStyle = big ? '#ff5a1f' : '#090c13'; x.fill(); x.strokeStyle = c; x.lineWidth = 1; x.stroke();
      x.fillStyle = c; for (const a of [-6, -2, 2, 6]) { circ(x, a, 5, 1.3); x.fill(); }
      break;
    }
    case 'aa': {
      for (const s of [-1, 1]) {
        const sx = s * 6.2;
        roundRect(x, sx - 3.6, -15, 7.2, 19, 2.2); x.fillStyle = metal(x, sx - 3, 0, sx + 3, 0); x.fill(); x.strokeStyle = rgba(c, .7); x.lineWidth = 1; x.stroke();
        x.fillStyle = c; circ(x, sx - 1.5, -13.5, 1.25); x.fill(); circ(x, sx + 1.5, -13.5, 1.25); x.fill(); circ(x, sx, -9.5, 1.25); x.fill();
      }
      x.fillStyle = '#262e3e'; x.fillRect(-3, -3, 6, 7); x.fillStyle = c; x.fillRect(-1, -1, 2, 2);
      break;
    }
    case 'fan': {
      circ(x, 0, 0, 12.5); x.fillStyle = '#0b1019'; x.fill(); x.strokeStyle = rgba(c, .55); x.lineWidth = 1.5; x.stroke();
      x.strokeStyle = 'rgba(255,255,255,.08)'; x.lineWidth = 1; circ(x, 0, 0, 8.5); x.stroke(); circ(x, 0, 0, 4.5); x.stroke();
      break;
    }
    case 'cpu': case 'nexus': {
      const big = d.head === 'nexus', S = big ? 24 : 20, h = S / 2;
      roundRect(x, -h, -h, S, S, 3); x.fillStyle = big ? '#0d1a14' : '#0e1911'; x.fill(); x.strokeStyle = rgba(c, .85); x.lineWidth = 1.2; x.stroke();
      x.fillStyle = '#93a593';
      for (let i = -h + 4; i <= h - 4; i += 4) { x.fillRect(i - .8, -h - 3, 1.6, 3); x.fillRect(i - .8, h, 1.6, 3); x.fillRect(-h - 3, i - .8, 3, 1.6); x.fillRect(h, i - .8, 3, 1.6); }
      x.fillStyle = '#060d08'; x.fillRect(-h + 4, -h + 4, S - 8, S - 8); x.strokeStyle = rgba(c, .4); x.strokeRect(-h + 4, -h + 4, S - 8, S - 8);
      if (big) { x.shadowColor = c; x.shadowBlur = 10; x.fillStyle = c; circ(x, 0, 0, 3); x.fill(); x.shadowBlur = 0; }
      break;
    }
    case 'coil': {
      x.strokeStyle = '#8b95aa'; x.lineWidth = 2.2;
      for (const [ey, rx, ry] of [[3, 7.5, 3.2], [-2.5, 6.3, 2.7], [-7.5, 5.2, 2.3]]) { x.beginPath(); x.ellipse(0, ey, rx, ry, 0, 0, TAU); x.stroke(); }
      x.strokeStyle = rgba(c, .7); x.lineWidth = 1; x.beginPath(); x.moveTo(0, 5); x.lineTo(0, -10); x.stroke();
      glowFill(0, -14, 4.6, 14);
      break;
    }
    case 'lens': {
      polyPath(x, 6, 8.5, Math.PI / 6); x.fillStyle = metal(x, -8, 0, 8, 0); x.fill(); x.strokeStyle = rgba(c, .8); x.lineWidth = 1; x.stroke();
      x.fillStyle = '#4a5670'; x.fillRect(-5, -20, 2, 14); x.fillRect(3, -20, 2, 14);
      glowFill(0, -18, 3.8, 14);
      x.fillStyle = c; circ(x, 0, 0, 3); x.fill();
      break;
    }
    case 'pods': {
      roundRect(x, -10.5, -14, 21, 21, 3); x.fillStyle = metal(x, -10, 0, 10, 0, '#2f4a2a', '#0e180c'); x.fill(); x.strokeStyle = rgba(c, .8); x.lineWidth = 1; x.stroke();
      for (const i of [-5, 5]) for (const j of [-8.5, -.5]) { x.fillStyle = '#05080a'; circ(x, i, j, 3.4); x.fill(); x.fillStyle = '#ff5544'; circ(x, i, j, 1.5); x.fill(); }
      break;
    }
    case 'ring': {
      x.lineWidth = 4.5; x.strokeStyle = rgba(c, .25); circ(x, 0, 0, 11.5); x.stroke();
      x.lineWidth = 2.2; x.strokeStyle = c; x.shadowColor = c; x.shadowBlur = 9;
      for (let i = 0; i < 3; i++) { x.beginPath(); x.arc(0, 0, 11.5, i * TAU / 3, i * TAU / 3 + 1.4); x.stroke(); }
      x.shadowBlur = 0; glowFill(0, 0, 4.2, 12);
      break;
    }
    case 'phoenix': {
      x.beginPath(); x.moveTo(0, -19); x.lineTo(10, 3); x.lineTo(3.5, -1); x.lineTo(0, 7); x.lineTo(-3.5, -1); x.lineTo(-10, 3); x.closePath();
      x.fillStyle = metal(x, 0, -18, 0, 8, '#6a3214', '#1c0a04'); x.fill();
      x.strokeStyle = c; x.lineWidth = 1.3; x.shadowColor = c; x.shadowBlur = 9; x.stroke(); x.shadowBlur = 0;
      glowFill(0, -6, 2.6, 8);
      break;
    }
    case 'nova': {
      x.strokeStyle = '#5b6782'; x.lineWidth = 3.2;
      for (let i = 0; i < 3; i++) { const a = -Math.PI / 2 + i * TAU / 3; x.beginPath(); x.moveTo(Math.cos(a) * 6, Math.sin(a) * 6); x.lineTo(Math.cos(a) * 14, Math.sin(a) * 14); x.stroke(); }
      x.fillStyle = c; for (let i = 0; i < 3; i++) { const a = -Math.PI / 2 + i * TAU / 3; circ(x, Math.cos(a) * 14.5, Math.sin(a) * 14.5, 1.8); x.fill(); }
      glowFill(0, 0, 8, 18);
      break;
    }
    case 'void': {
      x.strokeStyle = c; x.lineWidth = 2.6; x.shadowColor = c; x.shadowBlur = 10;
      for (let i = 0; i < 4; i++) { x.save(); x.rotate(i * TAU / 4); x.beginPath(); x.arc(5, 0, 10, Math.PI * .85, Math.PI * 1.45); x.stroke(); x.restore(); }
      x.shadowBlur = 16; x.fillStyle = '#000'; circ(x, 0, 0, 6.5); x.fill(); x.shadowBlur = 0;
      x.strokeStyle = '#e0c8ff'; x.lineWidth = 1; circ(x, 0, 0, 6.5); x.stroke();
      break;
    }
    case 'apoc': {
      roundRect(x, -12, -9, 24, 19, 5); x.fillStyle = metal(x, -12, 0, 12, 0, '#3d3524', '#0f0c06'); x.fill(); x.strokeStyle = rgba(c, .9); x.lineWidth = 1.2; x.stroke();
      x.fillStyle = '#2c2618'; x.beginPath(); x.moveTo(-12, 4); x.lineTo(-17, 10); x.lineTo(-10, 8); x.closePath(); x.fill();
      x.beginPath(); x.moveTo(12, 4); x.lineTo(17, 10); x.lineTo(10, 8); x.closePath(); x.fill();
      x.fillStyle = metal(x, -5, 0, 5, 0, '#d8c288', '#5e4d24'); x.fillRect(-5, -29, 10, 22);
      x.fillStyle = c; for (const y of [-26, -20, -14]) x.fillRect(-6.5, y, 13, 2.2);
      x.shadowColor = c; x.shadowBlur = 16; x.fillStyle = '#fff6d0'; x.fillRect(-3, -31, 6, 2.5); x.shadowBlur = 0;
      glowFill(0, 1, 3.5, 10);
      break;
    }
  }
  x.restore();
}

// détails animés (pales du ventilo, LED, arcs) : dessinés à chaque image en jeu, figés dans les icônes
function drawHeadExtras(c, d, t, off, live) {
  if (d.head === 'fan') {
    c.save(); c.rotate(t * .001 * (off ? 1 : 14));
    c.fillStyle = 'rgba(220,240,255,.85)';
    for (let i = 0; i < 3; i++) { c.rotate(TAU / 3); c.beginPath(); c.ellipse(0, -5.5, 2.4, 5.5, 0, 0, TAU); c.fill(); }
    c.fillStyle = '#9fb0cc'; circ(c, 0, 0, 2.2); c.fill();
    c.restore();
  } else if (d.head === 'cpu' || d.head === 'nexus') {
    const L = [[-4.5, -4.5], [1.5, -4.5], [-4.5, 1.5], [1.5, 1.5]];
    c.fillStyle = d.color;
    for (let i = 0; i < 4; i++) if (((t / (170 + i * 70)) | 0) & 1) c.fillRect(L[i][0], L[i][1], 3, 3);
  } else if (d.head === 'coil' && live && !off && Math.random() < .25) {
    c.strokeStyle = d.color; c.lineWidth = 1; c.beginPath();
    c.moveTo(0, -14); c.lineTo(rnd(-9, 9), rnd(-24, -12)); c.lineTo(rnd(-12, 12), rnd(-27, -16)); c.stroke();
  }
}

function drawEnemyShape(x, d, elite) {
  const r = d.r * (elite ? 1.25 : 1), c = d.color;
  x.save();
  x.shadowColor = c; x.shadowBlur = d.boss ? 18 : 10;
  const g = x.createRadialGradient(-r * .35, -r * .35, 0, 0, 0, r * 1.15);
  g.addColorStop(0, '#ffffff'); g.addColorStop(.38, c); g.addColorStop(1, shade(c, .35));
  x.fillStyle = g; x.strokeStyle = 'rgba(0,0,0,.55)'; x.lineWidth = 1.4;
  const eye = (ex, er) => { x.shadowBlur = 0; x.fillStyle = 'rgba(0,0,0,.6)'; circ(x, ex, 0, er); x.fill(); x.fillStyle = '#fff'; circ(x, ex + er * .3, 0, er * .4); x.fill(); };
  switch (d.shape) {
    case 'orb': circ(x, 0, 0, r); x.fill(); x.stroke(); eye(r * .25, r * .36); break;
    case 'dart':
      x.beginPath(); x.moveTo(r * 1.25, 0); x.lineTo(-r * .9, r * .85); x.lineTo(-r * .35, 0); x.lineTo(-r * .9, -r * .85); x.closePath(); x.fill(); x.stroke();
      break;
    case 'block':
      roundRect(x, -r, -r, r * 2, r * 2, r * .28); x.fill(); x.stroke();
      x.shadowBlur = 0; x.strokeStyle = 'rgba(0,0,0,.45)'; x.lineWidth = 1.2;
      x.beginPath(); x.moveTo(-r * .4, -r); x.lineTo(-r * .4, r); x.moveTo(r * .3, -r); x.lineTo(r * .3, r); x.stroke();
      x.fillStyle = 'rgba(255,255,255,.35)'; x.fillRect(r * .55, -r * .6, r * .3, r * 1.2);
      break;
    case 'diamond': polyPath(x, 4, r * 1.2, 0); x.fill(); x.stroke(); eye(r * .1, r * .3); break;
    case 'cross':
      circ(x, 0, 0, r); x.fill(); x.stroke(); x.shadowBlur = 0; x.fillStyle = '#ffffff';
      x.fillRect(-r * .2, -r * .62, r * .4, r * 1.24); x.fillRect(-r * .62, -r * .2, r * 1.24, r * .4);
      break;
    case 'wing':
      x.beginPath(); x.moveTo(r * 1.25, 0); x.lineTo(-r * .7, r * 1.15); x.lineTo(-r * .25, 0); x.lineTo(-r * .7, -r * 1.15); x.closePath(); x.fill(); x.stroke();
      x.shadowBlur = 0; x.fillStyle = '#fff'; circ(x, r * .35, 0, r * .2); x.fill();
      break;
    case 'glitch':
      x.globalCompositeOperation = 'lighter'; x.shadowBlur = 0;
      x.fillStyle = 'rgba(255,0,120,.55)'; x.fillRect(-r - 2, -r, r * 2, r * 2);
      x.fillStyle = 'rgba(0,200,255,.55)'; x.fillRect(-r + 2, -r, r * 2, r * 2);
      x.globalCompositeOperation = 'source-over'; x.fillStyle = g; x.fillRect(-r * .8, -r * .8, r * 1.6, r * 1.6);
      x.fillStyle = 'rgba(0,0,0,.6)'; x.fillRect(-r * .8, -r * .1, r * 1.6, r * .25);
      break;
    case 'jammer':
      x.save(); x.shadowBlur = 0; x.strokeStyle = c; x.lineWidth = 2;
      for (let i = 0; i < 4; i++) { const a = i * TAU / 4 + Math.PI / 4; x.beginPath(); x.moveTo(Math.cos(a) * r * .6, Math.sin(a) * r * .6); x.lineTo(Math.cos(a) * r * 1.45, Math.sin(a) * r * 1.45); x.stroke(); circ(x, Math.cos(a) * r * 1.45, Math.sin(a) * r * 1.45, 1.8); x.fillStyle = c; x.fill(); }
      x.restore(); x.fillStyle = g; circ(x, 0, 0, r * .85); x.fill(); x.stroke();
      x.shadowBlur = 0; x.fillStyle = 'rgba(0,0,0,.65)'; circ(x, 0, 0, r * .35); x.fill();
      break;
    case 'regen':
      circ(x, 0, 0, r); x.fill(); x.stroke(); x.shadowBlur = 0; x.strokeStyle = 'rgba(255,255,255,.7)'; x.lineWidth = 1.5;
      x.beginPath(); x.arc(0, 0, r * .62, 0, Math.PI * 1.5); x.stroke(); x.fillStyle = '#fff'; x.fillRect(-r * .12, -r * .45, r * .24, r * .9); x.fillRect(-r * .45, -r * .12, r * .9, r * .24);
      break;
    case 'sapper':
      x.beginPath(); x.moveTo(r * 1.2, 0); x.lineTo(r * .2, r * .9); x.lineTo(-r, r * .7); x.lineTo(-r, -r * .7); x.lineTo(r * .2, -r * .9); x.closePath(); x.fill(); x.stroke();
      x.shadowBlur = 0; x.strokeStyle = 'rgba(0,0,0,.6)'; x.lineWidth = 2; x.beginPath(); x.moveTo(r * .3, -r * .5); x.lineTo(r * 1.3, -r * 1.1); x.stroke();
      break;
    case 'hive':
      polyPath(x, 6, r, Math.PI / 6); x.fill(); x.stroke(); x.shadowBlur = 0; x.fillStyle = 'rgba(60,30,0,.55)';
      for (let i = 0; i < 6; i++) { const a = i * TAU / 6; circ(x, Math.cos(a) * r * .5, Math.sin(a) * r * .5, r * .16); x.fill(); }
      circ(x, 0, 0, r * .18); x.fill();
      break;
    case 'phase':
      x.globalAlpha = .85; polyPath(x, 3, r * 1.2, 0); x.fill(); x.stroke(); x.rotate(Math.PI); x.globalAlpha = .45; polyPath(x, 3, r * 1.2, 0); x.fill(); x.globalAlpha = 1;
      eye(0, r * .3);
      break;
    case 'null':
      circ(x, 0, 0, r); x.fill(); x.stroke(); x.shadowBlur = 0; x.strokeStyle = '#333'; x.lineWidth = 2.2;
      x.beginPath(); x.arc(0, 0, r * .55, 0, TAU); x.moveTo(-r * .4, r * .4); x.lineTo(r * .4, -r * .4); x.stroke();
      break;
    case 'ram':
      x.beginPath(); x.moveTo(r * 1.3, 0); x.lineTo(r * .4, r); x.lineTo(-r, r * .8); x.lineTo(-r, -r * .8); x.lineTo(r * .4, -r); x.closePath(); x.fill(); x.stroke();
      x.shadowBlur = 0; x.fillStyle = 'rgba(255,255,255,.7)'; x.beginPath(); x.moveTo(r * 1.3, 0); x.lineTo(r * .6, r * .35); x.lineTo(r * .6, -r * .35); x.closePath(); x.fill();
      break;
    case 'necro':
      polyPath(x, 5, r * 1.1, -Math.PI / 2); x.fill(); x.stroke(); x.shadowBlur = 0; x.fillStyle = 'rgba(0,0,0,.65)';
      circ(x, -r * .3, -r * .1, r * .18); x.fill(); circ(x, r * .3, -r * .1, r * .18); x.fill(); x.fillRect(-r * .3, r * .3, r * .6, r * .15);
      break;
    case 'frigate':
      x.beginPath(); x.moveTo(r * 1.35, 0); x.lineTo(-r * .2, r * 1.1); x.lineTo(-r * 1.1, r * .5); x.lineTo(-r * .7, 0); x.lineTo(-r * 1.1, -r * .5); x.lineTo(-r * .2, -r * 1.1); x.closePath(); x.fill(); x.stroke();
      x.shadowBlur = 0; x.fillStyle = 'rgba(0,0,0,.45)'; x.fillRect(-r * .5, -r * .18, r * 1.2, r * .36);
      break;
    case 'jugg':
      polyPath(x, 8, r, Math.PI / 8); x.fill(); x.stroke(); x.shadowBlur = 0; x.strokeStyle = 'rgba(0,0,0,.55)'; x.lineWidth = 2.5;
      roundRect(x, -r * .6, -r * .6, r * 1.2, r * 1.2, r * .15); x.stroke(); x.fillStyle = '#ff3d3d'; circ(x, r * .3, 0, r * .16); x.fill();
      break;
    case 'veil':
      circ(x, 0, 0, r); x.globalAlpha = .7; x.fill(); x.globalAlpha = 1; x.stroke(); x.shadowBlur = 0; x.strokeStyle = 'rgba(255,255,255,.6)'; x.lineWidth = 1.2;
      for (let i = 1; i <= 2; i++) { x.beginPath(); x.arc(0, 0, r * (.3 + i * .25), -.8, .8); x.stroke(); x.beginPath(); x.arc(0, 0, r * (.3 + i * .25), Math.PI - .8, Math.PI + .8); x.stroke(); }
      break;
    case 'mite':
      x.beginPath(); x.moveTo(r * 1.3, 0); x.lineTo(-r, r); x.lineTo(-r * .4, 0); x.lineTo(-r, -r); x.closePath(); x.fill(); x.stroke();
      break;
    case 'wraith':
      x.globalAlpha = .75; x.beginPath(); x.arc(0, -r * .1, r, Math.PI, 0); x.lineTo(r, r); x.lineTo(r * .4, r * .6); x.lineTo(0, r); x.lineTo(-r * .4, r * .6); x.lineTo(-r, r); x.closePath(); x.fill(); x.globalAlpha = 1; x.stroke();
      eye(-r * .25, r * .2); eye(r * .25, r * .2);
      break;
    case 'hex':
      polyPath(x, 6, r * 1.1, 0); x.fill(); x.stroke();
      x.shadowBlur = 0; polyPath(x, 6, r * .55, 0); x.fillStyle = 'rgba(20,0,40,.6)'; x.fill(); x.strokeStyle = 'rgba(255,255,255,.5)'; x.stroke();
      break;
    case 'boss1':
      polyPath(x, 8, r, Math.PI / 8); x.fill(); x.stroke();
      x.shadowBlur = 0; x.strokeStyle = 'rgba(0,0,0,.5)'; x.lineWidth = 2; polyPath(x, 8, r * .7, Math.PI / 8); x.stroke();
      x.fillStyle = '#300'; circ(x, r * .15, 0, r * .38); x.fill(); x.fillStyle = '#ff2020'; x.shadowColor = '#f00'; x.shadowBlur = 10; circ(x, r * .22, 0, r * .2); x.fill();
      break;
    case 'boss2':
      for (let i = 0; i < 3; i++) { const a = i * TAU / 3; circ(x, Math.cos(a) * r * .5, Math.sin(a) * r * .5, r * .58); x.fill(); x.stroke(); }
      x.shadowBlur = 0; x.fillStyle = 'rgba(0,30,10,.7)'; circ(x, 0, 0, r * .4); x.fill();
      for (let i = 0; i < 3; i++) { const a = i * TAU / 3; x.fillStyle = '#fff'; circ(x, Math.cos(a) * r * .62, Math.sin(a) * r * .62, r * .1); x.fill(); }
      break;
    case 'boss3':
      polyPath(x, 6, r * 1.1, 0, r * .62); x.fill(); x.stroke();
      x.shadowBlur = 0; x.fillStyle = 'rgba(30,0,50,.7)'; circ(x, 0, 0, r * .4); x.fill();
      x.fillStyle = '#ffccff'; circ(x, 0, 0, r * .16); x.fill();
      break;
    case 'boss4':   // cristal fendu : il va se diviser
      for (const s of [-1, 1]) { x.save(); x.translate(0, s * r * .28); polyPath(x, 4, r * .85, 0); x.fill(); x.stroke(); x.restore(); }
      x.shadowBlur = 0; x.strokeStyle = 'rgba(40,10,0,.8)'; x.lineWidth = 2;
      x.beginPath(); x.moveTo(-r * .9, 0); x.lineTo(-r * .3, r * .12); x.lineTo(r * .2, -r * .1); x.lineTo(r * .9, 0); x.stroke();
      x.fillStyle = '#fff'; circ(x, r * .35, 0, r * .13); x.fill();
      break;
    case 'boss5':   // sentinelle : hexagone entouré d'arcs de bouclier
      polyPath(x, 6, r * .9, Math.PI / 6); x.fill(); x.stroke();
      x.shadowBlur = 0; x.strokeStyle = 'rgba(160,240,255,.9)'; x.lineWidth = 2.5;
      for (let i = 0; i < 3; i++) { x.beginPath(); x.arc(0, 0, r * 1.18, i * TAU / 3 + .2, i * TAU / 3 + 1.6); x.stroke(); }
      x.fillStyle = 'rgba(0,30,50,.75)'; circ(x, 0, 0, r * .38); x.fill(); x.fillStyle = '#dff8ff'; circ(x, 0, 0, r * .15); x.fill();
      break;
    case 'mega1': {   // Léviathan : raie abyssale cuirassée
      x.beginPath(); x.moveTo(r * 1.3, 0); x.quadraticCurveTo(r * .2, r * 1.25, -r * 1.1, r * .55); x.lineTo(-r * .7, 0); x.lineTo(-r * 1.1, -r * .55); x.quadraticCurveTo(r * .2, -r * 1.25, r * 1.3, 0); x.closePath(); x.fill(); x.stroke();
      x.shadowBlur = 0; x.strokeStyle = 'rgba(0,20,40,.75)'; x.lineWidth = 2;
      for (let i = 0; i < 4; i++) { x.beginPath(); x.arc(-r * .2 + i * r * .28, 0, r * .55, -.9, .9); x.stroke(); }
      x.beginPath(); x.moveTo(-r * .7, 0); x.lineTo(-r * 1.6, 0); x.lineWidth = 3; x.strokeStyle = shade(c, .7); x.stroke();
      x.fillStyle = '#001a26'; circ(x, r * .62, 0, r * .26); x.fill();
      x.fillStyle = '#ffffff'; x.shadowColor = c; x.shadowBlur = 14; circ(x, r * .66, 0, r * .13); x.fill();
      break;
    }
    case 'mega2': {   // Oméga : anneaux concentriques autour d'un cœur stellaire
      polyPath(x, 12, r, 0, r * .78); x.fill(); x.stroke();
      x.shadowBlur = 0; x.fillStyle = 'rgba(30,0,40,.85)'; circ(x, 0, 0, r * .62); x.fill();
      x.strokeStyle = 'rgba(255,255,255,.75)'; x.lineWidth = 1.5;
      for (let i = 0; i < 3; i++) { x.beginPath(); x.arc(0, 0, r * (.3 + i * .12), i * 1.3, i * 1.3 + 4.2); x.stroke(); }
      x.fillStyle = '#ffffff'; x.shadowColor = c; x.shadowBlur = 16; circ(x, 0, 0, r * .17); x.fill();
      x.shadowBlur = 0; x.fillStyle = c; x.font = `bold ${Math.round(r * .5)}px sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.globalAlpha = .9; x.fillText('Ω', 0, r * .02); x.globalAlpha = 1;
      break;
    }
    case 'boss6':   // sauteur : chevron prêt à bondir
      x.beginPath(); x.moveTo(r * 1.25, 0); x.lineTo(-r * .55, r * 1.05); x.lineTo(-r * .15, 0); x.lineTo(-r * .55, -r * 1.05); x.closePath(); x.fill(); x.stroke();
      x.beginPath(); x.moveTo(r * .2, 0); x.lineTo(-r * 1.05, r * .75); x.lineTo(-r * .8, 0); x.lineTo(-r * 1.05, -r * .75); x.closePath(); x.globalAlpha = .7; x.fill(); x.globalAlpha = 1;
      x.shadowBlur = 0; x.fillStyle = '#fff'; circ(x, r * .45, 0, r * .14); x.fill();
      break;
  }
  if (elite) { x.shadowBlur = 0; x.strokeStyle = '#ffd23f'; x.lineWidth = 2; circ(x, 0, 0, r + 4); x.stroke(); }
  x.restore();
}

function drawTrapShape(x, type, lit) {
  x.save();
  if (type === 'mine') {
    x.fillStyle = '#7a2a20';
    for (let i = 0; i < 6; i++) { x.save(); x.rotate(i * TAU / 6); x.fillRect(-1.5, -12, 3, 5); x.restore(); }
    x.fillStyle = '#1a1e28'; circ(x, 0, 0, 9); x.fill(); x.strokeStyle = '#ff5544'; x.lineWidth = 1.5; x.stroke();
    x.fillStyle = lit ? '#ff6655' : '#5a1810'; if (lit) { x.shadowColor = '#ff3322'; x.shadowBlur = 10; }
    circ(x, 0, 0, 3.4); x.fill();
  } else {
    roundRect(x, -15, -9, 30, 18, 3); x.fillStyle = '#2a2416'; x.fill();
    x.save(); roundRect(x, -15, -9, 30, 18, 3); x.clip();
    x.fillStyle = '#ffae00';
    for (let i = -30; i < 30; i += 8) { x.beginPath(); x.moveTo(i, -9); x.lineTo(i + 4, -9); x.lineTo(i - 14, 9); x.lineTo(i - 18, 9); x.closePath(); x.fill(); }
    x.restore();
    roundRect(x, -15, -9, 30, 18, 3); x.strokeStyle = '#1a1206'; x.lineWidth = 2; x.stroke();
    x.fillStyle = '#5a4a2a'; x.fillRect(-13, 9, 4, 4); x.fillRect(9, 9, 4, 4);
  }
  x.restore();
}

function drawDropShape(x, type) {
  x.save();
  if (type === 'gold') {
    x.shadowColor = '#ffd23f'; x.shadowBlur = 10;
    const g = x.createRadialGradient(-2, -2, 0, 0, 0, 7); g.addColorStop(0, '#fff6c0'); g.addColorStop(1, '#d99a00');
    x.fillStyle = g; circ(x, 0, 0, 7); x.fill(); x.shadowBlur = 0;
    x.strokeStyle = '#7a5200'; x.lineWidth = 1; circ(x, 0, 0, 4.5); x.stroke();
  } else if (type === 'nano') {
    x.shadowColor = '#00ffaa'; x.shadowBlur = 12; x.fillStyle = '#00ffaa';
    polyPath(x, 6, 7, Math.PI / 6); x.fill(); x.shadowBlur = 0;
    x.fillStyle = '#003322'; polyPath(x, 6, 3.6, Math.PI / 6); x.fill();
  } else {
    x.shadowColor = '#ff2a6d'; x.shadowBlur = 10; x.fillStyle = '#ff2a6d';
    x.fillRect(-2.5, -7, 5, 14); x.fillRect(-7, -2.5, 14, 5);
  }
  x.restore();
}

const Spr = {
  k: 2, cache: new Map(),
  setK(k) { k = clamp(Math.ceil(k * 2) / 2, 1, 3); if (k !== this.k) { this.k = k; this.cache.clear(); } },
  mk(w, h, fn, k = this.k) {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.ceil(w * k)); c.height = Math.max(1, Math.ceil(h * k));
    const x = c.getContext('2d'); x.scale(k, k); fn(x, w, h); return c;
  },
  get(key, w, h, fn) { let c = this.cache.get(key); if (!c) { c = this.mk(w, h, fn); this.cache.set(key, c); } return c; },
  glow(col, white = true) {
    return this.get('g' + col + white, 32, 32, x => {
      const g = x.createRadialGradient(16, 16, 0, 16, 16, 16);
      if (white) { g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.22, rgba(col, .95)); }
      else g.addColorStop(0, rgba(col, .9));
      g.addColorStop(.55, rgba(col, .28)); g.addColorStop(1, rgba(col, 0));
      x.fillStyle = g; x.fillRect(0, 0, 32, 32);
    });
  },
  base(key) { return this.get('b' + key, 64, 64, x => { x.translate(32, 32); drawTowerBase(x, TOWERS[key]); }); },
  head(key) { return this.get('h' + key, 64, 64, x => { x.translate(32, 32); drawTowerHead(x, TOWERS[key]); }); },
  enemy(type, elite) {
    const d = EDEF(type), s = Math.ceil(d.r * 2 * (elite ? 1.25 : 1) + 30);
    return this.get('e' + type + (elite ? 'E' : ''), s, s, x => { x.translate(s / 2, s / 2); drawEnemyShape(x, d, elite); });
  },
  drop(type) { return this.get('d' + type, 28, 28, x => { x.translate(14, 14); drawDropShape(x, type); }); },
  // icône dessinée directement dans un <canvas> du DOM
  icon(cv, key, css, rot = 0) {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(css * dpr); cv.height = Math.round(css * dpr);
    const x = cv.getContext('2d'), s = css * dpr / 64;
    x.setTransform(s, 0, 0, s, 32 * s, 32 * s);
    drawTowerBase(x, TOWERS[key]); x.rotate(rot); drawTowerHead(x, TOWERS[key]); drawHeadExtras(x, TOWERS[key], 520, false, false);
  },
  enemyIcon(cv, type, css) {
    const dpr = Math.min(2, window.devicePixelRatio || 1), d = EDEF(type);
    cv.width = Math.round(css * dpr); cv.height = Math.round(css * dpr);
    const x = cv.getContext('2d'), s = css * dpr / (d.r * 2 + 10);
    x.setTransform(s, 0, 0, s, cv.width / 2, cv.height / 2);
    drawEnemyShape(x, d, false);
  }
};

