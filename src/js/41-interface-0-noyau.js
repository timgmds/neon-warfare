/* ============================== INTERFACE ==============================
   L'objet UI est réparti sur plusieurs fichiers : celui-ci (infobulles, annonces, HUD, barre de construction,
   capacités), puis 41-interface-1 à 5, qui lui ajoutent leurs méthodes avec Object.assign. */
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
  // lettrage 3D (style Néon 10) : la tranche est un double du texte, lu dans data-t ; sans effet en style classique
  x3d(t, cls = '') {
    const a = String(t).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
    return `<span class="x3d${cls ? ' ' + cls : ''}" data-t="${a}">${a}</span>`;
  },
  banner(t, s, col) {
    if (Demo.busy) return;
    const B = $('banner'); B.innerHTML = '';
    const d = document.createElement('div'); d.className = 'bn';
    if (col) d.style.setProperty('--bc', col);
    if (String(t).length > 12) d.classList.add('long');
    d.innerHTML = `<div class="t">${this.x3d(t)}</div>${s ? `<div class="s">${s}</div>` : ''}`;
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
    Online.rivalsLoad(); Render.resetZoom();
    Render.resize();
    this.refreshHUD(); this.refreshAbils(true); this.refreshBadges();
    // toute première partie : le tutoriel guidé démarre de lui-même (il se relance depuis le Manuel)
    if (!Store.data.tuto && !G.net && !G.replay && !G.daily) setTimeout(() => { if (G && Game.state === 'play' && !Tuto.on()) Tuto.begin(); }, 900);
  },
  exitGame() {
    this.mpHud(false); $('mp-wait').style.display = 'none'; $('rp-bar').hidden = true;
    $('hud').classList.add('hidden'); $('dock').classList.add('hidden'); $('missions').classList.add('hidden'); $('rival').hidden = true; Tuto.stop();
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
    Tuto.frame();
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
    const rk = G.res.p + ':' + G.res.a + ':' + (G.res.q || 0) + ':' + (G.res.sp ? 1 : 0) + (G.res.sa ? 1 : 0) + (G.res.sq ? 1 : 0);
    if (L.res !== rk) {
      L.res = rk;
      $('hs-el').hidden = !(G.res.sp || G.res.sa || G.res.sq || G.res.p || G.res.a || G.res.q);
      $('h-quint').textContent = RES.q.i + (G.res.q || 0); $('h-quint').hidden = !(G.res.sq || G.res.q);
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
    b.className = 'x3d'; b.dataset.t = txt;
    C.appendChild(b); clearTimeout(this.coT); this.coT = setTimeout(() => { C.innerHTML = ''; }, 1500);
  },
  bossIntro(d, type, mega) {
    const el = $('bossintro');
    el.style.setProperty('--bc', d.color);
    el.querySelector('span').textContent = mega ? '☠ ALERTE ROUGE · MÉGA-BOSS' : '⚠ ALERTE BOSS';
    $('bi-n').textContent = d.name; $('bi-n').className = 'x3d'; $('bi-n').dataset.t = d.name; $('bi-d').textContent = LORE[type] || '';
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

};
