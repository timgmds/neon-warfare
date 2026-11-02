/* ============================== REPLAYS ==============================
   La simulation solo est déterministe et toute action passe par Act : un replay n'est que la graine, les réglages
   de départ (ou l'état restauré si la partie a été reprise depuis une sauvegarde) et la liste des actions avec leur tick. */
const B64 = {
  enc(str) { const b = new TextEncoder().encode(str); let t = ''; for (let i = 0; i < b.length; i += 8192) t += String.fromCharCode.apply(null, b.subarray(i, i + 8192)); return btoa(t); },
  dec(b64) { const bin = atob(String(b64).replace(/\s+/g, '')); return new TextDecoder().decode(Uint8Array.from(bin, c => c.charCodeAt(0))); }
};
const Replay = {
  MAX: 6,   // replays gardés (les plus récents)
  // début d'enregistrement : nouvelle partie solo
  record() {
    if (!G || G.net || G.demo || G.replay) return;
    G.rec = { v: VERSION, o: { diff: G.diffKey, seed: G.seed, portrait: G.portrait, gm: G.gm, cus: G.cus, perks: Object.assign({}, G.perks), doctrine: G.doctrine,
      events: G.events, autoWave: G.autoWave, daily: G.daily || null }, a: [] };
  },
  // partie reprise depuis une sauvegarde : le replay repart de cet état
  resumed(s) {
    if (!G || G.net || G.demo) return;
    const base = Object.assign({}, s); delete base.rec;
    G.rec = { v: VERSION, o: { diff: G.diffKey, gm: G.gm, daily: G.daily || null }, base: JSON.parse(JSON.stringify(base)), from: G.waveNum + 1, a: [] };
  },
  note(type, a) { if (G.rec) G.rec.a.push([G.tick, type, ...a]); },
  // fin de partie solo : le replay rejoint la liste, lié à l'entrée d'historique
  keep(rid) {
    const r = G.rec; if (!r) return;
    r.end = { w: G.waveNum, k: G.stats.kills, t: G.tick }; r.id = rid; r.d = Date.now();
    const L = (Store.data.reps || []).filter(x => x.id !== rid); L.unshift(r);
    while (L.length > this.MAX || (L.length > 1 && JSON.stringify(L).length > 1.5e6)) L.pop();
    Store.data.reps = L; Store.save();
  },
  get(rid) { return (Store.data.reps || []).find(x => x.id === rid) || null; },
  code(r) { return 'NWR1:' + B64.enc(JSON.stringify(r)); },
  read(code) {
    const m = /^NWR1:([A-Za-z0-9+/=\s]+)$/.exec(String(code || '').trim()); if (!m) return null;
    try { const r = JSON.parse(B64.dec(m[1])); return r && r.o && Array.isArray(r.a) && (r.base || r.o.seed != null) ? r : null; } catch (e) { return null; }
  },
  // lecture
  play(r) {
    if (G && !G.over && !G.demo && Game.state === 'play') { UI.toast('Partie en cours', 'Quittez d\'abord la partie en cours pour regarder un replay.', '#ff2a6d', 3); return; }
    UI.closeAll();
    const rp = { a: r.a, i: 0, end: r.end || null, v: r.v, mul: 1, paused: false, rec: r };
    if (r.base) {
      Demo.stop(); Game.unpack(JSON.parse(JSON.stringify(r.base))); G.replay = rp; G.rec = null; Game.start(false);
      if (G.cardQ > 0 && !G.offer) G.offer = Cards.roll();   // comme au chargement d'une sauvegarde
    } else {
      const o = r.o;
      Game.newGame(o.diff, { seed: o.seed, portrait: o.portrait, gm: o.gm, cus: o.cus, perks: o.perks, doctrine: o.doctrine, events: o.events, autoWave: o.autoWave,
        daily: !!o.daily, dailyDate: o.daily || undefined, replay: rp });
    }
    if (r.v !== VERSION) UI.toast('Replay d\'une autre version', `Enregistré en v${r.v}, vous avez la v${VERSION} : il peut s'écarter de la partie d'origine.`, '#ffd23f', 6);
    UI.replayBar(true);
  },
  // avant chaque tick : les actions enregistrées à ce tick
  feed() {
    const R = G.replay, A = R.a;
    while (R.i < A.length && A[R.i][0] <= G.tick) { const x = A[R.i++]; Act.run(null, x[1], x.slice(2)); }
  },
  finish() {
    const R = G.replay, e = R.end, same = e && e.w === G.waveNum && e.k === G.stats.kills;
    UI.replayBar(false);
    $('rpe-sub').innerHTML = e ? (same ? `Partie rejouée à l'identique : vague <b>${G.waveNum}</b>, <b>${fmt(G.stats.kills)}</b> éliminations. <span style="color:#39ff88">✓ fidèle</span>`
      : `Le replay s'est écarté de l'original (vague ${G.waveNum} au lieu de ${e.w}${R.v !== VERSION ? ', version différente' : ''}).`) : `Fin du replay : vague <b>${G.waveNum}</b>.`;
    $('rpe-again').onclick = () => { const r = R.rec; Game.quit(false); this.play(r); };
    $('rpe-code').onclick = () => UI.openXfer('rpexp', R.rec);
    $('rpe-menu').onclick = () => { UI.close('ov-rpend'); Game.quit(false); };
    UI.open('ov-rpend');
  }
};

