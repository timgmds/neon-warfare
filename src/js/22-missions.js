/* ============================== MISSIONS ============================== */
const MDEF = Object.fromEntries(MISSIONS.map(m => [m.id, m]));
const Missions = {
  target(m) {
    const w = Math.max(1, G.waveNum);
    if (m.id === 'level') return Math.min(10, 5 + Math.floor(w / 8));
    if (m.fixed) return m.base;
    const n = m.base * (1 + w / 12);
    return n >= 1000 ? Math.round(n / 100) * 100 : n >= 20 ? Math.round(n / 5) * 5 : Math.round(n);
  },
  avail(m) {
    if (G.missions.some(x => x.id === m.id) || m.id === G.mLast) return false;
    if (m.from && G.waveNum + 1 < m.from) return false;
    if (m.near && 5 - (G.waveNum % 5) > 3) return false;
    if (m.need && !m.need()) return false;
    return true;
  },
  fill() {
    if (!G || G.demo) return;
    while (G.missions.length < 3) {
      const pool = MISSIONS.filter(m => this.avail(m));
      if (!pool.length) break;
      const m = spick(pool), nano = sr() < .35;
      G.missions.push({
        id: m.id, n: this.target(m), p: 0, xp: 25 + Math.round(Math.min(30, G.waveNum * 1.2)),
        nano: nano ? 2 + (G.waveNum >= 15 ? 1 : 0) : 0, cash: nano ? 0 : Math.round((60 + 15 * G.waveNum) / 10) * 10
      });
    }
    UI.missionsDirty = true;
  },
  on(ev, val = 1, e) {
    if (!G || G.demo || G.over) return;
    const L = G.missions;
    for (let i = L.length - 1; i >= 0; i--) {
      const s = L[i], m = MDEF[s.id];
      if (!m || m.ev !== ev || (m.f && !(e && m.f(e)))) continue;
      const before = s.p;
      s.p = m.max ? Math.max(s.p, val) : s.p + val;
      if (s.p !== before) UI.missionsDirty = true;
      if (s.p >= s.n) this.complete(i);
    }
  },
  complete(i) {
    const s = G.missions.splice(i, 1)[0], m = MDEF[s.id];
    gain(s.cash, null); G.nanites += s.nano; G.stats.missions++;
    if (!G.replay) Store.data.meta.frags += 1;
    const xp = Math.round(s.xp * Cmd.mult());
    UI.toast('Mission accomplie', `${m.d(s.n)}<br><b style="color:${s.nano ? 'var(--nano)' : 'var(--gold)'}">${s.nano ? '+' + s.nano + ' ◈' : '+' + s.cash + '¢'}</b> · <b style="color:var(--gold)">+${xp} XP</b> · <span class="frags">+1 ✦</span>`, '#39ff88', 3.5);
    Sfx.play('mission');
    UI.missionFlash = performance.now();
    G.mLast = s.id;
    Cmd.gain(xp);
    this.fill();
  }
};

