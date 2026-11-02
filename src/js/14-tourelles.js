/* ============================== TOURELLES ============================== */
const Towers = {
  _hit: [],
  elemOf(k) { const t = TOWERS[k].tier; return t === 3 ? 'p' : t === 4 ? 'a' : null; },
  // plan = synthèse au Labo ; sinon pose (construction ou fusion sur le terrain)
  elemCost(k, plan) {
    if (!this.elemOf(k)) return 0;
    const E = ELEM_COST[G.diffKey] || ELEM_COST.standard, t = TOWERS[k].tier;
    let v;
    if (plan) v = E.plan[t] + (k === 'singularity' ? 1 : 0);
    else { const P = E.pose[t]; v = Math.max(0, P[0] + P[1] * this.tierCount(t)); }
    return Math.round(v * (G.cus ? G.cus.ecost : 1));
  },
  // tourelles de ce palier déjà en jeu (en coopération : celles du joueur qui agit)
  tierCount(t) {
    const me = G.actor != null ? G.actor : Net.me;
    let n = 0;
    for (const x of G.towers) if (x.d.tier === t && (!Net.coop || x.owner == null || x.owner === me)) n++;
    return n;
  },
  // les niveaux Oméga (et l'abyssite des boss) commencent après cette vague
  omFrom() { return G && G.cus ? G.cus.omega : OMEGA.from; },
  canPay(k) { const c = this.elemOf(k); return !c || Res.get(c) >= this.elemCost(k); },
  // texte « + 1 ✺ » à côté d'un prix
  elemTxt(k, plan) { const c = this.elemOf(k), v = c ? this.elemCost(k, plan) : 0; return v ? ` + ${v} ${RES[c].i}` : ''; },
  elemMissing(k) {
    const c = this.elemOf(k);
    if (Act.mine()) { Sfx.play('error'); UI.toast(c === 'p' ? 'Plasma requis' : 'Abyssite requise', `Poser une ${TOWERS[k].name} coûte aussi ${Res.tag(c, this.elemCost(k))} (${c === 'p' ? 'boss, élites, raffinerie' : 'méga-boss, puis boss après la vague ' + this.omFrom()}). Le prix monte avec le nombre de ${TOWERS[k].tier === 3 ? 'T3' : 'T4'} déjà posées.`, RES[c].c, 3.5); }
  },
  costOf(k) { return Math.round(TOWERS[k].cost * G.mod.cost * (G.mod.kcost[k] || 1) * (TOWERS[k].tier === 0 ? G.mod.t0cost : 1)); },
  // niveaux Oméga : une fois la vague 30 repoussée (en vague 30 ou plus tard)
  omega() { const f = this.omFrom(); return G.waveNum > f || (G.waveNum === f && !G.waves[f]); },
  maxLevel(t) { return t.d.kind === 'support' ? 5 : this.omega() ? OMEGA.max : 10; },
  upCost(t) { return Math.round((t.d.cost * .6 * t.level + 30) * (t.level >= 10 ? Math.pow(OMEGA.cost, t.level - 9) : 1) * G.mod.cost * (G.mod.kcost[t.key] || 1) * (t.d.tier === 0 ? G.mod.t0cost : 1)); },
  // multiplicateur de dégâts du niveau : +22 % par niveau jusqu'au 10, puis +35 % par niveau Oméga
  lvlMul(L) { return Math.pow(1.22, Math.min(L, 9)) * Math.pow(G.mod.omegaDmg || OMEGA.dmg, Math.max(0, L - 9)); },
  // durée d'un brouillage / étourdissement après le Blindage IEM
  stunFor(v) { return Math.round(v * G.mod.stunMul); },
  at(tx, ty) { const M = G.map; return (tx < 0 || ty < 0 || tx >= M.C || ty >= M.R) ? null : G.tgrid[ty * M.C + tx]; },
  canPlace(tx, ty) { const M = G.map; return tx >= 0 && ty >= 0 && tx < M.C && ty < M.R && M.cells[ty * M.C + tx] === 0 && !G.tgrid[ty * M.C + tx]; },
  create(key, tx, ty, level = 1) {
    const d = TOWERS[key];
    const t = {
      id: G.nextId++, key, d, tx, ty, cx: (tx + .5) * TILE, cy: (ty + .5) * TILE, level, invested: 0, kills: 0, dealt: 0,
      strat: 0, oc: false, heat: 0, over: false, stun: 0, cd: srnd(0, 10), ang: -Math.PI / 2, target: null, aimT: 0,
      recoil: 0, flash: 0, ramp: 0, beam: null, fresh: G.phase === 'prep', bDmg: 0, bCool: 0, bRange: 0, dmg: 0, range: 0, rate: 1,
      spin: Math.random() * TAU, dead: false, born: performance.now(), spec: null, sm: {}, pierce: 0, shots: 0, owner: G.actor
    };
    t.ts = Stats.type(key); t.bornTick = G.tick;
    G.towers.push(t); G.tgrid[ty * G.map.C + tx] = t;
    Codex.see('t', key);
    return t;
  },
  build(key, tx, ty) {
    if (!this.canPlace(tx, ty)) { Sfx.play('error'); return null; }
    const cost = this.costOf(key), ec = this.elemCost(key);
    if (G.money < cost) { UI.noMoney(); return null; }
    if (!this.canPay(key)) { this.elemMissing(key); return null; }
    G.money -= cost; if (ec) Res.take(this.elemOf(key), ec);
    const t = this.create(key, tx, ty); t.invested = cost; t.ts.spent += cost; t.elem = ec;
    G.stats.built++;
    this.recalc();
    FX.ring(t.cx, t.cy, t.d.color, 34, 22, 2); FX.spark(t.cx, t.cy, t.d.color, 14, 3);
    Sfx.play('build');
    if (key === 'apocalypse') Ach.unlock('apoc');
    return t;
  },
  remove(t) {
    // classement : ce qu'a fait une tourelle vendue ou fusionnée reste au crédit de son propriétaire
    if (t.owner != null && G.pst) { const o = G.pst[t.owner] || (G.pst[t.owner] = { d: 0, k: 0 }); o.d += t.dealt || 0; o.k += t.kills || 0; }
    G.tgrid[t.ty * G.map.C + t.tx] = null;
    const i = G.towers.indexOf(t); if (i >= 0) G.towers.splice(i, 1);
    t.dead = true; t.beam = null; t.target = null;
  },
  sellValue(t) { return t.fresh ? t.invested : Math.floor(t.invested * G.mod.refund); },
  sell(t) {
    const v = this.sellValue(t);
    gain(v, Net.coop && t.owner != null && !(G.gone && G.gone[t.owner]) ? t.owner : G.actor); G.stats.gold -= v;
    if (t.fresh && t.elem) Res.gain(this.elemOf(t.key), t.elem);
    FX.float(t.cx, t.cy - 12, '+' + v, '#ffd23f', 14); FX.spark(t.cx, t.cy, '#ffd23f', 10, 2.5); FX.ring(t.cx, t.cy, t.d.color, 26, 16, 2);
    Sfx.play('sell');
    this.remove(t); this.recalc(); if (UI.sel === t) UI.deselect();
  },
  specs(t) { return SPECS[t.key] || SPECS[t.d.kind] || null; },
  specLvl(t) { return t.d.kind === 'support' ? SPEC_LVL_SUPPORT : SPEC_LVL; },
  needsSpec(t) { return !!this.specs(t) && t.spec == null && t.level >= this.specLvl(t); },
  // crans de zone d'un soutien (0 = 4 voisins … 3 = 20) : diagonales d'origine, voie Rayonnement, compétence Maillage
  reachOf(k, sm) { const d = TOWERS[k]; return Math.min(3, (d.reach || (d.diag ? 1 : 0)) + (sm && sm.diag ? 1 : 0) + (d.support && G.mod.supDiag ? 1 : 0)); },
  reach(t) { return this.reachOf(t.key, t.sm); },
  setSpec(t, i) {
    const S = this.specs(t); if (!S || !S[i] || t.spec != null) return;
    t.spec = i; t.sm = S[i]; t.born = performance.now() - 120;
    this.recalc();
    FX.ring(t.cx, t.cy, '#ffd23f', 40, 26, 3); FX.spark(t.cx, t.cy, '#ffd23f', 18, 3.5);
    FX.float(t.cx, t.cy - 22, S[i].n.toUpperCase(), '#ffd23f', 13);
    Sfx.play('levelup');
  },
  upgrade(t) {
    if (t.level >= this.maxLevel(t)) return false;
    if (this.needsSpec(t)) { UI.toast('Spécialisation requise', 'Choisissez une voie dans le panneau de la tourelle pour continuer à l\'améliorer.', '#ffd23f', 3); Sfx.play('error'); return false; }
    const c = this.upCost(t), ab = t.level >= 10 ? OMEGA.abyss : 0;
    if (G.money < c) { UI.noMoney(); return false; }
    if (ab && G.res.a < ab) { if (Act.mine()) { Sfx.play('error'); UI.toast('Abyssite requise', `Chaque niveau Oméga coûte aussi ${ab} abyssite ⬟ (méga-boss, puis boss après la vague ${this.omFrom()}).`, RES.a.c, 3); } return false; }
    G.money -= c; G.res.a -= ab; t.invested += c; t.ts.spent += c; t.level++; t.born = performance.now() - 170;
    this.recalc();
    const om = t.level > 10, oc = om ? '#ff4df0' : '#39ff88';
    FX.ring(t.cx, t.cy, oc, om ? 40 : 30, 20, 2); FX.spark(t.cx, t.cy, oc, om ? 18 : 10, 2.5);
    FX.float(t.cx, t.cy - 20, (om ? 'OMÉGA ' : 'NIV ') + t.level, oc, om ? 14 : 12);
    Sfx.play('upgrade');
    Missions.on('upgrade'); Missions.on('level', t.level);
    if (t.level >= 10) Ach.unlock('maxlvl');
    return true;
  },
  // bonus d'adjacence des tourelles de soutien : recalculé uniquement quand la grille change
  // une tourelle ne garde que le meilleur bonus de chaque type de soutien : empiler deux Nexus sur elle ne sert à rien,
  // mais un Nexus, un Ordi et un Ventilo se complètent
  recalc() {
    const C = G.map.C, R = G.map.R, F = ['dmg', 'cool', 'range', 'crit', 'pierce', 'rate'], best = new Map();
    for (const t of G.towers) { t.bDmg = 0; t.bCool = 0; t.bRange = 0; t.bCrit = 0; t.bPierce = 0; t.bRate = 0; }
    for (const s of G.towers) {
      const sp = s.d.support; if (!sp || s.stun > 0) continue;   // soutien brouillé : bonus suspendu
      const m = G.mod.support * (1 + .2 * (s.level - 1)) * (s.sm.eff || 1);
      for (const [dx, dy] of NBZ[this.reach(s)]) {
        const x = s.tx + dx, y = s.ty + dy;
        if (x < 0 || y < 0 || x >= C || y >= R) continue;
        const t = G.tgrid[y * C + x]; if (!t || t.d.support) continue;
        let B = best.get(t); if (!B) best.set(t, B = {});
        const cur = B[s.key] || (B[s.key] = {});
        for (const f of F) if (sp[f]) cur[f] = Math.max(cur[f] || 0, sp[f] * m);
      }
    }
    for (const [t, B] of best) for (const k in B) {
      const b = B[k];
      t.bDmg += b.dmg || 0; t.bCool += b.cool || 0; t.bRange += b.range || 0; t.bCrit += b.crit || 0; t.bPierce += b.pierce || 0; t.bRate += b.rate || 0;
    }
    for (const t of G.towers) this.refresh(t);
    Fusion.scan();
  },
  refresh(t) {
    const d = t.d, L = t.level - 1, s = t.sm;
    t.dmg = d.dmg * this.lvlMul(L) * (s.dmg || 1);
    t.range = d.range * (1 + .04 * L) * G.mod.range * (1 + t.bRange) * (s.range || 1);
    t.rate = d.rate ? Math.max(2, d.rate * Math.pow(.94, L) / G.mod.rate / (s.rate || 1) / (1 + (t.bRate || 0))) : 0;
    t.pierce = (d.pierce || 0) + (s.pierce || 0);
  },
  effDmg(t) { return t.dmg * (1 + t.bDmg) * G.mod.dmg * (G.mod.kdmg[t.key] || 1); },
  burnDps(t) { return t.d.burn.dps * this.lvlMul(t.level - 1) * (1 + t.bDmg) * G.mod.dmg * G.mod.burn * (t.sm.burn || 1); },
  dps(t) {
    const d = t.d;
    if (!d.rate || d.kind === 'radar' || d.kind === 'support') return 0;
    const dmg = this.effDmg(t) * (1 + (G.mod.critDmg - 1) * Math.min(1, G.mod.crit + (t.bCrit || 0))), sps = 60 / t.rate * (t.oc ? 2 : 1);
    switch (d.kind) {
      case 'beam': return this.effDmg(t) * (1 + t.ramp) * (t.oc ? 2 : 1) * G.mod.rate;
      case 'missiles': return dmg * sps * d.count;
      case 'orbital': return dmg * sps * d.strikes;
      case 'vortex': return this.effDmg(t) * (d.dur / 60) * sps;
      default: return dmg * sps + (d.burn ? this.burnDps(t) : 0);
    }
  },
  valid(t, e) {
    return !!e && e.alive && !e.phased && !(e.inv > 0) && !(t.d.ground && e.air) && (t.d.reveal || G.mod.omni || !hid(e)) &&
      d2(e.x, e.y, t.cx, t.cy) <= t.range * t.range;
  },
  find(t) {
    const d = t.d, r2 = t.range * t.range, seeAll = !!d.reveal || !!G.mod.omni, s = t.strat, arr = G.enemies;
    let best = null, bv = -Infinity;
    for (let i = 0, n = arr.length; i < n; i++) {
      const e = arr[i];
      if (!e.alive || e.phased || e.inv > 0 || (d.ground && e.air) || (!seeAll && hid(e))) continue;
      const dd = d2(e.x, e.y, t.cx, t.cy);
      if (dd > r2) continue;
      const v = s === 0 ? -e.rem : s === 1 ? e.hp + e.shield : s === 2 ? -(e.hp + e.shield) : -dd;
      if (v > bv) { bv = v; best = e; }
    }
    return best;
  },
  update() {
    const od = G.overdriveT > 0;
    let rc = false;
    for (let i = 0; i < G.towers.length; i++) {
      const t = G.towers[i], d = t.d;
      if (t.flash > 0) t.flash--;
      if (t.recoil > .1) t.recoil *= .8; else t.recoil = 0;
      if (d.spinHead) t.spin += d.spinHead * (t.stun > 0 || t.over ? .2 : 1);
      if (d.kind === 'support') { if (t.stun > 0 && !t.jamP && --t.stun <= 0) rc = true; continue; }
      if (t.heat > 0) {
        t.heat -= (d.cool || .5) * (1 + t.bCool) * G.mod.cool;
        if (t.heat <= 0) {
          t.heat = 0;
          if (t.over) { t.over = false; FX.float(t.cx, t.cy - 16, 'EN LIGNE', '#39ff88', 10); }
        }
      }
      if (t.stun > 0) { if (!t.jamP) t.stun--; t.beam = null; continue; }
      if (t.over) {
        t.beam = null;
        if (Render.hq && (G.tick & 7) === 0) FX.smoke(t.cx + rnd(-5, 5), t.cy - 4, 40, 3);
        continue;
      }
      const mul = (t.oc ? 2 : 1) * (od ? 2 : 1);
      if (d.kind === 'radar') { if ((G.tick + t.id) % 10 === 0) this.radar(t); continue; }
      if (d.kind === 'beam') { this.beamTick(t, mul, od); continue; }
      if (--t.aimT <= 0 || !this.valid(t, t.target)) { t.target = this.find(t); t.aimT = 8; }
      const e = t.target;
      if (e && !d.spinHead) t.ang = turnTo(t.ang, Math.atan2(e.y - t.cy, e.x - t.cx), .35);
      if (t.cd > 0) t.cd -= mul;
      if (t.cd <= 0) {
        if (!e) t.cd = 0;
        else {
          let shots = 0;
          while (t.cd <= 0 && shots < 3 && !t.over) { this.fire(t, e, od); t.cd += t.rate; shots++; if (!e.alive) break; }
          if (t.cd < 0) t.cd = 0;
        }
      }
    }
    if (rc) this.recalc();
  },
  // débrouillage payant : le prix suit le temps de brouillage restant et la valeur de la tourelle
  unjamCost(t) { return t.stun > 0 ? Math.max(10, Math.round((8 + t.invested * .012) * t.stun / 60 * G.mod.cost)) : 0; },
  jammed() { return G.towers.filter(t => t.stun > 0); },
  unjamCostAll() { let c = 0; for (const t of G.towers) c += this.unjamCost(t); return c; },
  unjam(list) {
    list = list.filter(t => t.stun > 0 && !t.dead);
    if (!list.length) return false;
    const c = list.reduce((a, t) => a + this.unjamCost(t), 0);
    if (G.money < c) { UI.noMoney(); return false; }
    G.money -= c;
    for (const t of list) {
      t.stun = 0; t.jamP = 0; t.aimT = 0;
      FX.ring(t.cx, t.cy, '#39ff88', 30, 18, 2); FX.float(t.cx, t.cy - 18, 'EN LIGNE', '#39ff88', 11);
    }
    if (list.some(t => t.d.support)) this.recalc();
    if (Act.mine()) Sfx.play('upgrade');
    return true;
  },
  overheat(t) {
    t.heat = 100; t.over = true; t.beam = null;
    FX.float(t.cx, t.cy - 16, 'SURCHAUFFE', '#ff3355', 12); FX.spark(t.cx, t.cy, '#ff5533', 10, 2);
    Sfx.play('error'); Ach.unlock('meltdown');
  },
  fire(t, e, od) {
    const d = t.d;
    if (t.oc && !od) { t.heat += d.heat * 1.5 * G.mod.heat; if (t.heat >= 100) this.overheat(t); }
    const crit = sr() < G.mod.crit + (t.sm.crit || 0) + (t.bCrit || 0);
    const dmg = this.effDmg(t) * (crit ? G.mod.critDmg * (t.sm.critMul || 1) : 1);
    t.shots++; t.ts.shots++;
    if (crit) Sfx.play('crit', .5);
    t.flash = 5; t.recoil = d.kind === 'mortar' ? 5 : 3;
    const mx = t.cx + Math.cos(t.ang) * 17, my = t.cy + Math.sin(t.ang) * 17;
    switch (d.kind) {
      case 'proj':
        Shots.bullet(t, mx, my, e, dmg, crit);
        Sfx.play('shot', .7, d.splash ? .55 : (d.rate <= 6 ? 1.35 : 1));
        break;
      case 'hitscan':
        FX.line(mx, my, e.x, e.y, d.color, 2.5, 10); FX.line(mx, my, e.x, e.y, '#ffffff', 1, 6); FX.spark(e.x, e.y, d.color, 6, 2.2);
        Combat.hit(e, dmg, t, crit, t.pierce);
        Sfx.play('sniper');
        break;
      case 'mortar': Shots.shell(t, mx, my, e, dmg, crit); Sfx.play('mortar'); break;
      case 'missiles': Shots.missiles(t, mx, my, e, dmg, crit); Sfx.play('missile'); break;
      case 'cone': this.cone(t, dmg, crit, mx, my); Sfx.play('flame'); break;
      case 'chain': this.chain(t, e, dmg, crit, mx, my); Sfx.play('zap'); break;
      case 'pierce': this.pierce(t, e, dmg, crit, mx, my); Sfx.play('rail'); break;
      case 'pulse': this.pulse(t, dmg, crit); Sfx.play('pulse'); break;
      case 'vortex': Shots.vortex(t, e, dmg); Sfx.play('vortex'); break;
      case 'orbital': this.orbital(t, e, dmg); break;
    }
  },
  cone(t, dmg, crit, mx, my) {
    const d = t.d, r = t.range, a0 = t.ang, bd = this.burnDps(t), arr = G.enemies, cone = d.cone * (t.sm.cone || 1);
    for (let i = 0, n = arr.length; i < n; i++) {
      const o = arr[i];
      if (!o.alive || o.air) continue;
      const dx = o.x - t.cx, dy = o.y - t.cy, rr = r + o.r;
      if (dx * dx + dy * dy > rr * rr) continue;
      if (Math.abs(angDiff(Math.atan2(dy, dx), a0)) > cone) continue;
      Combat.hit(o, dmg, t, crit, 0);
      if (o.alive) Status.burn(o, bd, d.burn.t, t);
    }
    const n = Render.hq ? 3 : 1;
    for (let k = 0; k < n; k++) {
      const a = a0 + rnd(-cone * .8, cone * .8), v = rnd(2.8, 4.2), q = Math.random();
      FX.part(mx, my, Math.cos(a) * v, Math.sin(a) * v, r / v * .95, q < .35 ? '#ffcc33' : q < .7 ? '#ff7a1a' : '#ff3b1f', rnd(3, 5), .985);
    }
  },
  chain(t, e, dmg, crit, mx, my) {
    const ch = t.d.chain, hit = this._hit; hit.length = 0;
    let cur = e, px = mx, py = my, dm = dmg;
    const f = Math.min(.95, ch.f * (t.sm.chainF || 1));
    for (let j = 0, n = Math.max(0, ch.n + G.mod.chain + (t.sm.chain || 0)); j <= n && cur; j++) {
      FX.bolt(px, py, cur.x, cur.y, t.d.color, j === 0 ? 2.6 : 1.8, 9);
      if (Render.hq) FX.spark(cur.x, cur.y, t.d.color, 3, 1.8, 14);
      hit.push(cur); px = cur.x; py = cur.y;
      Combat.hit(cur, dm, t, crit && j === 0, 0);
      Status.apply(cur, t);
      dm *= f;
      let best = null, bd = ch.r * ch.r;
      for (const o of G.enemies) {
        if (!o.alive || hit.includes(o) || hid(o)) continue;
        const dd = d2(o.x, o.y, px, py);
        if (dd < bd) { bd = dd; best = o; }
      }
      cur = best;
    }
  },
  pierce(t, e, dmg, crit, mx, my) {
    const a = Math.atan2(e.y - t.cy, e.x - t.cx), ux = Math.cos(a), uy = Math.sin(a), L = t.range, arr = G.enemies;
    t.ang = a;
    for (let i = 0, n = arr.length; i < n; i++) {
      const o = arr[i]; if (!o.alive) continue;
      const rx = o.x - t.cx, ry = o.y - t.cy, pr = rx * ux + ry * uy;
      if (pr < 0 || pr > L) continue;
      if (Math.abs(rx * uy - ry * ux) <= o.r + 8) Combat.hit(o, dmg, t, crit, 1);
    }
    const ex = t.cx + ux * L, ey = t.cy + uy * L;
    FX.line(mx, my, ex, ey, t.d.color, 10, 18); FX.line(mx, my, ex, ey, '#9fd8ff', 3, 14);
    FX.ring(mx, my, '#9fd8ff', 24, 14, 3);
    Render.shake(3);
  },
  pulse(t, dmg, crit) {
    const r2 = t.range * t.range, d = t.d, arr = G.enemies;
    for (let i = 0, n = arr.length; i < n; i++) {
      const o = arr[i]; if (!o.alive) continue;
      if (d2(o.x, o.y, t.cx, t.cy) > r2) continue;
      if (d.reveal) o.revealT = Math.max(o.revealT, 40);
      Combat.hit(o, dmg, t, crit, 0);
      Status.apply(o, t);
    }
    FX.ring(t.cx, t.cy, d.color, t.range, 26, 3, 10);
    FX.ring(t.cx, t.cy, '#ffffff', t.range * .6, 18, 1.5, 6);
  },
  radar(t) {
    const r2 = t.range * t.range, mv = t.d.mark * (1 + .1 * (t.level - 1)) + (t.sm.mark || 0);
    for (const o of G.enemies) {
      if (!o.alive) continue;
      if (d2(o.x, o.y, t.cx, t.cy) <= r2) { o.revealT = 14; o.markT = 14; if (mv > o.markV) o.markV = mv; }
    }
  },
  beamTick(t, mul, od) {
    let e = t.beam;
    if (!this.valid(t, e)) {
      const ne = this.find(t);
      if (ne !== e) t.ramp *= .3;
      e = t.beam = ne;
    }
    if (!e) { t.ramp = Math.max(0, t.ramp - .02); return; }
    t.ang = turnTo(t.ang, Math.atan2(e.y - t.cy, e.x - t.cx), .5);
    t.ramp = Math.min(t.d.ramp * (t.sm.rampMax || 1), t.ramp + t.d.ramp / 150 * (t.sm.rampSpd || 1));
    Combat.hit(e, this.effDmg(t) * (1 + t.ramp) * mul * G.mod.rate / 60, t, false, 1, true);
    if (e.alive) e.hitT = Math.max(e.hitT, 1);
    if (G.tick % 6 === 0) { t.shots++; t.ts.shots++; }   // le rayon compte comme 10 tirs par seconde
    if (t.oc && !od) { t.heat += t.d.heat * G.mod.heat; if (t.heat >= 100) this.overheat(t); }
    if (Render.hq && (G.tick & 3) === 0) FX.spark(e.x, e.y, t.d.color, 1, 1.6, 14, 2);
    if (G.tick % 12 === 0) Sfx.play('laser', .5);
  },
  orbital(t, e, dmg) {
    const d = t.d, r2 = t.range * t.range, cand = this._hit; cand.length = 0;
    for (const o of G.enemies) if (o.alive && o !== e && !hid(o) && d2(o.x, o.y, t.cx, t.cy) <= r2) cand.push(o);
    const targets = [e], ns = d.strikes + (t.sm.strikes || 0), rad = d.sr * (t.sm.sr || 1);
    for (let k = 1; k < ns; k++) targets.push(cand.length ? cand[Math.floor(sr() * cand.length)] : e);
    for (const o of targets) {
      const sp = o.freezeT > 0 ? 0 : o.spd * (o.slowT > 0 ? o.slowF : 1);
      Path.posAt(o.dist + sp * 28, _pt, o.pi);
      const x = o.air ? o.x : _pt.x, y = o.air ? o.y : _pt.y;
      Strikes.add(x + srnd(-6, 6), y + srnd(-6, 6), rad, dmg, t, d.color, 28, false);
    }
    FX.ring(t.cx, t.cy, d.color, 40, 20, 3);
    Sfx.play('nuke', .5);
  }
};

