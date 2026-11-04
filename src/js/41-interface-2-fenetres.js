/* ============================== INTERFACE : menu principal, nouvelle partie, pause, options et fenêtres ============================== */
Object.assign(UI, {
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
    if (Online.on()) list.push([`CLASSEMENT EN LIGNE<small>défi du jour · les meilleurs joueurs</small>`, 'gold', () => Online.open()]);
    list.push([`MULTIJOUEUR<small>versus ou coopération, de 2 à 4</small>`, 'nano', () => this.openMP()]);
    const nm = CMaps.list().length;
    list.push([`ÉDITEUR DE CARTES<small>${nm ? nm + ' carte' + (nm > 1 ? 's' : '') + ' perso · ' : 'vos chemins · '}${FunMaps.list().length} cartes fun</small>`, '', () => Editor.open()]);
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
          const cm = this.pendMap || CMaps.read($('seed-in').value), sd = cm ? null : Hist.parse($('seed-in').value);
          this.closeAll();
          const cus = gm === 'custom' ? Custom.get() : null;
          this.pendMap = null;
          if (cm) Game.newGame(k, { gm, cus, map: cm });
          else if (sd) Game.newGame(sd.diff || k, { gm: sd.free ? gm : sd.gm, cus, seed: sd.seed, portrait: sd.portrait == null ? undefined : sd.portrait }); else Game.newGame(k, { gm, cus });
        };
        if (Store.data.save) this.confirm('ÉCRASER LA SAUVEGARDE ?', 'Une partie sauvegardée existe déjà. Elle sera remplacée par la nouvelle.', go);
        else go();
      };
      g.appendChild(el);
    }
    const si = $('seed-in'), so = $('seed-ok'), sm = $('seed-map'), pm = this.pendMap;
    // carte perso choisie dans l'éditeur : elle remplace la graine
    sm.hidden = !pm; si.hidden = !!pm;
    if (pm) {
      sm.className = 'mapchip'; sm.innerHTML = `CARTE PERSO <b>${pm.n.replace(/</g, '&lt;')}</b><button class="btn" title="Revenir à une carte générée">✕</button>`;
      sm.querySelector('button').onclick = () => { this.pendMap = null; this.openNew(); };
    }
    si.oninput = () => {
      const cm = pm ? null : CMaps.read(si.value);
      if (cm) { so.innerHTML = `<b style="color:var(--ok)">Carte perso « ${cm.n.replace(/</g, '&lt;')} »</b> — cliquez une menace pour la jouer.`; return; }
      const sd = pm ? null : Hist.parse(si.value);
      so.innerHTML = pm ? 'Cliquez une menace pour lancer la partie sur cette carte.' : !sd ? '' : sd.free ? `<b style="color:var(--ok)">Graine « ${sd.free.replace(/</g, '&lt;')} »</b> · même texte = même carte et mêmes vagues — cliquez une menace pour lancer.`
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
    $('pause-info').innerHTML = `${G.daily ? 'DÉFI DU JOUR ' + G.daily : G.diff.name} · Vague <b>${G.waveNum}</b> · ${G.cmap ? `Carte perso <b>${G.cmap.n.replace(/</g, '&lt;')}</b>` : `Code de carte <b>${Hist.code()}</b>`}<br>${fmt(G.stats.kills)} éliminations · ${G.towers.length} tourelles` +
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
        const dk = G.diffKey, daily = !!G.daily, gm = G.gm, cus = G.cus, map = G.cmap; this.closeAll(); Game.newGame(dk, { daily, gm, cus, map });
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
    if (exp === 'mapexp' || exp === 'mapimp') {
      const out = exp === 'mapexp';
      $('xf-t').textContent = out ? 'CODE DE LA CARTE' : 'IMPORTER UNE CARTE';
      $('xf-sub').innerHTML = out ? 'Envoyez ce code à un ami : il le colle dans <b>Éditeur de cartes → Importer un code</b>, ou directement dans le champ « code de carte » de Nouvelle partie.' : 'Collez ici le code d\'une carte perso (il commence par NWM1:).';
      ta.value = out ? CMaps.code(rec) : ''; ta.readOnly = out; go.textContent = out ? 'COPIER LE CODE' : 'IMPORTER';
      go.onclick = () => {
        if (out) { this.copy(ta.value, ta); return; }
        const m = CMaps.read(ta.value);
        if (!m) { Sfx.play('error'); this.toast('Code invalide', 'Ce texte n\'est pas un code de carte Neon Warfare complet.', '#ff2a6d', 4); return; }
        CMaps.save(m); this.close('ov-xfer'); Editor.open(m);
        this.toast('Carte importée', `« ${m.n.replace(/</g, '&lt;')} » est dans Mes cartes.`, '#39ff88', 3);
      };
      this.open('ov-xfer');
      if (out) setTimeout(() => { ta.focus(); ta.select(); }, 50);
      return;
    }
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
      <div class="opt"><span>Style sonore<small>Néon 10 : sons en couches, réverbération, stéréo selon la position · Classique : les sons de la version 9</small></span><button class="btn" id="o-snd">${s.snd === 'classic' ? 'CLASSIQUE' : 'NÉON 10'}</button></div>
      <div class="opt"><span>Qualité graphique<small>AUTO réduit les effets si le jeu ralentit</small></span><button class="btn" id="o-q">${q[s.quality]}${s.quality === 'auto' && Perf.degraded ? ' (BASSE)' : ''}</button></div>
      <div class="opt"><span>Style graphique<small>Néon 10 : décors animés, halo lumineux, lettrage 3D · Classique : le rendu de la version 9</small></span><button class="btn" id="o-gfx">${s.gfx === 'classic' ? 'CLASSIQUE' : 'NÉON 10'}</button></div>
      <div class="opt"><span>Thème visuel</span><button class="btn" id="o-th">${THEMES[s.theme] ? THEMES[s.theme].name : '?'}</button></div>
      <div class="opt"><span>Effet CRT<small>Lignes de balayage rétro</small></span><button class="btn" id="o-crt">${tg(s.crt)}</button></div>
      <div class="opt"><span>Secousses & flashs</span><button class="btn" id="o-sh">${tg(s.shake)}</button></div>
      <div class="opt"><span>Effets réduits<small>Ni flash, ni secousse, halo adouci, animations de l'interface arrêtées : plus reposant pour les yeux</small></span><button class="btn" id="o-calm">${tg(s.calm)}</button></div>
      <div class="opt"><span>Couleurs pour daltoniens<small>Barres de vie et de chaleur en bleu, jaune et magenta au lieu de vert, orange et rouge</small></span><button class="btn" id="o-cb">${tg(s.cb)}</button></div>
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
    $('o-snd').onclick = () => { s.snd = s.snd === 'classic' ? 'neo' : 'classic'; Store.save(); Sfx.play('upgrade'); this.openOptions(); };
    $('o-q').onclick = () => { s.quality = s.quality === 'auto' ? 'high' : s.quality === 'high' ? 'low' : 'auto'; Perf.degraded = false; Store.save(); Render.applyQuality(); this.openOptions(); };
    $('o-th').onclick = () => { const ks = Object.keys(THEMES); s.theme = ks[(ks.indexOf(s.theme) + 1) % ks.length]; Store.save(); Render.setTheme(s.theme); this.openOptions(); };
    $('o-gfx').onclick = () => { s.gfx = s.gfx === 'classic' ? 'neo' : 'classic'; Store.save(); Render.setTheme(s.theme); if (G && !G.demo) this.buildBar(); this.openOptions(); };
    $('o-crt').onclick = () => { s.crt = !s.crt; Store.save(); Render.setTheme(s.theme); this.openOptions(); };
    $('o-sh').onclick = () => { s.shake = !s.shake; Store.save(); this.openOptions(); };
    $('o-calm').onclick = () => { s.calm = !s.calm; Store.save(); Render.setTheme(s.theme); this.openOptions(); };
    $('o-cb').onclick = () => { s.cb = !s.cb; Store.save(); this.openOptions(); };
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
});
