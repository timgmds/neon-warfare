/* ============================== RÉSEAU ==============================
   Pair-à-pair WebRTC, jusqu'à 4 joueurs en étoile : chaque invité est relié à l'hôte, qui relaie les messages.
   Pour se trouver, deux possibilités :
   - code de salon (NEON-ABCD, ou un code choisi par l'hôte) : quatre serveurs publics gratuits (PeerJS et trois
     serveurs MQTT) relaient la poignée de main en parallèle, ensuite tout passe en direct entre les navigateurs ;
     si la liaison directe est impossible ou tombe en cours de partie, les serveurs MQTT servent de relais ;
   - connexion manuelle : offre et réponse échangées par copier-coller, sans aucun service extérieur
     (fonctionne en réseau local sans internet), une invitation par joueur. */
const NET_ICE = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }, { urls: 'stun:stun.cloudflare.com:3478' }, { urls: 'stun:global.stun.twilio.com:3478' }];
const NET_ALPHA = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const NET_PREFIX = 'neonwarfare9x';
// serveurs MQTT publics (WebSocket) utilisés en plus de PeerJS pour la mise en relation
const NET_MQTT = [
  { n: 'Mosquitto', url: 'wss://test.mosquitto.org:8081/mqtt' },
  { n: 'Shiftr', url: 'wss://public.cloud.shiftr.io/mqtt', user: 'public', pass: 'public' },
  { n: 'EMQX', url: 'wss://broker.emqx.io:8084/mqtt' }
];
const NET_TOPIC = 'neonwarfare/v9/';
// mini-client MQTT 3.1.1 : connexion, abonnement et publication en QoS 0, rien de plus
const Mqtt = {
  enc: new TextEncoder(), dec: new TextDecoder(),
  vint(n) { const o = []; do { let b = n % 128; n = Math.floor(n / 128); if (n) b |= 128; o.push(b); } while (n); return o; },
  str(s) { const b = this.enc.encode(s); return [b.length >> 8, b.length & 255, ...b]; },
  pkt(h, body) { return new Uint8Array([h, ...this.vint(body.length), ...body]); },
  connect(id, user, pass) { return this.pkt(0x10, [...this.str('MQTT'), 4, 0x02 | (user ? 0x80 : 0) | (pass ? 0x40 : 0), 0, 60, ...this.str(id), ...(user ? this.str(user) : []), ...(pass ? this.str(pass) : [])]); },
  sub(topics) { return this.pkt(0x82, [0, 1, ...topics.flatMap(t => [...this.str(t), 0])]); },
  pub(topic, txt) { return this.pkt(0x30, [...this.str(topic), ...this.enc.encode(txt)]); },
  unpub(b) { const n = (b[0] << 8) | b[1]; return [this.dec.decode(b.subarray(2, 2 + n)), this.dec.decode(b.subarray(2 + n))]; },
  // découpe le flux reçu en paquets complets (un paquet peut arriver en plusieurs morceaux)
  read(ch, chunk) {
    let b = new Uint8Array(ch.buf.length + chunk.length); b.set(ch.buf); b.set(chunk, ch.buf.length);
    const out = [];
    while (b.length >= 2) {
      let rem = 0, mul = 1, i = 1, ok = false;
      for (; i < 5 && i < b.length; i++) { rem += (b[i] & 127) * mul; mul *= 128; if (!(b[i] & 128)) { ok = true; break; } }
      if (!ok || b.length < i + 1 + rem) break;
      out.push([b[0] >> 4, b.subarray(i + 1, i + 1 + rem)]);
      b = b.subarray(i + 1 + rem);
    }
    ch.buf = b;
    return out;
  }
};
const NET_MAX = 4;   // joueurs par salon, hôte compris
const NET_LOST = 20000;   // sans aucune nouvelle d'un joueur (ni direct, ni relais) pendant 20 s : il est considéré comme parti
// messages qu'un invité adresse à tous : l'hôte les fait suivre aux autres invités
const NET_RELAY = new Set(['chat', 'emote', 'st', 'send', 'dead', 'cur', 'surv', 'mark']);
const Net = {
  on: false, coop: false, versus: false, me: 0, role: null, chans: [], gid: '', sess: '', gotAnswer: false, code: '', custom: false,
  status: '', err: false, ping: 0, timers: [], links: [], pumpT: 0, pingT: 0,
  // un lien = une connexion WebRTC ; p = numéro du joueur à l'autre bout (côté hôte), 0 = l'hôte (côté invité)
  get connected() { return this.links.some(l => l.open); },
  supported() { return typeof RTCPeerConnection !== 'undefined' && typeof WebSocket !== 'undefined' && !this.sandboxed(); },
  // aperçus intégrés (ex. claude.ai) : les connexions directes y sont bloquées
  sandboxed() { try { return !!(window.claude && window.claude.hot) || window.top !== window.self && /claude/.test(document.referrer + location.hostname); } catch (e) { return true; } },
  setStatus(s, err = false) { this.status = s; this.err = err; if (UI.top() === 'ov-mp') UI.renderMP(); },
  later(fn, ms, every) { const id = every ? setInterval(fn, ms) : setTimeout(fn, ms); this.timers.push([id, every]); return id; },
  cleanCode(c) { return String(c || '').toUpperCase().replace(/^\s*NEON-?/, '').replace(/[^A-Z0-9]/g, ''); },

  /* ----- mise en relation : 4 serveurs publics en parallèle (PeerJS + 3 serveurs MQTT), le premier qui répond suffit.
     Ils ne transportent que l'offre et la réponse WebRTC (descriptions complètes, sans candidats séparés) ;
     ensuite tout passe en direct entre les navigateurs. Si un réseau bloque l'un d'eux, les autres prennent le relais. ----- */
  sigOpen() {
    this.sigClose();
    this.gid = this.gid || Math.random().toString(36).slice(2, 12);
    this.chans = [this.chanPeer()].concat(NET_MQTT.map(c => this.chanMqtt(c)));
    let n = 0;
    this.later(() => { n++; for (const c of this.chans) if (c.n === 'PeerJS' || n % 6 === 0) c.ping(); }, 5000, true);
    this.later(() => this.sigCheck(), 8000);
  },
  sigClose() { for (const c of this.chans) c.close(); this.chans = []; },
  sigUp() { return this.chans.filter(c => c.up).length; },
  sigSend(to, m) { for (const c of this.chans) if (c.up) c.send(to, m); },
  // aucun serveur joignable au bout de quelques secondes : on le dit clairement
  sigCheck() {
    if (this.sigUp() || this.connected) return;
    if (this.role === 'host' && !this.on) { UI.mpState = 'home'; this.setStatus('Aucun serveur de mise en relation n\'est joignable depuis ce réseau (pare-feu, bloqueur de publicités, réseau filtré ?). Essayez un autre réseau ou la connexion manuelle.', true); }
    else if (this.role === 'guest') this.setStatus('Aucun serveur de mise en relation n\'est joignable depuis ce réseau (pare-feu, bloqueur de publicités, réseau filtré ?). Essayez un autre réseau ou la connexion manuelle.', true);
  },
  chanUp(ch) {
    ch.fails = 0;
    if (this.role === 'host') { if (!this.on) { this.setStatus(''); this.startSession(); } else if (UI.top() === 'ov-mp' && UI.mpState === 'lobby') UI.renderMP(); }
    else if (this.role === 'guest' && !this.connected) {
      const L = this.links[0];
      if (!L) this.attempt(1);
      else if (L.offer) ch.send('h', { type: 'OFFER', cid: L.cid, sdp: L.offer });   // serveur arrivé après l'envoi de l'offre
    }
  },
  // un serveur a coupé : nouvel essai tant qu'on en a besoin (de plus en plus espacé)
  chanDown(ch) {
    if (ch.dead || !this.role) return;
    ch.fails = (ch.fails || 0) + 1;
    // pendant une session, un serveur peut servir de relais : on le rouvre vite
    this.later(() => { if (!ch.dead && !ch.ws) ch.open(); }, Math.min(this.on ? 4000 : 15000, 2000 * ch.fails));
    if (this.role === 'host' && UI.top() === 'ov-mp' && UI.mpState === 'lobby') UI.renderMP();
  },
  // un autre salon utilise déjà ce code
  taken() {
    if (this.role !== 'host' || MP.count() > 1) return;   // des invités sont déjà là : on garde le salon
    if (this.custom) { const c = this.code; this.reset(); UI.mpState = 'home'; this.setStatus(`Le code NEON-${c} est déjà utilisé : choisissez-en un autre.`, true); }
    else { UI.mpState = 'host'; this.host(); }
  },
  onSig(m, from) {
    if (!m) return;
    if (m.type === 'D') { this.onRelay(m, from); return; }
    if (m.type === 'R') { if (this.role === 'host' && from && m.cid) this.relayAccept(from, m.cid); return; }
    if (!m.cid || !m.sdp) return;
    if (this.role === 'host' && m.type === 'OFFER' && from) this.acceptOffer(from, m.cid, m.sdp);
    else if (this.role === 'guest' && m.type === 'ANSWER') {
      const re = /^(.+)_r\d+$/.exec(m.cid);
      if (re) {   // réponse à une tentative de rétablir la liaison directe
        const L = this.links.find(l => l.cid === re[1]);
        if (L && L.up && L.up.cid === m.cid && !L.up.has) { L.up.has = true; L.up.pc.setRemoteDescription(m.sdp).catch(() => {}); }
        return;
      }
      const L = this.links.find(l => l.cid === m.cid);
      if (!L || !L.pc || L.hasRemote) return;   // même réponse reçue par plusieurs serveurs
      L.hasRemote = true; this.gotAnswer = true;
      L.pc.setRemoteDescription(m.sdp).catch(() => { L.hasRemote = false; });
      // le salon a répondu : si la liaison directe ne s'ouvre pas vite, on passe par le relais
      this.later(() => { if (!L.open && L.fallback) L.fallback(); }, 5000);
    }
  },
  // serveur PeerJS : il n'accepte que des messages au format exact de la bibliothèque PeerJS
  chanPeer() {
    const ch = { n: 'PeerJS', up: false, ws: null, dead: false, was: false };
    ch.open = () => {
      const id = this.role === 'host' ? NET_PREFIX + this.code : 'nwc' + this.gid;
      let ws;
      try { ws = new WebSocket(`wss://0.peerjs.com/peerjs?key=peerjs&id=${encodeURIComponent(id)}&token=${Math.random().toString(36).slice(2)}&version=1.5.4`); }
      catch (e) { this.chanDown(ch); return; }
      ch.ws = ws;
      ws.onmessage = ev => {
        let m; try { m = JSON.parse(ev.data); } catch (e) { return; }
        const p = m.payload;
        if (m.type === 'OPEN') { ch.up = true; ch.was = true; this.chanUp(ch); }
        else if (m.type === 'ID-TAKEN') { if (this.role === 'host' && !ch.was) this.taken(); else try { ws.close(); } catch (e) { /* ignore */ } }   // ancienne inscription pas encore expirée : on réessaiera
        else if (m.type === 'OFFER' && p) this.onSig({ type: 'OFFER', cid: p.connectionId, sdp: p.sdp }, String(m.src || '').replace(/^nwc/, ''));
        else if (m.type === 'ANSWER' && p) this.onSig({ type: 'ANSWER', cid: p.connectionId, sdp: p.sdp }, 'h');
      };
      ws.onclose = () => { if (ch.ws !== ws) return; ch.ws = null; ch.up = false; this.chanDown(ch); };
    };
    ch.send = (to, m) => {
      if (!ch.ws || ch.ws.readyState !== 1 || (m.type !== 'OFFER' && m.type !== 'ANSWER')) return;
      const payload = { sdp: m.sdp, type: 'data', connectionId: m.cid };
      if (m.type === 'OFFER') Object.assign(payload, { label: m.cid, reliable: true, serialization: 'binary' });
      ch.ws.send(JSON.stringify({ type: m.type, payload, dst: to === 'h' ? NET_PREFIX + this.code : 'nwc' + to }));
    };
    ch.ping = () => { if (ch.ws && ch.ws.readyState === 1) ch.ws.send('{"type":"HEARTBEAT"}'); };
    ch.close = () => { ch.dead = true; ch.up = false; const w = ch.ws; ch.ws = null; if (w) { w.onclose = null; try { w.close(); } catch (e) { /* ignore */ } } };
    ch.open();
    return ch;
  },
  // serveur MQTT public : l'hôte écoute « …/CODE/h », chaque invité « …/CODE/g/<id> » ; « …/CODE/who » détecte un code déjà pris
  chanMqtt(cfg) {
    const ch = { n: cfg.n, up: false, ws: null, dead: false, buf: null };
    const base = NET_TOPIC + this.code + '/', mine = this.role === 'host' ? base + 'h' : base + 'g/' + this.gid, who = base + 'who';
    ch.open = () => {
      let ws;
      try { ws = new WebSocket(cfg.url, 'mqtt'); } catch (e) { this.chanDown(ch); return; }
      ws.binaryType = 'arraybuffer'; ch.ws = ws; ch.buf = new Uint8Array(0);
      ws.onopen = () => ws.send(Mqtt.connect('nw' + Math.random().toString(36).slice(2, 12), cfg.user, cfg.pass));
      ws.onmessage = ev => {
        for (const [type, body] of Mqtt.read(ch, new Uint8Array(ev.data))) {
          if (type === 2) {   // CONNACK
            if (body[1] !== 0) { try { ws.close(); } catch (e) { /* ignore */ } return; }
            ws.send(Mqtt.sub(this.role === 'host' ? [mine, who] : [mine]));
          } else if (type === 9) {   // SUBACK : prêt
            ch.up = true;
            if (this.role === 'host') ws.send(Mqtt.pub(who, JSON.stringify({ type: 'WHO', s: this.sess })));
            this.chanUp(ch);
          } else if (type === 3) {   // PUBLISH reçu
            const [topic, txt] = Mqtt.unpub(body);
            let m; try { m = JSON.parse(txt); } catch (e) { continue; }
            if (topic === who) {
              if (m.type === 'WHO' && m.s !== this.sess && this.on) ws.send(Mqtt.pub(who, JSON.stringify({ type: 'HERE', to: m.s })));
              else if (m.type === 'HERE' && m.to === this.sess) this.taken();
            } else if (topic === mine) this.onSig(m, m.from);
          }
        }
      };
      ws.onclose = () => { if (ch.ws !== ws) return; ch.ws = null; ch.up = false; this.chanDown(ch); };
    };
    ch.send = (to, m) => { if (ch.up && ch.ws && ch.ws.readyState === 1) ch.ws.send(Mqtt.pub(to === 'h' ? base + 'h' : base + 'g/' + to, JSON.stringify(Object.assign({ from: this.role === 'host' ? 'h' : this.gid }, m)))); };
    ch.ping = () => { if (ch.ws && ch.ws.readyState === 1) ch.ws.send(new Uint8Array([0xC0, 0])); };
    ch.close = () => {
      ch.dead = true; ch.up = false; const w = ch.ws; ch.ws = null;
      if (w) { w.onclose = null; try { if (w.readyState === 1) w.send(new Uint8Array([0xE0, 0])); w.close(); } catch (e) { /* ignore */ } }
    };
    ch.open();
    return ch;
  },
  /* ----- liens ----- */
  newLink(o) {
    const L = Object.assign({ pc: null, dc: null, cid: 'dc_' + Math.random().toString(36).slice(2, 13), src: null, p: 0, adm: false, t0: performance.now(), hasRemote: false, open: false, ping: 0,
      dcUp: false, stale: false, tx: 1, rx: 1, q: [], buf: new Map(), lastRx: performance.now(), ackDue: false, ackT: 0, up: null }, o);
    this.links.push(L); return L;
  },
  dropLink(L) {
    const i = this.links.indexOf(L); if (i >= 0) this.links.splice(i, 1);
    if (L.dc) { L.dc.onclose = L.dc.onmessage = L.dc.onopen = null; try { L.dc.close(); } catch (e) { /* ignore */ } }
    if (L.pc) { L.pc.onconnectionstatechange = null; try { L.pc.close(); } catch (e) { /* ignore */ } }
    if (L.up) { try { L.up.pc.close(); } catch (e) { /* ignore */ } }
    L.dc = L.pc = L.up = null; L.open = false; L.dcUp = false;
  },
  makePC(L, upgrade = false) {
    const pc = new RTCPeerConnection({ iceServers: NET_ICE });
    if (!upgrade) L.pc = pc;
    pc.onconnectionstatechange = () => this.pcState(L, pc);
    return pc;
  },
  pcState(L, pc) {
    const st = pc.connectionState;
    if (L.pc !== pc) {   // tentative de rétablissement de la liaison directe qui échoue
      if ((st === 'failed' || st === 'closed') && L.up && L.up.pc === pc) { L.up = null; try { pc.close(); } catch (e) { /* ignore */ } }
      return;
    }
    if (L.open) {
      if (st === 'failed' || st === 'closed') this.dcDown(L);
      else if (st === 'disconnected') this.setStale(L);
      return;
    }
    if (st !== 'failed') return;
    if (this.role === 'host') this.dropLink(L);
    else if (L.fallback) L.fallback();
  },
  bindDC(L, dc, pc) {
    if (L.pc === pc) L.dc = dc;
    dc.onopen = () => {
      if (!this.links.includes(L)) { try { dc.close(); } catch (e) { /* ignore */ } return; }
      if (L.pc !== pc) {   // liaison directe rétablie : elle remplace l'ancienne
        const od = L.dc, op = L.pc;
        if (od && od !== dc) { od.onclose = od.onmessage = od.onopen = null; try { od.close(); } catch (e) { /* ignore */ } }
        if (op) { op.onconnectionstatechange = null; try { op.close(); } catch (e) { /* ignore */ } }
        L.pc = pc;
      }
      if (L.up && L.up.pc === pc) L.up = null;
      else if (L.up) { try { L.up.pc.close(); } catch (e) { /* ignore */ } L.up = null; }
      L.dc = dc; L.dcUp = true; L.dcWas = true; L.stale = false;
      if (!L.open) { this.opened(L); return; }
      // retour à la liaison directe : ce qui n'est pas encore confirmé repart par là
      for (const e of L.q) if (!this.dcSend(L, e)) break;
      if (L.relayT) { L.relayT = 0; if (MP.live) UI.toast('Liaison directe rétablie', 'La partie ne passe plus par le serveur relais.', '#39ff88', 3); }
    };
    dc.onclose = () => {
      if (L.dc !== dc || !L.open) return;
      // fermeture nette alors que le réseau tenait : l'autre a sans doute fermé son onglet → délai de grâce court
      const clean = !!L.pc && L.pc.connectionState === 'connected';
      this.dcDown(L);
      if (clean) L.graceT = performance.now();
    };
    dc.onmessage = e => {
      let x; try { x = JSON.parse(e.data); } catch (err) { return; }
      if (x.t) { this.legacy(L); return; }
      this.recv(L, x.s, x.a, x.m, true);
    };
  },
  // la liaison directe d'un lien ouvert est tombée : le relais prend la suite, les messages non confirmés repartent par là
  dcDown(L) {
    const dc = L.dc, pc = L.pc, was = L.dcUp || !!L.dcWas;
    L.dc = L.pc = null; L.dcUp = false; L.stale = false;
    if (dc) { dc.onclose = dc.onmessage = dc.onopen = null; try { dc.close(); } catch (e) { /* ignore */ } }
    if (pc) { pc.onconnectionstatechange = null; try { pc.close(); } catch (e) { /* ignore */ } }
    if (!L.open) return;
    for (const e of L.q) e.at = 0;
    if (!L.relayT) {
      L.relayT = performance.now();
      if (was && MP.live) UI.toast('Liaison directe coupée', this.relayUp() ? 'La partie continue via un serveur relais ; la liaison directe sera retentée.' : 'Tentative de reconnexion…', '#ffd23f', 4);
    }
    this.planUpgrade(L);
  },
  // liaison directe douteuse (plus de nouvelles, état « déconnecté ») : on double les envois par le relais
  setStale(L) { if (L.stale || !L.dcUp) return; L.stale = true; for (const e of L.q) e.at = 0; },
  // un lien ouvert ne donne plus aucune nouvelle (ni direct, ni relais) depuis trop longtemps
  linkLost(L) {
    const was = L.open;
    this.dropLink(L);
    if (!was) return;
    if (this.role === 'guest') this.lost();
    else if (L.adm) MP.onLeave(L.p, 'lost');
  },
  // l'autre joueur a une ancienne version du jeu (messages sans numéro)
  legacy(L) {
    if (L.legacy) return; L.legacy = true;
    const txt = `Versions différentes : tous les joueurs doivent avoir la version ${VERSION} du jeu.`;
    if (this.role === 'host') {
      try { L.dc.send(JSON.stringify({ t: 'chat', p: 0, s: '⚠ ' + txt })); L.dc.send(JSON.stringify({ t: 'busy', p: 0 })); } catch (e) { /* ignore */ }
      setTimeout(() => { const p = L.p, a = L.adm; L.open = false; this.dropLink(L); if (a) MP.onLeave(p, 'bye'); }, 1200);
    } else {
      this.reset(); UI.mpState = 'home'; UI.closeAll(); UI.openMP();
      this.setStatus('L\'hôte utilise une autre version du jeu. ' + txt, true);
    }
  },

  /* ----- transport fiable : chaque message est numéroté et gardé jusqu'à son accusé de réception.
     Il part par la liaison directe (WebRTC) quand elle marche, sinon par le relais : les serveurs MQTT, en parallèle,
     le premier arrivé l'emporte. Si la liaison directe tombe en pleine partie, les messages non confirmés repartent
     par le relais : rien n'est perdu ni rejoué deux fois. ----- */
  relayUp() { return this.chans.some(c => c.up && c.n !== 'PeerJS'); },
  dcOk(L) { return L.dcUp && !!L.dc && L.dc.readyState === 'open'; },
  useRelay(L) { return !this.dcOk(L) || L.stale; },
  relayed() { return this.links.some(l => l.open && this.useRelay(l)); },
  raw(L, m) {
    if (!L || !L.open) return;
    const e = { s: L.tx++, m, at: 0, t0: performance.now() };
    L.q.push(e);
    if (this.dcOk(L)) this.dcSend(L, e);
  },
  dcSend(L, e) {
    try { L.dc.send(JSON.stringify({ s: e.s, a: L.rx - 1, m: e.m })); L.ackDue = false; return true; }
    catch (x) { this.dcDown(L); return false; }
  },
  recv(L, s, a, m, viaDc) {
    const now = performance.now();
    L.lastRx = now;
    if (a != null) { let i = 0; while (i < L.q.length && L.q[i].s <= a) i++; if (i) L.q.splice(0, i); }
    if (viaDc && L.stale && (!L.q.length || now - L.q[0].t0 < 1500)) L.stale = false;
    if (s == null) return;
    L.ackDue = true;
    if (s < L.rx) return;   // doublon (arrivé par les deux chemins, ou renvoyé)
    if (s > L.rx) { if (L.buf.size < 5000) L.buf.set(s, m); return; }
    L.rx++; this.onMsg(L, m);
    while (L.open && L.buf.has(L.rx)) { const x = L.buf.get(L.rx); L.buf.delete(L.rx); L.rx++; this.onMsg(L, x); }
  },
  // relais : lot de messages reçu par un serveur MQTT
  onRelay(m, from) {
    const L = this.links.find(l => l.cid === m.c);
    if (!L || (this.role === 'host' && L.src !== from)) return;
    if (!L.open) { if (this.role !== 'guest' || !L.relayWait) return; L.relayWait = false; this.opened(L); }
    this.recv(L, null, m.a, null, false);
    if (Array.isArray(m.b)) for (const x of m.b) { if (!L.open || !Array.isArray(x)) break; this.recv(L, x[0], null, x[1], false); }
  },
  // envoi par le relais de ce qui est nouveau, ou pas confirmé à temps (délai calé sur la meilleure latence mesurée)
  flush(L, now) {
    if (!this.relayUp()) return;
    const b = [], rto = clamp((L.rttMin || 400) * 1.5 + 100, 200, 1000);
    let tot = 0;
    for (const e of L.q) {
      if (e.at && now - e.at < rto) continue;
      const sz = e.sz || (e.sz = JSON.stringify(e.m).length);
      if (b.length && tot + sz > 200000) break;
      e.at = now; b.push([e.s, e.m]); tot += sz;
      if (b.length >= 150) break;
    }
    if (!b.length && !L.ackDue) return;
    L.ackDue = false; L.ackT = now;
    this.sigSend(this.role === 'host' ? L.src : 'h', { type: 'D', c: L.cid, a: L.rx - 1, b });
  },
  flushAll() { const now = performance.now(); for (const L of this.links) if (L.open && this.useRelay(L)) this.flush(L, now); },
  // appelé en continu (boucle d'affichage, minuterie de secours) : relais, accusés, pings, surveillance des liens
  pump(now = performance.now()) {
    if (!this.role || !this.links.length || now - this.pumpT < 45) return;
    this.pumpT = now;
    for (const L of this.links.slice()) {
      if (!L.open) continue;
      if (now - L.lastRx > NET_LOST || (L.graceT && L.lastRx < L.graceT && now - L.graceT > 6000)) { this.linkLost(L); continue; }
      // liaison directe muette, ou messages non confirmés depuis longtemps : on double par le relais
      if (this.dcOk(L) && !L.stale && (now - L.lastRx > 5000 || (L.q.length && now - L.q[0].t0 > 4000))) this.setStale(L);
      if (this.useRelay(L)) this.flush(L, now);
      else if (L.ackDue && now - L.ackT > 120) { L.ackDue = false; L.ackT = now; try { L.dc.send(JSON.stringify({ a: L.rx - 1 })); } catch (e) { this.dcDown(L); } }
    }
    if (now - this.pingT > 2000) { this.pingT = now; this.pingAll(); }
  },
  // invité : liaison directe impossible alors que le salon a répondu → on demande à l'hôte de passer par le relais
  relayStart(L, fail) {
    L.relayWait = true;
    this.setStatus('Connexion directe impossible entre vos réseaux : passage par un serveur relais…');
    let k = 0;
    const go = () => {
      if (L.open || !L.relayWait || !this.links.includes(L)) return;
      if (++k > 10) { L.relayWait = false; fail(); return; }
      this.sigSend('h', { type: 'R', cid: L.cid });
      this.later(go, 1000);
    };
    go();
  },
  // hôte : un invité demande le relais pour ce lien
  relayAccept(gid, cid) {
    let L = this.links.find(l => l.cid === cid);
    if (L && (L.open || L.src !== gid)) return;
    if (!L) L = this.newLink({ src: gid, cid });
    this.opened(L);
  },
  // invité : sur relais, on retente régulièrement une liaison directe (plus rapide)
  planUpgrade(L) {
    if (this.role !== 'guest' || L.upPlan || L.manual || !this.code) return;
    L.upPlan = true;
    const waits = [10000, 20000, 40000, 80000, 160000];
    let k = 0;
    const go = () => {
      if (!L.open || !this.links.includes(L) || this.dcOk(L) || k >= waits.length) { L.upPlan = false; return; }
      this.upgrade(L, ++k);
      this.later(go, waits[k] || 1);
    };
    this.later(go, waits[0]);
  },
  upgrade(L, k) {
    if (L.up) { try { L.up.pc.close(); } catch (e) { /* ignore */ } }
    const cid = L.cid + '_r' + k, pc = this.makePC(L, true);
    L.up = { cid, pc, has: false };
    this.bindDC(L, pc.createDataChannel('nw', { ordered: true }), pc);
    pc.createOffer().then(o => pc.setLocalDescription(o)).then(() => this.gathered(pc, 2500)).then(() => {
      if (!L.up || L.up.pc !== pc) return;
      const d = pc.localDescription;
      this.sigSend('h', { type: 'OFFER', cid, sdp: { type: d.type, sdp: d.sdp } });
    }).catch(() => {});
    this.later(() => { if (L.up && L.up.pc === pc) { L.up = null; try { pc.close(); } catch (e) { /* ignore */ } } }, 15000);
  },

  /* ----- héberger / rejoindre par code ----- */
  host(code) {
    const want = this.cleanCode(code);
    if (code && !/^[A-Z0-9]{3,12}$/.test(want)) { this.setStatus('Code personnalisé : 3 à 12 lettres ou chiffres.', true); return false; }
    this.reset(); this.role = 'host'; this.me = 0; this.custom = !!want;
    this.code = want || Array.from({ length: 4 }, () => NET_ALPHA[Math.floor(Math.random() * NET_ALPHA.length)]).join('');
    this.sess = Math.random().toString(36).slice(2, 12);
    this.setStatus('Ouverture du salon…');
    this.sigOpen();
    return true;
  },
  // l'hôte ouvre son salon (code ou invitation manuelle) : il y attend ses invités
  startSession(lobby = true) {
    if (this.on) return;
    this.on = true;
    this.keepAlive();
    if (!this.mig) MP.hosted(lobby);
  },
  // pings, relais et surveillance continuent même onglet masqué (minuterie de secours dans un Worker)
  keepAlive() { BG.start(); this.later(() => this.pump(), 250, true); },
  acceptOffer(gid, cid, sdp) {
    const re = /^(.+)_r\d+$/.exec(cid);
    if (re) {   // un invité sur relais retente la liaison directe
      const L = this.links.find(l => l.cid === re[1] && l.open && l.src === gid);
      if (!L) return;
      if (L.up && L.up.cid === cid) { if (L.up.answer) this.sigSend(gid, { type: 'ANSWER', cid, sdp: L.up.answer }); return; }
      if (L.up) { try { L.up.pc.close(); } catch (e) { /* ignore */ } }
      const pc = this.makePC(L, true); L.up = { cid, pc };
      pc.ondatachannel = e => this.bindDC(L, e.channel, pc);
      pc.setRemoteDescription(sdp).then(() => pc.createAnswer()).then(a => pc.setLocalDescription(a)).then(() => this.gathered(pc, 2500)).then(() => {
        if (!L.up || L.up.pc !== pc) return;
        const d = pc.localDescription; L.up.answer = { type: d.type, sdp: d.sdp };
        this.sigSend(gid, { type: 'ANSWER', cid, sdp: L.up.answer });
      }).catch(() => {});
      this.later(() => { if (L.up && L.up.pc === pc) { L.up = null; try { pc.close(); } catch (e) { /* ignore */ } } }, 20000);
      return;
    }
    const dup = this.links.find(l => l.cid === cid);
    if (dup) { if (dup.answer && !dup.open) this.sigSend(gid, { type: 'ANSWER', cid, sdp: dup.answer }); return; }   // même offre reçue par un autre serveur
    for (const l of this.links.filter(l => l.src === gid && !l.open)) this.dropLink(l);   // nouvelle tentative du même invité
    const L = this.newLink({ src: gid, cid });
    const pc = this.makePC(L);
    pc.ondatachannel = e => this.bindDC(L, e.channel, pc);
    pc.setRemoteDescription(sdp).then(() => pc.createAnswer()).then(a => pc.setLocalDescription(a)).then(() => this.gathered(pc, 2500))
      .then(() => {
        if (!this.links.includes(L) || L.pc !== pc) return;
        const d = pc.localDescription; L.answer = { type: d.type, sdp: d.sdp };
        this.sigSend(gid, { type: 'ANSWER', cid, sdp: L.answer });
      })
      .catch(() => { if (!L.open) this.dropLink(L); });
  },
  join(code) {
    code = this.cleanCode(code);
    if (code.length < 3 || code.length > 12) { this.setStatus('Le code fait de 3 à 12 caractères (ex. NEON-K7QX).', true); return; }
    this.reset(); this.role = 'guest'; this.me = 0; this.code = code; this.gotAnswer = false;
    this.setStatus('Connexion aux serveurs de mise en relation…');
    this.sigOpen();
  },
  // une tentative de connexion de l'invité ; jusqu'à 4 essais automatiques ; liaison directe impossible → relais
  attempt(n) {
    if (this.connected || this.role !== 'guest') return;
    for (const l of this.links.slice()) this.dropLink(l);
    const L = this.newLink({ src: 'h' }), up = this.sigUp();
    this.setStatus(n === 1 ? `Recherche du salon NEON-${this.code}… (${up} serveur${up > 1 ? 's' : ''} de mise en relation)` : `Nouvelle tentative (${n}/4)…`);
    const pc = this.makePC(L);
    let done = false;
    const retry = () => {
      if (done || L.open || L.relayWait || this.connected || this.role !== 'guest' || !this.links.includes(L)) return; done = true;
      if (n < 4) this.attempt(n + 1);
      else this.setStatus(this.gotAnswer
        ? 'Le salon a répondu, mais aucune connexion n\'a pu s\'établir, ni directe, ni par un serveur relais. Essayez un autre réseau (partage de connexion du téléphone) ou la connexion manuelle en réseau local.'
        : `Salon NEON-${this.code} introuvable : vérifiez le code et que l'hôte garde la fenêtre du salon ouverte.`, true);
    };
    L.fallback = () => {
      if (L.open || L.relayWait || done || !this.links.includes(L)) return;
      if (L.hasRemote && this.relayUp()) this.relayStart(L, retry); else retry();
    };
    this.bindDC(L, pc.createDataChannel('nw', { ordered: true }), pc);
    pc.createOffer().then(o => pc.setLocalDescription(o)).then(() => this.gathered(pc, 2500)).then(() => {
      if (!this.links.includes(L)) return;
      const d = pc.localDescription; L.offer = { type: d.type, sdp: d.sdp };
      this.sigSend('h', { type: 'OFFER', cid: L.cid, sdp: L.offer });
    }).catch(() => retry());
    this.later(() => L.fallback(), 9000 + n * 2000);
  },

  /* ----- connexion manuelle : codes longs à copier-coller (une invitation par joueur) ----- */
  async manualHost() {
    if (this.role !== 'host') { this.reset(); this.role = 'host'; this.me = 0; this.code = ''; }
    for (const l of this.links.filter(l => !l.open)) this.dropLink(l);   // invitation précédente non utilisée
    const L = this.newLink({ manual: true });
    const pc = this.makePC(L);
    this.bindDC(L, pc.createDataChannel('nw', { ordered: true }), pc);
    await pc.setLocalDescription(await pc.createOffer());
    await this.gathered(pc);
    this.startSession(false);
    return { L, code: await this.pack(pc.localDescription) };
  },
  async manualJoin(code) {
    this.reset(); this.role = 'guest'; this.me = 0;
    const L = this.newLink({ manual: true });
    const pc = this.makePC(L);
    pc.ondatachannel = e => this.bindDC(L, e.channel, pc);
    await pc.setRemoteDescription(await this.unpack(code));
    await pc.setLocalDescription(await pc.createAnswer());
    await this.gathered(pc);
    return this.pack(pc.localDescription);
  },
  async manualFinish(L, code) { if (!L || !L.pc) throw new Error('lien'); await L.pc.setRemoteDescription(await this.unpack(code)); },
  gathered(pc, ms = 4000) {
    return new Promise(res => {
      if (pc.iceGatheringState === 'complete') return res();
      const t = setTimeout(res, ms);
      pc.addEventListener('icegatheringstatechange', () => { if (pc.iceGatheringState === 'complete') { clearTimeout(t); res(); } });
    });
  },
  async pack(desc) {
    const raw = new TextEncoder().encode(JSON.stringify({ t: desc.type, s: desc.sdp }));
    let bytes = raw, tag = 'NW0';
    if (typeof CompressionStream !== 'undefined') {
      try { bytes = new Uint8Array(await new Response(new Blob([raw]).stream().pipeThrough(new CompressionStream('deflate-raw'))).arrayBuffer()); tag = 'NW1'; } catch (e) { bytes = raw; }
    }
    let bin = ''; for (const b of bytes) bin += String.fromCharCode(b);
    return tag + '.' + btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  },
  async unpack(code) {
    const m = /^(NW[01])\.([A-Za-z0-9_-]+)$/.exec(String(code).trim().replace(/\s+/g, ''));
    if (!m) throw new Error('code');
    const b64 = m[2].replace(/-/g, '+').replace(/_/g, '/'), bin = atob(b64 + '==='.slice((b64.length + 3) % 4));
    let bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
    if (m[1] === 'NW1') bytes = new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer());
    const o = JSON.parse(new TextDecoder().decode(bytes));
    return { type: o.t, sdp: o.s };
  },

  /* ----- canal ouvert : messages ----- */
  opened(L) {
    L.open = true; L.lastRx = performance.now();
    if (L.dcUp) L.dcWas = true;
    else L.relayT = performance.now();   // ouvert par le relais
    if (this.role === 'guest') {
      this.on = true; this.status = ''; this.err = false;
      this.keepAlive();
      this.raw(L, { t: 'hello', name: MP.myName(), v: VERSION, doc: MP.myDoc(), perks: MP.myPerks(), prev: MP.prevMe });
      if (!L.dcUp) this.planUpgrade(L);
      if (!this.mig) MP.connected();   // relais de l'hôte : on reste en partie, l'hôte renvoie la partie aussitôt
      return;
    }
    // hôte : une place libre ; pendant une partie, seulement pour reprendre la place d'un joueur parti (coopération)
    if (MP.live) {
      const rp = Net.coop ? MP.rejoinSlot(true) : null;
      if (rp == null) { this.raw(L, { t: 'busy' }); setTimeout(() => this.dropLink(L), 600); return; }
      L.p = rp; L.rj = true;   // la place exacte est choisie à la présentation (ancien numéro, sinon même nom)
      return;
    }
    const used = new Set(this.links.filter(l => l.open && l.adm).map(l => l.p));
    let p = 0; for (let i = 1; i < NET_MAX; i++) if (!used.has(i)) { p = i; break; }
    if (!p) {
      this.raw(L, { t: 'full' });
      setTimeout(() => this.dropLink(L), 600);
      return;
    }
    L.p = p; L.adm = true;
    this.raw(L, { t: 'welcome', you: p, code: this.code });
    MP.admit(p);
  },
  // invité : vers l'hôte ; hôte : vers tous les invités
  send(m) {
    if (this.role === 'host') { m.p = this.me; for (const L of this.links) if (L.adm) this.raw(L, m); }
    else this.raw(this.links[0], m);
  },
  sendTo(p, m) { if (this.role !== 'host') return; m.p = this.me; this.raw(this.links.find(l => l.adm && l.p === p), m); },
  // gros message (état complet d'une partie) : découpé en morceaux de 48 Ko, recollés à l'arrivée
  sendBig(p, m) {
    const str = JSON.stringify(m), N = 48000;
    if (str.length <= N) { this.sendTo(p, m); return; }
    const id = Math.random().toString(36).slice(2, 10), n = Math.ceil(str.length / N);
    for (let i = 0; i < n; i++) this.sendTo(p, { t: 'part', id, i, n, d: str.slice(i * N, (i + 1) * N) });
  },
  pingAll() { const ts = performance.now(); for (const L of this.links) if (L.open) this.raw(L, { t: 'ping', ts }); },
  onMsg(L, m) {
    if (m.t === 'ping') { this.raw(L, { t: 'pong', ts: m.ts }); return; }
    if (m.t === 'pong') {
      L.ping = Math.round(performance.now() - m.ts);
      L.rttMin = Math.min(L.ping, (L.rttMin || L.ping) * 1.1);   // latence de base, hors renvois
      if (this.role === 'guest') { this.ping = L.ping; L.srtt = L.srtt ? L.srtt * .7 + L.ping * .3 : L.ping; Lock.tune(); } else MP.setPing(L.p, L.ping, this.useRelay(L));
      return;
    }
    if (this.role === 'host') {
      if (L.rj) { if (m.t === 'hello') MP.rejoinHello(L, m); return; }   // retour en partie : place attribuée à la présentation
      if (!L.adm) return;   // pas encore admis
      m.p = L.p;   // l'expéditeur est celui du lien, quoi qu'il prétende
      if (m.t === 'f') { Lock.onFrame(m); return; }
      if (NET_RELAY.has(m.t)) for (const o of this.links) if (o !== L && o.adm) this.raw(o, m);
    } else {
      if (m.p == null) m.p = 0;
      if (m.t === 'F') { Lock.onComb(m); return; }
    }
    const h = MP.on[m.t]; if (h) { try { h.call(MP, m); } catch (e) { console.error(e); } }
  },
  // invité : l'hôte est parti, la session est terminée
  lost() {
    if (!this.on) return;
    this.close();
    MP.onLost();
  },
  close() {
    for (const [id, every] of this.timers) every ? clearInterval(id) : clearTimeout(id);
    this.timers = [];
    this.sigClose();
    for (const L of this.links.slice()) this.dropLink(L);
    this.on = false; this.coop = this.versus = false; this.ping = 0;
    BG.stop();
  },
  // relais de l'hôte : nouveau salon (hôte) ou connexion au nouvel hôte (invité), sans toucher à la partie en cours
  rehost(code) { this.close(); this.role = 'host'; this.mig = true; this.code = code; this.custom = true; this.sess = Math.random().toString(36).slice(2, 12); this.coop = true; this.sigOpen(); },
  rejoinRoom(code) { this.close(); this.role = 'guest'; this.mig = true; this.code = code; this.gotAnswer = false; this.coop = true; this.sigOpen(); },
  reset() { this.mig = false; this.close(); this.role = null; this.code = ''; this.custom = false; this.status = ''; this.err = false; this.me = 0; this.gid = ''; this.gotAnswer = false; MP.clear(); }
};

