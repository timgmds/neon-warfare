/* ============================== DÉMARRAGE ============================== */
function boot() {
  Store.load();
  if (!THEMES[Store.s.theme]) Store.s.theme = 'theme-cyber';
  UI.init();
  Render.init();
  Input.init();
  Render.setTheme(Store.s.theme);
  $('fps').style.display = Store.s.fps ? 'block' : 'none';
  try {
    if (navigator.keyboard && navigator.keyboard.getLayoutMap)
      navigator.keyboard.getLayoutMap().then(m => { UI.layout = m; UI.buildAbils(); if (G) UI.refreshAbils(true); }).catch(() => {});
  } catch (e) { /* API indisponible */ }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (Game.state === 'play' && G && !G.over && !UI.blocking() && !Net.on) UI.openPause();
      if (Sfx.ctx && Sfx.ctx.state === 'running') Sfx.ctx.suspend();
    } else if (Sfx.ctx && Sfx.ctx.state === 'suspended') Sfx.ctx.resume();
  });
  window.addEventListener('scroll', () => { if (window.scrollX || window.scrollY) window.scrollTo(0, 0); });
  window.addEventListener('beforeunload', () => { if (G && !G.over && G.phase === 'prep') SaveSys.save(); });
  // fermeture de l'onglet : on prévient les autres joueurs tout de suite (sinon ils attendraient 20 s)
  window.addEventListener('pagehide', () => { if (Net.on) { try { Net.send({ t: 'bye' }); Net.flushAll(); } catch (e) { /* ignore */ } } });
  App.init();
  UI.showMenu();
  News.check();
  requestAnimationFrame(t => { lastT = t; requestAnimationFrame(loop); });
  // accès console pour le débogage : NW.G, NW.give(5000), ...
  window.NW = {
    get G() { return G; }, Game, Towers, Waves, Enemies, UI, Render, Store, Skills, Fusion,
    give(m = 5000, n = 50) { if (G) { G.money += m; G.nanites += n; } }
  };
}
// si le jeu est affiché dans un visualiseur qui recharge la page à chaud, on sauvegarde avant (entre deux vagues)
const hot = window.claude && window.claude.hot;
if (hot && hot.snapshot) hot.snapshot(() => { try { if (G && !G.over && G.phase === 'prep') SaveSys.save(); } catch (e) { /* ignore */ } return {}; });
if (hot && hot.ready) hot.ready(boot); else boot();
