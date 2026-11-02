/* ============================== COMMANDANT (progression permanente) ============================== */
const Cmd = {
  need(l) { return 120 + 40 * (l - 1); },
  rank(l) { return RANKS[Math.min(RANKS.length - 1, Math.floor((l - 1) / 2))]; },
  mult() { return G ? (XP_DIFF[G.diffKey] || 1) * (G.daily ? 1.3 : 1) : 1; },
  nextDoctrine(l) { return Object.values(DOCTRINES).filter(d => d.lvl > l).sort((a, b) => a.lvl - b.lvl)[0] || null; },
  gain(x) {
    x = Math.round(x);
    if (!x || (G && (G.demo || G.replay || G.gm === 'sandbox' || G.gm === 'custom'))) return;
    const c = Store.data.cmd;
    c.xp += x;
    if (G) G.xpRun += x;
    while (c.xp >= this.need(c.lvl)) { c.xp -= this.need(c.lvl); c.lvl++; Store.data.meta.frags += 2; this.levelUp(c.lvl); }
    Store.save();
    UI.missionsDirty = true;
  },
  levelUp(l) {
    const doc = Object.values(DOCTRINES).find(d => d.lvl === l);
    UI.banner(`NIVEAU ${l}`, this.rank(l).toUpperCase(), '#ffd23f');
    UI.toast(`Commandant niveau ${l} · ${this.rank(l)}`, `<span class="frags">+2 ✦</span> fragments d'Héritage${doc ? `<br>Nouvelle doctrine débloquée : <b style="color:var(--gold)">${doc.n}</b>` : ''}`, '#ffd23f', 6);
    Sfx.play('levelup');
  }
};

