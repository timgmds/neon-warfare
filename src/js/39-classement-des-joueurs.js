/* ============================== CLASSEMENT DES JOUEURS ============================== */
const Score = {
  on: false, t: 0,
  // coopération : tout se calcule sur l'état partagé ; versus : chiffres envoyés par chaque joueur
  rows() {
    if (!G || !G.net) return [];
    if (G.net === 'coop') return MP.slots.map(p => {
      const T = G.towers.filter(t => t.owner === p), o = (G.pst || {})[p] || { d: 0, k: 0 };
      return { p, d: o.d + T.reduce((a, t) => a + (t.dealt || 0), 0), k: o.k + T.reduce((a, t) => a + (t.kills || 0), 0), n: T.length,
        inv: T.reduce((a, t) => a + (t.invested || 0), 0), c: G.wallets ? G.wallets[p] || 0 : 0, out: !!((G.gone && G.gone[p]) || MP.out[p]) };
    });
    const mine = { p: Net.me, d: this.myDmg(), k: G.stats.kills, w: G.waveNum, l: Math.ceil(G.lives), n: G.towers.length };
    return [mine].concat(MP.others().map(p => { const o = MP.opps[p] || {}; return { p, d: o.dmg || 0, k: o.kills || 0, w: o.wave, l: o.over ? 0 : o.lives, n: o.tw, out: !!(o.over || MP.out[p]) }; }));
  },
  myDmg() { let d = 0; for (const k in G.tstats) d += G.tstats[k].dealt || 0; return Math.round(d); },
  html(big) {
    const R = this.rows().sort((a, b) => b.d - a.d), max = Math.max(1, ...R.map(r => r.d)), coop = G.net === 'coop';
    const head = coop ? '<th>JOUEUR</th><th>DÉGÂTS</th><th>ÉLIM.</th><th>TOURELLES</th><th>INVESTI</th><th>CRÉDITS</th>' : '<th>JOUEUR</th><th>DÉGÂTS</th><th>ÉLIM.</th><th>VAGUE</th><th>INTÉGRITÉ</th>';
    return `<h4>🏆 CLASSEMENT${big ? '' : ` <small>${Keys.lbl('score') ? Keys.lbl('score') + ' pour fermer' : ''}</small>`}</h4><table class="sc-t"><tr>${head}</tr>` + R.map((r, i) =>
      `<tr class="${r.p === Net.me ? 'me' : ''}${r.out ? ' out' : ''}" style="--oc:${MP_COL[r.p]}"><td><span class="rk">${i + 1}</span>${MP.esc(MP.name(r.p))}${r.p === Net.me ? ' (vous)' : ''}${r.out ? ' · parti' : ''}<span class="bar" style="width:${(r.d / max * 100).toFixed(0)}%"></span></td>
      <td>${fmt(Math.round(r.d))}</td><td>${fmt(r.k)}</td>` + (coop ? `<td>${r.n}</td><td>${fmt(Math.round(r.inv))}¢</td><td>${fmt(Math.floor(r.c))}¢</td>` : `<td>${r.w != null ? r.w : '?'}</td><td>${r.l != null ? r.l + ' ♥' : '?'}</td>`) + '</tr>').join('') + '</table>';
  },
  toggle(v) {
    if (!G || !G.net) { UI.toast('Classement', 'Le classement des joueurs est disponible en multijoueur.', '#9fb0cc', 2.5); return; }
    this.on = v != null ? v : !this.on;
    $('score').hidden = !this.on; this.t = 0;
    if (this.on) this.refresh(true);
  },
  refresh(force) {
    if (!this.on) return;
    if (!G || !G.net) { this.on = false; $('score').hidden = true; return; }
    const now = performance.now(); if (!force && now - this.t < 500) return; this.t = now;
    $('score').innerHTML = this.html();
  }
};