/* ---------- minuterie de secours : un onglet en arrière-plan ne doit pas geler la partie des autres joueurs ---------- */
const BG = {
  w: null, last: 0,
  start() {
    if (this.w || typeof Worker === 'undefined') return;
    try {
      this.w = new Worker(URL.createObjectURL(new Blob(['setInterval(()=>postMessage(0),16)'], { type: 'text/javascript' })));
      this.last = performance.now();
      this.w.onmessage = () => {
        const now = performance.now(), dt = Math.min(250, now - this.last); this.last = now;
        Net.pump(now);
        if (document.hidden && Net.on && Game.state === 'play' && G) { simStep(dt); MP.tick(now); }
      };
    } catch (e) { this.w = null; }
  },
  stop() { if (this.w) { this.w.terminate(); this.w = null; } }
};

/* ---------- lockstep (coopération) : chaque tick n'est calculé qu'une fois connues les actions de tous les joueurs.
   Chaque invité envoie ses actions à l'hôte ; l'hôte les rassemble, fixe l'ordre et renvoie à tous la trame du tick. ---------- */
/* Coopération : l'hôte cadence la partie et ne s'arrête jamais pour attendre un invité.
   - les invités envoient leurs actions seulement quand ils en ont (pas de message à chaque tick) ;
   - l'hôte les place dans le prochain tick qu'il publie (D ticks plus tard) avec les siennes, puis diffuse la trame ;
     les ticks sans action ne sont pas envoyés, seulement un top d'horloge tous les 2 ticks ;
   - chaque invité joue les trames reçues avec un petit tampon contre les à-coups du réseau, et accélère ou
     ralentit très légèrement pour garder ce tampon : un joueur à 200 ms ne fige plus les autres, et lui-même
     voit une partie fluide (simplement décalée de sa latence). */
