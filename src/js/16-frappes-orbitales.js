/* ============================== FRAPPES ORBITALES ============================== */
const Strikes = {
  add(x, y, r, dmg, src, col, delay, big) { G.strikes.push({ x, y, r, dmg, src, col, t: delay, max: delay, big }); },
  update() {
    const S = G.strikes;
    for (let i = S.length - 1; i >= 0; i--) {
      const s = S[i];
      if (--s.t > 0) continue;
      const hits = Combat.splash(s.x, s.y, s.r, s.dmg, s.src, false, false, 1);
      if (s.big) Missions.on('orbital', hits);
      FX.line(s.x, s.y - 800, s.x, s.y, s.col, s.big ? 28 : 12, s.big ? 26 : 18);
      FX.line(s.x, s.y - 800, s.x, s.y, '#ffffff', s.big ? 8 : 4, s.big ? 20 : 14);
      FX.ring(s.x, s.y, s.col, s.r * 1.25, 30, 4); FX.ring(s.x, s.y, '#ffffff', s.r * .7, 18, 2);
      FX.spark(s.x, s.y, s.col, s.big ? 40 : 18, s.big ? 6 : 4, 40, 3);
      if (s.big) { Render.shake(16); Render.flash(.35, s.col); Sfx.play('boom'); }
      else { Render.shake(5); Sfx.at(s.x); Sfx.play('boom', .6); }
      S.splice(i, 1);
    }
  }
};

