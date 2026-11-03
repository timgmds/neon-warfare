/* ============================== CLASSEMENT EN LIGNE (Défi du jour) ==============================
   Les scores vont dans Firestore (Firebase) par de simples requêtes REST : aucune bibliothèque à charger.
   Chemin : daily/{date}/scores/{id}. Un score n'est jamais modifié : chaque nouveau meilleur score d'un joueur en crée un,
   et la liste ne garde que le meilleur de chacun. Le replay de la partie est joint : tout le monde peut la regarder,
   c'est le garde-fou contre la triche (un jeu web ne peut rien prouver seul). Les règles de sécurité Firestore
   (firebase/firestore.rules) vérifient la forme de chaque envoi.
   Sans configuration (projectId et apiKey vides), le classement reste invisible. La clé d'API web de Firebase
   n'est pas un secret : elle identifie le projet, ce sont les règles qui protègent les données. */
const LB_CFG = { projectId: 'neon-warfare-f82fb', apiKey: 'AIzaSyACFuyehcHtb1f_83Re7KgNLiBejtapnRA' };

const Online = {
  KMAX: 9999999, cache: {},
  on() { return !!(LB_CFG.projectId && LB_CFG.apiKey) && typeof fetch === 'function'; },
  // identifiant anonyme de ce navigateur : il sert seulement à ne garder que le meilleur score de chacun
  uid() {
    if (!Store.data.lbId) {
      const b = new Uint8Array(12); crypto.getRandomValues(b);
      Store.data.lbId = Array.from(b, x => (x % 36).toString(36)).join(''); Store.save();
    }
    return Store.data.lbId;
  },
  docs() { return `projects/${LB_CFG.projectId}/databases/(default)/documents`; },
  async req(path, body) {
    const url = `https://firestore.googleapis.com/v1/${this.docs()}${path}${path.includes('?') ? '&' : '?'}key=${encodeURIComponent(LB_CFG.apiKey)}`;
    const r = await fetch(url, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {});
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  },
  // les 50 meilleurs joueurs d'une journée (le meilleur score de chacun)
  async top(day) {
    const res = await this.req(`/daily/${day}:runQuery`, { structuredQuery: {
      from: [{ collectionId: 'scores' }], select: { fields: ['n', 'w', 'k', 'u', 'v', 'g'].map(f => ({ fieldPath: f })) },
      orderBy: [{ field: { fieldPath: 's' }, direction: 'DESCENDING' }], limit: 300 } });
    const seen = new Set(), out = [];
    for (const x of res) {
      const d = x.document; if (!d || !d.fields) continue;
      const f = d.fields, str = k => (f[k] && f[k].stringValue) || '', num = k => +((f[k] && f[k].integerValue) || 0), u = str('u');
      if (seen.has(u)) continue;
      seen.add(u);
      out.push({ id: d.name.split('/').pop(), n: str('n'), w: num('w'), k: num('k'), u, v: str('v'), g: str('g') });
      if (out.length >= 50) break;
    }
    this.cache[day] = { t: Date.now(), L: out };
    return out;
  },
  // publication à la fin d'un Défi du jour ; le replay part avec le score
  async submit(name) {
    const day = G.daily, w = G.waveNum, k = Math.min(this.KMAX, G.stats.kills), u = this.uid();
    const rep = G.rec ? Replay.code(G.rec) : '', id = u + '-' + Date.now().toString(36);
    const S = v => ({ stringValue: v }), I = v => ({ integerValue: String(v) });
    const fields = { n: S(name), w: I(w), k: I(k), s: I(w * (this.KMAX + 1) + k), u: S(u), v: S(VERSION), g: S(G.doctrine || 'standard') };
    if (rep && rep.length < 900000) fields.r = S(rep);
    await this.req(':commit', { writes: [{ update: { name: `${this.docs()}/daily/${day}/scores/${id}`, fields },
      updateTransforms: [{ fieldPath: 'd', setToServerValue: 'REQUEST_TIME' }], currentDocument: { exists: false } }] });
    const sent = Store.data.lbSent || (Store.data.lbSent = {});
    sent[day] = Math.max(sent[day] || 0, w);
    for (const d in sent) if (d < this.dayAgo(7)) delete sent[d];
    Store.save();
    delete this.cache[day];
  },
  async replay(day, id) {
    const d = await this.req(`/daily/${day}/scores/${id}?mask.fieldPaths=r`);
    return Replay.read(d.fields && d.fields.r ? d.fields.r.stringValue : '');
  },
  /* ---------- vérification des scores ----------
     Chaque replay du haut du classement est rejoué en accéléré dans ce navigateur, sans affichage : si la partie
     rejouée finit à la même vague avec le même nombre d'éliminations, le score est marqué « vérifié ».
     Seulement pour la version du jeu en cours (une autre version peut s'écarter), et depuis le menu. */
  ver() { return Store.data.lbVer || (Store.data.lbVer = {}); },
  async verifyTop(day, L) {
    if (this.verifying || Game.state !== 'menu') return;
    const V = this.ver(), todo = L.slice(0, 10).filter(x => !V[x.id] && x.v === VERSION);
    if (!todo.length) return;
    this.verifying = true; this.vNote(day);
    try {
      for (const x of todo) {
        if (!UI.stack.includes('ov-lb') || Game.state !== 'menu') break;
        let r = null;
        try { r = await this.replay(day, x.id); } catch (e) { break; }   // hors ligne : on réessaiera
        if (!r || r.base) { V[x.id] = { s: 'n' }; continue; }   // partie reprise d'une sauvegarde : pas vérifiable ainsi
        this.vNote(day, x.n);
        const res = await this.simulate(r);
        if (res.w < 0) break;   // interrompu (le joueur lance une partie, un replay…)
        V[x.id] = { s: res.w === x.w && res.k === x.k ? 'ok' : 'ko', w: res.w };
        Store.save();
        if (this.day === day && UI.stack.includes('ov-lb')) this.rows(day, L);
      }
    } finally {
      this.verifying = false; this.vNote(day);
      for (const id in V) if (!L.some(x => x.id === id) && Object.keys(V).length > 200) delete V[id];
      Store.save();
      if (!G && Game.state === 'menu' && Store.s.demo) Demo.start();
    }
  },
  vNote(day, who) {
    const el = $('lb-ver'); if (!el) return;
    el.textContent = this.verifying ? `Vérification des replays en cours${who ? ' : ' + who : ''}…` : '';
  },
  // rejoue une partie à toute vitesse, par tranches de 12 ms pour ne pas figer la page
  simulate(r) {
    return new Promise(done => {
      const o = r.o, rp = { a: r.a, i: 0, end: r.end || null, v: r.v, mul: 1, paused: false, rec: r, headless: true };
      Demo.busy = true;
      try {
        Game.newGame(o.diff, { seed: o.seed, portrait: o.portrait, gm: o.gm, cus: o.cus, map: o.map, perks: o.perks, doctrine: o.doctrine, events: o.events,
          autoWave: o.autoWave, daily: !!o.daily, dailyDate: o.daily || undefined, replay: rp });
      } catch (e) { Demo.busy = false; G = null; done({ w: -1 }); return; }
      Demo.busy = false;
      const finish = out => { if (G && G.replay === rp) { G = null; FX.clear(); Shots.pool.clear(); Render.dirtyMap = true; } done(out); };
      const step = () => {
        if (!G || G.replay !== rp || Game.state !== 'menu') { done({ w: -1 }); return; }
        Demo.busy = true;
        try {
          const t0 = performance.now();
          while (!G.over && G.tick < 3e6 && performance.now() - t0 < 12) { Replay.feed(); if (G.over) break; Game.update(); }
        } catch (e) { Demo.busy = false; finish({ w: -1 }); return; } finally { Demo.busy = false; }
        if (G.over || G.tick >= 3e6) finish({ w: G.waveNum, k: Math.min(this.KMAX, G.stats.kills) });
        else setTimeout(step, 0);
      };
      step();
    });
  },
  dayAgo(n) { const d = new Date(); d.setDate(d.getDate() - n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; },
  cleanName(s) { return String(s || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 16); },
  esc(s) { return String(s).replace(/[<>&"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' })[c]); },

  /* ---------- pendant un Défi du jour : les scores déjà publiés à battre ---------- */
  rivalsLoad() {
    this.riv = null; this.passed = 0; this.rivalShow(true);
    if (!this.on() || !G || !G.daily || G.replay || G.net) return;
    const day = G.daily;
    this.top(day).then(L => {
      if (!G || G.daily !== day || G.over) return;
      const me = this.uid();
      this.riv = L.filter(x => x.u !== me);
      this.passed = this.riv.filter(x => x.w <= this.done()).length;
      this.rivalShow(true);
    }).catch(() => { /* hors ligne : pas de rivaux, la partie continue */ });
  },
  done() { return G.phase === 'prep' ? G.waveNum : G.waveNum - 1; },
  // on « dépasse » un joueur en terminant la vague où il est tombé
  rivalShow(quiet, doneN) {
    const el = $('rival');
    if (!this.riv || !this.riv.length || !G || !G.daily || G.over || G.replay) { el.hidden = true; return; }
    const done = doneN != null ? doneN : this.done(), ahead = this.riv.filter(x => x.w > done), passed = this.riv.length - ahead.length, next = ahead[ahead.length - 1];
    el.hidden = false;
    el.innerHTML = `<span>DÉFI DU JOUR · ${ahead.length + 1}${ahead.length ? 'e' : 'er'} / ${this.riv.length + 1}</span>` +
      (next ? `<b>À battre : ${this.esc(next.n)} · vague ${next.w}</b>` : '<b>Vous êtes en tête du jour !</b>');
    if (!quiet && passed > this.passed) {
      const beaten = this.riv[ahead.length];
      UI.toast('Dépassé !', `Vous passez devant <b>${this.esc(beaten.n)}</b> (vague ${beaten.w}).${next ? '' : " Plus personne devant vous aujourd'hui !"}`, '#ffd23f', 4);
      Sfx.play('mission');
    }
    this.passed = passed;
  },

  /* ---------- fin de partie : bloc « publier mon score » ---------- */
  goBox() {
    if (!this.on() || !G || !G.daily || G.replay) return '';
    const sent = (Store.data.lbSent || {})[G.daily] || 0, better = G.waveNum > sent;
    return `<div class="lbbox" id="go-lb"><div class="lbh">CLASSEMENT EN LIGNE · DÉFI DU JOUR</div>
      ${better ? `<div class="row lbrow"><input id="lb-name" class="mp-in" maxlength="16" value="${this.esc(MP.myName())}" aria-label="Pseudo" autocomplete="off"><button class="btn gold" id="lb-send">PUBLIER MON SCORE</button></div>
      <div class="note" id="lb-msg">Seront visibles par tous : votre pseudo, la vague ${G.waveNum}, vos éliminations et le replay de la partie.</div>`
        : `<div class="note" id="lb-msg">Vous avez déjà publié la vague ${sent} aujourd'hui : battez-la pour la remplacer.</div>`}
      <button class="btn" id="lb-see">VOIR LE CLASSEMENT</button></div>`;
  },
  bindGo() {
    if (!$('go-lb')) return;
    $('lb-see').onclick = () => this.open(G && G.daily);
    const b = $('lb-send'); if (!b) return;
    b.onclick = async () => {
      const name = this.cleanName($('lb-name').value);
      if (name.length < 2) { Sfx.play('error'); $('lb-msg').textContent = 'Choisissez un pseudo de 2 à 16 caractères.'; return; }
      Store.s.name = name; Store.save();
      b.disabled = true; $('lb-msg').textContent = 'Envoi…';
      try {
        await this.submit(name);
        Ach.unlock('podium', true);
        const L = await this.top(G.daily), r = L.findIndex(x => x.u === this.uid()) + 1;
        Sfx.play('coin');
        $('lb-msg').innerHTML = r ? `<b style="color:var(--gold)">Publié ! Vous êtes ${r === 1 ? '1er' : r + 'e'} sur ${L.length} aujourd'hui.</b>` : '<b style="color:var(--ok)">Score publié !</b>';
        $('go-lb').querySelector('.lbrow').remove();
      } catch (e) {
        b.disabled = false; Sfx.play('error');
        $('lb-msg').textContent = 'Envoi impossible (pas de connexion ?). Réessayez dans un instant.';
      }
    };
  },

  /* ---------- fenêtre du classement ---------- */
  open(day) {
    this.day = day || todayStr();
    UI.open('ov-lb');
    this.render();
  },
  async render() {
    const day = this.day, days = [todayStr(), this.dayAgo(1), this.dayAgo(2)];
    if (!days.includes(day)) days.unshift(day);
    const lab = d => d === days[0] && d === todayStr() ? 'AUJOURD\'HUI' : d === this.dayAgo(1) ? 'HIER' : d === this.dayAgo(2) ? 'AVANT-HIER' : d;
    $('lb-days').innerHTML = days.map(d => `<button data-d="${d}" class="${d === day ? 'on' : ''}">${lab(d)}</button>`).join('');
    $('lb-days').querySelectorAll('button').forEach(b => b.onclick = () => { this.day = b.dataset.d; Sfx.play('ui'); this.render(); });
    const di = dailyInfo(day);
    $('lb-ver').textContent = '';
    $('lb-sub').innerHTML = `Défi du <b>${day}</b> : ${di.mutKeys.map(k => MUTATORS[k].n).join(' + ')}. Même carte et mêmes vagues pour tout le monde. ` +
      'Le meilleur score de chaque joueur ; ▶ pour regarder sa partie.';
    const box = $('lb-list');
    const c = this.cache[day];
    if (!c || Date.now() - c.t > 30000) box.innerHTML = '<div class="note lbwait">Chargement…</div>';
    let L;
    try { L = c && Date.now() - c.t <= 30000 ? c.L : await this.top(day); } catch (e) {
      if (this.day === day) box.innerHTML = '<div class="note lbwait">Classement inaccessible : vérifiez votre connexion. Certaines pages (comme l\'aperçu sur claude.ai) bloquent les connexions : jouez alors sur <b>timgmds.github.io/neon-warfare</b>.</div>';
      return;
    }
    if (this.day !== day || !UI.stack.includes('ov-lb')) return;
    if (!L.length) { box.innerHTML = '<div class="note lbwait">Personne n\'a encore publié de score ce jour-là. À vous de jouer !</div>'; return; }
    this.rows(day, L);
    if (Game.state === 'menu') this.verifyTop(day, L);
  },
  rows(day, L) {
    const box = $('lb-list'), me = this.uid(), V = this.ver();
    const vt = x => { const v = V[x.id]; return !v ? '' : v.s === 'ok' ? '<span class="vf ok" title="Replay rejoué dans votre navigateur : même vague, mêmes éliminations">✓ vérifié</span>'
      : v.s === 'ko' ? `<span class="vf ko" title="Le replay rejoué s'arrête à la vague ${v.w}">✗ écart</span>` : ''; };
    box.innerHTML = `<div class="lbl">${L.map((x, i) => `<div class="lbr${x.u === me ? ' me' : ''}"><i>${i + 1}</i><b>${this.esc(x.n)}${vt(x)}</b>` +
      `<span class="dc">${DOCTRINES[x.g] && x.g !== 'standard' ? TXT(DOCTRINES[x.g].i) + ' ' + DOCTRINES[x.g].n : ''}</span>` +
      `<em>VAGUE ${x.w}</em><small>${fmt(x.k)} élim. · v${this.esc(x.v)}</small><button class="btn" data-i="${i}" title="Regarder la partie">▶</button></div>`).join('')}</div>`;
    box.querySelectorAll('button').forEach(b => b.onclick = async () => {
      const x = L[+b.dataset.i]; b.disabled = true;
      try {
        const r = await this.replay(day, x.id);
        if (!r) throw new Error('replay');
        if (G && Game.state === 'play' && !G.over) { b.disabled = false; UI.toast('Partie en cours', 'Terminez ou quittez votre partie pour regarder un replay.', '#ffae00', 4); return; }
        if (G && !G.demo) Game.quit(false);
        Replay.play(r);
      } catch (e) { b.disabled = false; UI.toast('Replay indisponible', 'Ce score n\'a pas de replay lisible.', '#ff2a6d', 3); }
    });
  }
};
