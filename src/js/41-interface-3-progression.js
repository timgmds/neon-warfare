/* ============================== INTERFACE : arbre de compétences, labo de fusion, fin de partie, héritage, succès ============================== */
Object.assign(UI, {
  /* ---------- arbre de compétences ---------- */
  openTree() {
    if (!G || G.over) return;
    this.setPlacing(null, true); this.setTargeting(null);
    this.renderTree(); this.open('ov-tree');
    requestAnimationFrame(() => this.drawLinks());
  },
  renderTree() {
    $('tree-sub').innerHTML = `Disponibles : ${Res.tag('n', G.nanites)} · ${Res.tag('p', G.res.p)} · ${Res.tag('a', G.res.a)}${G.res.sq || G.res.q ? ' · ' + Res.tag('q', G.res.q || 0) : ''}<br>` +
      `<b>Palier II</b> en nanites (fin de vague, boss, butin). <b>Palier III</b> en plasma (boss, parfois élites, raffinerie). <b>Palier IV</b> en abyssite (méga-boss, puis boss après la vague ${Towers.omFrom()}). Les nœuds du 4<sup>e</sup> rang débloquent de nouvelles <b>capacités</b>.`;
    const root = $('tree'); root.innerHTML = '';
    BRANCHES.forEach((b, bi) => {
      const col = document.createElement('div'); col.className = 'branch';
      col.style.setProperty('--bc', b.color); col.style.setProperty('--brgb', hexRgb(b.color).join(','));
      col.innerHTML = `<h3>${b.name}</h3><div class="bd">${b.desc}</div>`;
      const rows = document.createElement('div'); rows.className = 'brows';
      rows.innerHTML = '<svg class="links"></svg>';
      for (let r = 0; r < 9; r++) {
        if (r === 4 || r === 6 || r === 7 || r === 8) {
          const h = document.createElement('div'); h.className = 'tier ' + (r === 4 ? 'p' : r === 6 ? 'a' : 'q');
          h.textContent = r === 4 ? `PALIER III · ${RES.p.i} PLASMA` : r === 6 ? `PALIER IV · ${RES.a.i} ABYSSITE` : r === 7 ? `PALIER V · ${RES.q.i} QUINTESSENCE` : 'RANGS INFINIS';
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
    el.innerHTML = `<div class="ic"><span>${TXT(s.i)}</span><span class="rk">${r}/${s.inf ? '∞' : s.max}</span></div><div class="nm">${s.n}</div>`;
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
    $('lab-sub').innerHTML = `Disponibles : ${Res.tag('n', G.nanites)} · ${Res.tag('p', G.res.p)} · ${Res.tag('a', G.res.a)} · ${Res.tag('q', G.res.q || 0)}<br>Plans <b>T2</b> en nanites, <b>T3</b> en plasma, <b>T4</b> en abyssite, <b>reliques T5</b> en quintessence (après Oméga) ; chaque pose d'une T3 ou T4 coûte aussi son élément (selon la difficulté). Synthétisez un <b>plan</b> pour rendre une tourelle fusionnée constructible. Ensuite, <b>placez ses deux composants côte à côte</b> et sélectionnez-en un pour les <b>fusionner sur le terrain</b> : 80% de leur valeur est récupérée et leur niveau moyen conservé.`;
    const Lb = $('lab'); Lb.innerHTML = '';
    for (const tier of [2, 3, 4, 5]) {
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
    $('over-body').innerHTML = `<h2 style="color:var(--dang)">${this.x3d('ÉCHEC SYSTÈME', 'over')}</h2>
      <div class="sub" style="margin-bottom:6px">${daily ? 'Défi du jour ' + G.daily : G.diff.name}${G.doctrine !== 'standard' ? ' · doctrine ' + DOCTRINES[G.doctrine].n : ''} · le noyau a cédé à la vague <b>${G.waveNum}</b></div>
      ${recLine}
      ${Online.goBox()}
      <div class="gocode"><span>CODE DE CARTE</span><input id="go-code" readonly value="${G.cmap ? CMaps.code(G.cmap) : Hist.code()}" aria-label="Code de carte"><button class="btn" id="go-cc">COPIER</button>${daily ? '' : '<button class="btn sec" id="go-replay">REJOUER CETTE CARTE</button>'}</div>
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
      const code = G.cmap ? CMaps.code(G.cmap) : Hist.code();
      this.copy(`Neon Warfare ${VERSION} : j'ai tenu jusqu'à la vague ${G.waveNum} en ${G.diff.name}${G.gm !== 'classic' ? ' (' + GMODES[G.gm].n + ')' : ''} ! Même carte, mêmes vagues : Nouvelle partie → code de carte ${code}`);
      this.toast('Défi copié', `Envoyez-le à un ami : il saisira le code <b>${code}</b> dans Nouvelle partie.`, '#ff2bd6', 5);
    };
    const cmap = G.cmap;
    $('go-again').onclick = () => { this.closeAll(); Game.newGame(dk, { daily, map: cmap }); };
    const ci = $('go-code'), same = { gm: G.gm, seed: G.seed, portrait: G.portrait, map: cmap };
    ci.onfocus = () => ci.select();
    $('go-cc').onclick = () => this.copy(ci.value, ci);
    Online.bindGo();
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
});
