/* ============================== CASINO : MACHINE À SOUS & PARIS ==============================
   Ouvert entre les vagues. Tirages et paris passent par Act (hasard de simulation) : en coopération,
   chaque joueur joue avec son propre portefeuille et ses propres jetons. */
const Casino = {
  TOKENS: 3,
  pl() { return G.actor != null ? G.actor : 0; },
  base() { return Math.round((20 + 8 * Math.max(1, G.waveNum)) / 5) * 5; },
  betCost(lvl) { return this.base() * BET_LVL[lvl].m; },
  tokens(p = this.pl()) { return G.tokens[p] || 0; },
  spin(lvl) {
    const p = this.pl(), cost = this.betCost(lvl);
    if (G.phase !== 'prep' || this.tokens(p) <= 0 || !BET_LVL[lvl]) return false;
    if (G.money < cost) { UI.noMoney(); return false; }
    G.money -= cost; G.tokens[p]--;
    const roll = () => { let r = sr() * 100; for (const k of SLOT_KEYS) { r -= SLOT_SYM[k].w; if (r < 0) return k; } return 'c'; };
    const R = [roll(), roll(), roll()], n = Math.max(1, G.waveNum);
    const cnt = {}; for (const k of R) cnt[k] = (cnt[k] || 0) + 1;
    const three = Object.keys(cnt).find(k => cnt[k] === 3), pair = Object.keys(cnt).find(k => cnt[k] === 2);
    let cash = 0, txt = 'Perdu…', tier = 0;   // tier : 0 perdu, 1 petit gain, 2 gros gain, 3 jackpot, -1 malédiction
    if (three === 'j') { cash = cost * 30 + G.jpot; G.nanites += 8; txt = `JACKPOT ! +${fmt(cash)}¢ et +8 ◈`; tier = 3; G.jpot = 400 + 60 * n; Ach.unlock('jackpot'); }
    else if (three === 'c') { cash = cost * 8; txt = `Triple crédit : +${fmt(cash)}¢`; tier = 2; }
    else if (three === 'n') { const v = 4 + Math.floor(n / 6); G.nanites += v; cash = cost; txt = `Triple nanite : +${v} ◈ et mise rendue`; tier = 2; }
    else if (three === 'k') { cash = Math.round(cost * 1.5); G.cardQ++; if (!G.offer) G.offer = Cards.roll(); txt = 'Triple étoile : un protocole offert !'; tier = 2; }
    else if (three === 'a') { cash = cost * 2; for (const k of Abil.keys) G.abil[k] = 0; txt = 'Triple comète : capacités rechargées !'; tier = 2; UI.refreshAbils(true); }
    else if (three === 'h') { cash = Math.round(cost * 1.5); const v = Math.min(15, G.maxLives - G.lives); G.lives += 15; G.maxLives += 15 - v; txt = 'Triple cœur : +15 intégrité'; tier = 2; }
    else if (three === 's') { const v = Math.min(cost, Math.max(0, G.money)); G.money -= v; G.curse = 1.15; txt = `Malédiction ! -${fmt(v)}¢ et vague suivante +15 % de PV`; tier = -1; }
    else if (pair === 'j') { cash = cost * 3; txt = `Deux sept : +${fmt(cash)}¢`; tier = 1; }
    else if (pair === 'c') { cash = Math.round(cost * 1.6); txt = `Paire de crédits : +${fmt(cash)}¢`; tier = 1; }
    else if (pair === 'k') { cash = Math.round(cost * 1.3); txt = `Paire d'étoiles : +${fmt(cash)}¢`; tier = 1; }
    else if (pair === 'n') { G.nanites += 2; cash = Math.round(cost * .4); txt = `Paire de nanites : +2 ◈`; tier = 1; }
    else if (pair === 'a') { for (const k of Abil.keys) G.abil[k] = Math.floor(G.abil[k] / 2); cash = Math.round(cost * .5); txt = 'Paire de comètes : recharge des capacités -50 %'; tier = 1; }
    else if (pair === 'h') { const v = Math.min(3, G.maxLives - G.lives); G.lives += 3; G.maxLives += 3 - v; cash = Math.round(cost * .5); txt = 'Paire de cœurs : +3 intégrité'; tier = 1; }
    else if (cnt.j) { cash = cost; txt = 'Un sept : mise remboursée'; tier = 1; }
    if (cash) { gain(cash, p); G.stats.gold -= Math.min(cash, cost); }
    if (tier <= 0) G.jpot += Math.round(cost * .5);
    G.slot[p] = { R, txt, tier, seq: (G.slot[p] ? G.slot[p].seq : 0) + 1, cash };
    G.stats.spins = (G.stats.spins || 0) + 1;
    return true;
  },
  // paris : les options dépendent de la vague à venir et des performances récentes
  betOptions() {
    const P = G.preview, n = P.n, boss = P.bosses.length > 0, leaky = G.leakHist.some(x => x), out = [];
    out.push({ k: 'clean', n: 'Sans fuite', d: `Aucun ennemi ne franchit la défense pendant la vague ${n}.`, odds: +(1.35 + (leaky ? .8 : 0) + (boss ? .4 : 0)).toFixed(2) });
    if (G.lastDur) { const x = Math.max(20, Math.round(G.lastDur / 60 * .85 / 5) * 5); out.push({ k: 'fast', n: 'Éclair', d: `Vague ${n} entièrement nettoyée en moins de ${x} s.`, odds: 2.2, x }); }
    const c = Math.max(15, Math.round((G.lastMc || 10) * 1.25 / 5) * 5);
    out.push({ k: 'combo', n: 'Carnage', d: `Atteindre un combo de ${c} pendant la vague ${n}.`, odds: 2, x: c });
    if (boss) out.push({ k: 'boss', n: 'Chasseur de boss', d: `Chaque boss abattu moins de 25 s après son apparition.`, odds: 2.6, x: 25 });
    return out;
  },
  myBet(p = Net.me) { return G.bets.find(b => b.p === p && b.n === G.preview.n) || null; },
  bet(kind, pi) {
    const p = this.pl();
    if (G.phase !== 'prep' || G.bets.some(b => b.p === p && b.n === G.preview.n) || !BET_STAKE[pi]) return false;
    const o = this.betOptions().find(x => x.k === kind); if (!o) return false;
    const stake = this.base() * BET_STAKE[pi].m;
    if (G.money < stake) { UI.noMoney(); return false; }
    G.money -= stake;
    G.bets.push({ p, k: kind, n: G.preview.n, stake, odds: o.odds, x: o.x || 0, name: o.n });
    if (Act.mine()) { UI.toast('Pari enregistré', `<b>${o.n}</b> · mise ${fmt(stake)}¢ · cote ×${o.odds}`, '#ffd23f', 3); Sfx.play('coin'); }
    return true;
  },
  resolve(w) {
    for (let i = G.bets.length - 1; i >= 0; i--) {
      const b = G.bets[i]; if (b.n !== w.n) continue;
      G.bets.splice(i, 1);
      const ok = b.k === 'clean' ? w.leaks === 0 : b.k === 'fast' ? (G.tick - w.t0) <= b.x * 60
        : b.k === 'combo' ? (w.mc || 0) >= b.x : b.k === 'boss' ? (w.bk || 0) > 0 && !w.bossSlow : false;
      const mine = !Net.coop || b.p === Net.me;
      if (ok) {
        const v = Math.round(b.stake * b.odds); gain(v, b.p); G.stats.gold -= b.stake;
        G.betsWon = (G.betsWon || 0) + 1; if (G.betsWon >= 5 && mine) Ach.unlock('bookie');
        if (mine && !G.demo) { UI.toast('PARI GAGNÉ !', `<b>${b.name}</b> : +${fmt(v)}¢ (×${b.odds})`, '#39ff88', 4); Sfx.play('win'); }
      } else if (mine && !G.demo) { UI.toast('Pari perdu', `<b>${b.name}</b> : la mise de ${fmt(b.stake)}¢ est perdue.`, '#ff2a6d', 3.5); Sfx.play('lose'); }
    }
  }
};

