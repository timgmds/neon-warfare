/* ============================== ENTRÉES ============================== */
const Input = {
  init() {
    const c = $('cv-game');
    c.addEventListener('pointermove', e => this.move(e));
    c.addEventListener('pointerdown', e => this.down(e));
    c.addEventListener('pointerleave', () => { UI.hover.inside = false; UI.hideTip(); });
    c.addEventListener('contextmenu', e => { e.preventDefault(); UI.cancel(); });
    c.addEventListener('mousedown', e => { if (e.button === 1) e.preventDefault(); });   // pas de défilement automatique au clic molette
    // appui long au doigt (coopération) : marqueur pour les partenaires
    const stopLong = () => { clearTimeout(this.longT); this.longT = 0; };
    c.addEventListener('pointerup', stopLong); c.addEventListener('pointercancel', stopLong);
    c.addEventListener('pointermove', e => { if (this.longT && Math.hypot(e.clientX - this.longX, e.clientY - this.longY) > 12) stopLong(); });
    window.addEventListener('keydown', e => this.key(e));
    $('bar').addEventListener('wheel', e => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) { $('bar').scrollLeft += e.deltaY; e.preventDefault(); }
    }, { passive: false });
    const unlock = () => Sfx.init();
    window.addEventListener('pointerdown', unlock, { passive: true });
    window.addEventListener('keydown', unlock, { passive: true });
  },
  locate(e) {
    const h = UI.hover;
    h.sx = e.clientX; h.sy = e.clientY;
    h.wx = (e.clientX - View.ox) / View.scale; h.wy = (e.clientY - View.oy) / View.scale;
    h.tx = Math.floor(h.wx / TILE); h.ty = Math.floor(h.wy / TILE);
    h.touch = e.pointerType === 'touch';
    h.inside = !!G;
  },
  move(e) {
    if (!G) return;
    this.locate(e);
    if (!UI.hover.touch) UI.hoverTower();
  },
  down(e) {
    if (!G || Game.state !== 'play' || G.over || e.button === 2) return;
    this.locate(e);
    const h = UI.hover, M = G.map;
    if (Net.coop) {
      if (e.button === 1 || e.altKey) { e.preventDefault(); MP.ping(h.wx, h.wy); return; }
      if (h.touch) { clearTimeout(this.longT); this.longX = e.clientX; this.longY = e.clientY; this.longT = setTimeout(() => { this.longT = 0; MP.ping(h.wx, h.wy); }, 550); }
    }
    if (UI.targeting) {
      const k = UI.targeting; UI.setTargeting(null);
      if (G.abil[k] <= 0) Act.do('abil', k, Math.round(clamp(h.wx, 0, M.C * TILE)), Math.round(clamp(h.wy, 0, M.R * TILE)));
      return;
    }
    if (Drops.tap(h.wx, h.wy) || Events.tapPod(h.wx, h.wy)) return;
    const inMap = h.tx >= 0 && h.ty >= 0 && h.tx < M.C && h.ty < M.R;
    if (UI.placing) {
      if (!inMap) { UI.setPlacing(null); return; }
      const tw = Towers.at(h.tx, h.ty);
      if (tw) { UI.select(tw); return; }
      if (M.cells[h.ty * M.C + h.tx] === 2) { UI.selectDebris(h.tx, h.ty); return; }
      // tactile : 1er toucher = aperçu (portée, validité), 2e toucher sur la même case = construction
      if (h.touch && (!UI.pend || UI.pend.tx !== h.tx || UI.pend.ty !== h.ty)) {
        UI.pend = { tx: h.tx, ty: h.ty };
        if (!UI.touchHint) { UI.touchHint = true; UI.toast('Construction', 'Touchez à nouveau la case pour confirmer.', '#00f3ff', 3); }
        return;
      }
      UI.pend = null;
      const t = UI.placing.startsWith('trap:') ? Act.do('trap', UI.placing.slice(5), h.tx, h.ty) : Act.do('build', UI.placing, h.tx, h.ty);
      if (t && !e.shiftKey) UI.setPlacing(null, true);
      return;
    }
    if (!inMap) { UI.deselect(); return; }
    const tw = Towers.at(h.tx, h.ty);
    if (tw) { if (UI.sel === tw) UI.deselect(); else UI.select(tw); return; }
    if (M.cells[h.ty * M.C + h.tx] === 2) { UI.selectDebris(h.tx, h.ty); return; }
    const tr = Traps.at(h.tx, h.ty);
    if (tr) { UI.selectTrap(tr); return; }
    UI.deselect();
  },
  key(e) {
    if (Keys.wait) { Keys.capture(e); return; }
    if (e.target && e.target.tagName === 'INPUT') return;
    const code = e.code;
    if (code === 'Escape') { e.preventDefault(); UI.escape(); return; }
    if (code === 'F3' || code === 'Backquote') { e.preventDefault(); UI.toggleFps(); return; }
    if (UI.stack.length) {
      const top = UI.top();
      if (top === 'ov-cards') { const m = /^(Digit|Numpad)([1-4])$/.exec(code); if (m) Act.do('card', +m[2] - 1); return; }
      if (top === 'ov-over' && (code === 'Enter' || code === 'NumpadEnter' || code === 'Space')) { e.preventDefault(); const b = $('go-again'); if (b) b.click(); return; }
      const a = Keys.act(code);
      if ((a === 'pause' && top === 'ov-pause') || (a === 'tree' && top === 'ov-tree') || (a === 'lab' && top === 'ov-lab') || (a === 'help' && top === 'ov-help' && G) || (a === 'stats' && top === 'ov-stats') || (a === 'casino' && top === 'ov-casino' && !UI.spinning)) UI.close(top);
      return;
    }
    if (Game.state !== 'play' || !G || G.over || e.repeat) return;
    const act = Keys.act(code);
    if (!act) return;
    if (act.startsWith('tw:') || act.startsWith('trap:')) {
      const k = act.startsWith('tw:') ? act.slice(3) : act;
      if (UI.cards[k]) UI.setPlacing(UI.placing === k ? null : k);
      else if (TOWERS[k]) UI.toast(TOWERS[k].name, TOWERS[k].tier >= 2 ? 'Plan non acquis : synthétisez-le au Labo de fusion.' : 'Indisponible dans cette partie.', TOWERS[k].color, 2.5);
      return;
    }
    if (act.startsWith('slot')) { const k = UI.hotkeys[+act.slice(4) - 1]; if (k) UI.setPlacing(UI.placing === k ? null : k); return; }
    switch (act) {
      case 'wave': e.preventDefault(); Act.do('wave'); break;
      case 'pause': UI.openPause(); break;
      case 'speed': Game.cycleSpeed(); break;
      case 'tree': UI.openTree(); break;
      case 'lab': UI.openLab(); break;
      case 'stats': UI.openStats(); break;
      case 'casino': UI.openCasino(); break;
      case 'help': UI.openHelp(); break;
      case 'score': e.preventDefault(); Score.toggle(); break;
      case 'ping': if (Net.coop && UI.hover.inside) MP.ping(UI.hover.wx, UI.hover.wy); break;
      case 'orbital': case 'emp': case 'overdrive': Abil.trigger(act); break;
      case 'up': if (UI.sel) { if (e.shiftKey) UI.upAll(); else if (Act.do('up', UI.sel.tx, UI.sel.ty)) UI.renderPanel(); } break;
      case 'sell': if (UI.sel) { e.preventDefault(); UI.sellSel(); } break;
      case 'strat': if (UI.sel) UI.setStrat((UI.sel.strat + 1) % 4, e.shiftKey); break;
      case 'oc': if (UI.sel) UI.toggleOC(); break;
      case 'unjam': UI.unjam(); break;
      case 'recycle': if (UI.selDebris && !UI.selDebris.trap) Act.do('recycle', UI.selDebris.tx, UI.selDebris.ty); break;
    }
  }
};

