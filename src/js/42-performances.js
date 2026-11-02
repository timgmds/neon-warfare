/* ============================== PERFORMANCES ============================== */
const Perf = {
  acc: 0, frames: 0, fps: 60, slow: 0, degraded: false, simMs: 0, workMs: 0,
  frame(dt) {
    this.acc += dt; this.frames++;
    if (this.acc < 1000) return;
    this.fps = Math.round(this.frames * 1000 / this.acc); this.acc = 0; this.frames = 0;
    if (Store.s.fps) {
      const el = $('fps'); el.style.top = (View.top + 6) + 'px';
      el.textContent = `${this.fps} FPS · image ${this.workMs.toFixed(1)} ms · simulation ${this.simMs.toFixed(2)} ms/tick` +
        (G ? `\n${G.enemies.length} ennemis · ${Shots.pool.n} tirs · ${FX.parts.n} particules` : '');
    }
    this.auto();
  },
  auto() {
    if (Store.s.quality !== 'auto' || this.degraded || Game.state !== 'play' || !G || document.hidden || UI.blocking()) { this.slow = 0; return; }
    // on ne dégrade que si NOTRE travail par image est lourd (et pas si le navigateur bride simplement l'onglet)
    // avec les effets WebGL, c'est souvent le GPU qui peine : il ne se voit que dans les FPS, pas dans le temps JS
    if (this.fps < 40 && (this.workMs > 9 || GLFX.active())) this.slow++; else this.slow = Math.max(0, this.slow - 1);
    if (this.slow >= 4) {
      this.degraded = true; Render.applyQuality();
      UI.toast('Performances', 'Qualité graphique réduite automatiquement pour garder le jeu fluide (modifiable dans les options).', '#ffae00', 5);
    }
  }
};

