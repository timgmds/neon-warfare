/* ============================== INTERFACE : casino, analyse de combat, codex, historique et manuel ============================== */
Object.assign(UI, {
  /* ---------- casino ---------- */
  csTab: 'slot', csLvl: 0, csBet: null, csPct: 0, spinning: false, holdMoney: null,
  openCasino(tab) {
    if (!G || G.over) return;
    if (tab) this.csTab = tab;
    this.setPlacing(null, true); this.setTargeting(null);
    $('cs-tabs').querySelectorAll('button').forEach(b => { b.classList.toggle('on', b.dataset.k === this.csTab); b.onclick = () => { Sfx.play('ui'); this.openCasino(b.dataset.k); }; });
    $('cs-slot').hidden = this.csTab !== 'slot'; $('cs-bet').hidden = this.csTab !== 'bet';
    $('cs-sub').innerHTML = G.phase === 'prep'
      ? `Ouvert entre les vagues : <b>${Casino.TOKENS} jetons</b> de machine à sous et <b>un pari</b> par vague. Le hasard est impitoyable… et généreux.`
      : '<span style="color:var(--dang)">Fermé pendant la vague</span> — revenez une fois la vague repoussée.';
    if (this.csTab === 'slot') this.renderSlot(); else this.renderBets();
    this.open('ov-casino');
  },
  slotStrip(el, final, n) {
    // bande de symboles : n symboles au hasard puis le résultat (au centre de la fenêtre à l'arrêt)
    let h = '';
    const sym = k => `<div class="sym ${k}" style="color:${SLOT_SYM[k].col}">${k === 'j' ? '7' : TXT(SLOT_SYM[k].g)}</div>`;
    for (let i = 0; i < n; i++) h += sym(SLOT_KEYS[Math.floor(Math.random() * SLOT_KEYS.length)]);
    h += sym(SLOT_KEYS[Math.floor(Math.random() * SLOT_KEYS.length)]) + sym(final) + sym(SLOT_KEYS[Math.floor(Math.random() * SLOT_KEYS.length)]);
    el.innerHTML = h;
  },
  renderSlot() {
    const me = Net.me, cost = l => Casino.betCost(l), tok = Casino.tokens(me), prep = G.phase === 'prep';
    $('cs-jp').textContent = fmt(G.jpot) + '¢';
    $('cs-lvl').innerHTML = BET_LVL.map((b, i) => `<button data-l="${i}" class="${i === this.csLvl ? 'on' : ''}">${b.n}<small>${fmt(cost(i))}¢</small></button>`).join('');
    $('cs-lvl').querySelectorAll('button').forEach(b => b.onclick = () => { if (this.spinning) return; this.csLvl = +b.dataset.l; Sfx.play('ui'); this.renderSlot(); });
    $('cs-tok').innerHTML = `JETONS <b>${'●'.repeat(tok)}${'○'.repeat(Math.max(0, Casino.TOKENS - tok))}</b>`;
    const btn = $('cs-spin');
    btn.disabled = this.spinning || !prep || tok <= 0 || G.money < cost(this.csLvl);
    btn.textContent = !prep ? 'FERMÉ PENDANT LA VAGUE' : tok <= 0 ? 'PLUS DE JETONS — PROCHAINE VAGUE' : this.spinning ? 'LES ROULEAUX TOURNENT…' : `TIRER LE LEVIER · ${fmt(cost(this.csLvl))}¢`;
    btn.onclick = () => this.pullLever();
    const strips = $('slot').querySelectorAll('.strip');
    if (!strips[0].children.length) strips.forEach(st => { this.slotStrip(st, SLOT_KEYS[Math.floor(Math.random() * 7)], 0); st.style.transform = 'translateY(0)'; });
    if (!this.spinning && !$('cs-res').textContent) $('cs-res').textContent = 'Alignez trois symboles sur la ligne dorée.';
    const g = k => `<span style="color:${SLOT_SYM[k].col}">${k === 'j' ? '7 7 7' : [1, 2, 3].map(() => TXT(SLOT_SYM[k].g)).join(' ')}</span>`;
    $('cs-pay').innerHTML = [
      [g('j'), 'JACKPOT + 30× + 8 ◈'], [g('c'), '8× la mise'], [g('n'), 'nanites + mise rendue'], [g('k'), 'protocole offert'],
      [g('a'), 'capacités rechargées'], [g('h'), '+15 intégrité'], [g('s'), 'malédiction !'], ['<span>PAIRE</span>', 'petit gain'], ['<span style="color:#ff3d3d">UN 7</span>', 'mise remboursée']
    ].map(([a, b]) => `<div>${a}<span>${b}</span></div>`).join('');
  },
  pullLever() {
    if (this.spinning || !G || G.phase !== 'prep') return;
    const me = Net.me, prev = G.slot[me] ? G.slot[me].seq : 0, money0 = G.money;
    if (G.money < Casino.betCost(this.csLvl) || Casino.tokens(me) <= 0) { Sfx.play('error'); return; }
    this.spinning = true; this.holdMoney = money0;
    $('slot').classList.remove('win', 'jack'); $('cs-res').className = 'cs-res'; $('cs-res').textContent = '…';
    this.renderSlot();
    Act.do('slot', this.csLvl);
    // en solo le résultat est immédiat ; en coopération il arrive après la latence réseau
    const wait = (n = 0) => {
      const r = G && G.slot[me];
      if (r && r.seq !== prev) this.spinReels(r);
      else if (n < 120 && G) setTimeout(() => wait(n + 1), 25);
      else { this.spinning = false; this.holdMoney = null; this.renderSlot(); }
    };
    wait();
  },
  spinReels(r) {
    const strips = $('slot').querySelectorAll('.strip'), h = strips[0].firstElementChild ? strips[0].firstElementChild.offsetHeight || 64 : 64;
    const stopAt = [900, 1350, 1850];
    strips.forEach((st, i) => {
      const n = 14 + i * 6;
      this.slotStrip(st, r.R[i], n);
      st.style.transition = 'none'; st.style.transform = 'translateY(0)'; void st.offsetHeight;
      st.style.transition = `transform ${stopAt[i]}ms cubic-bezier(.15,.75,.25,1.04)`;
      st.style.transform = `translateY(${-(n) * h}px)`;
    });
    const t0 = performance.now();
    const tick = () => { const e = performance.now() - t0; if (e < stopAt[2]) { Sfx.play('reel', .8, 1); setTimeout(tick, 60 + e * .05); } };
    tick();
    stopAt.forEach((ms, i) => setTimeout(() => Sfx.play('hit', 1.2), ms));
    setTimeout(() => this.spinDone(r), stopAt[2] + 120);
  },
  spinDone(r) {
    this.spinning = false; this.holdMoney = null;
    if (!G) return;
    const res = $('cs-res'), sl = $('slot');
    res.textContent = r.txt;
    res.className = 'cs-res ' + (r.tier === 3 ? 't3' : r.tier === 2 ? 't2' : r.tier === 1 ? 't1' : r.tier < 0 ? 'tm' : '');
    if (r.tier >= 1) sl.classList.add('win');
    if (r.tier === 3) { sl.classList.add('jack'); Sfx.play('jackpot'); Render.flash(.4, '#ffd23f'); this.banner('JACKPOT !', `+${fmt(r.cash)} CRÉDITS`, '#ffd23f'); }
    else if (r.tier === 2) Sfx.play('levelup');
    else if (r.tier === 1) Sfx.play('win');
    else Sfx.play(r.tier < 0 ? 'evbad' : 'lose');
    if (r.tier >= 2) this.coinRain(r.tier === 3 ? 60 : 24);
    this.refreshHUD(); this.renderSlot();
    if (G.cardQ > 0 && G.offer && r.R.every(k => k === 'k')) setTimeout(() => { if (G && G.offer) this.openCards(); }, 900);
  },
  coinRain(n) {
    const box = $('cs-coins');
    for (let i = 0; i < n; i++) {
      const c = document.createElement('i'); c.textContent = i % 5 ? '¢' : '◈';
      c.style.left = (Math.random() * 96) + '%'; c.style.fontSize = (12 + Math.random() * 14) + 'px'; c.style.animationDelay = (Math.random() * .7) + 's';
      box.appendChild(c); setTimeout(() => c.remove(), 2600);
    }
  },
  renderBets() {
    const box = $('cs-bet'), prep = G.phase === 'prep', mine = Casino.myBet();
    if (mine) {
      box.innerHTML = `<div class="betc on" style="cursor:default"><h4>PARI EN COURS · ${mine.name.toUpperCase()}</h4><p>Vague ${mine.n} · mise <b>${fmt(mine.stake)}¢</b> · gain possible <b style="color:var(--gold)">${fmt(Math.round(mine.stake * mine.odds))}¢</b></p><div class="od">×${mine.odds}</div></div>
        <div class="note">Résultat à la fin de la vague. Bonne chance, Commandant.</div>`;
      return;
    }
    if (!prep) { box.innerHTML = '<div class="st-empty">Les paris se placent entre les vagues, avant le lancement.</div>'; return; }
    const O = Casino.betOptions();
    if (!O.some(o => o.k === this.csBet)) this.csBet = O[0].k;
    const stake = pi => Casino.base() * BET_STAKE[pi].m, sel = O.find(o => o.k === this.csBet);
    box.innerHTML = `<div class="note" style="margin-bottom:10px">Un pari par vague. La mise est prélevée tout de suite ; si vous gagnez, vous touchez <b>mise × cote</b>.</div>` +
      O.map(o => `<div class="betc${o.k === this.csBet ? ' on' : ''}" data-k="${o.k}"><h4>${o.n.toUpperCase()}</h4><p>${o.d}</p><div class="od">×${o.odds}</div></div>`).join('') +
      `<div class="lbl-s" style="margin:6px 0 4px">MISE</div><div class="seg" id="bt-pct">${BET_STAKE.map((b, i) => `<button data-i="${i}" class="${i === this.csPct ? 'on' : ''}">${b.n} · ${fmt(stake(i))}¢</button>`).join('')}</div>
      <button class="btn gold big" id="bt-go" style="width:100%;margin-top:12px" ${G.money < stake(this.csPct) ? 'disabled' : ''}>PARIER ${fmt(stake(this.csPct))}¢ → ${fmt(Math.round(stake(this.csPct) * sel.odds))}¢</button>`;
    box.querySelectorAll('.betc').forEach(el => el.onclick = () => { this.csBet = el.dataset.k; Sfx.play('ui'); this.renderBets(); });
    box.querySelectorAll('#bt-pct button').forEach(b => b.onclick = () => { this.csPct = +b.dataset.i; Sfx.play('ui'); this.renderBets(); });
    $('bt-go').onclick = () => { Act.do('bet', this.csBet, this.csPct); setTimeout(() => { if (G && this.top() === 'ov-casino') this.renderBets(); this.refreshBet(); }, Net.coop ? 250 : 0); };
  },
  refreshBet() {
    const el = $('wp-bet'), b = G && Casino.myBet(), act = G && G.bets.find(x => x.p === Net.me);
    const show = b || act;
    el.style.display = show ? 'inline-block' : 'none';
    if (show) el.textContent = `PARI ×${show.odds}`;
  },
  /* ---------- analyse de combat : classement des tourelles de la partie en cours ---------- */
  stOpt: { m: 'dealt', g: 'type', v: 'chart' },
  openStats() {
    if (!G) return;
    if (!G.over) { this.setPlacing(null, true); this.setTargeting(null); }
    const O = this.stOpt, eff = O.m === 'eff';
    const segs = { 'st-metric': 'm', 'st-group': 'g', 'st-view': 'v' };
    for (const id in segs) $(id).querySelectorAll('button').forEach(b => {
      b.classList.toggle('on', b.dataset.k === O[segs[id]]);
      b.onclick = () => { O[segs[id]] = b.dataset.k; Sfx.play('ui'); this.openStats(); };
    });
    // lignes : par type (vendues et fusionnées comprises) ou par tourelle encore en jeu
    const rows = [];
    if (O.g === 'type') {
      for (const k in G.tstats) {
        const s = G.tstats[k], n = G.towers.filter(t => t.key === k).length;
        rows.push({ key: k, name: TOWERS[k].name, sub: n ? `${n} en jeu` : 'plus en jeu', dealt: s.dealt, kills: s.kills, shots: s.shots, spent: s.spent });
      }
    } else for (const t of G.towers)
      rows.push({ key: t.key, t, name: t.d.name, sub: `niv ${t.level}${t.spec != null ? ' · ' + t.sm.n : ''}`, dealt: t.dealt, kills: t.kills, shots: t.shots, spent: t.invested });
    for (const r of rows) { r.eff = r.spent > 0 ? r.dealt / r.spent : 0; r.v = r[O.m]; }
    const sum = f => rows.reduce((a, r) => a + r[f], 0);
    const tot = { dealt: sum('dealt'), kills: sum('kills'), shots: sum('shots') };
    const fv = v => eff ? (v < 100 ? v.toFixed(1) : fmt(v)) : fmt(v);
    const pct = (v, t) => t > 0 ? Math.round(v / t * 100) + '%' : '—';
    // tuiles
    const all = Object.values(G.waveDmg).reduce((a, b) => a + b, 0), typeDealt = Object.values(G.tstats).reduce((a, s) => a + s.dealt, 0);
    const other = Math.max(0, all - typeDealt);
    let best = null; for (const k in G.tstats) if (G.tstats[k].dealt > 0 && (!best || G.tstats[k].dealt > G.tstats[best].dealt)) best = k;
    $('st-sub').innerHTML = `${G.daily ? 'Défi du jour ' + G.daily : G.diff.name} · vague <b>${G.waveNum}</b>${G.phase === 'combat' && !G.over ? ' (en cours)' : ''}. ` +
      (O.g === 'type' ? 'Par type : les tourelles vendues ou fusionnées gardent leur contribution.' : 'Par tourelle : tourelles actuellement en jeu, cliquez pour la sélectionner.');
    $('st-tiles').innerHTML = [
      ['Dégâts infligés', fmt(all), other > 0 ? `dont ${fmt(other)} par pièges et frappes` : 'toutes sources'],
      ['Tirs', fmt(Object.values(G.tstats).reduce((a, s) => a + s.shots, 0)), 'rayons : 10 par seconde'],
      ['Éliminations', fmt(G.stats.kills), `${G.stats.bosses} boss`],
      ['Meilleure tourelle', best ? TOWERS[best].name : '—', best ? `${pct(G.tstats[best].dealt, all)} des dégâts` : 'aucun dégât']
    ].map(([l, v, s]) => `<div class="st-tile"><div class="lbl-s">${l.toUpperCase()}</div><b>${v}</b><small>${s}</small></div>`).join('');
    // classement
    const main = $('st-main'); main.innerHTML = '';
    const list = rows.filter(r => r.v > 0).sort((a, b) => b.v - a.v);
    if (O.v === 'table') {
      const sorted = rows.slice().sort((a, b) => b.v - a.v || b.dealt - a.dealt);
      if (!sorted.length) { main.innerHTML = '<div class="st-empty">Aucune tourelle construite pour l\'instant.</div>'; }
      else {
        const cols = [['TOURELLE', null], ['DÉGÂTS', 'dealt'], ['PART', null], ['ÉLIM.', 'kills'], ['TIRS', 'shots'], ['INVESTI', null], ['DÉGÂTS / ¢', 'eff']];
        main.innerHTML = `<div class="st-tbl"><table><thead><tr>${cols.map(([n, k]) => `<th${k === O.m ? ' class="on"' : ''}>${n}</th>`).join('')}</tr></thead><tbody>` +
          sorted.map(r => `<tr><td>${r.name}<small>${r.sub}</small></td><td>${fmt(r.dealt)}</td><td>${pct(r.dealt, tot.dealt)}</td><td>${fmt(r.kills)}</td><td>${fmt(r.shots)}</td><td>${fmt(r.spent)}¢</td><td>${r.eff.toFixed(1)}</td></tr>`).join('') +
          '</tbody></table></div>';
      }
    } else if (!list.length) {
      main.innerHTML = `<div class="st-empty">${rows.length ? 'Pas encore de données pour cette mesure — lancez une vague.' : 'Aucune tourelle construite pour l\'instant.'}</div>`;
    } else {
      const box = document.createElement('div'); box.className = 'st-bars';
      const max = list[0].v, cap = O.g === 'tower' ? 30 : 99;
      for (const r of list.slice(0, cap)) {
        const el = document.createElement('div'); el.className = 'st-row' + (r.t ? ' pk' : '');
        el.innerHTML = `<canvas></canvas><div class="st-nm">${r.name.toUpperCase()}<small>${r.sub}</small></div>` +
          `<div class="st-tr"><i class="st-bar" style="width:calc((100% - 86px) * ${(r.v / max).toFixed(4)})"></i><span class="st-v">${fv(r.v)}${eff ? '' : `<small>${pct(r.v, tot[O.m])}</small>`}</span></div>`;
        el.dataset.tip = `<b style="color:var(--txt)">${r.name}</b> · ${r.sub}<div class="s"><span>Dégâts</span><b>${fmt(r.dealt)}</b><span>Part des dégâts</span><b>${pct(r.dealt, tot.dealt)}</b>` +
          `<span>Éliminations</span><b>${fmt(r.kills)}</b><span>Tirs</span><b>${fmt(r.shots)}</b><span>Investi</span><b>${fmt(r.spent)}¢</b><span>Dégâts par crédit</span><b>${r.eff.toFixed(1)}</b></div>`;
        if (r.t) el.onclick = () => { if (r.t.dead || G.over) return; this.closeAll(); this.select(r.t); };
        Spr.icon(el.querySelector('canvas'), r.key, 28);
        box.appendChild(el);
      }
      if (list.length > cap) box.insertAdjacentHTML('beforeend', `<div class="st-more">+ ${list.length - cap} autres tourelles — voir le tableau</div>`);
      main.appendChild(box);
    }
    this.statsWaves();
    this.open('ov-stats');
  },
  statsWaves() {
    const W = G.waveDmg, last = G.waveNum, from = Math.max(1, last - 59), box = $('st-waves');
    const vals = []; for (let n = from; n <= last; n++) vals.push(W[n] || 0);
    const max = Math.max(0, ...vals);
    if (!last || max <= 0) { box.innerHTML = '<div class="st-empty">Aucune vague jouée pour l\'instant.</div>'; return; }
    const cf = v => v >= 1e9 ? +(v / 1e9).toFixed(2) + 'G' : v >= 1e6 ? +(v / 1e6).toFixed(2) + 'M' : v >= 1e3 ? +(v / 1e3).toFixed(1) + 'k' : '' + Math.round(v);
    const p = Math.pow(10, Math.floor(Math.log10(max / 3))), f = max / 3 / p, step = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p;
    const top = Math.ceil(max / step) * step, H = 112, y = v => (v / top * H).toFixed(1);
    let ys = '', gl = '';
    for (let v = 0; v <= top + step / 2; v += step) { ys += `<span style="bottom:${y(v)}px">${cf(v)}</span>`; gl += `<i class="gl${v ? '' : ' z'}" style="bottom:${y(v)}px"></i>`; }
    const every = vals.length > 30 ? 10 : 5, imax = vals.indexOf(max), live = G.phase === 'combat' && !G.over;
    let cols = '', xs = '';
    vals.forEach((v, i) => {
      const n = from + i, cur = live && n === last;
      const tip = `Vague <b>${n}</b>${n % Waves.bossEv() === 0 ? ' · boss' : ''}${cur ? ' · en cours' : ''}<br><b style="color:var(--txt)">${fmt(v)}</b> dégâts`;
      cols += `<div class="st-c${cur ? ' cur' : ''}" data-tip="${tip.replace(/"/g, '&quot;')}">${i === imax ? `<em>${cf(v)}</em>` : ''}<i style="height:${y(v)}px"></i></div>`;
      xs += `<span>${n === from || n % every === 0 ? n : ''}</span>`;
    });
    box.innerHTML = `<div class="st-wv"><div class="st-y">${ys}</div><div class="st-plot">${gl}<div class="st-cols">${cols}</div></div><div class="st-x">${xs}</div></div>`;
  },
  openAch(tab = 'ach') {
    $('ach-tabs').querySelectorAll('button').forEach(b => { b.classList.toggle('on', b.dataset.k === tab); b.onclick = () => { Sfx.play('ui'); this.openAch(b.dataset.k); }; });
    if (tab === 'hist') {
      const H = Store.data.hist || [];
      $('ach-sub').innerHTML = (H.length ? `Vos <b>${H.length}</b> dernières parties. Cliquez un code de carte pour le copier et défier un ami ; 🎬 revoit la partie (les ${Replay.MAX} dernières en solo).` : 'Aucune partie terminée pour l\'instant.')
        + ' <button class="btn" id="rp-imp" style="margin-left:8px;padding:3px 8px;font-size:10px">IMPORTER UN REPLAY</button>';
      $('rp-imp').onclick = () => this.openXfer('rpimp');
      const L = $('ach-list'); L.className = 'hist';
      L.innerHTML = H.map((h, i) => {
        const dt = new Date(h.d), mode = h.net ? (h.net === 'versus' ? `Versus contre ${String(h.vs || '?').replace(/</g, '&lt;')} · ${h.win ? '<b style="color:var(--gold)">VICTOIRE</b>' : 'défaite'}` : 'Coopération') : (h.daily ? 'Défi du jour' : (GMODES[h.gm] || GMODES.classic).n);
        return `<div class="hrow"><b>${h.w}</b><span class="t">${DIFFS[h.diff] ? DIFFS[h.diff].name : '?'} · ${mode}${h.best ? ' · <span style="color:var(--gold)">record</span>' : ''}</span>
          <span class="c" data-i="${i}" title="Copier le code de carte">${h.code || ''}</span>${h.code && !h.daily ? `<button class="btn hp" data-i="${i}" title="Rejouer cette carte">▶</button>` : ''}${h.rid && Replay.get(h.rid) ? `<button class="btn hr" data-i="${i}" title="Revoir la partie">🎬</button>` : ''}
          <span class="m">${dt.toLocaleDateString('fr-FR')} ${dt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} · ${fmt(h.k)} éliminations${h.mvp && TOWERS[h.mvp] ? ' · MVP ' + TOWERS[h.mvp].name : ''}</span></div>`;
      }).join('');
      L.querySelectorAll('.c').forEach(el => el.onclick = () => { const h = H[+el.dataset.i]; if (h && h.code) this.copy(h.code); });
      L.querySelectorAll('.hr').forEach(el => el.onclick = () => { const h = H[+el.dataset.i], r = h && Replay.get(h.rid); if (r) Replay.play(r); });
      L.querySelectorAll('.hp').forEach(el => el.onclick = () => {
        const h = H[+el.dataset.i], c = h && Hist.parse(h.code); if (!c) return;
        if (G && !G.over && !G.demo && Game.state === 'play') { this.toast('Partie en cours', 'Quittez d\'abord la partie en cours pour rejouer une carte.', '#ff2a6d', 3); return; }
        this.closeAll(); Game.newGame(c.diff || h.diff || 'standard', { gm: c.gm || 'classic', seed: c.seed, portrait: c.portrait == null ? undefined : c.portrait });
      });
      this.open('ov-ach'); return;
    }
    $('ach-list').className = 'plist';
    const A = Store.data.ach, n = Object.keys(ACH).filter(k => A[k]).length;
    $('ach-sub').innerHTML = `<b>${n} / ${Object.keys(ACH).length}</b> débloqués — chaque succès rapporte <span class="frags">3 ✦</span> fragments d'Héritage.`;
    $('ach-list').innerHTML = Object.entries(ACH).map(([k, a]) => `<div class="ach${A[k] ? ' on' : ''}"><div class="ai">${TXT(a.i)}</div><div><h4>${a.n}</h4><p>${a.d}</p></div></div>`).join('');
    this.open('ov-ach');
  },
  openHelp() {
    const K = id => `<kbd>${Keys.lbl(id) || '—'}</kbd>`;
    $('help').innerHTML = `
      <div class="row" style="justify-content:center;margin-bottom:10px"><button class="btn prim" id="h-tuto">▶ TUTORIEL GUIDÉ<span class="k">les bases en 2 minutes</span></button></div>
      <h3>OBJECTIF</h3><p>Les ennemis suivent le chemin lumineux jusqu'à votre <b>noyau</b> (l'hexagone). Chaque ennemi qui passe réduit votre <b>intégrité</b>. Les vagues sont infinies et de plus en plus puissantes, avec un <b>boss toutes les 5 vagues</b> et un <b style="color:#ff2a6d">méga-boss</b> à plusieurs phases aux vagues 50 (Léviathan) et 100 (Oméga), puis toutes les 50 vagues. Un méga-boss qui atteint le noyau met fin à la partie. Tenez le plus longtemps possible.</p>
      <h3>CONSTRUIRE & AMÉLIORER</h3><ul>
        <li>Choisissez une tourelle dans la barre du bas (touches ${K('slot1')}…${K('slot10')}, ou la touche que vous avez donnée à un canon) puis cliquez sur une case libre. <kbd>Maj</kbd> + clic pour en poser plusieurs.</li>
        <li>Cliquez sur une tourelle : amélioration (niveau 10 max), ciblage, surcadence, revente. Entre deux vagues, une tourelle tout juste construite est <b>remboursée à 100%</b> (droit à l'erreur).</li>
        <li>Les <b>débris</b> bloquent des cases : recyclez-les (charges limitées) pour des crédits ou des nanites.</li>
        <li>Appeler une vague en avance (quand la précédente a fini d'apparaître) rapporte une <b>prime</b>.</li>
        <li><b>Spécialisation</b> : au niveau 5 (niveau 3 pour le soutien), choisissez l'une des deux voies de la tourelle (losange doré clignotant). Le choix est définitif et nécessaire pour continuer à l'améliorer.</li>
        <li><b>Astéroïdes et foudre</b> : leur IEM met les tourelles touchées <b>hors ligne jusqu'à ce que vous payiez le débrouillage</b> (touche ${K('unjam')}, ou le bouton qui apparaît). En partie perso, vous pouvez le rendre temporaire.</li>
        <li><b>Éléments rares</b> : le <b style="color:#ff8a3d">plasma ✺</b> (boss dès la vague 10, parfois élites, ou raffinerie de nanites) paie le palier III de l'arbre et les fusions <b>T3</b> ; l'<b style="color:#b48cff">abyssite ⬟</b> (arrachée au Léviathan à chaque phase, puis aux boss après la vague 50) paie le palier IV, les niveaux Oméga et l'Apocalypse <b>T4</b>. Pour une T3 ou une T4, le plan au Labo <i>et</i> chaque pose coûtent l'élément, d'autant plus que la difficulté est élevée ; chaque pose coûte un peu plus que la précédente (Standard : plan T3 5 ✺, poses 0, 1, 2… ✺ ; plan T4 3 ⬟, poses 0, 2, 4… ⬟). Revendre une tourelle fait redescendre le prix. Les boss lâchent 1 ✺ dès la vague 10, 2 dès la 25 et 3 dès la 40.</li>
        <li><b style="color:#ff4df0">Fin de partie</b> : une fois le Léviathan repoussé (vague 50), les tourelles d'attaque montent jusqu'au <b>niveau Oméga 15</b> (+35 % de dégâts par niveau, crédits + 1 abyssite par niveau), et la <b>Recherche Oméga</b> (en bas de l'arbre, en plasma) ajoute +8 % de dégâts à toutes les tourelles par rang, sans limite. Le badge <b>⚔</b> de l'aperçu de vague estime combien de secondes de tir il faut pour détruire la vague suivante.</li>
        <li><b>Pièges</b> (dans la barre, après les tourelles de base) : les <b>mines</b> explosent au passage d'un ennemi au sol, les <b>barricades</b> bloquent le chemin jusqu'à leur destruction. Ils se posent sur le chemin, loin de l'entrée et du noyau.</li>
        <li>Certaines cartes ont <b>deux chemins</b> qui se rejoignent : couvrez les deux branches, ou concentrez-vous sur le tronçon commun. Les ennemis y sont 10% moins résistants.</li></ul>
      <h3>FUSION DES CANONS</h3><ul>
        <li>Au <b>Labo de fusion</b> (${K('lab')}), dépensez des nanites pour acquérir des <b>plans</b> : la tourelle fusionnée devient constructible.</li>
        <li><b>Fusion sur le terrain</b> : placez les deux composants côte à côte, sélectionnez l'un d'eux et fusionnez. 80% de leur valeur est déduite du prix et leur niveau moyen est conservé.</li>
        <li>Les fusions se combinent entre elles : T2 → T3 → l'ultime <b>Apocalypse</b> (T4). 14 recettes à découvrir.</li></ul>
      <h3>CHALEUR & SOUTIEN</h3><ul>
        <li>La <b>surcadence</b> double la cadence mais fait chauffer la tourelle. À 100% elle s'arrête jusqu'à refroidissement complet.</li>
        <li><b style="color:#fff08a">Après Oméga (vague 100)</b> : la <b>quintessence ❂</b> (chaque phase d'Oméga, sa défaite, puis chaque boss) débloque le <b>palier V</b> de l'arbre, puis des <b>rangs infinis</b> (dégâts, cadence, crédits), et les trois <b>reliques T5</b> au Labo : <b>Lance-Néant</b> (Apocalypse + Singularité), <b>Annihilateur</b> (Apocalypse + Tempête) et <b>Soleil noir</b> (Cœur abyssal + Nova).</li>
        <li><b>Bonus de soutien</b> : une tourelle ne garde que le <b>meilleur bonus de chaque type</b> de soutien (deux Nexus autour d'elle ne comptent qu'une fois, mais un Nexus et un Ordi s'additionnent). Soutiens de haut niveau : l'<b>Oracle</b> T3 (Nexus + Stase : critiques et perforation du blindage) et le <b>Cœur abyssal</b> T4 (Oracle + Nexus : dégâts, cadence et portée sur 12 voisines).</li>
        <li><b>Ventilo</b> : refroidit les 4 voisines (avec 2 ventilos, beaucoup de tourelles tiennent la surcadence en permanence). <b>Ordi</b> : +25% de dégâts aux voisines. <b>Nexus</b> : les deux, sur 8 voisines.</li></ul>
      <h3>MISSIONS & PROTOCOLES</h3><ul>
        <li><b>Missions</b> : 3 objectifs courts sont toujours actifs (panneau en haut à droite). Chacune rapporte crédits ou nanites, de l'XP et un fragment, puis est aussitôt remplacée.</li>
        <li><b>Protocoles</b> : toutes les 2 vagues repoussées, choisissez 1 carte parmi 3 (touches <kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd>). Près de 50 cartes en quatre familles (économie, attaque, défense, tactique) : bonus immédiats, améliorations cumulables, <b style="color:#ff3d5a">pactes</b> (gros gain contre un risque) et, dès la vague 12, des <b style="color:#ffd23f">légendaires</b> qui changent la partie (Réaction en chaîne, Second souffle, Œil omniscient…). Une même main mélange les familles. Relance possible contre des crédits.</li></ul>
      <h3>COMMANDANT & DOCTRINES</h3><ul>
        <li>Chaque vague, boss et mission donne de l'<b>XP de Commandant</b>, conservée d'une partie à l'autre. Chaque niveau rapporte 2 fragments et un nouveau grade.</li>
        <li>Les niveaux débloquent des <b>doctrines</b> (Artillerie, Génie, Finance, Alchimie, Précision, Bastion, Blitz) à choisir au lancement d'une partie.</li></ul>
      <h3>PROGRESSION</h3><ul>
        <li><b>Arbre de compétences</b> (<kbd>K</kbd>) : 18 compétences en 3 branches, payées en nanites, pour la partie en cours. Les nœuds finaux débloquent la <b>Cryo-Bombe</b> et la <b>Surcharge</b>.</li>
        <li><b>Héritage</b> : les fragments gagnés à chaque fin de partie achètent des bonus permanents.</li>
        <li><b>Graine libre</b> : dans Nouvelle partie, tapez un nombre ou n'importe quel mot (« neon », votre prénom…) : le même texte donne toujours la même carte et les mêmes vagues.</li>
        <li><b>Défier un ami</b> : à la fin d'une partie, copiez son <b>code de carte</b> (ex. 1A2B3C-L-S). Saisi dans Nouvelle partie, il redonne exactement la même carte et les mêmes vagues. Le <b>Palmarès</b> garde l'historique de vos 30 dernières parties.</li>
        <li><b>Analyse de combat</b> (<kbd>G</kbd>) : graphiques de la partie en cours — dégâts, éliminations, tirs et rentabilité de chaque tourelle, et dégâts par vague. Le <b>Codex</b> réunit les fiches de tout ce que vous avez rencontré.</li>
        <li>La partie est <b>sauvegardée automatiquement</b> entre les vagues.</li></ul>
      <h3>ÉDITEUR DE CARTES</h3><ul>
        <li>Menu principal → <b>Éditeur de cartes</b>. Outil <b>Chemin</b> : glissez d'une case du bord à une autre ; les ennemis entrent par la première case, le noyau est sur la dernière (${CMaps.MIN} cases au moins). Repassez sur vos pas pour revenir en arrière, touchez une case du chemin pour le reprendre à partir de là.</li>
        <li><b>Entrée en plus</b> (deux au maximum) : partez d'une case libre du bord et rejoignez le chemin principal. <b>Débris</b> : cases à recycler. <b>Gomme</b>, <b>Annuler</b> (Ctrl+Z), <b>Aléatoire</b> pour partir d'une carte générée.</li>
        <li><b>Code de partage</b> : un ami le colle dans l'éditeur (Importer un code) ou dans le champ « code de carte » de Nouvelle partie. En multijoueur, l'hôte choisit la carte dans le salon. Les cartes perso ne comptent ni pour les records ni pour les succès, l'XP et les fragments.</li></ul>
      <h3>MULTIJOUEUR</h3><ul>
        <li><b>Marqueurs</b> (coopération) : clic molette, Alt + clic, ${K('ping')} ou appui long au doigt posent un signal visible par vos partenaires (« Construis ici », « Le boss ! »…). Sur un ennemi, il le désigne aussi comme cible <b>FOCUS</b>.</li>
        <li><b>Dons</b> (coopération) : le bouton <b>🎁 DON</b> sous le nom d'un partenaire lui donne des crédits ou un élément rare que vous possédez.</li>
        <li><b>Menu → Multijoueur</b> : de 2 à 4 joueurs. L'hôte crée un salon, avec un code au hasard (NEON-XXXX) ou <b>un code de son choix</b>, et le donne aux autres. Dans le salon, l'hôte peut <b>exclure</b> un joueur (✕). Sans internet, la <b>connexion manuelle</b> échange deux codes par copier-coller (une invitation par joueur).</li>
        <li><b>Versus à plusieurs</b> : cliquez sur un adversaire dans le panneau de gauche pour en faire la <b>cible</b> de vos envois. Le dernier debout gagne ; le classement s'affiche en fin de partie.</li>
        <li><b style="color:#ff2a6d">Versus</b> : même carte et mêmes vagues, chacun chez soi. La barre du bas propose des <b>envois</b> d'ennemis chez l'adversaire : ils coûtent des crédits mais augmentent votre <b>revenu par vague</b>, et chaque ennemi envoyé vous rapporte une <b>prime de survie</b> (jusqu'à 60 % de son prix s'il tient 20 s, +50 % s'il atteint le noyau adverse). Et deux <b style="color:#ff8a3d">sabotages</b>, une fois par vague : la <b>pluie de météores</b> (dès la vague 4) sonne ses meilleures tourelles et en rétrograde deux d'un niveau ; le <b>météore géant</b> (dès la vague 10) pulvérise sa tourelle la plus chère, sauf s'il la vend dans les 4 s. Vitesse 1x, vagues automatiques avec 10 s de préparation. Plus dur qu'en solo : ennemis +30 % de PV et plus d'élites, intégrité -30 %, crédits de départ -15 %, et dès la vague 13 une <b>escalade</b> de +5 % de PV par vague. Le dernier debout gagne.</li>
        <li><b style="color:#39ff88">Coopération</b> : une seule carte, une intégrité commune, mais chacun ses crédits (60 % des primes chacun). Nanites, compétences, plans et capacités sont partagés ; les protocoles se choisissent à tour de rôle. Seul le constructeur d'une tourelle peut la vendre. Le curseur de votre partenaire est visible sur la carte.</li>
        <li>En multijoueur, les menus ne mettent pas la partie en pause.</li></ul>
      <h3>CASINO NÉON</h3><ul>
        <li>Entre les vagues (<kbd>C</kbd>), <b>3 jetons</b> de <b>machine à sous</b> : trois mises possibles, des gains en crédits, nanites, protocoles, capacités ou intégrité… et un <b>jackpot progressif</b> qui grossit à chaque mise perdue. Trois crânes : malédiction !</li>
        <li><b>Paris sur la vague</b> : sans fuite, éclair (vague nettoyée en un temps record), carnage (combo à atteindre) ou chasseur de boss. La mise est prélevée tout de suite, le gain vaut mise × cote.</li></ul>
      <h3>ÉVÉNEMENTS ALÉATOIRES</h3><ul>
        <li>Dès la vague 3, une vague sur trois environ réserve une surprise : <b style="color:#ff8a3d">pluie d'astéroïdes</b> (dégâts massifs, mais tourelles sonnées et débris), <b style="color:#39ff88">capsule de ravitaillement</b> à cliquer, <b style="color:#ffd23f">ruée vers l'or</b>, <b style="color:#00f3ff">surtension</b>, <b style="color:#ffb13d">tempête solaire</b>, <b style="color:#ff2a6d">lune de sang</b>, <b style="color:#9fe8ff">comète</b>, <b style="color:#c43dff">faille dimensionnelle</b> ou <b style="color:#fff35c">orage IEM</b>.</li>
        <li>L'événement en cours s'affiche sous la barre du haut avec sa durée. Ils se désactivent dans les Options.</li></ul>
      <h3>ENNEMIS</h3><ul>
        <li><b>Blindage</b> : réduit chaque impact — privilégiez les gros calibres (Sniper, Railgun, Laser). <b>Bouclier</b> : se régénère. <b>Furtifs</b> : il faut un Radar ou une Stase. <b>Volants</b> : intouchables par Inferno, Titan et Magma.</li>
        <li>Les <b style="color:var(--gold)">élites</b> (cercle doré) sont 3x plus résistants mais lâchent souvent des nanites. Survolez le butin pour le ramasser.</li>
        <li><b>Boss</b> : le Colosse encaisse, l'Hydre invoque, l'Overlord brouille, la <b>Scission</b> se divise en fragments, la <b>Sentinelle</b> protège ses voisins par des boucliers et le <b>Sauteur</b> marque son point d'atterrissage avant de bondir en avant.</li>
        <li><b style="color:#fff35c">Tourelles brouillées ⚡</b> (IEM, météores, sabotages) : elles ne tirent plus, et un soutien brouillé ne donne plus son bonus. Le brouillage se dissipe seul, ou se paie pour repartir aussitôt : bouton <b>DÉBROUILLER</b> dans le panneau de la tourelle, ou touche <kbd>D</kbd>. Le prix dépend du temps restant et de la valeur de la tourelle.</li></ul>
      <h3>RACCOURCIS <small style="font-size:10px;letter-spacing:1px;color:var(--dim)">modifiables dans Options → Raccourcis clavier</small></h3><div class="cols">
        <p>${K('wave')} Lancer / appeler la vague</p><p>${K('slot1')}…${K('slot10')} Choisir une tourelle</p>
        <p>${K('orbital')} ${K('emp')} ${K('overdrive')} Capacités</p><p>${K('up')} Améliorer · ${K('sell')} Vendre</p>
        <p>${K('strat')} Ciblage (PREMIER, FORT, FAIBLE, PROCHE, FOCUS) · ${K('oc')} Surcadence</p><p>${K('ping')} / Alt + clic : désigner la cible FOCUS · molette : zoom · clic droit glissé : déplacer la carte</p><p><kbd>Maj</kbd> + ${K('strat')} / ${K('up')} : pour toutes vos tourelles du même type</p><p>${K('recycle')} Recycler le débris sélectionné</p>
        <p>${K('unjam')} Débrouiller (la tourelle choisie, sinon toutes)</p>
        <p>${K('speed')} Vitesse · ${K('pause')} Pause</p><p>${K('tree')} Arbre · ${K('lab')} Labo · ${K('stats')} Stats · ${K('casino')} Casino · ${K('help')} Manuel</p>
        <p><kbd>Échap</kbd> / clic droit : annuler</p><p><kbd>F3</kbd> Compteur FPS</p></div>`;
    $('h-tuto').onclick = () => Tuto.launch();
    this.open('ov-help');
  }
});
