/* ============================== INTERFACE : salon multijoueur et multijoueur en partie ============================== */
Object.assign(UI, {
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
        <div class="lbl-s" style="margin:12px 0 6px">CARTE ${host ? '<span style="opacity:.6">(vos cartes perso, faites dans l\'éditeur)</span>' : ''}</div>
        <div class="seg mp-maps" id="mp-map">${host ? [null, ...CMaps.all()].map((m, i) => `<button data-i="${i - 1}" class="${(MP.cmap ? MP.cmap.n : null) === (m ? m.n : null) ? 'on' : ''}">${m ? esc(m.n).toUpperCase() : 'ALÉATOIRE'}</button>`).join('')
          : `<button class="on">${MP.mapName ? 'CARTE PERSO · ' + esc(MP.mapName).toUpperCase() : 'ALÉATOIRE'}</button>`}</div>
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
      if (host) B.querySelectorAll('#mp-map button').forEach(b => b.onclick = () => { Sfx.play('ui'); MP.setMap(CMaps.all()[+b.dataset.i]); });
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
        if (!gone && Net.coop) {
          // don : une rangée de montants, ouverte par le bouton 🎁 (seulement ce que vous possédez)
          const me = G.wallets[Net.me] || 0, R = (G.resW && G.resW[Net.me]) || {};
          h += this.giftP === p ? `<div class="mp-gift" data-to="${p}">${[250, 1000].filter(v => me >= v).map(v => `<button class="btn" data-c="m" data-n="${v}">${v}¢</button>`).join('')}` +
            ['p', 'a', 'q'].filter(c => (R[c] | 0) >= 1).map(c => `<button class="btn" data-c="${c}" data-n="1" style="color:${RES[c].c}">1 ${RES[c].i}</button>`).join('') + '<button class="btn" data-x="1">✕</button></div>'
            : `<button class="btn mp-gb" data-g="${p}" title="Donner des crédits ou des éléments à ${esc(MP.name(p))}">🎁 DON</button>`;
        }
      }
      if (Net.coop) h += `<div class="mp-row"><span>Protocole</span><b style="color:${MP_COL[Cards.turn()]}">${esc(MP.name(Cards.turn()))}</b></div>`;
    }
    h += `<button class="btn mp-sc" id="mp-score">🏆 CLASSEMENT${Keys.lbl('score') ? ` <span class="k">${Keys.lbl('score')}</span>` : ''}</button>`;
    if (this.survV && performance.now() - this.survT >= 2500) this.survV = 0;
    $('mp-info').innerHTML = h;
    $('mp-score').onclick = () => Score.toggle();
    $('mp-info').querySelectorAll('.mp-op[data-p]').forEach(r => r.onclick = () => MP.setTarget(+r.dataset.p));
    $('mp-info').querySelectorAll('.mp-gb').forEach(b => b.onclick = () => { this.giftP = +b.dataset.g; Sfx.play('ui'); this.refreshMP(); });
    $('mp-info').querySelectorAll('.mp-gift button').forEach(b => b.onclick = () => {
      const to = +b.parentNode.dataset.to;
      if (!b.dataset.x) Act.do('gift', to, b.dataset.c, +b.dataset.n);
      this.giftP = null; this.refreshMP();
    });
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
    $('mpend-body').innerHTML = `<h2 style="color:${col};text-shadow:0 0 18px ${col}">${this.x3d(title, 'over')}</h2><div class="sub">${sub}</div>${rank}
      <div class="mpe-score">${Score.html(true)}</div>
      <div class="gostats"><div>Vague atteinte <b>${G.waveNum}</b></div><div>Éliminations <b>${fmt(s.kills)}</b></div>
      ${G.net === 'versus' ? `<div>Ennemis envoyés <b>${G.sentTotal || 0}</b></div><div>Ennemis reçus <b>${G.recvTotal || 0}</b></div><div>Primes de survie <b>${fmt(G.survGain || 0)}¢</b></div><div>Revenu final <b>+${G.income || 0}¢</b></div>` : `<div>Tourelles <b>${G.towers.length}</b></div><div>Boss vaincus <b>${s.bosses}</b></div>`}</div>
      <div class="sub" style="font-size:13px">Fragments d'Héritage : <span class="frags">+${frags} ✦</span></div>
      <div class="gocode"><span>CODE DE CARTE</span><input id="mpe-code" readonly value="${G.cmap ? CMaps.code(G.cmap) : Hist.code()}" aria-label="Code de carte"><button class="btn" id="mpe-cc">COPIER</button></div>
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
});
