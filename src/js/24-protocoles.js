/* ============================== PROTOCOLES (cartes entre les vagues) ============================== */
const Cards = {
  ok(id) {
    const c = CARDS[id];
    if (c.max && (G.cards[id] || 0) >= c.max) return false;
    if (c.timed && G.timed.some(t => t.id === id)) return false;
    return !c.need || c.need();
  },
  roll() {
    const w = G.waveNum, rw = [55, 32 + w * .5, 10 + w * .4, w >= 12 ? 3 + w * .12 : 0], n = 3 + (G.mod.choices || 0), out = [], cats = {};
    const pool = Object.keys(CARDS).filter(id => this.ok(id) && rw[CARDS[id].r] > 0);
    // une main variée : une catégorie déjà présente devient bien moins probable
    while (out.length < n && pool.length) {
      const id = pool.splice(weightedIndex(pool.map(k => rw[CARDS[k].r] * (cats[CARDS[k].cat] ? .25 : 1)), sr), 1)[0];
      out.push(id); cats[CARDS[id].cat] = 1;
    }
    return out;
  },
  // le type de tourelle qui a infligé le plus de dégâts (Spécialisation)
  fav() {
    const S = {}; let b = null;
    for (const t of G.towers) if (t.d.kind !== 'support') S[t.key] = (S[t.key] || 0) + t.dealt + 1;
    for (const k in S) if (!b || S[k] > S[b]) b = k;
    return b;
  },
  offer() {
    if (G.demo) { const o = this.roll(); if (o.length) this.apply(pick(o)); return; }
    G.cardQ++;
    if (!G.offer) G.offer = this.roll();
    UI.openCards();
  },
  apply(id) {
    const c = CARDS[id];
    G.cards[id] = (G.cards[id] || 0) + 1;
    if (c.timed) G.timed.push({ id, left: c.timed });
    if (c.now) c.now();
    Skills.apply(); Towers.recalc();
  },
  // coopération : les protocoles se choisissent à tour de rôle parmi les joueurs encore présents
  turn() {
    if (!(G.wallets && Net.coop)) return Net.me;
    const P = []; for (let i = 0; i < G.wallets.length; i++) if (!(G.gone && G.gone[i])) P.push(i);
    return P.length ? P[(G.cardN || 0) % P.length] : Net.me;
  },
  pick(i) {
    const id = G.offer && G.offer[i]; if (!id) return;
    if (G.wallets && G.actor != null && G.actor !== this.turn()) return;
    if (G.wallets) G.cardN = (G.cardN || 0) + 1;
    const c = CARDS[id];
    this.apply(id);
    G.cardQ = Math.max(0, G.cardQ - 1);
    G.offer = G.cardQ > 0 ? this.roll() : null;
    Sfx.play(c.pact ? 'fuse' : 'upgrade');
    Render.flash(.18, c.pact ? '#ff3d5a' : CARD_RARITY[c.r].c);
    if (G.offer && this.turn() === Net.me) UI.openCards(); else UI.close('ov-cards');
    UI.buildBar(); UI.refreshHUD();
    if (UI.sel) UI.renderPanel();
  },
  rerollCost() { return 30 + 10 * G.waveNum; },
  reroll() {
    if (G.wallets && G.actor != null && G.actor !== this.turn()) return;
    const c = this.rerollCost();
    if (G.money < c) { UI.noMoney(); return; }
    G.money -= c; G.offer = this.roll(); Sfx.play('ui'); UI.renderCards(); UI.refreshHUD();
  },
  // pactes à durée limitée : effets de fin de vague puis expiration
  tick() {
    let nano = 0, cash = 1;
    for (const t of G.timed) { if (t.id === 'horde') { nano += 2; cash *= 1.3; } t.left--; }
    const n = G.timed.length;
    G.timed = G.timed.filter(t => t.left > 0);
    if (G.timed.length !== n) Skills.apply();
    return { nano, cash };
  }
};

