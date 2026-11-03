/* ============================== INTERFACE : sélection et panneau de tourelle ============================== */
Object.assign(UI, {
  /* ---------- sélection & panneau de tourelle ---------- */
  select(t) {
    this.sel = t; this.selDebris = null; this.hideTip();
    if (this.placing) this.setPlacing(null, true);
    if (this.targeting) this.setTargeting(null);
    this.renderPanel(); Sfx.play('ui');
  },
  selectDebris(tx, ty) {
    this.sel = null; this.selDebris = { tx, ty };
    if (this.placing) this.setPlacing(null, true);
    this.renderDebris(); Sfx.play('ui');
  },
  selectTrap(tr) {
    this.sel = null; this.selDebris = { tx: tr.tx, ty: tr.ty, trap: tr };
    const T = TRAPS[tr.type], P = $('tpanel');
    P.style.setProperty('--tc', T.color);
    P.innerHTML = `<div class="tp-head"><div><div class="tp-name">${T.name.toUpperCase()}</div><div class="tp-sub">PIÈGE · ${Traps.count(tr.type)} / ${T.max} SUR LA CARTE</div></div><span class="tp-close" id="tp-x">✕</span></div>
      <div class="note">${T.d}</div>
      <div class="sgrid" style="margin-top:8px">${tr.type === 'mine' ? `<div style="grid-column:1/3">DÉGÂTS <b>${fmt(tr.dmg)}</b></div>` : `<div style="grid-column:1/3">RÉSISTANCE <b>${fmt(Math.max(0, tr.hp))} / ${fmt(tr.max)}</b></div>`}</div>
      <div class="pbtns"><button class="btn danger" id="tp-rm">RETIRER · +${fmt(Math.floor(tr.cost * .5))}¢</button></div>`;
    $('tp-x').onclick = () => this.deselect();
    $('tp-rm').onclick = () => { Act.do('untrap', tr.tx, tr.ty); this.deselect(); };
    P.classList.add('show'); this.placePanel(); Sfx.play('ui');
  },
  deselect() { this.sel = null; this.selDebris = null; $('tpanel').classList.remove('show'); },
  cancel() {
    if (this.targeting) this.setTargeting(null);
    else if (this.placing) this.setPlacing(null);
    else this.deselect();
  },
  escape() {
    if (this.stack.length) {
      const top = this.top();
      if (top !== 'ov-menu' && top !== 'ov-over' && top !== 'ov-cards' && top !== 'ov-mpend') this.close(top);
      return;
    }
    if (this.targeting || this.placing || this.sel || this.selDebris) { this.cancel(); return; }
    if (Game.state === 'play' && G && !G.over) this.openPause();
  },
  // Maj : même ciblage pour toutes vos tourelles de ce type
  setStrat(i, all) {
    const t = this.sel; if (!t) return;
    const L = all ? G.towers.filter(o => o.key === t.key && Act.owns(o)) : [t];
    for (const o of L) Act.do('strat', o.tx, o.ty, i);
    if (all) this.toast('Ciblage groupé', `${STRATS[i]} pour ${L.length} ${t.d.name}.`, t.d.color, 2.5);
    Sfx.play('ui'); this.renderPanel();
  },
  // Maj + améliorer : un niveau de plus pour chacune de vos tourelles de ce type, les plus faibles d'abord
  upAll() {
    const t = this.sel; if (!t) return;
    const L = G.towers.filter(o => o.key === t.key && Act.owns(o) && o.level < Towers.maxLevel(o) && !Towers.needsSpec(o)).sort((a, b) => a.level - b.level || a.id - b.id);
    let n = 0, money = G.money;
    for (const o of L) { const c = Towers.upCost(o); if (money < c || (o.level >= 10 && G.res.a < OMEGA.abyss)) break; if (Act.do('up', o.tx, o.ty)) { n++; money -= c; } }
    this.toast('Amélioration groupée', n ? `${n} ${t.d.name} amélioré${n > 1 ? 'es' : 'e'} d'un niveau.` : 'Pas assez de crédits.', t.d.color, 2.5);
    if (n) this.renderPanel(); else Sfx.play('error');
  },
  toggleOC() {
    const t = this.sel;
    if (!t || t.d.kind === 'support' || t.d.kind === 'radar') return;
    Act.do('oc', t.tx, t.ty, !t.oc);
    Sfx.play('ui'); this.renderPanel();
  },
  sellSel() {
    const t = this.sel; if (!t) return;
    if (!Act.owns(t)) { Sfx.play('error'); this.toast('Vente', "Seul le joueur qui l'a construite peut vendre cette tourelle.", '#9fb0cc', 2.5); return; }
    this.hideTip(); Act.do('sell', t.tx, t.ty);
  },
  // coopération : une action (locale ou du partenaire) vient d'être exécutée → l'interface se remet à jour
  afterAct(type, p) {
    if (this.sel) { if (this.sel.dead) this.deselect(); else if (type !== 'drop') this.renderPanel(); }
    else if (this.selDebris && !this.selDebris.trap && type === 'recycle') this.deselect();
    if (type === 'card' || type === 'reroll') { if (G.offer && Cards.turn() === Net.me) { if (this.top() === 'ov-cards') this.renderCards(); else if (p !== Net.me) this.openCards(); } else this.close('ov-cards'); }
    if (type === 'skill' && this.top() === 'ov-tree') { this.renderTree(); this.drawLinks(); }
    if (type === 'research' && this.top() === 'ov-lab') this.renderLab();
    if (type === 'card' || type === 'research' || type === 'skill') this.buildBar();
    this.refreshHUD();
  },
  nextStats(t) {
    const d = t.d, L = t.level;
    const dmgNext = d.dmg * Towers.lvlMul(L) * (t.sm.dmg || 1) * (1 + t.bDmg) * G.mod.dmg * (G.mod.kdmg[t.key] || 1);
    const rNext = d.range * (1 + .04 * L) * G.mod.range * (1 + t.bRange);
    return { dmg: dmgNext - Towers.effDmg(t), range: (rNext - t.range) / TILE };
  },
  renderPanel() {
    const t = this.sel;
    if (!t || t.dead) { this.deselect(); return; }
    const d = t.d, P = $('tpanel'), maxL = Towers.maxLevel(t), sup = d.kind === 'support';
    P.style.setProperty('--tc', d.color);
    let pips = '';
    for (let i = 1; i <= maxL; i++) pips += `<i class="${i <= t.level ? 'on' : ''}${i >= 6 ? ' hi' : ''}${i > 10 ? ' om' : ''}${i >= maxL ? ' max' : ''}"></i>`;
    let body;
    if (sup) {
      const s = d.support, m = G.mod.support * (1 + .2 * (t.level - 1)), parts = [];
      if (s.dmg) parts.push(`+${Math.round(s.dmg * m * 100)}% dégâts`);
      if (s.cool) parts.push(`+${Math.round(s.cool * m * 100)}% refroid.`);
      if (s.range) parts.push(`+${Math.round(s.range * m * 100)}% portée`);
      if (s.crit) parts.push(`+${Math.round(s.crit * m * 100)}% critiques`);
      if (s.pierce) parts.push(`${Math.round(Math.min(1, s.pierce * m) * 100)}% blindage ignoré`);
      if (s.rate) parts.push(`+${Math.round(s.rate * m * 100)}% cadence`);
      body = `<div class="note" style="margin-bottom:6px">${d.desc}</div><div class="sgrid"><div style="grid-column:1/3">EFFET <b style="color:var(--ok)">${parts.join(' · ')}</b></div></div>` +
        (t.level < maxL ? `<div class="note">Chaque niveau : +20% d'efficacité.</div>` : '');
    } else if (d.kind === 'radar') {
      const mk = Math.round(d.mark * (1 + .1 * (t.level - 1)) * 100), nmk = Math.round(d.mark * (1 + .1 * t.level) * 100);
      body = `<div class="note" style="margin-bottom:6px">${d.desc}</div><div class="sgrid">
        <div>PORTÉE <b>${(t.range / TILE).toFixed(1)}</b></div><div>MARQUAGE <b>+${mk}%${t.level < maxL ? `<span class="up">+${nmk - mk}</span>` : ''}</b></div></div>`;
    } else {
      const nx = t.level < maxL ? this.nextStats(t) : null;
      body = `<div class="sgrid">
        <div>DÉGÂTS <b>${fmt(Towers.effDmg(t))}${d.kind === 'beam' ? '/s' : ''}${nx ? `<span class="up">+${fmt(nx.dmg)}</span>` : ''}</b></div>
        <div>PORTÉE <b>${(t.range / TILE).toFixed(1)}${nx ? `<span class="up">+${nx.range.toFixed(1)}</span>` : ''}</b></div>
        <div>CADENCE <b id="tp-rate">-</b></div><div>DPS <b id="tp-dps">-</b></div>
        <div>ÉLIM. <b id="tp-kills">-</b></div><div>TOTAL <b id="tp-dealt">-</b></div></div>`;
    }
    const tags = `<div class="tags">${this.tagsHtml(d, t)}${t.bDmg > 0 && !sup ? `<span class="tag g">Soutien +${Math.round(t.bDmg * 100)}% dég.</span>` : ''}${t.bCool > 0 && !sup ? `<span class="tag b">Refroid. +${Math.round(t.bCool * 100)}%</span>` : ''}${t.bCrit > 0 && !sup ? `<span class="tag p">Critiques +${Math.round(t.bCrit * 100)}%</span>` : ''}${t.bPierce > 0 && !sup ? `<span class="tag y">Perforation ${Math.round(Math.min(1, t.bPierce) * 100)}%</span>` : ''}${t.bRate > 0 && !sup ? `<span class="tag g">Cadence +${Math.round(t.bRate * 100)}%</span>` : ''}</div>`;
    let ctrl = '';
    if (!sup && d.kind !== 'radar') {
      if (d.kind !== 'pulse') ctrl += `<div class="lbl-s" style="margin-top:4px">CIBLAGE <span style="opacity:.6">[T]</span></div><div class="seg" id="tp-strat">${STRATS.map((s, i) => `<button data-s="${i}" class="${t.strat === i ? 'on' : ''}">${s}</button>`).join('')}</div>`;
      ctrl += `<div class="lbl-s" style="margin-top:8px">CHALEUR</div><div class="heat"><i id="tp-heat"></i></div>`;
      ctrl += `<div class="row" style="margin-top:2px"><button class="btn${t.oc ? ' danger on' : ''}" id="tp-oc" style="flex:1">SURCADENCE : ${t.oc ? 'ON' : 'OFF'} <span class="k">${Keys.lbl('oc')}</span></button></div>` +
        `<div class="note" style="margin-top:3px">Cadence x2 mais chauffe. À 100% : arrêt jusqu'au refroidissement complet. Les Ventilos aident.</div>`;
    }
    let fuse = '';
    for (const f of Fusion.fieldOptions(t)) {
      const R = TOWERS[f.r.r];
      fuse += `<div class="fuse-opt${f.owned ? '' : ' off'}" data-o="${f.o.id}" style="--fc:${R.color}"><canvas></canvas><span>+ ${TOWERS[f.o.key].name} → <b>${R.name}</b></span><span class="c">${f.owned ? (f.cost ? fmt(f.cost) + '¢' : 'GRATUIT') + Towers.elemTxt(f.r.r) : 'PLAN ?'}</span></div>`;
    }
    if (fuse) fuse = `<div class="lbl-s" style="margin-top:8px;color:var(--sec)">FUSION SUR LE TERRAIN</div>` + fuse;
    // spécialisation : choix offert au niveau requis, puis rappel de la voie choisie
    const S = Towers.specs(t), need = Towers.needsSpec(t);
    let spec = '';
    if (need) spec = `<div class="lbl-s" style="margin-top:8px;color:var(--gold)">SPÉCIALISATION — CHOISISSEZ UNE VOIE</div><div class="specs">` +
      S.map((s, i) => `<button class="spec" data-sp="${i}"><i>${TXT(s.i)}</i><b>${s.n}</b><span>${s.d}</span></button>`).join('') + '</div>';
    else if (t.spec != null) spec = `<div class="specd"><i>${TXT(S[t.spec].i)}</i><b>${S[t.spec].n}</b><span>${S[t.spec].d}</span></div>`;
    else if (S) spec = `<div class="note" style="margin-top:6px">Spécialisation débloquée au niveau ${Towers.specLvl(t)}.</div>`;
    const upTxt = t.level >= maxL ? (!sup && !Towers.omega() ? `NIVEAUX OMÉGA APRÈS LA VAGUE ${Towers.omFrom()}` : 'NIVEAU MAX') : t.level >= 10 ? `▲ OMÉGA ${t.level + 1} · +${Math.round((G.mod.omegaDmg - 1) * 100)}% DÉG. · <b style="font-family:var(--mono)">${fmt(Towers.upCost(t))}¢ + ${OMEGA.abyss} ${RES.a.i}</b> <span class="k">${Keys.lbl('up')}</span>` : need ? 'CHOISISSEZ UNE SPÉCIALISATION' : `▲ AMÉLIORER · <b style="font-family:var(--mono)">${fmt(Towers.upCost(t))}¢</b> <span class="k">${Keys.lbl('up')}</span>`;
    P.innerHTML = `<div class="tp-head"><canvas id="tp-ic"></canvas><div><div class="tp-name">${d.name.toUpperCase()}</div><div class="tp-sub">${TIER_NAMES[d.tier]} · NIV ${t.level}/${maxL}</div><div class="pips">${pips}</div></div><span class="tp-close" id="tp-x">✕</span></div>
      ${body}${tags}<div class="jam" id="tp-jam" hidden><span>⚡ BROUILLÉE${sup ? ' · BONUS SUSPENDU' : ''} · <b id="tp-jt"></b></span><button class="btn" id="tp-unjam"></button><button class="btn" id="tp-unjall" hidden></button></div>${spec}${ctrl}${fuse}
      <div class="pbtns"><button class="btn prim" id="tp-up">${upTxt}</button><button class="btn danger" id="tp-sell" data-tip="${t.fresh ? 'Remboursement intégral : tourelle construite pendant cette préparation.' : 'Revente à ' + Math.round(G.mod.refund * 100) + '% de la valeur investie.'}">VENDRE · ${fmt(Towers.sellValue(t))}¢ <span class="k">${Keys.lbl('sell')}</span></button></div>`;
    Spr.icon($('tp-ic'), t.key, 42);
    $('tp-x').onclick = () => this.deselect();
    $('tp-up').onclick = e => { if (e.shiftKey) this.upAll(); else if (Act.do('up', t.tx, t.ty)) this.renderPanel(); };
    P.querySelectorAll('.spec').forEach(b => { b.onclick = () => { Act.do('spec', t.tx, t.ty, +b.dataset.sp); this.renderPanel(); }; });
    $('tp-sell').onclick = () => this.sellSel();
    const st = $('tp-strat'); if (st) st.onclick = e => { const b = e.target.closest('button'); if (b) this.setStrat(+b.dataset.s, e.shiftKey); };
    const oc = $('tp-oc'); if (oc) oc.onclick = () => this.toggleOC();
    $('tp-unjam').onclick = () => { Act.do('unjam', t.tx, t.ty); this.refreshPanelLive(); this.refreshUnjam(); };
    $('tp-unjall').onclick = () => { Act.do('unjamAll'); this.refreshPanelLive(); this.refreshUnjam(); };
    this.last.tpj = null;
    P.querySelectorAll('.fuse-opt').forEach(el => {
      const o = G.towers.find(x => x.id === +el.dataset.o); if (!o) return;
      const r = Fusion.recipeFor(t.key, o.key);
      Spr.icon(el.querySelector('canvas'), r.r, 26);
      el.onclick = () => Act.do('fuse', t.tx, t.ty, o.tx, o.ty);
      el.onpointerenter = () => this.showTipAt(this.towerTipHtml(r.r) + (G.unlocked.has(r.r) ? `<div class="d" style="margin-top:4px;color:#fff">Coût de fusion : ${Fusion.fieldCost(t, o, r)}¢ (80% de la valeur des deux tourelles est déduite). Niveau conservé : ${Math.min(10, Math.max(1, Math.floor((t.level + o.level) / 2)))}.</div>` : '<div class="d" style="margin-top:4px;color:var(--dang)">Plan non acquis : rendez-vous au Labo de fusion.</div>'), el.getBoundingClientRect(), TOWERS[r.r].color);
      el.onpointerleave = () => this.hideTip();
    });
    P.classList.add('show');
    this.refreshPanelLive(); this.refreshPanelButtons();
    this.placePanel();
  },
  refreshPanelLive() {
    const t = this.sel; if (!t) return;
    if (t.dead) { this.deselect(); return; }
    const k = $('tp-kills');
    if (k) {
      const od = G.overdriveT > 0 ? 2 : 1;
      k.textContent = fmt(t.kills); $('tp-dealt').textContent = fmt(t.dealt);
      $('tp-dps').textContent = fmt(Towers.dps(t) * od);
      $('tp-rate').textContent = t.d.kind === 'beam' ? 'continu' : (60 / t.rate * (t.oc ? 2 : 1) * od).toFixed(1) + '/s';
    }
    this.refreshJam(t);
    const h = $('tp-heat');
    if (h) { const p = t.heat; h.style.width = p + '%'; h.style.background = t.over ? '#777' : p > 80 ? '#ff3355' : p > 50 ? '#ffae00' : '#39ff88'; }
  },
  refreshJam(t) {
    const J = $('tp-jam'); if (!J) return;
    const on = t.stun > 0, n = on ? Towers.jammed().length : 0, c = Towers.unjamCost(t), ca = n > 1 ? Towers.unjamCostAll() : 0;
    const k = on ? [Math.ceil(t.stun / 6), t.jamP ? 1 : 0, c, ca, n, G.money >= c, G.money >= ca].join(':') : '';
    if (k === this.last.tpj) return;
    const was = this.last.tpj; this.last.tpj = k;
    J.hidden = !on;
    if (!on) { if (was) this.placePanel(); return; }
    $('tp-jt').textContent = t.jamP ? 'jusqu\'au débrouillage' : (t.stun / 60).toFixed(1).replace('.', ',') + ' s';
    const b = $('tp-unjam'); b.innerHTML = `DÉBROUILLER · <b>${fmt(c)}¢</b> <span class="k">${Keys.lbl('unjam')}</span>`; b.disabled = G.money < c;
    const a = $('tp-unjall'); a.hidden = n < 2;
    if (n > 1) { a.innerHTML = `TOUTES (${n}) · <b>${fmt(ca)}¢</b>`; a.disabled = G.money < ca; }
    if (!was) this.placePanel();
  },
  refreshPanelButtons() {
    const t = this.sel; if (!t) return;
    const up = $('tp-up'); if (up) up.disabled = t.level >= Towers.maxLevel(t) || G.money < Towers.upCost(t) || Towers.needsSpec(t) || (t.level >= 10 && G.res.a < OMEGA.abyss);
  },
  renderDebris() {
    const P = $('tpanel'), c = G.recycle, busy = !!G.recycling;
    P.style.setProperty('--tc', '#9fb0cc');
    P.innerHTML = `<div class="tp-head"><div><div class="tp-name">DÉBRIS SPATIAL</div><div class="tp-sub">BLOQUE LA CONSTRUCTION</div></div><span class="tp-close" id="tp-x">✕</span></div>
      <div class="note">Recyclez-le pour libérer la case et récupérer des crédits (70%) ou des nanites (30%).</div>
      <div class="sgrid" style="margin-top:8px"><div style="grid-column:1/3">CHARGES DE RECYCLAGE <b style="color:${c > 0 ? 'var(--ok)' : 'var(--dang)'}">${c}</b></div></div>
      <div class="note">+1 charge toutes les 5 vagues.</div>
      <div class="row" style="margin-top:9px"><button class="btn nano" id="tp-rec" style="flex:1" ${c > 0 && !busy ? '' : 'disabled'}>${busy ? 'RECYCLAGE EN COURS…' : 'RECYCLER'} <span class="k">${Keys.lbl('recycle')}</span></button></div>`;
    $('tp-x').onclick = () => this.deselect();
    $('tp-rec').onclick = () => { if (this.selDebris) Act.do('recycle', this.selDebris.tx, this.selDebris.ty); };
    P.classList.add('show');
    this.placePanel();
  },
  placePanel() {
    const P = $('tpanel');
    if (!P.classList.contains('show') || !G) return;
    const s = this.sel || this.selDebris; if (!s) return;
    const pw = P.offsetWidth, ph = P.offsetHeight, ts = TILE * View.scale;
    if (View.w < 640) {
      P.style.left = '8px'; P.style.right = '8px';
      P.style.top = Math.max(View.top + 4, View.h - View.bottom - ph - 8) + 'px';
      return;
    }
    P.style.right = 'auto';
    // à distance de la tuile sélectionnée pour laisser ses voisines visibles (partenaires de fusion, soutiens)
    const sx = View.ox + (s.tx + .5) * ts, sy = View.oy + (s.ty + .5) * ts, off = ts * 1.7 + 6;
    let x = sx < View.w / 2 ? sx + off : sx - off - pw;
    if (x + pw > View.w - 8) x = sx - off - pw;
    if (x < 8) x = sx + off;
    x = clamp(x, 8, View.w - pw - 8);
    const y = clamp(sy - ph / 2, View.top + 8, Math.max(View.top + 8, View.h - View.bottom - ph - 8));
    P.style.left = x + 'px'; P.style.top = y + 'px';
  },
});