const Lock = {
  D: 2, sent: -1, combMax: -1, comb: new Map(), out: [], rq: [], sys: [], hashes: new Map(), pend: new Map(),
  stall: 0, hold: false, desync: false, snapWait: null, log: null,
  buf: 4, bufMin: 3, winMin: 1e9, winT: 0, missT: 0, ghosts: [],
  reset(t = 0) {
    this.sent = t + this.D - 1; this.combMax = t + this.D - 1;
    this.comb.clear(); this.out = []; this.rq = []; this.sys = []; this.hashes.clear(); this.pend.clear(); this.ghosts = [];
    this.log = null; MP.base = null;   // la photo de référence sera reprise au prochain moment calme
    this.stall = 0; this.hold = false; this.desync = false; this.snapWait = null;
    this.buf = Math.max(this.bufMin, 4); this.winMin = 1e9; this.winT = 0;
  },
  // invité : le relais MQTT arrive par paquets (toutes les 45 ms), il faut un tampon un peu plus grand
  tune() { this.bufMin = Net.relayed() ? 5 : 3; if (this.buf < this.bufMin) this.buf = this.bufMin; },
  // vérifications locales avant d'envoyer : retour immédiat au joueur (argent, case occupée…)
  pre(type, a) {
    if (type === 'build') {
      if (!Towers.canPlace(a[1], a[2])) { Sfx.play('error'); return false; }
      if (G.money < Towers.costOf(a[0])) { UI.noMoney(); return false; }
      if (!Towers.canPay(a[0])) { Towers.elemMissing(a[0]); return false; }
    } else if (type === 'trap') {
      if (!Traps.canPlace(a[1], a[2]) || Traps.count(a[0]) >= TRAPS[a[0]].max) { Sfx.play('error'); return false; }
      if (G.money < Traps.cost(a[0])) { UI.noMoney(); return false; }
    } else if (type === 'up') {
      const t = Towers.at(a[0], a[1]);
      if (!t || t.level >= Towers.maxLevel(t) || Towers.needsSpec(t)) return false;
      if (G.money < Towers.upCost(t)) { UI.noMoney(); return false; }
      if (t.level >= 10 && G.res.a < OMEGA.abyss) { Sfx.play('error'); return false; }
    } else if (type === 'card' || type === 'reroll') {
      if (Cards.turn() !== Net.me) { Sfx.play('error'); return false; }
    }
    return true;
  },
  push(type, a) {
    if (!this.pre(type, a)) return false;
    this.out.push([type, ...a]);
    // retour immédiat : la tourelle demandée s'affiche en fantôme en attendant son tick
    if (type === 'build' && Net.role === 'guest') this.ghosts.push({ k: a[0], x: a[1], y: a[2], t: performance.now() });
    return true;
  },
  // hôte : actions d'un invité, jouées dans le prochain tick publié
  onFrame(m) { if (Array.isArray(m.c) && m.c.length) this.rq.push([m.p, m.c]); },
  // invité : trame d'un tick telle que fixée par l'hôte (sans « c » : simple top d'horloge, ticks vides jusqu'à k)
  onComb(m) {
    if (m.k <= this.combMax && !m.c) return;
    if (m.c) { this.comb.set(m.k, m.c); if (this.log && MP.base && m.k > MP.base.t) this.log.set(m.k, m.c); }
    if (m.k > this.combMax) this.combMax = m.k;
  },
  // avant le tick t : l'hôte publie les trames jusqu'à t+D ; l'invité envoie ses actions et vérifie qu'il connaît le tick t
  ready(t) {
    if (this.hold) return false;
    if (Net.role === 'host') {
      while (this.sent < t + this.D) {
        const k = ++this.sent, c = [];
        if (this.out.length) c.push([Net.me, this.out.splice(0)]);
        for (const [p, x] of this.rq.splice(0)) if (!MP.out[p]) c.push([p, x]);
        if (this.sys.length) c.push([0, this.sys.splice(0)]);   // événements du salon (départ d'un joueur)
        if (c.length) { this.comb.set(k, c); if (this.log) this.log.set(k, c); }
        this.combMax = k;
        if (c.length) Net.send({ t: 'F', k, c }); else if (k % 2 === 0) Net.send({ t: 'F', k });
      }
      return true;
    }
    if (this.out.length) Net.send({ t: 'f', c: this.out.splice(0) });
    if (this.combMax >= t) return true;
    // à court de trames : on agrandit le tampon (au plus une fois toutes les 300 ms)
    const now = performance.now();
    if (now - this.missT > 300) { this.missT = now; this.buf = Math.min(40, this.buf + 2); }
    return false;
  },
  // invité : vitesse de lecture qui garde environ « buf » ticks d'avance en réserve
  pace(dt) {
    const lead = this.combMax - G.tick;
    this.winMin = Math.min(this.winMin, lead); this.winT += dt;
    if (this.winT > 4000) {   // réserve jamais entamée depuis 4 s : on réduit le tampon (moins de décalage)
      if (this.winMin > 2 && this.buf > this.bufMin) this.buf--;
      this.winT = 0; this.winMin = 1e9;
    }
    const e = lead - this.buf;
    // très en retard (onglet masqué, coupure) : rattrapage rapide
    return e > 30 ? Math.min(8, e / 12) : clamp(1 + e * .04, .85, 1.6);
  },
  exec(t) {
    const c = this.comb.get(t) || []; this.comb.delete(t);
    for (const [p, cmds] of c) for (const x of cmds) Act.run(p, x[0], x.slice(1));
    if (this.ghosts.length) { const now = performance.now(); this.ghosts = this.ghosts.filter(g => now - g.t < 3000 && !Towers.at(g.x, g.y)); }
  },
  // empreinte de l'état : comparée régulièrement pour détecter une désynchronisation
  hash() {
    let h = (G.rs ^ Math.imul(G.tick, 2654435761) ^ Math.round(G.lives * 100)) | 0;
    for (const e of G.enemies) if (e.alive) h = (Math.imul(h, 31) + Math.round(e.hp) + Math.round(e.dist)) | 0;
    for (const w of G.wallets || []) h = (Math.imul(h, 17) + Math.round(w)) | 0;
    for (const w of G.resW || []) h = (Math.imul(h, 13) + (w.p | 0) * 7 + (w.a | 0) + (w.q | 0) * 3) | 0;
    return (h ^ G.towers.length) >>> 0;
  },
  check(t) {
    if (t % 120 !== 0) return;
    const v = this.hash();
    if (Net.role === 'host') {
      this.hashes.set(t, v); if (this.hashes.size > 30) this.hashes.delete(this.hashes.keys().next().value);
      for (const [key, pv] of this.pend) if (key.endsWith(':' + t)) { this.pend.delete(key); if (pv !== v) MP.flagDesync(); }
    }
    else Net.send({ t: 'h', k: t, v });
  }
};

