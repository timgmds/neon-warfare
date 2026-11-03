/* ============================== SAUVEGARDE ============================== */
const SaveSys = {
  save() {
    if (!G || G.over || G.demo || G.net || G.replay) return;
    Store.data.save = this.pack();
    Store.save();
  },
  pack() {
    const M = G.map;
    return {
      v: 8, gm: G.gm, cus: G.cus, cmap: G.cmap || null, rec: G.rec ? 1 : 0, portrait: G.portrait, diffKey: G.diffKey, seed: G.seed, waveNum: G.waveNum, daily: G.daily, mutKeys: G.mutKeys,
      doctrine: G.doctrine, missions: G.missions, cards: G.cards, timed: G.timed, cardQ: G.cardQ, offer: G.offer, xpRun: G.xpRun, cmdStart: G.cmdStart, cx: G.cx, focus: G.focus || 0,
      traps: G.traps.map(t => [t.type, t.tx, t.ty, Math.round(t.dmg), Math.round(t.hp), Math.round(t.max), t.cost]), money: Math.floor(G.money), lives: G.lives, maxLives: G.maxLives,
      rs: G.rs, nanites: G.nanites, res: G.res, recycle: G.recycle, skills: G.skills, unlocked: [...G.unlocked], stats: G.stats, abil: G.abil, seen: G.seen, used: G.used,
      tstats: Object.fromEntries(Object.entries(G.tstats).map(([k, s]) => [k, [Math.round(s.dealt), s.kills, s.shots, s.spent]])),
      waveDmg: Object.fromEntries(Object.entries(G.waveDmg).map(([k, v]) => [k, Math.round(v)])),
      map: { C: M.C, R: M.R, cells: Array.from(M.cells).join(''), paths: M.paths },
      towers: G.towers.map(t => [t.key, t.tx, t.ty, t.level, t.invested, t.kills, Math.round(t.dealt), t.strat, t.oc ? 1 : 0, t.spec, t.shots, t.jamP ? t.stun : 0]),
      date: Date.now()
    };
  },
  clear() { Store.data.save = null; Store.save(); }
};

