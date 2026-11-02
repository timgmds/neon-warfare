/* ============================== CAPACITÉS ============================== */
const Abil = {
  keys: ['orbital', 'emp', 'overdrive'],
  unlocked(k) { const a = ABILS[k]; return !a.skill || (G.skills[a.skill] || 0) > 0; },
  cdMax(k) { return Math.round(ABILS[k].cd * G.mod.abilCd * (k === 'orbital' ? G.mod.orbCd : 1)); },
  orbDmg() { return 320 * Waves.hpMul(Math.max(1, G.waveNum)) * G.mod.orbDmg; },
  trigger(k) {
    if (!G || G.over || Game.state !== 'play') return;
    if (!this.unlocked(k)) {
      UI.toast(ABILS[k].n, `Verrouillée : débloquez « ${SKILLS[ABILS[k].skill].n} » dans l'Arbre de compétences.`, ABILS[k].color, 3);
      Sfx.play('error'); return;
    }
    if (G.abil[k] > 0) { Sfx.play('error'); return; }
    if (ABILS[k].targeted) { UI.setTargeting(UI.targeting === k ? null : k); return; }
    Act.do('abil', k);
  },
  use(k, x, y) {
    G.abil[k] = this.cdMax(k);
    G.used[k] = 1;
    if (G.used.orbital && G.used.emp && G.used.overdrive) Ach.unlock('overdrive');
    if (k === 'orbital') {
      Strikes.add(x, y, ABILS.orbital.radius, this.orbDmg(), null, ABILS.orbital.color, 45, true);
      Sfx.play('nuke');
    } else if (k === 'emp') {
      for (const e of G.enemies) { if (!e.alive || e.d.noSlow) continue; e.freezeT = e.d.slowRes ? Math.round(90 * e.d.slowRes) : e.boss ? 90 : 180; FX.spark(e.x, e.y, '#bff4ff', 4, 1.5); }
      const M = G.map;
      FX.ring(M.C * TILE / 2, M.R * TILE / 2, '#3ad7ff', Math.max(M.C, M.R) * TILE * .7, 40, 6, 20);
      Render.flash(.45, '#3ad7ff'); Sfx.play('freeze');
      UI.banner('CRYO-BOMBE', 'ENNEMIS GELÉS', '#3ad7ff');
    } else if (k === 'overdrive') {
      G.overdriveT = ABILS.overdrive.dur;
      for (const t of G.towers) { t.heat = 0; t.over = false; }
      Render.flash(.3, '#ffae00'); Sfx.play('upgrade');
      UI.banner('SURCHARGE', 'CADENCE x2 · SANS SURCHAUFFE', '#ffae00');
    }
    UI.refreshAbils(true);
  },
  update() {
    for (const k of this.keys) if (G.abil[k] > 0) G.abil[k]--;
    if (G.overdriveT > 0) G.overdriveT--;
  }
};

