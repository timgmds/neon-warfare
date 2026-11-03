/* ============================== CLASSEMENT EN LIGNE (Défi du jour) ==============================
   Les scores vont dans Firestore (Firebase) par de simples requêtes REST : aucune bibliothèque à charger.
   Chemin : daily/{date}/scores/{id}. Un score n'est jamais modifié : chaque nouveau meilleur score d'un joueur en crée un,
   et la liste ne garde que le meilleur de chacun. Le replay de la partie est joint : tout le monde peut la regarder,
   c'est le garde-fou contre la triche (un jeu web ne peut rien prouver seul). Les règles de sécurité Firestore
   (firebase/firestore.rules) vérifient la forme de chaque envoi.
   Sans configuration (projectId et apiKey vides), le classement reste invisible. La clé d'API web de Firebase
   n'est pas un secret : elle identifie le projet, ce sont les règles qui protègent les données. */
const LB_CFG = { projectId: '', apiKey: '' };

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
  dayAgo(n) { const d = new Date(); d.setDate(d.getDate() - n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; },
  cleanName(s) { return String(s || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 16); },
  esc(s) { return String(s).replace(/[<>&"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' })[c]); },

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
    $('lb-sub').innerHTML = `Défi du <b>${day}</b> : ${di.mutKeys.map(k => MUTATORS[k].n).join(' + ')}. Même carte et mêmes vagues pour tout le monde. ` +
      'Le meilleur score de chaque joueur ; ▶ pour regarder sa partie.';
    const box = $('lb-list');
    const c = this.cache[day];
    if (!c || Date.now() - c.t > 30000) box.innerHTML = '<div class="note lbwait">Chargement…</div>';
    let L;
    try { L = c && Date.now() - c.t <= 30000 ? c.L : await this.top(day); } catch (e) {
      if (this.day === day) box.innerHTML = '<div class="note lbwait">Classement inaccessible : vérifiez votre connexion.</div>';
      return;
    }
    if (this.day !== day || !UI.stack.includes('ov-lb')) return;
    if (!L.length) { box.innerHTML = '<div class="note lbwait">Personne n\'a encore publié de score ce jour-là. À vous de jouer !</div>'; return; }
    const me = this.uid();
    box.innerHTML = `<div class="lbl">${L.map((x, i) => `<div class="lbr${x.u === me ? ' me' : ''}"><i>${i + 1}</i><b>${this.esc(x.n)}</b>` +
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
