/* ============================== BUTIN & RECYCLAGE ============================== */
const Drops = {
  col: { gold: '#ffd23f', nano: '#00ffaa', repair: '#ff2a6d' },
  spawn(x, y, type) { if (G.drops.length < 40) G.drops.push({ id: G.nextId++, x, y, type, life: 600, ph: sr() * TAU, fly: 0, tx: 0, ty: 0, by: null }); },
  update() {
    const D = G.drops;
    for (let i = D.length - 1; i >= 0; i--) {
      const d = D[i];
      d.ph += .1;
      if (d.fly > 0) {
        d.fly++; d.x += (d.tx - d.x) * .2; d.y += (d.ty - d.y) * .2;
        if (d.fly > 12) { this.give(d); D.splice(i, 1); }
        continue;
      }
      if (--d.life <= 0) { D.splice(i, 1); continue; }
      if (G.mod.magnet && d.life < 560) this.collect(d);
    }
  },
  collect(d) { if (d.fly) return; d.fly = 1; d.by = G.actor; d.tx = d.x; d.ty = d.y - 26; Sfx.play('coin'); },
  grab(id) { const d = G.drops.find(x => x.id === id); if (d) this.collect(d); },
  // côté interface : survol (souris) ou toucher → action « ramasser », envoyée une seule fois par objet
  near(x, y, r) {
    let any = false;
    for (const d of G.drops) if (!d.fly && !d.req && d2(x, y, d.x, d.y) < r * r) { d.req = true; Act.do('drop', d.id); any = true; }
    return any;
  },
  tap(x, y) { return this.near(x, y, 46); },
  give(d) {
    if (d.type === 'gold') { const v = Math.round(20 + G.waveNum * 4); gain(v, d.by); FX.float(d.x, d.y, '+' + v, '#ffd23f', 14); }
    else if (d.type === 'nano') { G.nanites++; FX.float(d.x, d.y, '+1 ◈', '#00ffaa', 14); }
    else { const v = Math.min(5, G.maxLives - G.lives); G.lives += v; FX.float(d.x, d.y, '+' + v + ' ♥', '#ff2a6d', 14); }
    FX.spark(d.x, d.y, this.col[d.type], 10, 2.6);
  }
};

const Recycle = {
  start(tx, ty) {
    if (G.recycling) { UI.toast('Recyclage', 'Un recyclage est déjà en cours.', '#9fb0cc', 2); return; }
    if (G.recycle <= 0) { Sfx.play('error'); UI.toast('Recyclage', 'Aucune charge disponible (+1 toutes les 5 vagues).', '#ff2a6d', 2.5); return; }
    G.recycle--; G.recycling = { tx, ty, t: 60, by: G.actor };
    Sfx.play('ui'); if (Act.mine()) UI.deselect();
  },
  update() {
    const r = G.recycling; if (!r) return;
    const x = (r.tx + .5) * TILE, y = (r.ty + .5) * TILE;
    if ((G.tick & 3) === 0) FX.spark(x, y, '#9fb0cc', 2, 1.5, 18);
    if (--r.t > 0) return;
    G.map.cells[r.ty * G.map.C + r.tx] = 0; G.recycling = null; Render.dirtyMap = true;
    const m = G.mod.recycleMul;
    if (sr() < .3) { G.nanites += m; FX.float(x, y, `+${m} ◈`, '#00ffaa', 14); }
    else { const v = Math.round((25 + sr() * 35 + G.waveNum * 2) * m); gain(v, r.by); FX.float(x, y, '+' + v, '#ffd23f', 14); }
    FX.ring(x, y, '#ffffff', 26, 18, 2); FX.spark(x, y, '#cfd8e8', 14, 3); Sfx.play('coin');
    if (!G.replay) Store.data.stats.recycled++;
    if (Store.data.stats.recycled >= 10) Ach.unlock('recycler');
    Missions.on('recycle');
  }
};

