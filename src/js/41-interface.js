/* ============================== INTERFACE ============================== */
const UI = {
  stack: [], placing: null, targeting: null, sel: null, selDebris: null, hotkeys: [], cards: {}, abEls: {},
  hover: { inside: false, touch: false, tx: -1, ty: -1, wx: 0, wy: 0, sx: 0, sy: 0 },
  hoverT: null, frameN: 0, last: {}, dmgNums: true, layout: null,

  init() {
    this.dmgNums = Store.s.dmgNums;
    $('b-tree').onclick = () => this.openTree();
    $('b-lab').onclick = () => this.openLab();
    $('b-stats').onclick = () => this.openStats();
    $('b-casino').onclick = () => this.openCasino();
    $('b-speed').onclick = () => Game.cycleSpeed();
    $('b-pause').onclick = () => this.openPause();
    $('b-wave').onclick = () => Act.do('wave');
    $('b-auto').onclick = () => this.toggleAuto();
    $('b-unjam').onclick = () => { Act.do('unjamAll'); this.refreshUnjam(); };
    $('cf-no').onclick = () => this.close('ov-confirm');
    $('mh').onclick = () => { Store.s.mMin = !$('missions').classList.contains('min'); Store.save(); this.applyMissionsMin(); Sfx.play('ui'); };
    document.addEventListener('click', e => {
      const b = e.target.closest('button'); if (b) b.blur();
      const c = e.target.closest('[data-close]'); if (c) this.close(c.closest('.ov').id);
    });
    document.addEventListener('pointerover', e => {
      if (e.pointerType === 'touch') return;
      const el = e.target.closest && e.target.closest('[data-tip]');
      if (el) this.showTipAt(`<div class="d">${el.dataset.tip}</div>`, el.getBoundingClientRect());
    });
    document.addEventListener('pointerout', e => {
      const el = e.target.closest && e.target.closest('[data-tip]');
      if (el && !el.contains(e.relatedTarget)) this.hideTip();
    });
    this.buildAbils();
    $('mp-emt').onclick = () => { const e = $('mp-em'); e.classList.toggle('on'); $('mp-emt').textContent = e.classList.contains('on') ? 'MESSAGES ▴' : 'MESSAGES ▾'; };
  },

  /* ---------- infobulles ---------- */
  showTipAt(html, rect, color) {
    const T = $('tip');
    T.innerHTML = html; T.style.setProperty('--tc', color || 'var(--accent)'); T.style.display = 'block';
    const w = T.offsetWidth, h = T.offsetHeight;
    let x = rect.left + rect.width / 2 - w / 2, y = rect.top - h - 10;
    if (y < 6) y = rect.bottom + 10;
    T.style.left = clamp(x, 6, View.w - w - 6) + 'px'; T.style.top = clamp(y, 6, View.h - h - 6) + 'px';
  },
  hideTip() { $('tip').style.display = 'none'; this.hoverT = null; },
  moveTip(x, y) {
    const T = $('tip'), w = T.offsetWidth, h = T.offsetHeight;
    let px = x + 16, py = y + 16;
    if (px + w > View.w - 6) px = x - w - 12;
    if (py + h > View.h - 6) py = y - h - 12;
    T.style.left = px + 'px'; T.style.top = py + 'px';
  },
  hoverTower() {
    const h = this.hover, t = (!this.placing && !this.targeting) ? Towers.at(h.tx, h.ty) : null;
    const st = !!t && t.stun > 0;
    if (t === this.hoverT && st === this.hoverSt) { if (t) this.moveTip(h.sx, h.sy); return; }
    this.hoverT = t; this.hoverSt = st;
    if (!t || t === this.sel) { $('tip').style.display = 'none'; return; }
    const T = $('tip');
    T.style.setProperty('--tc', t.d.color);
    T.innerHTML = `<h4>${t.d.name} <span style="color:#fff;font-size:10px">NIV ${t.level}</span></h4>` +
      (t.d.kind === 'support' ? '<div class="d">Tourelle de soutien</div>' : `<div class="s"><span>DPS</span><b>${fmt(Towers.dps(t))}</b><span>Élim.</span><b>${t.kills}</b></div>`) +
      (t.over ? '<div class="d" style="color:var(--dang)">SURCHAUFFE</div>' : '') + (t.stun > 0 ? `<div class="d" style="color:#fff35c">${t.jamP ? 'HORS LIGNE (IEM)' : 'BROUILLÉE'}${t.d.support ? ' · bonus suspendu' : ''}</div><div class="d">Débrouiller : ${fmt(Towers.unjamCost(t))}¢ (sélection puis D)</div>` : '');
    T.style.display = 'block';
    this.moveTip(h.sx, h.sy);
  },
  tagsHtml(d, t) {
    const T = [];
    if (d.tier >= 2) T.push([TIER_NAMES[d.tier], 'p']);
    if (d.splash) T.push(['Zone', 'y']);
    if (d.slow) T.push([`Ralentit ${Math.round((1 - d.slow.f) * 100)}%`, 'b']);
    if (d.burn) T.push(['Brûlure', 'r']);
    if (d.pierce) T.push([d.pierce >= 1 ? 'Ignore blindage' : `Perce ${Math.round(d.pierce * 100)}% blindage`, 'y']);
    if (d.kind === 'beam') T.push(['Ignore blindage', 'y']);
    if (d.airMult) T.push([`Air x${d.airMult}`, 'g']);
    if (d.ground) T.push(['Sol uniquement', 'r']);
    if (d.chain) T.push([`Chaîne x${d.chain.n}`, 'y']);
    if (d.reveal || d.kind === 'radar') T.push(['Détection', 'g']);
    if (d.bounce) T.push([`Rebonds x${d.bounce}`, 'y']);
    if (d.kind === 'vortex') T.push(['Contrôle', 'p']);
    if (d.kind === 'missiles') T.push([`x${d.count} missiles`, 'y']);
    if (d.kind === 'support') T.push([NBZ[t ? Towers.reach(t) : G && G.mod ? Towers.reachOf(Object.keys(TOWERS).find(k => TOWERS[k] === d)) : d.diag ? 1 : 0].length + ' voisins', 'g']);
    return T.map(([t, c]) => `<span class="tag ${c}">${t}</span>`).join('');
  },
  towerTipHtml(k) {
    const d = TOWERS[k], cost = G ? Towers.costOf(k) : d.cost, rec = RECIPES.find(r => r.r === k);
    const stats = d.kind === 'support' ? '' :
      `<div class="s"><span>Dégâts</span><b>${d.dmg}${d.kind === 'beam' ? '/s' : ''}${d.kind === 'missiles' ? ' x' + d.count : ''}</b>` +
      `<span>Portée</span><b>${(d.range / TILE).toFixed(1)} cases</b>` +
      (d.kind !== 'radar' && d.kind !== 'beam' ? `<span>Cadence</span><b>${(60 / d.rate).toFixed(1)}/s</b>` : '') + '</div>';
    const ec = G && Towers.elemOf(k) ? Towers.elemTxt(k) : '';
    return `<h4>${d.name} <span style="color:var(--gold);font-family:var(--mono)">${cost}¢</span>${ec ? `<span style="color:${RES[Towers.elemOf(k)].c};font-family:var(--mono)">${ec}</span>` : ''}</h4><div class="d">${d.desc}</div>${stats}` +
      `<div class="tags">${this.tagsHtml(d)}</div>${rec ? `<div class="d">Fusion de ${TOWERS[rec.a].name} + ${TOWERS[rec.b].name}</div>` : ''}`;
  },
  enemyDesc(d, hpMul) {
    const p = [`PV ${fmt(d.hp * hpMul)}`];
    if (d.armor) p.push('blindé'); if (d.shield) p.push('bouclier'); if (d.air) p.push('volant'); if (d.stealth) p.push('furtif');
    if (d.spd >= 2) p.push('rapide'); if (d.heal) p.push('soigneur'); if (d.jam) p.push('IEM'); if (d.blink) p.push('téléportation');
    if (d.spawn) p.push(d.spawn.type === 'scout' || d.spawn.type === 'mite' ? 'libère des unités' : 'se divise'); if (d.summon) p.push(d.summon.type === 'wraith' ? 'relève les morts' : 'invoque des drones');
    if (d.aura) p.push('protège ses alliés'); if (d.leap) p.push('bondit en avant');
    if (d.mega) p.push(d.phases.length + ' phases', 'IEM géante', 'défaite immédiate s\'il passe');
    if (d.regen) p.push('régénère'); if (d.sapper) p.push('désamorce les pièges'); if (d.phase) p.push('déphasage'); if (d.noSlow) p.push('insensible au gel');
    if (d.accel) p.push('accélère'); if (d.veil) p.push('rend ses alliés invisibles'); if (d.heavy) p.push('résiste aux trous noirs');
    return p.join(' · ');
  },

  /* ---------- bannière & notifications ---------- */
  banner(t, s, col) {
    if (Demo.busy) return;
    const B = $('banner'); B.innerHTML = '';
    const d = document.createElement('div'); d.className = 'bn';
    if (col) d.style.setProperty('--bc', col);
    if (String(t).length > 12) d.classList.add('long');
    d.innerHTML = `<div class="t">${t}</div>${s ? `<div class="s">${s}</div>` : ''}`;
    B.appendChild(d);
    clearTimeout(this._bt); this._bt = setTimeout(() => d.remove(), 2700);
  },
  toast(title, text, col = '#ffd23f', life = 4) {
    if (Demo.busy) return;
    const box = $('toasts');
    while (box.children.length >= 4) box.firstChild.remove();
    const d = document.createElement('div'); d.className = 'toast';
    d.style.setProperty('--tc', col); d.style.setProperty('--life', life + 's');
    d.innerHTML = `<h5>${title}</h5><p>${text}</p>`;
    box.appendChild(d);
    setTimeout(() => d.remove(), life * 1000 + 500);
  },
  noMoney() { if (!Act.mine()) return; Sfx.play('error'); this.anim($('h-money'), 'bad'); },
  anim(el, cls) { el.classList.remove('bump', 'bad'); void el.offsetWidth; el.classList.add(cls); },

  /* ---------- entrée / sortie de partie ---------- */
  enterGame() {
    this.closeAll();
    $('hud').classList.remove('hidden'); $('dock').classList.remove('hidden');
    this.last = {}; this.sel = null; this.selDebris = null; this.placing = null; this.targeting = null;
    $('tpanel').classList.remove('show'); $('bossbar').style.display = 'none';
    $('cv-game').classList.remove('placing', 'targeting');
    this.buildBar(); this.buildAbils(); this.refreshAuto(); this.refreshSpeed(); this.onPreview();
    $('missions').classList.remove('hidden'); this.applyMissionsMin(); this.renderMissions();
    Render.resize();
    this.refreshHUD(); this.refreshAbils(true); this.refreshBadges();
    if (!Store.data.tuto) {
      Store.data.tuto = true; Store.save();
      setTimeout(() => this.toast('Bienvenue, Commandant', 'Choisissez une tourelle dans la barre du bas (touches 1 à 0), puis cliquez sur une case libre de la carte.', '#00f3ff', 8), 700);
      setTimeout(() => this.toast('Astuce', 'Lancez la vague avec ESPACE. Survolez les éléments pour les détails. Manuel complet : touche H.', '#00f3ff', 8), 4200);
    }
  },
  exitGame() {
    this.mpHud(false); $('mp-wait').style.display = 'none'; $('rp-bar').hidden = true;
    $('hud').classList.add('hidden'); $('dock').classList.add('hidden'); $('missions').classList.add('hidden');
    $('tpanel').classList.remove('show'); $('bossbar').style.display = 'none';
    this.sel = null; this.selDebris = null; this.placing = null; this.targeting = null; this.hover.inside = false;
    this.hideTip();
    Render.resize();
    this.showMenu();
  },
  onResize() {
    window.scrollTo(0, 0);
    this.placePanel();
    if (G && !G.demo) this.applyMissionsMin();
    if (this.top() === 'ov-tree') requestAnimationFrame(() => this.drawLinks());
  },

  /* ---------- HUD ---------- */
  frame() {
    this.frameN++;
    if (Game.state !== 'play' || !G) { if (Score.on) Score.refresh(); if (this.last.mpp) this.refreshMpPause(); return; }
    const f = this.frameN;
    if (f % 10 === 0) { Score.refresh(); this.refreshMpPause(); if (G.replay) this.refreshReplay(); }
    if (f % 60 === 0) Tips.check();
    if (f % 6 === 0) { this.refreshHUD(); this.refreshCombo(); this.refreshBoss(); this.refreshEvent(); this.refreshUnjam(); }
    if (f % 4 === 0) this.refreshAbils();
    if (this.sel && f % 12 === 0) this.refreshPanelLive();
    if (f % 30 === 0) this.refreshBadges();
    if (this.missionsDirty && f % 5 === 0) { this.missionsDirty = false; this.renderMissions(); }
    if (this.missionFlash) { const m = $('missions'); m.classList.remove('flash'); void m.offsetWidth; m.classList.add('flash'); this.missionFlash = 0; }
    const h = this.hover;
    if (h.inside && !h.touch && G.drops.length && !G.over) Drops.near(h.wx, h.wy, 40);
    if (f % 20 === 0 && G.net) this.refreshMP();
    if (f % 10 === 0) { const w = Net.coop && Lock.stall > 600; if (w !== this.last.wait) { this.last.wait = w; $('mp-wait').style.display = w ? 'block' : 'none'; if (w) $('mp-wait').textContent = MP.migT ? 'RECONNEXION AU NOUVEL HÔTE…' : MP.rejoining ? 'RETOUR EN JEU…' : MP.slots.length > 2 ? 'EN ATTENTE DES AUTRES JOUEURS…' : `EN ATTENTE DE ${MP.name(MP.others()[0] || 0).toUpperCase()}…`; } }
  },
  refreshHUD() {
    const L = this.last, lives = Math.max(0, Math.ceil(G.lives)), money = Math.floor(this.holdMoney != null ? this.holdMoney : G.money);
    if (L.lives !== lives) { const el = $('h-lives'); el.textContent = lives; if (L.lives !== undefined && lives < L.lives) this.anim(el, 'bad'); L.lives = lives; }
    if (L.money !== money) {
      $('h-money').textContent = fmt(money); L.money = money;
      this.refreshBar();
      if (money >= 5000) Ach.unlock('rich');
      Missions.on('money', money);
      if (this.sel) this.refreshPanelButtons();
    }
    const rk = G.res.p + ':' + G.res.a + ':' + (G.res.sp ? 1 : 0) + (G.res.sa ? 1 : 0);
    if (L.res !== rk) {
      L.res = rk;
      $('hs-el').hidden = !(G.res.sp || G.res.sa || G.res.p || G.res.a);
      $('h-plasma').textContent = RES.p.i + G.res.p; $('h-abyss').textContent = RES.a.i + G.res.a;
      $('h-abyss').hidden = !(G.res.sa || G.res.a);
      this.refreshBadges(); this.refreshBar();
    }
    if (L.nano !== G.nanites) { const el = $('h-nano'); el.textContent = G.nanites; if (L.nano !== undefined && G.nanites > L.nano) this.anim(el, 'bump'); L.nano = G.nanites; this.refreshBadges(); }
    if (L.wave !== G.waveNum) { $('h-wave').textContent = G.waveNum; L.wave = G.waveNum; }
    if (L.nt !== G.towers.length) { L.nt = G.towers.length; this.refreshBar(); }
    this.refreshWaveBtn();
  },
  // bouton flottant « débrouiller » : seulement quand le brouillage en vaut la peine (météores, gros IEM)
  refreshUnjam() {
    const b = $('b-unjam');
    let n = 0, tot = 0;
    if (!G.over && !G.demo) for (const t of G.towers) if (t.stun > 0) { n++; tot += t.jamP ? 999 : t.stun; }
    // sur mobile, le panneau de la tourelle sélectionnée occupe le bas de l'écran et a ses propres boutons
    const show = n > 0 && (tot >= 240 || (this.last.uj && tot > 30)) && !(View.w < 640 && this.sel);
    if (show !== this.last.uj) { this.last.uj = show; b.hidden = !show; this.last.ujk = ''; }
    if (!show) return;
    const c = Towers.unjamCostAll(), k = n + ':' + c + ':' + (G.money >= c);
    if (k === this.last.ujk) return;
    this.last.ujk = k;
    b.innerHTML = `⚡ DÉBROUILLER ${n > 1 ? n + ' TOURELLES' : 'LA TOURELLE'} · <b>${fmt(c)}¢</b> <span class="k">${Keys.lbl('unjam')}</span>`;
    b.disabled = G.money < c;
  },
  // touche D : la tourelle sélectionnée si elle est brouillée, sinon toutes
  unjam() {
    const t = this.sel;
    if (t && !t.dead && t.stun > 0) Act.do('unjam', t.tx, t.ty);
    else if (Towers.jammed().length) Act.do('unjamAll');
    else return;
    this.refreshUnjam(); if (this.sel) this.refreshPanelLive();
  },
  refreshWaveBtn() {
    const b = $('b-wave');
    let txt, cls = '', dis = false;
    if (G.over) { txt = 'NOYAU DÉTRUIT'; dis = true; cls = 'busy'; }
    else if (G.phase === 'prep') { const n = G.waveNum + 1; txt = G.autoWave ? `VAGUE ${n} · ${Math.ceil(G.autoT / 60)}s` : `LANCER VAGUE ${n}`; }
    else if (G.spawnQ.length) { txt = `VAGUE ${G.waveNum} EN COURS`; cls = 'busy'; dis = true; }
    else { txt = `VAGUE ${G.waveNum + 1} ⏩ +${Waves.earlyBonus(G.waveNum + 1)}¢`; cls = 'early'; }
    const key = txt + cls + dis;
    if (this.last.wbtn === key) return;
    this.last.wbtn = key;
    b.innerHTML = txt + (dis ? '' : ` <span class="k">${Keys.lbl('wave')}</span>`);
    b.className = 'btn ' + cls; b.disabled = dis;
  },
  refreshBadges() {
    if (!G) return;
    this.refreshPower();
    $('bd-tree').classList.toggle('on', Skills.anyBuyable());
    $('bd-lab').classList.toggle('on', Fusion.anyResearchable());
    $('bd-casino').classList.toggle('on', G.phase === 'prep' && Casino.tokens(Net.me) > 0 && G.waveNum >= 1 && G.money >= Casino.betCost(0));
    this.refreshBet();
  },
  // temps de tir continu de toutes les tourelles pour détruire la vague suivante
  refreshPower() {
    const el = $('wp-pow'), P = G.preview;
    if (!P || G.demo || G.over) { el.textContent = ''; return; }
    let dps = 0; for (const t of G.towers) dps += Towers.dps(t);
    const hp = Waves.totalHp(P), fire = dps > 0 ? hp / dps : Infinity;
    const dur = P.list.length * Math.max(11, 30 - P.n * .35) * P.gapMul / 60 + 12, r = fire / dur;
    const col = r < .5 ? 'var(--ok)' : r < 1 ? 'var(--gold)' : 'var(--dang)';
    const txt = TXT('⚔') + ' ' + (fire === Infinity ? '—' : fire < 100 ? fire.toFixed(fire < 10 ? 1 : 0).replace('.', ',') + ' s' : fire < 6000 ? Math.round(fire / 60) + ' min' : '∞');
    const k = txt + col; if (this.last.pow === k) return; this.last.pow = k;
    el.textContent = txt; el.style.color = col;
    el.dataset.tip = `<b>Puissance de feu</b> — il faudrait environ <b>${fire === Infinity ? '∞' : Math.round(fire) + ' s'}</b> de tir continu de toutes vos tourelles pour détruire la vague ${P.n}.<br>PV estimés : <b>${fmt(hp)}</b> · vos DPS : <b>${fmt(dps)}</b>.<br><span style="color:var(--ok)">Vert</span> : large marge · <span style="color:var(--gold)">jaune</span> : tendu · <span style="color:var(--dang)">rouge</span> : renforcez-vous (estimation : la portée, le blindage et les boucliers comptent aussi).`;
  },
  refreshCombo() {
    const c = G.combo, on = c >= 5;
    if (on !== this.last.comboOn) { $('combo').classList.toggle('on', on); this.last.comboOn = on; }
    if (on && this.last.combo !== c) {
      this.last.combo = c;
      const el = $('combo');
      $('combo-v').textContent = 'x' + (1 + Math.min(1, Math.floor(c / 10) * .1)).toFixed(1);
      $('combo-n').textContent = c + ' élim.';
      el.classList.toggle('t1', c >= 25 && c < 50); el.classList.toggle('t2', c >= 50 && c < 100); el.classList.toggle('t3', c >= 100);
    }
    if (this.comboBurst) { const el = $('combo'); el.classList.remove('burst'); void el.offsetWidth; el.classList.add('burst'); this.comboBurst = 0; }
  },
  refreshBoss() {
    const b = G.boss, el = $('bossbar');
    Music.intensity = G.over ? 0 : b ? 2 : G.phase === 'combat' ? 1 : 0;
    if (!b || !b.alive) { if (this.last.boss) { el.style.display = 'none'; this.last.boss = null; } return; }
    if (this.last.boss !== b || this.last.bph !== b.mph) {
      this.last.boss = b; this.last.bph = b.mph; el.style.display = 'block'; el.classList.toggle('mega', !!b.d.mega);
      $('bb-name').textContent = b.d.mega ? `☠ ${b.d.name} · PHASE ${b.mph + 1}/${b.d.phases.length} ☠` : '⚠ ' + b.d.name + (b.elite ? ' ÉLITE' : '') + ' ⚠';
      $('bb-ticks').innerHTML = b.d.mega ? b.d.phases.slice(1).map(P => `<i style="left:${P.at * 100}%"></i>`).join('') : '';
    }
    el.classList.toggle('inv', b.inv > 0);
    $('bb-fill').style.width = (Math.max(0, b.hp / b.maxHp) * 100).toFixed(1) + '%';
    $('bb-sh').style.width = b.maxShield ? (b.shield / b.maxShield * 100).toFixed(1) + '%' : '0';
  },
  callout(txt, col) {
    if (Demo.busy) return;
    const C = $('callout'); C.innerHTML = '';
    const b = document.createElement('b'); b.textContent = txt; b.style.setProperty('--cc', col || '#ffd23f');
    C.appendChild(b); clearTimeout(this.coT); this.coT = setTimeout(() => { C.innerHTML = ''; }, 1500);
  },
  bossIntro(d, type, mega) {
    const el = $('bossintro');
    el.style.setProperty('--bc', d.color);
    el.querySelector('span').textContent = mega ? '☠ ALERTE ROUGE · MÉGA-BOSS' : '⚠ ALERTE BOSS';
    $('bi-n').textContent = d.name; $('bi-d').textContent = LORE[type] || '';
    Spr.enemyIcon($('bi-cv'), type, 64);
    el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
    clearTimeout(this.biT); this.biT = setTimeout(() => el.classList.remove('show'), mega ? 5000 : 3500);
  },
  refreshEvent() {
    const el = $('evchip'), L = Events.label();
    if (!L || G.over) { if (this.last.ev) { el.style.display = 'none'; this.last.ev = null; } return; }
    if (this.last.ev !== L.E) {
      this.last.ev = L.E; el.style.display = 'flex'; el.style.setProperty('--ec', L.E.c);
      $('ev-i').textContent = TXT(L.E.i); $('ev-n').textContent = L.E.n.toUpperCase();
    }
    el.classList.toggle('low', !!this.last.boss);
    const pb = $('ev-p'); pb.parentNode.style.display = L.p < 0 ? 'none' : 'block'; if (L.p >= 0) pb.style.width = (L.p * 100).toFixed(1) + '%';
  },
  refreshSpeed() {
    const b = $('b-speed');
    b.textContent = '▶ ' + Game.speed + 'x';
    b.classList.toggle('on', Game.speed > 1);
  },
  toggleAuto() {
    if (G && G.net === 'versus') { Sfx.play('error'); this.toast('Vagues automatiques', 'En versus, les vagues s\'enchaînent automatiquement pour les deux joueurs (vous pouvez les appeler plus tôt).', '#9fb0cc', 3); return; }
    const on = !(G ? G.autoWave : Store.s.autoWave);
    Store.s.autoWave = on; Store.save();
    if (G) Act.do('auto', on);
    this.refreshAuto(); Sfx.play('ui');
  },
  refreshAuto() {
    const b = $('b-auto'), on = G ? G.autoWave : Store.s.autoWave;
    b.textContent = 'AUTO : ' + (on ? 'ON' : 'OFF');
    b.classList.toggle('on', on);
    this.last.wbtn = null;
  },
  onPreview() {
    if (G.demo) return;
    const P = G.preview;
    $('wp-name').textContent = `${P.n} · ${P.name}`;
    const box = $('wp-chips'); box.innerHTML = ''; this.last.pow = null; this.refreshPower();
    const items = Object.entries(P.counts).sort((a, b) => b[1] - a[1]).map(([k, n]) => [k, n, false]);
    for (const b of P.bosses.slice().reverse()) items.unshift([b, 1, true]);
    for (const [k, n, boss] of items.slice(0, 7)) {
      const ch = document.createElement('span'); ch.className = 'chip' + (boss ? ' boss' : '');
      const cv = document.createElement('canvas'); Spr.enemyIcon(cv, k, 20); ch.appendChild(cv);
      ch.appendChild(document.createTextNode('×' + n));
      const d = EDEF(k);
      ch.dataset.tip = `<b style="color:${d.color}">${d.name}</b> — ${this.enemyDesc(d, P.hpMul)}`;
      box.appendChild(ch);
    }
    const types = Object.keys(P.counts).concat(P.bosses.length ? ['boss'] : []);
    for (const k of types) if (HINTS[k] && !G.seen.includes(k)) {
      G.seen.push(k);
      this.toast('Renseignement : ' + HINTS[k][0], HINTS[k][1], k === 'boss' ? '#ff2a6d' : '#4df3ff', 7);
    }
  },

  /* ---------- missions ---------- */
  applyMissionsMin() {
    const min = Store.s.mMin === undefined ? View.w < 640 : Store.s.mMin;
    $('missions').classList.toggle('min', min); $('m-tog').textContent = min ? '+' : '−';
  },
  renderMissions() {
    if (!G || G.demo) return;
    const c = Store.data.cmd;
    $('m-cmd').textContent = `NIV ${c.lvl} · ${fmt(c.xp)}/${fmt(Cmd.need(c.lvl))} XP`;
    $('m-xp').style.width = (c.xp / Cmd.need(c.lvl) * 100).toFixed(1) + '%';
    $('mlist').innerHTML = G.missions.map(s => {
      const m = MDEF[s.id], p = Math.min(1, s.p / s.n);
      return `<div class="mi"><div class="mt"><i>${TXT(m.i)}</i><span>${m.d(s.n)}</span><span class="mr" style="color:${s.nano ? 'var(--nano)' : 'var(--gold)'}">${s.nano ? '+' + s.nano + ' ◈' : '+' + fmt(s.cash) + '¢'}</span></div>` +
        `<div class="mb"><div><s style="width:${(p * 100).toFixed(1)}%"></s></div><em>${fmt(Math.min(s.p, s.n))}/${fmt(s.n)}</em></div></div>`;
    }).join('') || '<div class="note" style="margin-top:6px">Nouvelles missions à la prochaine vague.</div>';
  },

  /* ---------- protocoles ---------- */
  openCards() {
    if (!G || !G.offer || !G.offer.length) { if (G) { G.offer = null; G.cardQ = 0; } return; }
    if (G.replay) return;
    if (G.wallets && Net.coop && Cards.turn() !== Net.me) { this.toast('Protocole', `${MP.esc(MP.name(Cards.turn()))} choisit le protocole de cette vague.`, '#ff2bd6', 3); return; }
    this.setPlacing(null, true); this.setTargeting(null); this.deselect();
    this.renderCards(); this.open('ov-cards'); Sfx.play('card');
  },
  renderCards() {
    $('cards-t').textContent = `PROTOCOLE · VAGUE ${G.waveNum}`;
    $('cards-sub').innerHTML = `Choisissez une amélioration pour la suite de la partie${G.cardQ > 1 ? ` (<b>${G.cardQ}</b> en attente)` : ''}. Raccourcis : ${G.offer.map((_, i) => `<kbd>${i + 1}</kbd>`).join(' ')}.`;
    const box = $('cards'); box.innerHTML = ''; box.classList.toggle('c4', G.offer.length > 3);
    G.offer.forEach((id, i) => {
      const c = CARDS[id], col = c.pact ? '#ff3d5a' : CARD_RARITY[c.r].c, own = G.cards[id] || 0, cat = CARD_CAT[c.cat];
      const st = c.timed ? `Durée : ${c.timed} vagues` : c.max ? `Niveau ${own} → ${own + 1} / ${c.max}` : 'Effet immédiat';
      const el = document.createElement('div');
      el.className = 'pcard' + (c.pact ? ' pact' : '') + (c.r === 3 ? ' legend' : ''); el.tabIndex = 0; el.style.setProperty('--rc', col);
      el.innerHTML = `<span class="hk">${i + 1}</span><div class="ci">${TXT(c.i)}</div><div class="ct"><div class="rr">${c.pact ? 'PACTE' : CARD_RARITY[c.r].n}${cat ? ' · ' + cat : ''}</div><h3>${c.n}</h3><p>${c.d()}</p><div class="st">${st}</div></div>`;
      el.onclick = () => Act.do('card', i);
      el.onkeydown = e => { if (e.key === 'Enter') Act.do('card', i); };
      box.appendChild(el);
    });
    const rb = $('cards-reroll'), rc = Cards.rerollCost();
    rb.innerHTML = `RELANCER LES CARTES · ${fmt(rc)}¢`; rb.disabled = G.money < rc; rb.onclick = () => Act.do('reroll');
  },

  /* ---------- doctrines ---------- */
  renderDocs() {
    const row = $('doc-row'), lvl = Store.data.cmd.lvl;
    let cur = Store.data.doctrine;
    if (!DOCTRINES[cur] || DOCTRINES[cur].lvl > lvl) cur = 'standard';
    const desc = (d, lock) => { $('doc-desc').innerHTML = `<b>${d.n}</b> — ${d.d}${lock ? ` <span style="color:var(--dang)">Débloquée au niveau ${d.lvl}.</span>` : ''}`; };
    row.innerHTML = '';
    for (const k in DOCTRINES) {
      const d = DOCTRINES[k], lock = d.lvl > lvl, b = document.createElement('button');
      b.className = 'doc' + (k === cur ? ' on' : '') + (lock ? ' lock' : '');
      b.innerHTML = `<i>${lock ? '⊘' : TXT(d.i)}</i>${d.n}${lock ? ` · niv ${d.lvl}` : ''}`;
      b.onclick = () => { if (lock) { Sfx.play('error'); return; } Store.data.doctrine = k; Store.save(); Sfx.play('ui'); this.renderDocs(); };
      b.onpointerenter = () => desc(d, lock);
      b.onpointerleave = () => desc(DOCTRINES[cur], false);
      row.appendChild(b);
    }
    desc(DOCTRINES[cur], false);
  },
  cmdBadge(el) {
    const c = Store.data.cmd, nd = Cmd.nextDoctrine(c.lvl);
    el.innerHTML = `<div class="cl">NIV <b>${c.lvl}</b><span>${Cmd.rank(c.lvl).toUpperCase()}</span><em>${fmt(c.xp)} / ${fmt(Cmd.need(c.lvl))} XP</em></div>` +
      `<div class="xpbar"><s style="width:${(c.xp / Cmd.need(c.lvl) * 100).toFixed(1)}%"></s></div>` +
      (nd ? `<div class="nx">Prochaine doctrine : <b>${nd.n}</b> au niveau ${nd.lvl}</div>` : '<div class="nx">Toutes les doctrines sont débloquées.</div>');
  },

  /* ---------- barre de construction ---------- */
  buildBar() {
    const bar = $('bar'); bar.innerHTML = ''; this.cards = {}; this.hotkeys = [];
    const keys = Object.keys(TOWERS).filter(k => Fusion.avail(k)).sort((a, b) => TOWERS[a].tier - TOWERS[b].tier);
    let i = 0, sep = false;
    const sepEl = () => { const s = document.createElement('div'); s.className = 'bsep'; bar.appendChild(s); };
    // les pièges se rangent entre les tourelles de base et les fusions
    const traps = () => {
      sepEl();
      for (const type in TRAPS) {
        const T = TRAPS[type], k = 'trap:' + type, el = document.createElement('div');
        el.className = 'bcard'; el.style.setProperty('--tc', T.color);
        el.innerHTML = `<span class="hk">${Keys.lbl(k)}</span><span class="tr" style="color:${T.color}">PIÈGE</span><canvas></canvas><span class="pr"></span>`;
        const cv = el.querySelector('canvas'), dpr = Math.min(2, window.devicePixelRatio || 1);
        cv.width = cv.height = 44 * dpr; const x = cv.getContext('2d'); x.setTransform(dpr * 1.25, 0, 0, dpr * 1.25, 22 * dpr, 22 * dpr); drawTrapShape(x, type, true);
        el.onclick = () => this.setPlacing(this.placing === k ? null : k);
        el.onpointerenter = e => { if (e.pointerType !== 'touch') this.showTipAt(`<h4>${T.name} <span style="color:var(--gold);font-family:var(--mono)">${Traps.cost(type)}¢</span></h4><div class="d">${T.d}</div><div class="d" style="margin-top:4px">Se pose sur le chemin · ${T.max} maximum · puissance adaptée à la vague</div>`, el.getBoundingClientRect(), T.color); };
        el.onpointerleave = () => this.hideTip();
        bar.appendChild(el);
        this.cards[k] = { el, pr: el.querySelector('.pr'), cost: -1, off: null, trap: type };
      }
    };
    for (const k of keys) {
      const d = TOWERS[k];
      if (d.tier >= 2 && !sep) { sep = true; traps(); sepEl(); }
      const el = document.createElement('div');
      el.className = 'bcard' + (G.freshBp === k ? ' fresh' : '');
      el.style.setProperty('--tc', d.color);
      const hk = (Keys.lbl('tw:' + k) || (i < 10 ? Keys.lbl('slot' + (i + 1)) : '')).replace('PAVÉ ', 'P');
      const ei = Towers.elemOf(k) ? `<span class="ec" style="color:${RES[Towers.elemOf(k)].c}"></span>` : '';
      el.innerHTML = `<span class="hk">${hk}</span>${d.tier >= 2 ? `<span class="tr" style="color:${d.color}">T${d.tier}</span>` : ''}${ei}<canvas></canvas><span class="pr"></span>`;
      Spr.icon(el.querySelector('canvas'), k, 44);
      el.onclick = () => {
        this.setPlacing(this.placing === k ? null : k);
        if (G.freshBp === k) { G.freshBp = null; el.classList.remove('fresh'); }
      };
      el.onpointerenter = e => { if (e.pointerType !== 'touch') this.showTipAt(this.towerTipHtml(k), el.getBoundingClientRect(), d.color); };
      el.onpointerleave = () => this.hideTip();
      bar.appendChild(el);
      this.cards[k] = { el, pr: el.querySelector('.pr'), cost: -1, off: null, ec: el.querySelector('.ec'), ev: -1 };
      if (i < 10) this.hotkeys[i] = k;
      i++;
    }
    if (!sep) traps();
    if (G.net === 'versus') {
      sepEl();
      for (const k in SENDS) {
        const S = SENDS[k], key = 'send:' + k, el = document.createElement('div'), col = S.sab ? S.c : EDEF(S.type).color, st = S.stock || SEND_STOCK;
        el.className = 'bcard send' + (S.sab ? ' sab' : ''); el.style.setProperty('--tc', S.sab ? S.c : '#ff2a6d');
        el.innerHTML = `<span class="hk"></span><span class="tr">${S.sab ? 'SABOT.' : '×' + S.cnt}</span><canvas></canvas><span class="pr"></span>`;
        if (S.sab) {   // icône : rocher en flammes
          const cv = el.querySelector('canvas'), x = cv.getContext('2d'); cv.width = cv.height = 88;
          const g = x.createRadialGradient(44, 44, 4, 44, 44, 40); g.addColorStop(0, rgba(S.c, .55)); g.addColorStop(1, rgba(S.c, 0));
          x.fillStyle = g; x.fillRect(0, 0, 88, 88);
          x.font = `900 ${S.sab === 2 ? 54 : 46}px "Segoe UI Symbol",sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
          x.shadowColor = S.c; x.shadowBlur = 14; x.fillStyle = '#fff2c4'; x.fillText(S.i, 44, 48);
        } else Spr.enemyIcon(el.querySelector('canvas'), S.type, 44);
        el.onclick = () => MP.sendPack(k);
        const what = S.sab ? `<div class="d">${S.d}</div>` : `<div class="d">${S.cnt} × <b style="color:${col}">${EDEF(S.type).name}</b> apparaissent chez l'adversaire, à la puissance de votre vague actuelle. Chacun vous rapporte jusqu'à <b>60 %</b> de son prix s'il survit 20 s, et <b>+50 %</b> s'il atteint le noyau.</div>`;
        el.onpointerenter = e => { if (e.pointerType !== 'touch') this.showTipAt(`<h4>${S.sab ? 'SABOTAGE' : 'ENVOI'} · ${S.n.toUpperCase()}</h4>${what}<div class="d" style="margin-top:4px;color:var(--gold)">Revenu +${S.inc}¢ à chaque vague repoussée.</div><div class="d" style="margin-top:4px">${st} envoi${st > 1 ? 's' : ''} par vague${S.from > 1 ? ` · dès la vague ${S.from}` : ''}.</div>`, el.getBoundingClientRect(), col); };
        el.onpointerleave = () => this.hideTip();
        bar.appendChild(el);
        this.cards[key] = { el, pr: el.querySelector('.pr'), hk: el.querySelector('.hk'), cost: -1, off: null, send: k };
      }
    }
    this.refreshBar();
    if (G.freshBp && this.cards[G.freshBp]) { const el = this.cards[G.freshBp].el; bar.scrollLeft = el.offsetLeft - bar.offsetLeft - bar.clientWidth / 2; }
  },
  refreshBar() {
    for (const k in this.cards) {
      const c = this.cards[k], cost = c.send ? MP.sendCost(c.send) : c.trap ? Traps.cost(c.trap) : Towers.costOf(k);
      if (c.cost !== cost) { c.cost = cost; c.pr.textContent = cost; }
      if (c.ec) { const ev = Towers.elemCost(k); if (ev !== c.ev) { c.ev = ev; c.ec.textContent = ev ? ev + RES[Towers.elemOf(k)].i : ''; } }
      if (c.send) { const st = MP.stock(c.send); if (c.hk.textContent !== String(st)) c.hk.textContent = SENDS[c.send].from > Math.max(1, G.waveNum) ? 'V' + SENDS[c.send].from : st; }
      const off = G.money < cost || (!!c.send && !MP.canSend(c.send)) || (!c.send && !c.trap && !Towers.canPay(k));   // toujours un booléen : toggle(x, undefined) inverserait la classe
      if (off !== c.off) { c.off = off; c.el.classList.toggle('off', off); }
      c.el.classList.toggle('sel', this.placing === k);
    }
  },
  setPlacing(k, silent) {
    if (k && this.targeting) this.setTargeting(null);
    this.placing = k; this.pend = null;
    if (k) { this.deselect(); if (!silent) Sfx.play('ui'); }
    $('cv-game').classList.toggle('placing', !!k);
    if (G) this.refreshBar();
  },
  setTargeting(k) {
    this.targeting = k;
    if (k) { this.placing = null; this.deselect(); if (G) this.refreshBar(); Sfx.play('ui'); }
    $('cv-game').classList.toggle('targeting', !!k);
    if (k) $('cv-game').classList.remove('placing');
    if (G) this.refreshAbils(true);
    if (k && this.hover.touch) this.toast(ABILS[k].n, 'Touchez la carte pour choisir la cible.', ABILS[k].color, 2.5);
  },

  /* ---------- capacités ---------- */
  keyLabel(code) {
    if (this.layout) { const v = this.layout.get(code); if (v) return v.toUpperCase(); }
    const az = /^fr/i.test(navigator.language || '');
    return ({ KeyQ: az ? 'A' : 'Q', KeyW: az ? 'Z' : 'W', KeyE: 'E' })[code] || code.replace('Key', '');
  },
  buildAbils() {
    const box = $('abils'); box.innerHTML = ''; this.abEls = {};
    for (const k of Abil.keys) {
      const a = ABILS[k], el = document.createElement('div');
      el.className = 'abil'; el.style.setProperty('--c', a.color);
      el.innerHTML = `<span class="ic">${TXT(a.i)}</span><div class="cdov"></div><span class="cdt"></span><span class="key">${Keys.lbl(k)}</span>`;
      el.onclick = () => Abil.trigger(k);
      el.onpointerenter = e => { if (e.pointerType !== 'touch') this.showTipAt(this.abilTip(k), el.getBoundingClientRect(), a.color); };
      el.onpointerleave = () => this.hideTip();
      box.appendChild(el);
      this.abEls[k] = { el, ov: el.querySelector('.cdov'), t: el.querySelector('.cdt'), ic: el.querySelector('.ic'), st: '' };
    }
  },
  abilTip(k) {
    const a = ABILS[k], locked = G && !Abil.unlocked(k), cd = G ? Abil.cdMax(k) / 60 : a.cd / 60;
    return `<h4>${a.n}${Keys.lbl(k) ? ` [${Keys.lbl(k)}]` : ''}</h4><div class="d">${a.d}</div>` +
      `<div class="d" style="margin-top:4px">Recharge : ${Math.round(cd)} s${k === 'orbital' && G ? ` · Dégâts : <b style="color:#fff">${fmt(Abil.orbDmg())}</b>` : ''}</div>` +
      (locked ? `<div class="d" style="color:var(--dang);margin-top:4px">Verrouillée — compétence « ${SKILLS[a.skill].n} » requise (Arbre).</div>` : '');
  },
  refreshAbils(force) {
    if (!G || G.demo) return;
    for (const k of Abil.keys) {
      const A = this.abEls[k]; if (!A) continue;
      const cd = G.abil[k], un = Abil.unlocked(k);
      const st = !un ? 'L' : cd > 0 ? 'C' + cd : (this.targeting === k ? 'T' : 'R');
      if (st === A.st && !force) continue;
      A.st = st;
      A.el.classList.toggle('locked', !un);
      A.el.classList.toggle('cd', un && cd > 0);
      A.el.classList.toggle('armed', this.targeting === k);
      if (un && cd > 0) {
        A.ov.style.background = `conic-gradient(rgba(0,0,0,.75) ${(cd / Abil.cdMax(k) * 360).toFixed(1)}deg, transparent 0)`;
        A.t.textContent = Math.ceil(cd / 60);
      } else { A.ov.style.background = 'none'; A.t.textContent = ''; }
      A.ic.style.opacity = un && cd > 0 ? .3 : 1;
    }
  },

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

  /* ---------- fenêtres modales ---------- */
  open(id) { if (!this.stack.includes(id)) this.stack.push(id); $(id).classList.add('show'); this.hideTip(); },
  close(id) {
    $(id).classList.remove('show');
    this.stack = this.stack.filter(x => x !== id);
    this.hideTip();
    if (G && (id === 'ov-tree' || id === 'ov-lab')) { this.refreshHUD(); this.refreshBadges(); }
    if (id === 'ov-meta' && Game.state === 'menu') this.showMenu();
  },
  closeAll() { for (const id of this.stack) $(id).classList.remove('show'); this.stack = []; },
  top() { return this.stack[this.stack.length - 1]; },
  blocking() { return this.stack.length > 0; },
  confirm(title, text, yes) {
    $('cf-t').textContent = title; $('cf-x').innerHTML = text;
    $('cf-yes').onclick = () => { this.close('ov-confirm'); yes(); };
    this.open('ov-confirm');
  },
  btns(box, list) {
    box.innerHTML = '';
    for (const [label, cls, fn] of list) {
      const b = document.createElement('button'); b.className = 'btn ' + cls; b.innerHTML = label; b.onclick = fn; box.appendChild(b);
    }
  },
  showMenu() {
    this.closeAll();
    const s = Store.data.save, list = [], di = dailyInfo(), dBest = (Store.data.daily || {})[di.date];
    if (s && DIFFS[s.diffKey]) list.push([`CONTINUER<small>${s.daily ? 'DÉFI DU JOUR' : DIFFS[s.diffKey].name} · VAGUE ${s.waveNum + 1}</small>`, 'prim', () => {
      if (!Game.load()) { this.toast('Sauvegarde illisible', 'Impossible de restaurer la partie.', '#ff2a6d'); this.showMenu(); }
    }]);
    list.push(['NOUVELLE PARTIE', s ? '' : 'prim', () => this.openNew()]);
    list.push([`DÉFI DU JOUR<small>${di.mutKeys.map(k => MUTATORS[k].n).join(' + ')}${dBest ? ' · record : vague ' + dBest : ''}</small>`, 'sec', () => {
      const go = () => { this.closeAll(); Game.newGame('standard', { daily: true }); };
      if (Store.data.save) this.confirm('ÉCRASER LA SAUVEGARDE ?', 'Une partie sauvegardée existe déjà. Elle sera remplacée par le Défi du jour.', go); else go();
    }]);
    list.push([`MULTIJOUEUR<small>versus ou coopération, de 2 à 4</small>`, 'nano', () => this.openMP()]);
    list.push([`HÉRITAGE<small>${Store.data.meta.frags} fragments</small>`, 'gold', () => this.openMeta()]);
    list.push([`PALMARÈS<small>${Object.keys(Store.data.ach).filter(k => ACH[k]).length} / ${Object.keys(ACH).length} succès · historique</small>`, '', () => this.openAch()]);
    const cx = Codex.progress();
    list.push([`CODEX<small>${cx[0]} / ${cx[1]} fiches</small>`, '', () => this.openCodex()]);
    list.push(['OPTIONS', '', () => this.openOptions()]);
    list.push(['MANUEL', '', () => this.openHelp()]);
    if (App.canOffer()) list.push(['INSTALLER LE JEU<small>sur cet appareil, jouable hors ligne</small>', 'sec', () => App.install()]);
    this.btns($('menu-btns'), list);
    this.cmdBadge($('menu-cmd'));
    const rec = Object.keys(DIFFS).filter(k => Store.data.records[k]).map(k => `${DIFFS[k].name} <b>${Store.data.records[k]}</b>`).join(' · ');
    $('menu-foot').innerHTML = `${rec ? 'Records — ' + rec + '<br>' : ''}Un seul fichier · 100% hors-ligne · v${VERSION}` +
      (Store.s.demo ? '<br><span style="opacity:.6">En arrière-plan : une IA défend une carte en direct</span>' : '');
    this.open('ov-menu');
    if (!G && Store.s.demo) Demo.start();
  },
  openNew() {
    this.renderDocs();
    const gm = GMODES[Store.s.gm] ? Store.s.gm : 'classic';
    $('gm-row').innerHTML = Object.entries(GMODES).map(([k, m]) => `<button data-k="${k}" class="${k === gm ? 'on' : ''}" style="--tc:${m.c}">${m.n.toUpperCase()}</button>`).join('');
    $('gm-row').querySelectorAll('button').forEach(b => b.onclick = () => { Store.s.gm = b.dataset.k; Store.save(); Sfx.play('ui'); this.openNew(); });
    $('gm-desc').innerHTML = `<b style="color:${GMODES[gm].c}">${GMODES[gm].n}</b> — ${GMODES[gm].d}`;
    $('cus-box').hidden = gm !== 'custom';
    if (gm === 'custom') Custom.render();
    const g = $('diff-grid'); g.innerHTML = '';
    for (const k in DIFFS) {
      const d = DIFFS[k], rec = Store.data.records[gm === 'classic' ? k : k + ':' + gm] || 0, el = document.createElement('div');
      el.className = 'dcard'; el.style.setProperty('--dc', d.color);
      el.innerHTML = `<h3>${d.name}</h3><p>${d.desc}</p><div class="st">PV ennemis <b>x${d.hp}</b><br>Intégrité <b>${d.lives}</b> · Crédits <b>${d.money}</b><br>Fragments <b>x${d.frag}</b><br>Record : <b>${rec ? 'vague ' + rec : '—'}</b></div>`;
      el.onclick = () => {
        const go = () => {
          const sd = Hist.parse($('seed-in').value);
          this.closeAll();
          const cus = gm === 'custom' ? Custom.get() : null;
          if (sd) Game.newGame(sd.diff || k, { gm: sd.free ? gm : sd.gm, cus, seed: sd.seed, portrait: sd.portrait == null ? undefined : sd.portrait }); else Game.newGame(k, { gm, cus });
        };
        if (Store.data.save) this.confirm('ÉCRASER LA SAUVEGARDE ?', 'Une partie sauvegardée existe déjà. Elle sera remplacée par la nouvelle.', go);
        else go();
      };
      g.appendChild(el);
    }
    const si = $('seed-in'), so = $('seed-ok');
    si.oninput = () => {
      const sd = Hist.parse(si.value);
      so.innerHTML = !sd ? '' : sd.free ? `<b style="color:var(--ok)">Graine « ${sd.free.replace(/</g, '&lt;')} »</b> · même texte = même carte et mêmes vagues — cliquez une menace pour lancer.`
        : `<b style="color:var(--ok)">Code de défi</b> · ${sd.diff ? DIFFS[sd.diff].name : 'menace au choix'} · ${GMODES[sd.gm].n} — cliquez une menace pour lancer.`;
    };
    si.oninput();
    this.open('ov-new');
  },
  openPause() {
    if (!G || G.over) return;
    this.setPlacing(null, true); this.setTargeting(null);
    if (G.net) {
      $('pause-info').innerHTML = `${G.net === 'versus' ? 'VERSUS' : 'COOPÉRATION'} avec <b>${MP.others().map(p => MP.esc(MP.name(p))).join(', ')}</b> · Vague <b>${G.waveNum}</b><br><span style="color:var(--gold)">La partie continue pendant que ce menu est ouvert${Net.coop ? ' (sauf si vous la mettez en pause pour tous)' : ''}.</span>`;
      this.btns($('pause-btns'), [
        ['REPRENDRE', 'prim', () => this.close('ov-pause')],
        ...(Net.coop && !G.over ? [[G.paused ? 'RELANCER LA PARTIE<small>pour tous les joueurs</small>' : 'METTRE EN PAUSE<small>pour tous les joueurs, même en pleine vague</small>', 'gold', () => { Act.do('mpause', !G.paused); this.close('ov-pause'); }]] : []),
        ['CLASSEMENT', '', () => { this.close('ov-pause'); Score.toggle(true); }],
        ['OPTIONS', '', () => this.openOptions()],
        ['ANALYSE DE COMBAT', '', () => this.openStats()],
        ['CASINO', '', () => this.openCasino()],
        ['MANUEL', '', () => this.openHelp()],
        ...(Net.connected && Net.role === 'host' ? [['RETOUR AU SALON', '', () => this.confirm('RETOUR AU SALON ?', "La partie en cours s'arrête pour tous les joueurs.", () => MP.toLobby())]] : []),
        ['QUITTER LA PARTIE', 'danger', () => this.confirm('QUITTER ?', G.net === 'versus' ? (MP.slots.length > 2 ? 'Vous serez éliminé.' : 'Votre adversaire gagnera par forfait.')
          : Net.role === 'host' ? 'Vous êtes l\'hôte : les autres joueurs continueront chacun de leur côté.' : 'Les autres joueurs continueront sans vous.', () => MP.leave())]
      ]);
      this.open('ov-pause'); Sfx.play('ui'); return;
    }
    $('pause-info').innerHTML = `${G.daily ? 'DÉFI DU JOUR ' + G.daily : G.diff.name} · Vague <b>${G.waveNum}</b> · Code de carte <b>${Hist.code()}</b><br>${fmt(G.stats.kills)} éliminations · ${G.towers.length} tourelles` +
      `<br>Doctrine <b>${G.docs && G.docs.length ? G.docs.map(k => DOCTRINES[k].n).join(' + ') : DOCTRINES[G.doctrine].n}</b> · Commandant niv. <b>${Store.data.cmd.lvl}</b>` +
      (G.daily ? '<br>' + G.mutKeys.map(k => `<b style="color:var(--gold)">${MUTATORS[k].n}</b> : ${MUTATORS[k].d}`).join('<br>') : '') +
      (G.cus ? '<br><b style="color:#b48cff">Partie perso</b> : ' + (CUSTOM.filter(d => G.cus[d.k] !== d.d).map(d => `${d.n} ${Custom.txt(d, G.cus[d.k])}`).join(' · ') || 'réglages par défaut') : '');
    this.btns($('pause-btns'), [
      ['REPRENDRE', 'prim', () => this.close('ov-pause')],
      ['OPTIONS', '', () => this.openOptions()],
      ['ANALYSE DE COMBAT', '', () => this.openStats()],
      ['CASINO', '', () => this.openCasino()],
      ['MANUEL', '', () => this.openHelp()],
      ['CODEX', '', () => this.openCodex()],
      ['RECOMMENCER', '', () => this.confirm('RECOMMENCER ?', G.daily ? 'Le Défi du jour reprend depuis le début.' : 'Nouvelle carte, même difficulté. La partie en cours sera perdue.', () => {
        const dk = G.diffKey, daily = !!G.daily, gm = G.gm, cus = G.cus; this.closeAll(); Game.newGame(dk, { daily, gm, cus });
      })],
      [G.phase === 'prep' ? 'SAUVEGARDER & QUITTER' : 'QUITTER<small>reprise au début de la vague en cours</small>', '', () => Game.quit()],
      ['ABANDONNER', 'danger', () => this.confirm('ABANDONNER ?', 'La partie sera perdue. Les fragments gagnés restent acquis.', () => { this.closeAll(); Act.do('giveup'); })]
    ]);
    this.open('ov-pause'); Sfx.play('ui');
  },
  // transfert de progression : tout Store.data, encodé en texte copiable
  xferCode() { const d = Object.assign({}, Store.data); delete d.reps; return 'NW1:' + B64.enc(JSON.stringify(d)); },
  xferRead(code) {
    const m = /^NW1:([A-Za-z0-9+/=\s]+)$/.exec(String(code || '').trim()); if (!m) return null;
    try { const d = JSON.parse(B64.dec(m[1])); return d && typeof d === 'object' && d.meta && d.settings ? d : null; } catch (e) { return null; }
  },
  openXfer(exp, rec) {
    const ta = $('xf-txt'), go = $('xf-go');
    if (exp === 'rpexp' || exp === 'rpimp') {
      const out = exp === 'rpexp';
      $('xf-t').textContent = out ? 'CODE DU REPLAY' : 'IMPORTER UN REPLAY';
      $('xf-sub').innerHTML = out ? 'Envoyez ce code à un ami : dans <b>Palmarès → Historique → Importer un replay</b>, il verra votre partie (même version du jeu conseillée).' : 'Collez ici le code d\'un replay.';
      ta.value = out ? Replay.code(rec) : ''; ta.readOnly = out; go.textContent = out ? 'COPIER LE CODE' : 'REGARDER';
      go.onclick = () => {
        if (out) { this.copy(ta.value, ta); return; }
        const r = Replay.read(ta.value);
        if (!r) { Sfx.play('error'); this.toast('Code invalide', 'Ce texte n\'est pas un code de replay Neon Warfare complet.', '#ff2a6d', 4); return; }
        Replay.play(r);
      };
      this.open('ov-xfer');
      if (out) setTimeout(() => { ta.focus(); ta.select(); }, 50);
      return;
    }
    exp = exp === true || exp === 'exp';
    $('xf-t').textContent = exp ? 'EXPORTER LA PROGRESSION' : 'IMPORTER UNE PROGRESSION';
    $('xf-sub').innerHTML = exp ? 'Copiez ce code, puis collez-le dans <b>Options → Transférer la progression → Importer</b> sur l\'autre appareil ou navigateur.'
      : 'Collez ici un code exporté depuis un autre appareil. <b style="color:var(--dang)">Votre progression actuelle sur cet appareil sera remplacée.</b>';
    ta.value = exp ? this.xferCode() : ''; ta.readOnly = exp;
    go.textContent = exp ? 'COPIER LE CODE' : 'IMPORTER';
    go.onclick = () => {
      if (exp) { this.copy(ta.value, ta); return; }
      const d = this.xferRead(ta.value);
      if (!d) { Sfx.play('error'); this.toast('Code invalide', 'Ce texte n\'est pas un code de progression Neon Warfare complet.', '#ff2a6d', 4); return; }
      this.confirm('REMPLACER LA PROGRESSION ?', `Héritage (${(d.meta.frags || 0)} fragments), succès, records et partie en cours de cet appareil seront remplacés par ceux du code.`, () => {
        try { localStorage.setItem(Store.KEY, JSON.stringify(d)); } catch (e) { this.toast('Impossible', 'Le stockage du navigateur est indisponible.', '#ff2a6d', 4); return; }
        location.reload();
      });
    };
    this.open('ov-xfer');
    if (exp) setTimeout(() => { ta.focus(); ta.select(); }, 50);
  },
  openOptions() {
    const s = Store.s, O = $('opts'), q = { auto: 'AUTO', high: 'HAUTE', low: 'BASSE' };
    const tg = (v) => v ? 'ON' : 'OFF';
    O.innerHTML = `
      <div class="opt"><span>Effets sonores</span><input type="range" min="0" max="100" id="o-sfx" value="${Math.round(s.sfx * 100)}"></div>
      <div class="opt"><span>Musique<small>Générée en direct, s'intensifie en combat</small></span><input type="range" min="0" max="100" id="o-mus" value="${Math.round(s.music * 100)}"></div>
      <div class="opt"><span>Style musical<small>Arena 80s : synth-rock énergique · Ambiance : nappes douces · Synthwave : rythmée</small></span><button class="btn" id="o-mst">${MUSIC_STYLES[s.musicStyle] || 'Arena 80s'}</button></div>
      <div class="opt"><span>Qualité graphique<small>AUTO réduit les effets si le jeu ralentit</small></span><button class="btn" id="o-q">${q[s.quality]}${s.quality === 'auto' && Perf.degraded ? ' (BASSE)' : ''}</button></div>
      <div class="opt"><span>Thème visuel</span><button class="btn" id="o-th">${THEMES[s.theme] ? THEMES[s.theme].name : '?'}</button></div>
      <div class="opt"><span>Effet CRT<small>Lignes de balayage rétro</small></span><button class="btn" id="o-crt">${tg(s.crt)}</button></div>
      <div class="opt"><span>Secousses & flashs</span><button class="btn" id="o-sh">${tg(s.shake)}</button></div>
      <div class="opt"><span>Chiffres de dégâts</span><button class="btn" id="o-dn">${tg(s.dmgNums)}</button></div>
      <div class="opt"><span>Événements aléatoires<small>Astéroïdes, ravitaillements, tempêtes… (prochaines parties)</small></span><button class="btn" id="o-ev">${tg(s.events !== false)}</button></div>
      <div class="opt"><span>Compteur FPS<small>Touche F3</small></span><button class="btn" id="o-fps">${tg(s.fps)}</button></div>
      <div class="opt"><span>Astuces<small>Conseils affichés une seule fois, quand un nouvel élément du jeu apparaît</small></span><span class="row" style="gap:6px"><button class="btn" id="o-tips">${tg(s.tips !== false)}</button><button class="btn" id="o-tipr" title="Revoir toutes les astuces">↺</button></span></div>
      <div class="opt"><span>Transférer la progression<small>Héritage, succès, records et partie en cours, vers un autre appareil ou navigateur</small></span><span class="row" style="gap:6px"><button class="btn" id="o-exp">EXPORTER</button><button class="btn" id="o-imp">IMPORTER</button></span></div>
      <div class="opt"><span>Raccourcis clavier<small>Changer les touches, en donner une à chaque canon</small></span><button class="btn" id="o-keys">MODIFIER</button></div>
      <div class="opt"><span>Démo IA du menu<small>Une partie jouée par l'IA en fond du menu principal</small></span><button class="btn" id="o-demo">${tg(s.demo)}</button></div>
      <div class="opt" style="border:0"><span>Réinitialiser la progression<small>Héritage, succès, records et sauvegarde</small></span><button class="btn danger" id="o-reset">EFFACER</button></div>`;
    $('o-sfx').oninput = e => { s.sfx = e.target.value / 100; Sfx.applyVolumes(); };
    $('o-sfx').onchange = () => { Store.save(); Sfx.play('coin'); };
    $('o-mus').oninput = e => { s.music = e.target.value / 100; Sfx.applyVolumes(); };
    $('o-mus').onchange = () => Store.save();
    $('o-mst').onclick = () => { const ks = Object.keys(MUSIC_STYLES); s.musicStyle = ks[(ks.indexOf(s.musicStyle) + 1) % ks.length]; Music.step = 0; Store.save(); this.openOptions(); };
    $('o-q').onclick = () => { s.quality = s.quality === 'auto' ? 'high' : s.quality === 'high' ? 'low' : 'auto'; Perf.degraded = false; Store.save(); Render.applyQuality(); this.openOptions(); };
    $('o-th').onclick = () => { const ks = Object.keys(THEMES); s.theme = ks[(ks.indexOf(s.theme) + 1) % ks.length]; Store.save(); Render.setTheme(s.theme); this.openOptions(); };
    $('o-crt').onclick = () => { s.crt = !s.crt; Store.save(); Render.setTheme(s.theme); this.openOptions(); };
    $('o-sh').onclick = () => { s.shake = !s.shake; Store.save(); this.openOptions(); };
    $('o-dn').onclick = () => { s.dmgNums = !s.dmgNums; this.dmgNums = s.dmgNums; Store.save(); this.openOptions(); };
    $('o-fps').onclick = () => { this.toggleFps(); this.openOptions(); };
    $('o-keys').onclick = () => Keys.open();
    $('o-exp').onclick = () => this.openXfer(true);
    $('o-tips').onclick = () => { s.tips = s.tips === false; Store.save(); this.openOptions(); };
    $('o-tipr').onclick = () => { Store.data.tips = {}; Store.save(); this.toast('Astuces', 'Toutes les astuces seront de nouveau affichées.', '#00f3ff', 2.5); };
    $('o-imp').onclick = () => this.openXfer(false);
    $('keys-reset').onclick = () => { Keys.wait = null; Keys.reset(); Sfx.play('ui'); Keys.render(); };
    $('o-ev').onclick = () => { s.events = s.events === false; Store.save(); this.openOptions(); };
    $('o-demo').onclick = () => {
      s.demo = !s.demo; Store.save();
      if (Game.state === 'menu') { if (s.demo) Demo.start(); else { Demo.stop(); Render.resize(); } }
      this.openOptions();
    };
    $('o-reset').onclick = () => this.confirm('TOUT EFFACER ?', 'Héritage, succès, records et sauvegarde seront définitivement supprimés.', () => {
      const keep = Store.s; Store.data = Store.defaults(); Store.data.settings = keep; Store.data.tuto = true; Store.save();
      this.toast('Progression effacée', 'Nouveau départ, Commandant.', '#ff2a6d');
      if (Game.state === 'menu') this.showMenu();
    });
    this.open('ov-opts');
  },
  toggleFps() { Store.s.fps = !Store.s.fps; Store.save(); $('fps').style.display = Store.s.fps ? 'block' : 'none'; },

  /* ---------- arbre de compétences ---------- */
  openTree() {
    if (!G || G.over) return;
    this.setPlacing(null, true); this.setTargeting(null);
    this.renderTree(); this.open('ov-tree');
    requestAnimationFrame(() => this.drawLinks());
  },
  renderTree() {
    $('tree-sub').innerHTML = `Disponibles : ${Res.tag('n', G.nanites)} · ${Res.tag('p', G.res.p)} · ${Res.tag('a', G.res.a)}<br>` +
      `<b>Palier II</b> en nanites (fin de vague, boss, butin). <b>Palier III</b> en plasma (boss, parfois élites, raffinerie). <b>Palier IV</b> en abyssite (méga-boss, puis boss après la vague ${Towers.omFrom()}). Les nœuds du 4<sup>e</sup> rang débloquent de nouvelles <b>capacités</b>.`;
    const root = $('tree'); root.innerHTML = '';
    BRANCHES.forEach((b, bi) => {
      const col = document.createElement('div'); col.className = 'branch';
      col.style.setProperty('--bc', b.color); col.style.setProperty('--brgb', hexRgb(b.color).join(','));
      col.innerHTML = `<h3>${b.name}</h3><div class="bd">${b.desc}</div>`;
      const rows = document.createElement('div'); rows.className = 'brows';
      rows.innerHTML = '<svg class="links"></svg>';
      for (let r = 0; r < 7; r++) {
        if (r === 4 || r === 6) {
          const h = document.createElement('div'); h.className = 'tier ' + (r === 4 ? 'p' : 'a');
          h.textContent = r === 4 ? `PALIER III · ${RES.p.i} PLASMA` : `PALIER IV · ${RES.a.i} ABYSSITE`;
          rows.appendChild(h);
        }
        const row = document.createElement('div'); row.className = 'brow';
        for (let c = 0; c < 3; c++) {
          const cell = document.createElement('div');
          const id = Object.keys(SKILLS).find(k => SKILLS[k].br === bi && SKILLS[k].row === r && SKILLS[k].col === c);
          if (id) cell.appendChild(this.skillNode(id));
          row.appendChild(cell);
        }
        rows.appendChild(row);
      }
      col.appendChild(rows); root.appendChild(col);
    });
    this.renderArs();
  },
  renderArs() {
    const r = Skills.rank('ars'), on = Towers.omega(), c = Skills.arsCost(), rc = Skills.refineCost();
    $('ars').innerHTML =
      `<div class="ars ref"><div class="ic">${RES.p.i}</div><div><b>RAFFINERIE</b><span>Transforme vos nanites en trop en plasma. Le prix augmente à chaque conversion (${G.res.ref || 0} déjà faite${(G.res.ref || 0) > 1 ? 's' : ''}).</span></div>` +
      `<button class="btn" id="ref-b" ${G.nanites >= rc ? '' : 'disabled'}><span class="nanos">${rc} ◈</span> → 1 ${RES.p.i}</button></div>` +
      `<div class="ars${on ? '' : ' off'}"><div class="ic">${TXT('⚔')}</div><div><b>RECHERCHE OMÉGA · RANG ${r}</b><span>Recherche sans limite : <b style="letter-spacing:0">+${Math.round(OMEGA.ars * 100)} %</b> de dégâts pour toutes les tourelles à chaque rang${r ? ` (actuellement +${Math.round(OMEGA.ars * 100 * r)} %)` : ''}. ` +
      (on ? 'Le prix augmente à chaque rang.' : `Débloquée après la vague ${Towers.omFrom()}${Towers.omFrom() === OMEGA.from ? ' (le Léviathan)' : ''}, avec les niveaux Oméga des tourelles.`) + `</span></div>` +
      `<button class="btn" id="ars-b" ${on && G.res.p >= c ? '' : 'disabled'}>+1 RANG · ${Res.tag('p', c)}</button></div>`;
    $('ars-b').onclick = () => { if (Act.do('skill', 'ars')) { this.renderTree(); this.drawLinks(); } };
    $('ref-b').onclick = () => { if (Act.do('skill', 'refine')) { this.renderTree(); this.drawLinks(); } };
  },
  skillNode(id) {
    const s = SKILLS[id], r = Skills.rank(id), ok = Skills.reqOk(id), can = Skills.canBuy(id);
    const el = document.createElement('div');
    let cls = 'snode' + (s.cap ? ' cap' : '') + (s.top ? ' top' : '');
    if (s.cur) { el.style.setProperty('--bc', RES[s.cur].c); el.style.setProperty('--brgb', hexRgb(RES[s.cur].c).join(',')); }
    if (r >= s.max) cls += ' max';
    else if (r > 0) cls += ' part' + (can ? ' can' : '');
    else if (can) cls += ' avail';
    else if (ok) cls += ' poor';
    el.className = cls; el.dataset.id = id;
    el.innerHTML = `<div class="ic"><span>${TXT(s.i)}</span><span class="rk">${r}/${s.max}</span></div><div class="nm">${s.n}</div>`;
    el.onclick = () => {
      if (Act.do('skill', id)) {
        this.renderTree(); this.drawLinks();
        const n = $('tree').querySelector(`.snode[data-id="${id}"]`); if (n) this.skillTip(id, n);
      } else Sfx.play('error');
    };
    el.onpointerenter = () => this.skillTip(id, el);
    el.onpointerleave = () => this.hideTip();
    return el;
  },
  skillTip(id, el) {
    const s = SKILLS[id], r = Skills.rank(id), b = BRANCHES[s.br];
    let h = `<h4>${s.n} <span style="color:var(--dim);font-size:10px">${r}/${s.max}</span></h4>`;
    if (r > 0) h += `<div class="d">Actuel : ${s.d(r)}</div>`;
    if (r < s.max) h += `<div class="d" style="color:#fff">${r > 0 ? 'Rang suivant' : 'Effet'} : ${s.d(r + 1)}</div><div class="d" style="margin-top:4px">Coût : ${Res.tag(Skills.cur(id), s.cost[r])}</div>`;
    else h += `<div class="d" style="color:var(--gold)">Compétence maîtrisée</div>`;
    if (!Skills.reqOk(id)) {
      const req = (s.req || s.reqAny).map(([k, n]) => `${SKILLS[k].n} (${n})`).join(s.reqAny ? ' ou ' : ' et ');
      h += `<div class="d" style="color:var(--dang);margin-top:4px">Requiert : ${req}</div>`;
    }
    this.showTipAt(h, el.getBoundingClientRect(), s.cur ? RES[s.cur].c : b.color);
  },
  drawLinks() {
    document.querySelectorAll('#tree .brows').forEach(rows => {
      const svg = rows.querySelector('svg'), base = rows.getBoundingClientRect();
      let html = '';
      rows.querySelectorAll('.snode').forEach(n => {
        const s = SKILLS[n.dataset.id], reqs = (s.req || []).concat(s.reqAny || []);
        const nb = n.querySelector('.ic').getBoundingClientRect();
        for (const [k, need] of reqs) {
          const p = rows.querySelector(`.snode[data-id="${k}"] .ic`); if (!p) continue;
          const pb = p.getBoundingClientRect();
          html += `<line x1="${pb.left + pb.width / 2 - base.left}" y1="${pb.top + pb.height / 2 - base.top}" x2="${nb.left + nb.width / 2 - base.left}" y2="${nb.top + nb.height / 2 - base.top}" class="${Skills.rank(k) >= need ? 'on' : ''}"/>`;
        }
      });
      svg.innerHTML = html;
    });
  },

  /* ---------- labo de fusion ---------- */
  openLab() {
    if (!G || G.over) return;
    this.setPlacing(null, true); this.setTargeting(null);
    this.renderLab(); this.open('ov-lab');
  },
  renderLab() {
    $('lab-sub').innerHTML = `Disponibles : ${Res.tag('n', G.nanites)} · ${Res.tag('p', G.res.p)} · ${Res.tag('a', G.res.a)}<br>Plans <b>T2</b> en nanites, <b>T3</b> en plasma, <b>T4</b> en abyssite ; chaque pose d'une T3 ou T4 coûte aussi son élément (selon la difficulté). Synthétisez un <b>plan</b> pour rendre une tourelle fusionnée constructible. Ensuite, <b>placez ses deux composants côte à côte</b> et sélectionnez-en un pour les <b>fusionner sur le terrain</b> : 80% de leur valeur est récupérée et leur niveau moyen conservé.`;
    const Lb = $('lab'); Lb.innerHTML = '';
    for (const tier of [2, 3, 4]) {
      const h = document.createElement('div'); h.className = 'lab-tier'; h.textContent = TIER_NAMES[tier]; Lb.appendChild(h);
      const grid = document.createElement('div'); grid.className = 'rgrid';
      for (const r of RECIPES.filter(x => TOWERS[x.r].tier === tier)) {
        const d = TOWERS[r.r], own = G.unlocked.has(r.r), can = Fusion.canResearch(r), rc = Fusion.cost(r), cu = Fusion.cur(r), afford = Res.get(cu) >= rc;
        const missing = [r.a, r.b].filter(k => !Fusion.avail(k)).map(k => TOWERS[k].name);
        const el = document.createElement('div');
        el.className = 'rcard' + (own ? ' own' : '') + (!own && !can ? ' lock' : '');
        el.style.setProperty('--tc', d.color);
        el.innerHTML = `<div class="eq"><canvas></canvas>+<canvas></canvas>→<canvas class="res"></canvas><div style="margin-left:auto;text-align:right">${own ? '<span class="tag g">PLAN ACQUIS</span>' : Res.tag(cu, rc)}</div></div>
          <h4>${d.name}<small>${TOWERS[r.a].name} + ${TOWERS[r.b].name} · ${Towers.costOf(r.r)}¢${Towers.elemTxt(r.r)} la prochaine pose</small></h4><p>${d.desc}</p>
          ${d.kind === 'support' ? '' : `<div class="ms"><span>DÉG <b>${d.dmg}${d.kind === 'beam' ? '/s' : ''}</b></span><span>PORTÉE <b>${(d.range / TILE).toFixed(1)}</b></span>${d.rate > 1 ? `<span>CAD <b>${(60 / d.rate).toFixed(1)}/s</b></span>` : ''}</div>`}
          <div class="tags">${this.tagsHtml(d)}</div>
          ${own ? '' : missing.length ? `<div class="note" style="color:var(--dang)">Plans requis : ${missing.join(', ')}</div>` : `<button class="btn nano" ${afford ? '' : 'disabled'} style="${cu !== 'n' ? `border-color:${RES[cu].c};color:${RES[cu].c}` : ''}">SYNTHÉTISER LE PLAN · ${rc} ${RES[cu].i}</button>`}`;
        const cvs = el.querySelectorAll('canvas');
        Spr.icon(cvs[0], r.a, 36); Spr.icon(cvs[1], r.b, 36); Spr.icon(cvs[2], r.r, 48);
        const btn = el.querySelector('button');
        if (btn) btn.onclick = () => { if (Act.do('research', r.r)) this.renderLab(); };
        grid.appendChild(el);
      }
      Lb.appendChild(grid);
    }
  },

  /* ---------- fin de partie, héritage, succès, manuel ---------- */
  gameOver(frags, best, prev = 0) {
    const s = G.stats, mins = Math.max(1, Math.round(G.tick / 3600)), dk = G.diffKey, daily = !!G.daily;
    let mvp = null;
    for (const t of G.towers) if (t.dealt > 0 && (!mvp || t.dealt > mvp.dealt)) mvp = t;
    // l'écart au record : le moteur du « encore une »
    const gap = prev - G.waveNum + 1;
    const recLine = best ? `<div class="goline rec">★ NOUVEAU RECORD · VAGUE ${G.waveNum} ★</div>`
      : `<div class="goline">Record : vague ${prev} — plus que <b style="color:var(--gold)">${gap} vague${gap > 1 ? 's' : ''}</b> pour le battre${gap <= 3 ? ' !' : '.'}</div>`;
    const c0 = G.cmdStart || Store.data.cmd, c1 = Store.data.cmd, ups = c1.lvl - c0.lvl, nd = Cmd.nextDoctrine(c1.lvl);
    let toGo = 0;
    if (nd) { toGo = -c1.xp; for (let l = c1.lvl; l < nd.lvl; l++) toGo += Cmd.need(l); }
    const startW = ups > 0 ? 0 : c0.xp / Cmd.need(c0.lvl) * 100, endW = c1.xp / Cmd.need(c1.lvl) * 100;
    $('over-body').innerHTML = `<h2 style="color:var(--dang)">ÉCHEC SYSTÈME</h2>
      <div class="sub" style="margin-bottom:6px">${daily ? 'Défi du jour ' + G.daily : G.diff.name}${G.doctrine !== 'standard' ? ' · doctrine ' + DOCTRINES[G.doctrine].n : ''} · le noyau a cédé à la vague <b>${G.waveNum}</b></div>
      ${recLine}
      <div class="gocode"><span>CODE DE CARTE</span><input id="go-code" readonly value="${Hist.code()}" aria-label="Code de carte"><button class="btn" id="go-cc">COPIER</button>${daily ? '' : '<button class="btn sec" id="go-replay">REJOUER CETTE CARTE</button>'}</div>
      <div class="cmdb" style="margin:6px auto 4px"><div class="cl">NIV <b>${c1.lvl}</b><span>${Cmd.rank(c1.lvl).toUpperCase()}</span><em style="color:var(--gold)">+${fmt(G.xpRun)} XP</em></div>
        <div class="xpbar"><s id="go-xp" style="width:${startW.toFixed(1)}%"></s></div>
        ${ups > 0 ? `<div class="nx" style="color:var(--gold);font-weight:700">▲ ${ups} niveau${ups > 1 ? 'x' : ''} gagné${ups > 1 ? 's' : ''} !</div>` : ''}
        ${nd ? `<div class="nx">Prochaine doctrine : <b>${nd.n}</b> au niveau ${nd.lvl} — encore ${fmt(toGo)} XP</div>` : ''}</div>
      <div class="gostats"><div>Éliminations <b>${fmt(s.kills)}</b></div><div>Missions <b>${s.missions}</b></div>
      <div>Crédits gagnés <b>${fmt(s.gold)}</b></div><div>Combo max <b>${s.maxCombo}</b></div>
      <div>Boss vaincus <b>${s.bosses}</b></div><div>Fusions terrain <b>${s.fusions}</b></div>
      <div>Protocoles <b>${Object.values(G.cards).reduce((a, b) => a + b, 0)}</b></div><div>Temps de jeu <b>${mins} min</b></div></div>
      ${mvp ? `<div class="mvp" style="--tc:${mvp.d.color}"><canvas id="go-mvp"></canvas><div style="text-align:left"><div class="lbl-s">TOURELLE MVP</div><b style="color:${mvp.d.color};letter-spacing:1px">${mvp.d.name.toUpperCase()} · NIV ${mvp.level}</b><div class="note">${fmt(mvp.dealt)} dégâts · ${fmt(mvp.kills)} éliminations</div></div></div>` : ''}
      <div class="sub" style="font-size:13px">Fragments d'Héritage : <span class="frags">+${frags} ✦</span> (total ${Store.data.meta.frags})</div>
      <div class="row gobtns" style="justify-content:center;gap:10px;margin-top:12px"><button class="btn" id="go-menu">MENU</button><button class="btn gold" id="go-meta">HÉRITAGE</button><button class="btn" id="go-stats">STATS</button><button class="btn sec" id="go-dare">DÉFIER UN AMI</button>${G.rec ? '<button class="btn" id="go-rep">🎬 REVOIR</button>' : ''}<button class="btn prim big" id="go-again">${daily ? 'RETENTER LE DÉFI' : 'ENCORE UNE !'} <span class="k">ENTRÉE</span></button></div>`;
    if (mvp) Spr.icon($('go-mvp'), mvp.key, 44);
    requestAnimationFrame(() => requestAnimationFrame(() => { const x = $('go-xp'); if (x) x.style.width = endW.toFixed(1) + '%'; }));
    if (best && G.waveNum > 1) Sfx.play('levelup');
    $('go-menu').onclick = () => Game.quit(false);
    if ($('go-rep')) { const r = G.rec; $('go-rep').onclick = () => { Game.quit(false); Replay.play(r); }; }
    $('go-meta').onclick = () => { Game.quit(false); this.openMeta(); };
    $('go-stats').onclick = () => this.openStats();
    $('go-dare').onclick = () => {
      const code = Hist.code();
      this.copy(`Neon Warfare ${VERSION} : j'ai tenu jusqu'à la vague ${G.waveNum} en ${G.diff.name}${G.gm !== 'classic' ? ' (' + GMODES[G.gm].n + ')' : ''} ! Même carte, mêmes vagues : Nouvelle partie → code de carte ${code}`);
      this.toast('Défi copié', `Envoyez-le à un ami : il saisira le code <b>${code}</b> dans Nouvelle partie.`, '#ff2bd6', 5);
    };
    $('go-again').onclick = () => { this.closeAll(); Game.newGame(dk, { daily }); };
    const ci = $('go-code'), same = { gm: G.gm, seed: G.seed, portrait: G.portrait };
    ci.onfocus = () => ci.select();
    $('go-cc').onclick = () => this.copy(ci.value, ci);
    if ($('go-replay')) $('go-replay').onclick = () => { this.closeAll(); Game.newGame(dk, same); };
    this.open('ov-over');
    $('go-again').focus();
  },
  openMeta() {
    const M = Store.data.meta;
    $('meta-sub').innerHTML = `Fragments : <span class="frags">${M.frags} ✦</span> — gagnés à chaque fin de partie (vagues atteintes, boss vaincus, difficulté) et grâce aux succès (+3). Ces améliorations sont <b>permanentes</b> et s'appliquent aux nouvelles parties.`;
    const Lst = $('meta-list'); Lst.innerHTML = '';
    for (const k in PERKS) {
      const p = PERKS[k], r = M.perks[k] || 0, mx = r >= p.max, cost = mx ? 0 : p.cost[r];
      const el = document.createElement('div'); el.className = 'perk' + (mx ? ' mx' : '');
      el.innerHTML = `<div class="pi">${TXT(p.i)}</div><div style="flex:1"><h4>${p.n} <span style="color:var(--dim);font-size:10px">${r}/${p.max}</span></h4><p>${p.d}</p>${mx ? '<span class="tag y">MAXIMUM</span>' : `<button class="btn gold" ${M.frags >= cost ? '' : 'disabled'}>AMÉLIORER · ${cost} ✦</button>`}</div>`;
      const b = el.querySelector('button');
      if (b) b.onclick = () => { if (M.frags < cost) return; M.frags -= cost; M.perks[k] = r + 1; Store.save(); Sfx.play('upgrade'); this.openMeta(); };
      Lst.appendChild(el);
    }
    this.open('ov-meta');
  },
  openCodex(tab = this.codexTab || 'e') {
    this.codexTab = tab;
    const [n, tot] = Codex.progress();
    $('codex-sub').innerHTML = `<b>${n} / ${tot}</b> fiches découvertes — rencontrez un ennemi ou construisez une tourelle pour débloquer sa fiche.`;
    $('codex-tabs').querySelectorAll('button').forEach(b => { b.classList.toggle('on', b.dataset.k === tab); b.onclick = () => { Sfx.play('ui'); this.openCodex(b.dataset.k); }; });
    const box = $('codex'), C = Store.data.codex[tab];
    box.innerHTML = '';
    for (const k of Codex.keys()[tab]) {
      const own = !!C[k], el = document.createElement('div');
      el.className = 'cx' + (own ? '' : ' lock');
      let body;
      if (tab === 'e') {
        const d = EDEF(k);
        el.style.setProperty('--cc', d.color);
        body = `<h4>${own ? d.name.toUpperCase() : '???'}${d.boss ? ' <small style="color:var(--dang)">BOSS</small>' : ''}</h4>` +
          `<div class="cm">${own ? `PV <b>${d.hp}</b>${d.armor ? ` · blindage <b>${d.armor}</b>` : ''}${d.shield ? ` · bouclier <b>${d.shield}</b>` : ''} · vitesse <b>${(d.spd * 60 / TILE).toFixed(1)}</b> cases/s<br>prime <b>${d.bounty}¢</b> · fuite <b>-${d.leak}</b>${d.air ? ' · <b>volant</b>' : ''}` : 'Pas encore rencontré'}</div>` +
          `<p>${own ? LORE[k] || '' : ''}</p>`;
      } else {
        const d = TOWERS[k], rec = RECIPES.find(r => r.r === k);
        el.style.setProperty('--cc', d.color);
        body = `<h4>${own ? d.name.toUpperCase() : '???'} <small style="color:var(--dim)">${TIER_NAMES[d.tier]}</small></h4>` +
          `<div class="cm">${own ? (d.kind === 'support' ? 'Soutien' : `dégâts <b>${d.dmg}${d.kind === 'beam' ? '/s' : ''}</b> · portée <b>${(d.range / TILE).toFixed(1)}</b>`) + ` · <b>${d.cost}¢</b>` : rec ? `Fusion de ${TOWERS[rec.a].name} + ${TOWERS[rec.b].name}` : 'Jamais construite'}</div>` +
          `<p>${own ? d.desc : ''}</p>`;
      }
      el.innerHTML = '<canvas></canvas>' + body;
      const cv = el.querySelector('canvas');
      if (tab === 'e') Spr.enemyIcon(cv, k, 54); else Spr.icon(cv, k, 54);
      box.appendChild(el);
    }
    this.open('ov-codex');
  },
  /* ---------- multijoueur : salon ---------- */
  mpState: 'home', mpManual: null,
  openMP() {
    if (!Net.supported()) {
      this.toast('Multijoueur indisponible ici', 'Cet aperçu bloque les connexions directes. Téléchargez neon-warfare.html (github.com/timgmds/neon-warfare) et ouvrez-le directement dans Chrome, Edge ou Firefox.', '#ff2a6d', 8);
      return;
    }
    if (!Net.on && this.mpState === 'lobby') this.mpState = 'home';
    this.renderMP(); this.open('ov-mp');
  },
  renderMP() {
    const B = $('mp-body'); if (!B) return;
    const st = Net.status ? `<div class="mp-st${Net.err ? ' err' : ''}">${Net.status}</div>` : '';
    const esc = s => String(s).replace(/[<>&"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' })[c]);
    if (this.mpState === 'lobby' && Net.on) {
      const host = Net.role === 'host', ids = Object.keys(MP.pl).map(Number).sort((a, b) => a - b), n = ids.length;
      const row = p => {
        const P = MP.pl[p], me = p === Net.me, ping = host ? P.ping : me ? Net.ping : 0, rl = host ? P.rl : me ? Net.relayed() : false;
        return `<div class="mp-pl" style="--pc:${MP_COL[p]}"><i></i><b>${esc(P.name)}</b><span>${p !== (MP.hostP || 0) ? 'INVITÉ' : 'HÔTE'}${me ? ' · VOUS' : ''}${P.doc && DOCTRINES[P.doc] ? ` · ${TXT(DOCTRINES[P.doc].i)} ${DOCTRINES[P.doc].n}` : ''}${p && ping ? ` · ${ping} ms` : ''}${p && rl ? ' · <em class="rl">RELAIS</em>' : ''}</span>${p && P.ready ? '<em>PRÊT</em>' : ''}${host && p ? `<button class="mp-kick" data-p="${p}" title="Exclure ${esc(P.name)}">✕</button>` : ''}</div>`;
      };
      const free = Array.from({ length: Math.max(0, NET_MAX - n) }, () => '<div class="mp-pl free"><i></i><b>Place libre</b><span>EN ATTENTE…</span></div>').join('');
      const ready = host ? MP.allReady() : MP.ready;
      const code = Net.code ? `<div class="mp-lcode"><span>CODE DU SALON</span><b>NEON-${esc(Net.code)}</b><button class="btn" id="mp-copy">COPIER</button>${host ? '<button class="btn" id="mp-inv">+ INVITATION MANUELLE</button>' : ''}${host && Net.chans.length ? `<small class="mp-sig${Net.sigUp() ? '' : ' err'}">${Net.sigUp()}/${Net.chans.length} serveurs de mise en relation en ligne</small>` : ''}</div>`
        : host ? '<div class="mp-lcode"><span>SALON LOCAL</span><button class="btn" id="mp-inv">+ INVITATION MANUELLE</button></div>' : '';
      B.innerHTML = `${code}<div class="lbl-s" style="margin:4px 0 6px">JOUEURS · ${n} / ${NET_MAX}</div><div class="mp-pls">${ids.map(row).join('')}${free}</div>
        <div class="lbl-s" style="margin:12px 0 6px">MODE ${host ? '' : '<span style="opacity:.6">(choisi par l\'hôte)</span>'}</div>
        <div class="mp-modes">
          <button class="mp-mode${MP.mode === 'versus' ? ' on' : ''}" data-m="versus" style="--mc:#ff2a6d"><b>VERSUS</b><span>Chacun sa carte, mêmes vagues, sans pitié : ennemis renforcés, préparation courte, puis escalade dès la vague 13. Envoyez des ennemis chez l'adversaire pour augmenter votre revenu. Le dernier debout gagne.</span></button>
          <button class="mp-mode${MP.mode === 'coop' ? ' on' : ''}" data-m="coop" style="--mc:#39ff88"><b>COOPÉRATION</b><span>Une carte partagée, intégrité commune, chacun ses crédits. Ennemis plus résistants : il faut s'organiser.</span></button>
        </div>
        <div class="lbl-s" style="margin:12px 0 6px">MENACE</div>
        <div class="seg" id="mp-diff">${Object.keys(DIFFS).map(k => `<button data-d="${k}" class="${MP.diff === k ? 'on' : ''}" style="--tc:${DIFFS[k].color}">${DIFFS[k].name.toUpperCase()}</button>`).join('')}</div>
        <div class="lbl-s" style="margin:12px 0 6px">VOTRE DOCTRINE <span style="opacity:.6">(en coopération, les doctrines de tous les joueurs s'additionnent ; une doctrine en double ne compte qu'une fois)</span></div>
        <div class="docs" id="mp-docs">${Object.keys(DOCTRINES).filter(k => DOCTRINES[k].lvl <= Store.data.cmd.lvl).map(k => `<button class="doc${MP.myDoc() === k ? ' on' : ''}" data-k="${k}" title="${esc(DOCTRINES[k].d)}"><i>${TXT(DOCTRINES[k].i)}</i>${DOCTRINES[k].n}</button>`).join('')}</div>
        <div class="mp-chat"><div class="mp-log" id="mp-log"></div><form id="mp-form"><input id="mp-msg" maxlength="140" placeholder="Message…" autocomplete="off"><button class="btn">ENVOYER</button></form></div>
        <div class="row" style="gap:10px;margin-top:12px">
          <button class="btn danger" id="mp-quit">QUITTER LE SALON</button>
          ${host ? `<button class="btn prim big" id="mp-go" style="flex:1" ${ready ? '' : 'disabled'}>${ready ? `LANCER LA PARTIE · ${n} JOUEURS` : n < 2 ? 'EN ATTENTE DE JOUEURS…' : 'EN ATTENTE QUE TOUS SOIENT PRÊTS…'}</button>`
            : `<button class="btn ${MP.ready ? 'gold' : 'prim'} big" id="mp-ready" style="flex:1">${MP.ready ? 'PRÊT ✓ (ANNULER)' : 'JE SUIS PRÊT'}</button>`}
        </div>`;
      B.querySelectorAll('.mp-mode').forEach(b => b.onclick = () => { if (!host) return; Sfx.play('ui'); MP.setMode(b.dataset.m); });
      B.querySelectorAll('#mp-diff button').forEach(b => b.onclick = () => { if (!host) return; Sfx.play('ui'); MP.setDiff(b.dataset.d); });
      B.querySelectorAll('#mp-docs button').forEach(b => b.onclick = () => { Store.data.doctrine = b.dataset.k; Store.save(); Sfx.play('ui'); MP.sendMe(); this.renderMP(); });
      $('mp-quit').onclick = () => MP.leave();
      if (host) $('mp-go').onclick = () => MP.launch(); else $('mp-ready').onclick = () => { Sfx.play('ui'); MP.toggleReady(); };
      if ($('mp-copy')) $('mp-copy').onclick = () => this.copy('NEON-' + Net.code);
      if ($('mp-inv')) $('mp-inv').onclick = () => this.mpInvite();
      B.querySelectorAll('.mp-kick').forEach(b => b.onclick = () => {
        const k = +b.dataset.p, nm = MP.pl[k] ? MP.pl[k].name : '';
        this.confirm('EXCLURE ?', `<b>${esc(nm)}</b> sera retiré du salon et ne pourra pas revenir sous ce nom.`, () => MP.kick(k));
      });
      $('mp-form').onsubmit = e => { e.preventDefault(); const i = $('mp-msg'); MP.say(i.value); i.value = ''; };
      this.renderChat();
      return;
    }
    if (this.mpState === 'manual') { this.renderManual(B, st); return; }
    if (this.mpState === 'host') {
      B.innerHTML = `<div class="mp-code"><span>OUVERTURE DU SALON</span><b>${Net.code ? 'NEON-' + esc(Net.code) : '…'}</b></div>${st}
        <div class="row" style="justify-content:center;margin-top:14px"><button class="btn" id="mp-back">ANNULER</button></div>`;
      $('mp-back').onclick = () => { Net.reset(); this.mpState = 'home'; this.renderMP(); };
      return;
    }
    if (this.mpState === 'join') {
      B.innerHTML = `${st}<div class="row" style="justify-content:center;margin-top:14px"><button class="btn" id="mp-back">ANNULER</button></div>`;
      $('mp-back').onclick = () => { Net.reset(); this.mpState = 'home'; this.renderMP(); };
      return;
    }
    B.innerHTML = `<div class="opt" style="border:0;padding-top:0"><span>Votre nom<small>Visible par l'autre joueur</small></span><input id="mp-name" class="mp-in" maxlength="24" value="${esc(MP.myName())}"></div>
      <div class="mp-two">
        <div class="mp-box"><h3>HÉBERGER</h3><p>Créez un salon (jusqu'à ${NET_MAX} joueurs) et donnez son code à vos amis. Code au hasard, ou choisissez le vôtre.</p><input id="mp-hcode" class="mp-in big" maxlength="17" placeholder="Code perso (facultatif)" autocomplete="off" value="${esc(Store.s.roomCode || '')}"><button class="btn prim big" id="mp-host">CRÉER UN SALON</button></div>
        <div class="mp-box"><h3>REJOINDRE</h3><p>Entrez le code reçu de l'hôte.</p><input id="mp-code" class="mp-in big" maxlength="17" placeholder="NEON-XXXX" autocomplete="off"><button class="btn prim big" id="mp-join">REJOINDRE</button></div>
      </div>${st}
      <div class="note" style="margin-top:12px">Le code passe par quatre services publics gratuits de mise en relation en parallèle (PeerJS et trois serveurs MQTT) : si votre réseau en bloque un, les autres prennent le relais. La partie se joue ensuite en direct entre les navigateurs ; si vos réseaux l'empêchent, ou si la liaison tombe en cours de partie, elle passe par un serveur relais, sans perte de message.
        Pas d'internet, ou ça ne passe pas ? <a href="#" id="mp-man">Connexion manuelle (réseau local)</a>. L'hôte peut exclure un joueur depuis le salon.</div>`;
    const nm = $('mp-name');
    nm.onchange = () => { Store.s.name = nm.value.trim().slice(0, 24) || MP.myName(); Store.save(); };
    $('mp-host').onclick = () => {
      nm.onchange();
      const want = Net.cleanCode($('mp-hcode').value); Store.s.roomCode = want; Store.save();
      if (Net.host(want)) this.mpState = 'host';
      this.renderMP();
    };
    $('mp-hcode').onkeydown = e => { if (e.key === 'Enter') $('mp-host').click(); };
    $('mp-join').onclick = () => { nm.onchange(); this.mpState = 'join'; Net.join($('mp-code').value); if (Net.err) this.mpState = 'home'; this.renderMP(); };
    $('mp-code').onkeydown = e => { if (e.key === 'Enter') $('mp-join').click(); };
    $('mp-man').onclick = e => { e.preventDefault(); nm.onchange(); this.mpState = 'manual'; this.mpManual = null; Net.reset(); this.renderMP(); };
  },
  renderManual(B, st) {
    const M = this.mpManual;
    if (!M) {
      B.innerHTML = `<div class="note" style="margin-bottom:12px">Sans aucun serveur : chacun copie un code et l'envoie à l'autre (message, mail, clé USB…). Fonctionne entre ordinateurs du même réseau, même sans internet. Une invitation par joueur : pour un 3e ou un 4e joueur, l'hôte crée une nouvelle invitation depuis le salon.</div>
        <div class="mp-two"><div class="mp-box"><h3>JE CRÉE</h3><p>Génère un code d'invitation.</p><button class="btn prim big" id="mm-h">CRÉER L'INVITATION</button></div>
        <div class="mp-box"><h3>J'AI REÇU UNE INVITATION</h3><p>Collez-la pour générer votre réponse.</p><textarea id="mm-in" class="mp-ta" placeholder="NW1.…"></textarea><button class="btn prim big" id="mm-j">GÉNÉRER LA RÉPONSE</button></div></div>${st}
        <div class="row" style="justify-content:center;margin-top:12px"><button class="btn" id="mp-back">RETOUR</button></div>`;
      $('mm-h').onclick = () => this.mpInvite();
      $('mm-j').onclick = async () => {
        const v = $('mm-in').value; this.mpManual = { step: 'jwait' }; Net.setStatus('Préparation de la réponse…');
        try { this.mpManual.code = await Net.manualJoin(v); Net.setStatus('Envoyez cette réponse à l\'hôte, puis patientez.'); } catch (e) { this.mpManual = null; Net.setStatus('Invitation illisible : copiez-la en entier.', true); }
        this.renderMP();
      };
    } else if (M.step === 'hwait' || M.step === 'jwait') {
      const host = M.step === 'hwait';
      B.innerHTML = `<div class="lbl-s">${host ? '1. ENVOYEZ CETTE INVITATION' : 'ENVOYEZ CETTE RÉPONSE À L\'HÔTE'}</div>
        <textarea class="mp-ta" readonly id="mm-out">${M.code || '…'}</textarea><button class="btn" id="mm-copy">COPIER</button>
        ${host ? `<div class="lbl-s" style="margin-top:12px">2. COLLEZ LA RÉPONSE DE VOTRE AMI</div><textarea id="mm-ans" class="mp-ta" placeholder="NW1.…"></textarea><button class="btn prim big" id="mm-fin" style="width:100%">SE CONNECTER</button>` : ''}
        ${st}<div class="row" style="justify-content:center;margin-top:12px"><button class="btn" id="mp-back">ANNULER</button></div>`;
      $('mm-copy').onclick = () => this.copy(M.code || '', $('mm-out'));
      if (host) $('mm-fin').onclick = async () => { try { await Net.manualFinish(M.L, $('mm-ans').value); Net.setStatus('Connexion…'); } catch (e) { Net.setStatus('Réponse illisible : copiez-la en entier.', true); } };
    }
    $('mp-back').onclick = () => {
      // l'hôte d'un salon déjà ouvert revient simplement au salon
      if (Net.role === 'host' && Net.on && (Net.code || MP.count() > 1)) { for (const l of Net.links.filter(l => !l.open)) Net.dropLink(l); this.mpManual = null; this.mpState = 'lobby'; this.renderMP(); return; }
      Net.reset(); this.mpManual = null; this.mpState = M ? 'manual' : 'home'; this.renderMP();
    };
  },
  // hôte : une nouvelle invitation manuelle (un joueur de plus)
  async mpInvite() {
    if (Net.role === 'host' && MP.count() >= NET_MAX) { this.toast('Salon complet', `${NET_MAX} joueurs maximum.`, '#ff2a6d', 3); return; }
    this.mpState = 'manual'; this.mpManual = { step: 'hwait' }; Net.setStatus('Préparation de l\'invitation…');
    try { const r = await Net.manualHost(); this.mpManual.L = r.L; this.mpManual.code = r.code; Net.setStatus(''); }
    catch (e) { Net.setStatus('Impossible de créer l\'invitation.', true); }
    this.renderMP();
  },
  copy(txt, sel) {
    const done = () => this.toast('Copié', 'Collez-le dans votre message.', '#39ff88', 2);
    const fail = () => { if (sel) { sel.focus(); sel.select(); } this.toast('Copie bloquée', sel ? 'Le code est sélectionné : faites Ctrl+C.' : 'Code : <b>' + txt + '</b>', '#ffae00', 5); };
    try { navigator.clipboard.writeText(txt).then(done, fail); } catch (e) { fail(); }
  },
  renderChat() {
    const L = $('mp-log'); if (!L) return;
    const esc = s => String(s).replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' })[c]);
    L.innerHTML = MP.chat.length ? MP.chat.map(([p, s]) => `<div><b style="color:${MP_COL[p]}">${esc(MP.name(p))}</b> ${esc(s)}</div>`).join('')
      : '<div style="opacity:.5">Discutez ici avant de lancer la partie.</div>';
    L.scrollTop = L.scrollHeight;
  },
  /* ---------- multijoueur : en partie ---------- */
  // lecteur de replay
  replayBar(on) {
    const b = $('rp-bar'); b.hidden = !on; if (!on) return;
    const R = G.replay;
    const draw = () => {
      b.innerHTML = `<b>🎬 REPLAY</b><span id="rp-w"></span><button class="btn" data-a="p">${R.paused ? '▶' : '⏸'}</button>${[1, 2, 4, 8].map(m => `<button class="btn${R.mul === m ? ' on' : ''}" data-m="${m}">×${m}</button>`).join('')}<button class="btn" data-a="c" title="Copier le code du replay">CODE</button><button class="btn danger" data-a="q">QUITTER</button>`;
      b.querySelectorAll('button').forEach(x => x.onclick = () => {
        if (x.dataset.m) R.mul = +x.dataset.m;
        else if (x.dataset.a === 'p') R.paused = !R.paused;
        else if (x.dataset.a === 'c') { R.paused = true; this.openXfer('rpexp', R.rec); }
        else if (x.dataset.a === 'q') { this.replayBar(false); Game.quit(false); return; }
        Sfx.play('ui'); draw(); this.refreshReplay(true);
      });
    };
    draw(); this.refreshReplay(true);
  },
  refreshReplay(force) {
    if (!G || !G.replay) return;
    const R = G.replay, k = G.waveNum + ':' + R.i;
    if (!force && k === this.last.rp) return; this.last.rp = k;
    const w = $('rp-w'); if (w) w.textContent = `Vague ${G.waveNum} · action ${Math.min(R.i, R.a.length)} / ${R.a.length}`;
  },
  // bandeau de pause en coopération
  refreshMpPause() {
    const on = !!(G && G.paused && G.net === 'coop' && Game.state === 'play'), by = on ? G.paused - 1 : -1, k = on ? 'p' + by : '';
    if (k === (this.last.mpp || '')) return;
    this.last.mpp = k;
    $('mp-pause').hidden = !on;
    if (!on) return;
    $('mp-pby').innerHTML = `demandée par <b style="color:${MP_COL[by]}">${MP.esc(MP.name(by))}</b>`;
    $('mp-resume').onclick = () => Act.do('mpause', false);
    Sfx.play('ui');
  },
  mpHud(on) {
    const el = $('mp');
    el.classList.toggle('hidden', !on);
    if (!on) return;
    el.style.setProperty('--pc', MP_COL[Net.me]);
    $('mp-em').innerHTML = EMOTES.map((e, i) => `<button data-i="${i}">${e}</button>`).join('');
    $('mp-em').querySelectorAll('button').forEach(b => b.onclick = () => { MP.emote(+b.dataset.i); });
    this.refreshMP(true);
  },
  refreshMP() {
    const el = $('mp'); if (el.classList.contains('hidden') || !G) return;
    const esc = s => MP.esc(s), vs = Net.versus || G.net === 'versus';
    let h = `<div class="mp-h"><i></i><b>${vs ? 'VERSUS' : 'COOP'} · ${MP.slots.length} JOUEURS</b><span>${Net.on ? (Net.ping ? Net.ping + ' ms' : '') + (Net.relayed() ? ' · RELAIS' : '') : 'DÉCONNECTÉ'}</span></div>`;
    if (vs) {
      const tg = MP.aim(), many = MP.others().length > 1;
      for (const p of MP.others()) {
        const o = MP.opps[p] || {}, out = o.over || MP.out[p], pc = out ? 0 : o.max ? Math.max(0, o.lives / o.max) : 1;
        h += `<div class="mp-op${p === tg && many ? ' tg' : ''}${out ? ' out' : ''}" data-p="${p}" style="--oc:${MP_COL[p]}"${many && !out ? ' title="Cibler ce joueur"' : ''}>
          <div class="mp-on"><i></i><b>${esc(MP.name(p))}</b><span>${out ? (o.forfeit ? 'PARTI' : 'ÉLIMINÉ') : `${o.lives != null ? o.lives + ' ♥ · ' : ''}V${o.wave != null ? o.wave : '?'}${MP.shielded(p) ? ` · 🛡 ${MP.shielded(p)} s` : ''}${p === tg && many ? ' · ◎ CIBLE' : ''}`}</span></div>
          <div class="mp-bar"><s style="width:${(pc * 100).toFixed(1)}%"></s></div></div>`;
      }
      h += `${(G.sabSh || 0) > G.tick ? `<div class="mp-row"><span>Protection anti-sabotage</span><b style="color:#39ff88">🛡 ${Math.ceil((G.sabSh - G.tick) / 60)} s</b></div>` : ''}<div class="mp-row"><span>Votre revenu</span><b style="color:var(--gold)">+${G.income || 0}¢</b><span>Envoyés</span><b>${G.sentTotal || 0}</b></div>
        <div class="mp-row"><span>Primes de survie</span><b style="color:var(--gold)">${fmt(G.survGain || 0)}¢</b>${this.survV && performance.now() - this.survT < 2500 ? `<span></span><b style="color:#39ff88">+${fmt(this.survV)}¢</b>` : ''}</div>
        <button class="btn danger" id="mp-sendgo" style="width:100%;margin-top:5px;padding:5px">ENVOYER DES ENNEMIS ▸</button>`;
    } else if (G.wallets) {
      for (const p of MP.others()) {
        const gone = (G.gone && G.gone[p]) || MP.out[p];
        h += `<div class="mp-op${gone ? ' out' : ''}" style="--oc:${MP_COL[p]}"><div class="mp-on"><i></i><b>${esc(MP.name(p))}</b><span>${gone ? 'PARTI' : `${fmt(G.wallets[p] || 0)}¢ · ${G.towers.filter(t => t.owner === p).length} tour.`}</span></div></div>`;
      }
      if (Net.coop) h += `<div class="mp-row"><span>Protocole</span><b style="color:${MP_COL[Cards.turn()]}">${esc(MP.name(Cards.turn()))}</b></div>`;
    }
    h += `<button class="btn mp-sc" id="mp-score">🏆 CLASSEMENT${Keys.lbl('score') ? ` <span class="k">${Keys.lbl('score')}</span>` : ''}</button>`;
    if (this.survV && performance.now() - this.survT >= 2500) this.survV = 0;
    $('mp-info').innerHTML = h;
    $('mp-score').onclick = () => Score.toggle();
    $('mp-info').querySelectorAll('.mp-op[data-p]').forEach(r => r.onclick = () => MP.setTarget(+r.dataset.p));
    const sg = $('mp-sendgo');
    if (sg) sg.onclick = () => { const c = this.cards['send:swarm']; if (c) { const bar = $('bar'); bar.scrollLeft = c.el.offsetLeft - bar.offsetLeft - 20; c.el.classList.add('fresh'); setTimeout(() => c.el.classList.remove('fresh'), 1500); } };
  },
  mpEnd(win, why, frags, place) {
    if (!G) return;
    const s = G.stats, host = Net.role === 'host' && Net.connected, n = MP.slots.length, vs = G.net === 'versus', esc = x => MP.esc(x);
    const one = MP.others()[0], o = MP.opps[one], left = MP.alive().length, over = MP.matchOver();
    const ord = k => k === 1 ? '1er' : k + 'e';
    const title = why === 'coop' ? 'DÉFAITE COMMUNE' : win ? 'VICTOIRE !' : n > 2 && place ? `ÉLIMINÉ · ${ord(place)} / ${n}` : 'DÉFAITE';
    const col = win ? 'var(--gold)' : 'var(--dang)';
    const sub = why === 'forfait' ? (n > 2 ? 'Vos adversaires ont quitté la partie.' : `${esc(MP.name(one))} a quitté la partie.`)
      : why === 'ko' ? (n > 2 ? `Dernier debout parmi ${n} joueurs !` : `Le noyau de ${esc(MP.name(one))} a cédé à la vague ${o && o.wave != null ? o.wave : '?'}.`)
      : why === 'coop' ? `Votre défense commune est tombée à la vague ${G.waveNum}.`
      : `Votre noyau a cédé à la vague ${G.waveNum}.${vs && !over ? ` Encore ${left} joueur${left > 1 ? 's' : ''} en lice…` : ''}`;
    // classement du versus à plusieurs
    let rank = '';
    if (vs && n > 2) {
      const L = MP.slots.map(p => {
        const me = p === Net.me, op = MP.opps[p] || {};
        const pl = me ? (win ? 1 : place) : op.place || (op.forfeit ? null : op.over ? null : (over ? 1 : null));
        return { p, pl, txt: me ? (win ? 'vainqueur' : `vague ${G.waveNum}`) : op.forfeit ? 'parti' : op.over ? `vague ${op.wave != null ? op.wave : '?'}` : over ? 'vainqueur' : 'en lice' };
      }).sort((a, b) => (a.pl || 99) - (b.pl || 99));
      rank = `<div class="mp-rank">${L.map(r => `<div style="--oc:${MP_COL[r.p]}"><em>${r.pl ? ord(r.pl) : '–'}</em><i></i><b>${esc(MP.name(r.p))}${r.p === Net.me ? ' (vous)' : ''}</b><span>${r.txt}</span></div>`).join('')}</div>`;
    }
    Score.toggle(false);
    $('mpend-body').innerHTML = `<h2 style="color:${col};text-shadow:0 0 18px ${col}">${title}</h2><div class="sub">${sub}</div>${rank}
      <div class="mpe-score">${Score.html(true)}</div>
      <div class="gostats"><div>Vague atteinte <b>${G.waveNum}</b></div><div>Éliminations <b>${fmt(s.kills)}</b></div>
      ${G.net === 'versus' ? `<div>Ennemis envoyés <b>${G.sentTotal || 0}</b></div><div>Ennemis reçus <b>${G.recvTotal || 0}</b></div><div>Primes de survie <b>${fmt(G.survGain || 0)}¢</b></div><div>Revenu final <b>+${G.income || 0}¢</b></div>` : `<div>Tourelles <b>${G.towers.length}</b></div><div>Boss vaincus <b>${s.bosses}</b></div>`}</div>
      <div class="sub" style="font-size:13px">Fragments d'Héritage : <span class="frags">+${frags} ✦</span></div>
      <div class="gocode"><span>CODE DE CARTE</span><input id="mpe-code" readonly value="${Hist.code()}" aria-label="Code de carte"><button class="btn" id="mpe-cc">COPIER</button></div>
      <div class="row gobtns" style="justify-content:center;gap:10px;margin-top:12px"><button class="btn" id="mpe-quit">QUITTER</button>${host && over ? '<button class="btn" id="mpe-lobby">SALON</button>' : ''}<button class="btn" id="mpe-stats">STATS</button>
      ${host ? (over ? '<button class="btn prim big" id="mpe-again">REVANCHE !</button>' : '<button class="btn prim big" disabled>PARTIE EN COURS…</button>') : Net.connected ? '<span class="note" style="align-self:center">L\'hôte peut relancer une partie…</span>' : ''}</div>`;
    $('mpe-quit').onclick = () => MP.leave();
    $('mpe-code').onfocus = () => $('mpe-code').select();
    $('mpe-cc').onclick = () => this.copy($('mpe-code').value, $('mpe-code'));
    if ($('mpe-lobby')) $('mpe-lobby').onclick = () => MP.toLobby();
    $('mpe-stats').onclick = () => this.openStats();
    if ($('mpe-again')) $('mpe-again').onclick = () => MP.rematch();
    this.open('ov-mpend');
  },
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
      <h3>MULTIJOUEUR</h3><ul>
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
        <p>${K('strat')} Ciblage · ${K('oc')} Surcadence</p><p><kbd>Maj</kbd> + ${K('strat')} / ${K('up')} : pour toutes vos tourelles du même type</p><p>${K('recycle')} Recycler le débris sélectionné</p>
        <p>${K('unjam')} Débrouiller (la tourelle choisie, sinon toutes)</p>
        <p>${K('speed')} Vitesse · ${K('pause')} Pause</p><p>${K('tree')} Arbre · ${K('lab')} Labo · ${K('stats')} Stats · ${K('casino')} Casino · ${K('help')} Manuel</p>
        <p><kbd>Échap</kbd> / clic droit : annuler</p><p><kbd>F3</kbd> Compteur FPS</p></div>`;
    this.open('ov-help');
  }
};

