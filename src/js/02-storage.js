/* ============================== STORAGE ============================== */
const Store = {
  KEY: 'neonwarfare8',
  data: null,
  defaults() {
    return {
      settings: { sfx: .6, music: .3, musicStyle: 'arena', quality: 'auto', theme: 'theme-cyber', gfx: 'neo', snd: 'neo', calm: false, cb: false, crt: true, dmgNums: true, autoWave: false, shake: true, fps: false, demo: true, events: true },
      meta: { frags: 0, perks: {} }, ach: {}, records: {}, daily: {}, stats: { recycled: 0, games: 0, kills: 0 }, save: null, tuto: false,
      cmd: { lvl: 1, xp: 0 }, doctrine: 'standard', codex: { e: {}, t: {} }, mv: 9
    };
  },
  load() {
    let d = null;
    try { d = JSON.parse(localStorage.getItem(this.KEY)); } catch (e) { d = null; }
    const def = this.defaults();
    if (!d || typeof d !== 'object') { this.data = def; return; }
    this.data = Object.assign(def, d);
    this.data.settings = Object.assign(this.defaults().settings, d.settings || {});
    this.data.meta = Object.assign({ frags: 0, perks: {} }, d.meta || {});
    this.data.stats = Object.assign(this.defaults().stats, d.stats || {});
    this.data.cmd = Object.assign({ lvl: 1, xp: 0 }, d.cmd || {});
    this.data.codex = Object.assign({ e: {}, t: {} }, d.codex || {});
    // v9 : la nouvelle musique « Arena 80s » devient la musique par défaut, une fois
    if (!d.mv) { this.data.settings.musicStyle = 'arena'; this.data.mv = 9; }
    if (!MUSIC_STYLES[this.data.settings.musicStyle]) this.data.settings.musicStyle = 'arena';
  },
  save() { try { localStorage.setItem(this.KEY, JSON.stringify(this.data)); } catch (e) { /* stockage indisponible */ } },
  get s() { return this.data.settings; }
};

