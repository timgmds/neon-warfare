/* ============================== CODEX ============================== */
const Codex = {
  keys() { return { e: Object.keys(ENEMIES).concat(Object.keys(BOSSES)), t: Object.keys(TOWERS) }; },
  see(kind, key) {
    if (!G || G.demo) return;
    const C = Store.data.codex[kind];
    if (C[key]) return;
    C[key] = Date.now(); Store.save();
    const K = this.keys();
    if (K.e.every(k => Store.data.codex.e[k]) && K.t.every(k => Store.data.codex.t[k])) Ach.unlock('codex');
  },
  progress() { const K = this.keys(), C = Store.data.codex; return [K.e.filter(k => C.e[k]).length + K.t.filter(k => C.t[k]).length, K.e.length + K.t.length]; }
};

