/* ============================== BOUCLE PRINCIPALE ==============================
   Simulation à pas fixe (60 ticks/s) indépendante de la fréquence de l'écran,
   rendu interpolé pour rester fluide sur les écrans 120/144 Hz. */
let lastT = 0;
// avance la simulation de dt millisecondes (appelée par l'affichage, ou par la minuterie de secours en arrière-plan)
function simStep(dt) {
  if (G.over || (UI.blocking() && !Net.on) || (G.replay && G.replay.paused)) { Render.alpha = 1; if (G.over) FX.update(); return; }
  let sm = 1;
  if (Game.slowT > 0) { Game.slowT -= dt; sm = .28; }
  Game.acc += dt * Game.speed * sm * (Net.coop && Net.role === 'guest' ? Lock.pace(dt) : 1) * (G.replay ? G.replay.mul : 1);
  const t0 = performance.now();
  let steps = 0;
  const maxSteps = (Net.coop && Net.role === 'guest') || G.replay ? 48 : 12;
  while (Game.acc >= TICK_MS && steps < maxSteps) {
    if (Net.coop) {
      if (!Lock.ready(G.tick)) { Lock.stall += TICK_MS; Game.acc = Math.min(Game.acc, TICK_MS * 4); break; }
      Lock.stall = 0; Lock.exec(G.tick);
      if (!G || G.over) break;
    }
    if (G.replay) { Replay.feed(); if (G.over) break; }
    Game.update();
    if (Net.coop) Lock.check(G.tick);
    Game.acc -= TICK_MS; steps++;
    if (G.over || (UI.blocking() && !Net.on)) break;
  }
  if (steps >= maxSteps) Game.acc = 0;
  if (steps) Perf.simMs = Perf.simMs * .9 + (performance.now() - t0) / steps * .1;
  Render.alpha = clamp(Game.acc / TICK_MS, 0, 1);
}
function loop(now) {
  requestAnimationFrame(loop);
  const w0 = performance.now();
  let dt = now - lastT; lastT = now;
  if (dt > 250) dt = 250; else if (dt < 0) dt = 0;
  Perf.frame(dt);
  // filet de sécurité : certains navigateurs mobiles ratent l'événement resize (rotation, barre d'adresse)
  if ((UI.frameN & 31) === 0 && (window.innerWidth !== View.w || window.innerHeight !== View.h)) Render.resize();
  if (Game.state === 'play' && G) { simStep(dt); MP.tick(now); }
  if (Net.role) Net.pump(now);
  else if (Game.state === 'menu' && G && G.demo) Demo.frame(dt);
  Render.frame(now);
  UI.frame();
  Perf.workMs = Perf.workMs * .95 + (performance.now() - w0) * .05;
}

