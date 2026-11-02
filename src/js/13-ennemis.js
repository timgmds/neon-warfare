/* ============================== ENNEMIS ============================== */
const Enemies = {
  spawn(type, o = {}) {
    const d = EDEF(type), elite = !!o.elite, mu = G.mut, hm = (o.hpMul || 1) * (elite ? 3 : 1) * (d.boss ? mu.bossHp * G.mod.bossHp : 1) * G.mod.ehp;
    const e = {
      id: G.nextId++, type, d, alive: true, boss: !!d.boss, air: !!d.air, stealth: !!d.stealth, elite,
      hp: d.hp * hm, maxHp: d.hp * hm, shield: (d.shield || 0) * hm, maxShield: (d.shield || 0) * hm,
      armor: ((d.armor || 0) + mu.armorAdd + G.mod.earmor) * mu.armor * Math.sqrt(o.hpMul || 1), spd: d.spd * mu.spd * G.mod.espd * (1 + Math.min(.35, Math.max(0, (o.wave || G.waveNum) - 25) * .01)), r: d.r * (elite ? 1.25 : 1),
      dist: o.dist || 0, seg: 0, x: 0, y: 0, px: 0, py: 0, ang: 0, pi: G.map.P[o.pi] ? o.pi : 0, rem: 0,
      slowT: 0, slowF: 1, burnT: 0, burnDps: 0, burnSrc: null, freezeT: 0, revealT: 0, markT: 0, markV: 0, hitT: 0, shCd: 0,
      wave: o.wave || 0, bounty: d.bounty * (elite ? 3 : 1), ph: sr() * TAU,
      tA: d.summon ? d.summon.every : d.heal ? 60 : srndi(90, 200), tB: srndi(120, 240), sumLeft: d.summon ? d.summon.max : 0,
      tC: d.aura ? 90 : d.veil ? d.veil.every : 0, tD: d.leap ? d.leap.every : 0, leapTo: 0, t0: G.tick,
      tP: d.phase ? srndi(60, d.phase.every) : 0, phased: false, veilT: 0, pulled: 0, acc: 1
    };
    Path.place(e); e.px = e.x; e.py = e.y;
    if (d.mega) { e.spd0 = e.spd; e.am = Math.sqrt(o.hpMul || 1); Mega.enter(e, 0, true); }
    G.enemies.push(e);
    Codex.see('e', type);
    if (o.child && G.waves[e.wave]) G.waves[e.wave].left++;
    if (e.boss) {
      Render.shake(d.mega ? 22 : 8); Sfx.play('boss');
      if (d.mega && !G.demo) { Render.flash(.5, d.color); Sfx.play('alarm'); UI.bossIntro(d, type, true); }
      else if (!G.demo && !(G.seenBoss || (G.seenBoss = {}))[type]) { G.seenBoss[type] = 1; UI.bossIntro(d, type); }
    }
    return e;
  },
  update() {
    const M = G.map, arr = G.enemies;
    let boss = null;
    // Réaction en chaîne : explosions différées (au plus 20 par tick, pour ne jamais geler le jeu)
    if (G.cxq && G.cxq.length) {
      const q = G.cxq.splice(0, 60);
      for (let i = 0; i < q.length; i += 3) { Combat.splash(q[i], q[i + 1], 55, q[i + 2], null, false, false); if (Render.hq) FX.ring(q[i], q[i + 1], '#ff7a1a', 55, 16, 2); }
    }
    for (let i = 0, n = arr.length; i < n; i++) {
      const e = arr[i];
      if (!e.alive) continue;
      const d = e.d;
      e.px = e.x; e.py = e.y;
      if (d.mega) { Mega.update(e); if (!e.alive) continue; }
      if (e.hitT > 0) e.hitT--;
      if (e.revealT > 0) e.revealT--;
      if (e.markT > 0 && --e.markT === 0) e.markV = 0;
      if (e.burnT > 0) {
        e.burnT--;
        Combat.hit(e, e.burnDps / 60, e.burnSrc, false, 0, true);
        if (!e.alive) continue;
        if (Render.hq && ((G.tick + e.id) & 7) === 0)
          FX.part(e.x + rnd(-4, 4), e.y + rnd(-4, 4), rnd(-.3, .3), -rnd(.4, 1), 22, Math.random() < .5 ? '#ff7a1a' : '#ffcc33', 2.2, .96);
      }
      if (e.maxShield > 0) {
        if (e.shCd > 0) e.shCd--;
        else if (e.shield < e.maxShield) e.shield = Math.min(e.maxShield, e.shield + e.maxShield * .004);
      }
      if (d.heal && --e.tA <= 0) { e.tA = 60; this.heal(e); }
      if (d.blink && --e.tA <= 0) { e.tA = srndi(160, 230); this.blink(e); }
      if (d.jam && --e.tB <= 0) { e.tB = d.boss ? 300 : 240; this.jam(e, d.jamR || 110); }
      if (d.summon && e.sumLeft > 0 && --e.tA <= 0) {
        e.tA = d.summon.every; e.sumLeft--;
        const w = G.waves[e.wave];
        for (let k = 0; k < d.summon.n; k++)
          this.spawn(d.summon.type, { dist: Math.max(0, e.dist - 26 - k * 16), hpMul: (w ? w.hpMul : 1) * .6, wave: e.wave, child: true, pi: e.pi });
        FX.ring(e.x, e.y, d.color, 50, 20, 2);
      }
      if (d.aura && --e.tC <= 0) { e.tC = d.aura.every; this.aura(e, d.aura); }
      if (e.veilT > 0) e.veilT--;
      if (d.regen && e.hp < e.maxHp) e.hp = Math.min(e.maxHp, e.hp + e.maxHp * d.regen / 60);
      if (d.phase && --e.tP <= 0) {
        e.phased = !e.phased; e.tP = e.phased ? d.phase.dur : d.phase.every;
        FX.ring(e.x, e.y, d.color, 26, 14, 2);
      }
      if (d.veil && --e.tC <= 0) {
        e.tC = d.veil.every; const r2 = d.veil.r * d.veil.r;
        for (const o of G.enemies) if (o.alive && !o.boss && d2(o.x, o.y, e.x, e.y) <= r2) o.veilT = 180;
        FX.ring(e.x, e.y, d.color, d.veil.r, 30, 2);
      }
      if (d.accel && e.acc < 2) e.acc = Math.min(2, e.acc + .0012);
      if (d.leap && --e.tD <= 0) {
        if (!e.leapTo) {   // annonce : marqueur au point d'atterrissage pendant 1 s
          e.leapTo = Math.min(M.P[e.pi].total - 40, e.dist + d.leap.dist); e.tD = 60;
          FX.float(e.x, e.y - 30, 'BOND !', d.color, 14); Sfx.play('alarm', .6);
        } else {
          FX.spark(e.x, e.y, d.color, 20, 4); e.dist = Math.max(e.dist, e.leapTo); e.leapTo = 0; e.tD = d.leap.every;
          Path.place(e); e.px = e.x; e.py = e.y;
          FX.ring(e.x, e.y, d.color, 70, 26, 4); FX.spark(e.x, e.y, d.color, 24, 4.5); Render.shake(9); Sfx.play('boom', .6);
        }
      }
      let sp = e.spd * G.evSpd * e.acc;
      if (e.leapTo) sp = 0;   // se ramasse avant de bondir
      if (e.freezeT > 0) { e.freezeT--; sp = 0; }
      else if (e.slowT > 0) { e.slowT--; sp *= e.slowF; if (e.slowT === 0) e.slowF = 1; }
      let nd = e.dist + sp;
      if (sp > 0 && !e.air && G.traps.length) { const lim = Traps.block(e, nd); if (nd > lim) nd = Math.max(e.dist, lim); }
      e.dist = nd;
      if (e.dist >= M.P[e.pi].total) { this.leak(e); if (G.over) return; continue; }
      Path.place(e);
      if (e.air) { e.ph += .05; const w = Math.sin(e.ph) * 7; e.x -= Math.sin(e.ang) * w; e.y += Math.cos(e.ang) * w; }
      if (e.boss && (!boss || (e.d.mega && !boss.d.mega))) boss = e;
    }
    G.boss = boss;
  },
  heal(e) {
    const r2 = 85 * 85; let any = false;
    for (const o of G.enemies) {
      if (!o.alive || o === e || o.hp >= o.maxHp) continue;
      if (d2(o.x, o.y, e.x, e.y) < r2) { o.hp = Math.min(o.maxHp, o.hp + o.maxHp * .06); any = true; }
    }
    if (any) FX.ring(e.x, e.y, '#5dff7a', 85, 22, 1.5);
  },
  // Sentinelle : recouvre les ennemis proches d'un bouclier (fraction de leurs PV max)
  aura(e, a) {
    const r2 = a.r * a.r; let n = 0;
    for (const o of G.enemies) {
      if (!o.alive || o === e || d2(o.x, o.y, e.x, e.y) > r2) continue;
      const s = o.maxHp * a.f;
      if (o.maxShield < s) o.maxShield = s;
      o.shield = Math.max(o.shield, s); o.shCd = 120; n++;
    }
    FX.ring(e.x, e.y, '#4dd2ff', a.r, 30, 3, 10);
    if (n) FX.float(e.x, e.y - 30, 'BOUCLIERS', '#4dd2ff', 12);
  },
  blink(e) {
    FX.spark(e.x, e.y, e.d.color, 8, 2.4);
    e.dist += 70; Path.place(e); e.px = e.x; e.py = e.y;
    FX.spark(e.x, e.y, e.d.color, 8, 2.4);
    FX.float(e.x, e.y - 14, 'GLITCH', '#00ffd5', 10);
  },
  jam(e, r) {
    FX.ring(e.x, e.y, '#fff35c', r, 30, 2.5);
    FX.float(e.x, e.y - 14, 'IEM', '#fff35c', 12);
    const r2 = r * r; let hit = 0;
    for (const t of G.towers) {
      if (t.d.kind === 'support') continue;
      if (d2(t.cx, t.cy, e.x, e.y) <= r2) { t.stun = Math.max(t.stun, Towers.stunFor(90)); hit++; }
    }
    if (hit) Sfx.play('zap', .7);
  },
  kill(e, src) {
    if (!e.alive) return;
    e.alive = false;
    if (e.from != null) MP.survived(e, false);
    const w = G.waves[e.wave];
    if (w) w.left--;
    if (src) { src.kills++; if (src.ts) src.ts.kills++; }
    G.stats.kills++;
    G.combo++; G.comboT = 150;
    if (w) { if (G.combo > (w.mc || 0)) w.mc = G.combo; if (e.boss) { w.bk = (w.bk || 0) + 1; if (G.tick - e.t0 > 1500) w.bossSlow = true; } }
    if (G.combo > G.stats.maxCombo) G.stats.maxCombo = G.combo;
    if (G.combo === 100) Ach.unlock('combo');
    Missions.on('kill', 1, e); Missions.on('combo', G.combo);
    if (!G.demo) {
      // multi-élimination : 6 ennemis ou plus en moins d'une demi-seconde
      if (G.tick - (G.mkT || 0) > 30) { G.mkT = G.tick; G.mkN = 0; }
      if (++G.mkN === 6) UI.callout('MULTI-ÉLIMINATION', '#00f3ff');
      else if (G.mkN === 12) UI.callout('MASSACRE ×12', '#ff2bd6');
    }
    if (COMBO_STEPS.includes(G.combo) && !G.demo) {
      FX.float(e.x, e.y - 26, `COMBO ${G.combo} !`, '#ffd23f', 18);
      UI.callout(`${COMBO_CALL[G.combo]} ×${G.combo}`, '#ffd23f');
      Sfx.play('combo', 1, 1 + COMBO_STEPS.indexOf(G.combo) * .12);
      UI.comboBurst = performance.now();
    }
    const cm = 1 + Math.min(1, Math.floor(G.combo / 10) * .1);
    let bounty = Math.max(1, Math.round(e.bounty * cm * G.mod.bounty * G.diff.bounty * G.mut.bounty * (G.gm === 'rush' ? 1.3 : 1) * (1 + .015 * (G.waveNum - 1))));
    if (G.mod.lucky && sr() < G.mod.lucky) { bounty *= 3; if (!G.demo) FX.float(e.x, e.y - 20, '×3', '#ffd23f', 13); }
    gain(bounty, null);
    if (G.mod.vamp && G.stats.kills % 40 === 0 && G.lives < G.maxLives) { G.lives = Math.min(G.maxLives, G.lives + G.mod.vamp); FX.float(e.x, e.y - 30, '+' + G.mod.vamp + ' ♥', '#ff5d8f', 12); }
    if (G.mod.chainx) (G.cxq || (G.cxq = [])).push(e.x, e.y, e.maxHp * .2);
    if (e.boss && G.mod.bossCard) G.cx.bc = (G.cx.bc || 0) + 1;
    if (UI.dmgNums || e.boss) FX.float(e.x, e.y - 8, '+' + bounty, '#ffd23f', e.boss ? 18 : 10);
    if (e.d.spawn) {
      const s = e.d.spawn;
      for (let k = 0; k < s.n; k++)
        this.spawn(s.type, { dist: Math.max(0, e.dist - k * 14), hpMul: (w ? w.hpMul : 1) * (s.hp || .5) * (e.elite ? 1.5 : 1), wave: e.wave, child: true, pi: e.pi });
      FX.float(e.x, e.y - 20, s.type === 'scout' ? 'BRÈCHE' : s.type === 'mite' ? 'ESSAIM' : s.type === 'echo' ? 'ÉCHOS' : 'SCISSION', e.d.color, s.type === 'echo' ? 20 : 12);
    }
    const dm = G.mod.drop;
    if (e.boss) {
      const bn = (e.d.mega ? 15 : 3) + G.mut.bossNano;
      G.nanites += bn; G.stats.bosses++;
      const ew = e.wave || 0;   // 0 : boss envoyé par un adversaire (versus), sans éléments rares
      if (e.d.mega) { Res.drop('p', e.type === 'omega' ? 12 : 8, e.x, e.y - 48); Res.drop('a', e.type === 'omega' ? 6 : 3, e.x, e.y - 68); Res.drop('q', e.type === 'omega' ? 5 : ew > QFROM ? 2 : 0, e.x, e.y - 88); }
      else {
        // 1 ✺ par boss dès la vague 10, 2 dès la 25, 3 dès la 40 (1 en Boss Rush, où il y a un boss par vague)
        if (ew >= 10) Res.drop('p', (G.gm === 'rush' ? 1 : ew >= 40 ? 3 : ew >= 25 ? 2 : 1) + (e.elite ? 1 : 0) + G.mod.prosp, e.x, e.y - 48);
        if (ew > Towers.omFrom()) Res.drop('a', 1 + G.mod.abyssB, e.x, e.y - 68);
        if (ew > QFROM) Res.drop('q', 1 + G.mod.quintB, e.x, e.y - 88);
      }
      if (e.d.mega) {
        G.stats.megas = (G.stats.megas || 0) + 1; Ach.unlock(e.type);
        if (!G.demo) { UI.callout(e.d.name + ' ANÉANTI', e.d.color); Render.flash(.6, '#ffffff'); }
        for (let i = 0; i < 6; i++) FX.ring(e.x, e.y, i & 1 ? '#ffffff' : e.d.color, 80 + i * 45, 34 + i * 8, 4);
        Drops.spawn(e.x, e.y - 14, 'nano'); Drops.spawn(e.x, e.y + 14, 'repair');
      }
      FX.float(e.x, e.y - 28, `+${bn} ◈`, '#00ffaa', 18);
      Ach.unlock('boss');
      Cmd.gain(20 * Cmd.mult());
      if (!G.demo) Game.slowT = 1100;   // ralenti dramatique sur le coup fatal
      Render.shake(16); Render.flash(.35, e.d.color); Sfx.play('boom');
      for (let i = 0; i < 4; i++) FX.ring(e.x, e.y, i & 1 ? '#ffffff' : e.d.color, 50 + i * 30, 26 + i * 6, 3);
      Drops.spawn(e.x - 10, e.y, 'gold'); Drops.spawn(e.x + 10, e.y, 'gold');
    } else {
      if (e.elite && (e.wave || 0) >= 15 && sr() < .05) Res.drop('p', 1, e.x, e.y - 22);
      const r = sr();
      if (r < (e.elite ? .35 : .03) * dm) Drops.spawn(e.x, e.y, 'nano');
      else if (r < (e.elite ? .6 : .09) * dm) Drops.spawn(e.x, e.y, 'gold');
      else if (r < (e.elite ? .65 : .105) * dm) Drops.spawn(e.x, e.y, 'repair');
    }
    FX.spark(e.x, e.y, e.d.color, e.boss ? 60 : 14, e.boss ? 6 : 3.2, 34, 2.6);
    FX.ring(e.x, e.y, e.d.color, e.r * 2.6, 20, 2);
    // la tonalité monte avec le combo : la tension se construit à l'oreille
    Sfx.play('pop', .7, .75 + Math.min(G.combo, 80) / 80 * .9 + Math.random() * .15);
    if (G.stats.kills === 1) Ach.unlock('first');
  },
  leak(e) {
    e.alive = false;
    if (e.from != null) MP.survived(e, true);
    const w = G.waves[e.wave];
    if (w) { w.left--; w.leaks++; if (e.boss) w.bossSlow = true; }
    const [x, y] = G.map.P[e.pi].exit;
    if (w && !e.boss && (w.aeg || 0) < G.mod.aegis) {   // Bouclier du noyau
      w.aeg = (w.aeg || 0) + 1; w.leaks--;
      FX.ring(x, y, '#4df3ff', 46, 22, 3); FX.float(x, y - 24, 'ABSORBÉ', '#4df3ff', 14); Sfx.play('zap', .5);
      return;
    }
    const dmg = e.d.leak * (e.elite ? 2 : 1);
    G.lives -= dmg; G.combo = 0; G.stats.leaks++;
    FX.float(x, y - 24, '-' + dmg, '#ff2a6d', 18);
    FX.ring(x, y, '#ff2a6d', 40, 22, 3);
    Render.shake(e.boss ? 20 : 7); Render.flash(e.boss ? .4 : .18, '#ff2a6d'); Sfx.play('leak');
    if (G.lives <= 0 && G.mod.revive && !G.cx.rev) {   // Second souffle
      G.cx.rev = 1; G.lives = Math.ceil(G.maxLives * .5);
      FX.ring(x, y, '#ffd23f', 120, 40, 5); Render.flash(.5, '#ffd23f');
      if (!G.demo) UI.callout('SECOND SOUFFLE', '#ffd23f');
      return;
    }
    if (G.lives <= 0) { G.lives = 0; Game.gameOver(); }
  },
  compact() {
    const a = G.enemies; let j = 0;
    for (let i = 0; i < a.length; i++) if (a[i].alive) a[j++] = a[i];
    a.length = j;
  }
};

