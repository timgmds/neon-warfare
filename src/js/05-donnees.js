/* ============================== DONNÉES ============================== */
const THEMES = {
  'theme-cyber':   { name: 'Synthwave', accent: '#00f3ff', sec: '#ff2bd6', top: '#03021a', bot: '#1d0036' },
  'theme-matrix':  { name: 'Matrice',   accent: '#00ff66', sec: '#c6ff00', top: '#000703', bot: '#001c09' },
  'theme-crimson': { name: 'Écarlate',  accent: '#ff2e55', sec: '#ff9500', top: '#040001', bot: '#2c0008' },
  'theme-void':    { name: 'Néant',     accent: '#c04dff', sec: '#00e5ff', top: '#04000a', bot: '#14002c' },
  'theme-solar':   { name: 'Solaire',   accent: '#ffae00', sec: '#ff5e00', top: '#0b0400', bot: '#2c1300' }
};

/* kind : comportement de tir — head : dessin de la tourelle
   rate : ticks entre deux tirs (60 ticks = 1 s) — range/splash en pixels monde (1 case = 40) */
const TOWERS = {
  blaster:  { name: 'Blaster', tier: 0, cost: 50, range: 120, dmg: 12, rate: 24, color: '#00e5ff', kind: 'proj', head: 'twin', spd: 9, heat: 8, cool: .5,
    desc: 'Tourelle polyvalente à tir rapide. Idéale en début de partie.' },
  sniper:   { name: 'Sniper', tier: 0, cost: 175, range: 300, dmg: 110, rate: 95, color: '#ffd23f', kind: 'hitscan', head: 'rail', pierce: .6, heat: 40, cool: .35, sfx: 'sniper',
    desc: 'Très longue portée, gros dégâts. Perce 60% du blindage.' },
  vulcan:   { name: 'Vulcain', tier: 0, cost: 220, range: 115, dmg: 5, rate: 5, color: '#ff4d4d', kind: 'proj', head: 'gatling', spd: 11, psz: 2, heat: 3, cool: .8,
    desc: 'Cadence extrême. Peu efficace contre le blindage.' },
  cryo:     { name: 'Cryo', tier: 0, cost: 110, range: 105, dmg: 6, rate: 36, color: '#4db8ff', kind: 'proj', head: 'orb', spd: 7, psz: 3, slow: { f: .6, t: 90 }, heat: 10, cool: .6,
    desc: 'Ralentit sa cible de 40% pendant 1,5 s.' },
  radar:    { name: 'Radar', tier: 0, cost: 180, range: 165, dmg: 0, rate: 10, color: '#39ff88', kind: 'radar', head: 'dish', spinHead: .035, mark: .15,
    desc: 'Révèle les unités furtives et les marque : +15% de dégâts subis.' },
  inferno:  { name: 'Inferno', tier: 0, cost: 240, range: 88, dmg: 3, rate: 6, color: '#ff7a1a', kind: 'cone', head: 'flamer', cone: .42, burn: { dps: 10, t: 120 }, ground: true, heat: 2, cool: .6,
    desc: 'Lance-flammes en cône avec brûlure persistante. Sol uniquement.' },
  titan:    { name: 'Titan', tier: 0, cost: 200, range: 175, dmg: 45, rate: 75, color: '#ff9f43', kind: 'mortar', head: 'mortar', splash: 48, ground: true, heat: 25, cool: .4,
    desc: 'Mortier lourd à dégâts de zone. Sol uniquement.' },
  aero:     { name: 'Aéro', tier: 0, cost: 100, range: 145, dmg: 9, rate: 14, color: '#b8ffcf', kind: 'proj', head: 'aa', spd: 12, airMult: 2.5, heat: 5, cool: .5,
    desc: 'Défense anti-aérienne : dégâts x2,5 contre les volants.' },
  fan:      { name: 'Ventilo', tier: 1, cost: 120, range: 0, dmg: 0, rate: 0, color: '#dff2ff', kind: 'support', head: 'fan', support: { cool: .6 },
    desc: 'Refroidit les 4 tourelles adjacentes (+60%). Indispensable pour tenir la Surcadence.' },
  computer: { name: 'Ordi', tier: 1, cost: 250, range: 0, dmg: 0, rate: 0, color: '#4dff6a', kind: 'support', head: 'cpu', support: { dmg: .25 },
    desc: 'Augmente de 25% les dégâts des 4 tourelles adjacentes.' },
  // ----- FUSIONS T2 -----
  plasma:   { name: 'Plasma', tier: 2, cost: 380, range: 170, dmg: 70, rate: 42, color: '#c34dff', kind: 'proj', head: 'twin', spd: 8, psz: 4.5, splash: 45, heat: 20, cool: .7,
    desc: 'Projectiles de plasma explosifs : dégâts de zone.' },
  tesla:    { name: 'Tesla', tier: 2, cost: 420, range: 135, dmg: 30, rate: 42, color: '#fff23a', kind: 'chain', head: 'coil', chain: { n: 4, f: .8, r: 95 }, heat: 25, cool: .6, sfx: 'zap',
    desc: 'Arc électrique qui rebondit sur 4 cibles supplémentaires.' },
  laser:    { name: 'Laser', tier: 2, cost: 520, range: 210, dmg: 75, rate: 1, color: '#ff3df2', kind: 'beam', head: 'lens', ramp: 2.5, heat: 1.2, cool: 1,
    desc: 'Rayon continu qui s\'intensifie jusqu\'à x3,5 sur la même cible. Ignore le blindage.' },
  magma:    { name: 'Magma', tier: 2, cost: 560, range: 165, dmg: 55, rate: 42, color: '#ff3b1f', kind: 'mortar', head: 'mortar', splash: 62, burn: { dps: 25, t: 150 }, ground: true, heat: 18, cool: .6,
    desc: 'Obus de lave : zone + brûlure intense. Sol uniquement.' },
  blizzard: { name: 'Blizzard', tier: 2, cost: 480, range: 125, dmg: 7, rate: 5, color: '#9fe6ff', kind: 'proj', head: 'gatling', spd: 10, psz: 2.2, slow: { f: .45, t: 60 }, heat: 4, cool: .9,
    desc: 'Mitrailleuse cryogénique : ralentit de 55%.' },
  railgun:  { name: 'Railgun', tier: 2, cost: 1100, range: 520, dmg: 380, rate: 150, color: '#e8f4ff', kind: 'pierce', head: 'rail2', pierce: 1, heat: 60, cool: .3,
    desc: 'Tir hypersonique qui transperce tous les ennemis alignés. Ignore le blindage.' },
  swarm:    { name: 'Essaim', tier: 2, cost: 520, range: 200, dmg: 26, rate: 45, color: '#7dff4d', kind: 'missiles', head: 'pods', count: 4, splash: 30, airMult: 1.8, heat: 20, cool: .6,
    desc: 'Salve de 4 missiles à tête chercheuse. Dégâts x1,8 contre les volants.' },
  stasis:   { name: 'Stase', tier: 2, cost: 460, range: 110, dmg: 14, rate: 45, color: '#5df2ff', kind: 'pulse', head: 'ring', spinHead: .02, slow: { f: .5, t: 70 }, reveal: true, heat: 15, cool: .6,
    desc: 'Impulsion de zone : dégâts, ralentissement 50% et révélation des furtifs.' },
  phoenix:  { name: 'Phénix', tier: 2, cost: 460, range: 150, dmg: 22, rate: 20, color: '#ffb03a', kind: 'proj', head: 'phoenix', spd: 9, psz: 3.5, burn: { dps: 18, t: 120 }, bounce: 2, airMult: 2, heat: 12, cool: .6,
    desc: 'Boules de feu rebondissantes (2 rebonds) qui enflamment. Anti-air x2.' },
  nexus:    { name: 'Nexus', tier: 2, cost: 520, range: 0, dmg: 0, rate: 0, color: '#7dffb0', kind: 'support', head: 'nexus', support: { cool: .8, dmg: .3, range: .1 }, diag: true,
    desc: 'Supercalculateur : buffe ses voisines, diagonales comprises (+30% dégâts, +80% refroidissement, +10% portée).' },
  // ----- SOUTIENS DE HAUT NIVEAU -----
  oracle:   { name: 'Oracle', tier: 3, cost: 1500, range: 0, dmg: 0, rate: 0, color: '#c58cff', kind: 'support', head: 'nexus', support: { crit: .12, pierce: .25 }, diag: true,
    desc: 'Calculateur de trajectoires : ses voisines, diagonales comprises, gagnent +12% de coups critiques et ignorent 25% du blindage.' },
  abyss:    { name: 'Cœur abyssal', tier: 4, cost: 2600, range: 0, dmg: 0, rate: 0, color: '#ff4df0', kind: 'support', head: 'nexus', support: { dmg: .35, rate: .2, range: .1 }, reach: 2,
    desc: 'Fragment du Léviathan : ses 12 voisines (jusqu\'à 2 cases en ligne droite) gagnent +35% de dégâts, +20% de cadence et +10% de portée.' },
  // ----- FUSIONS T3 -----
  nova:     { name: 'Nova', tier: 3, cost: 950, range: 180, dmg: 240, rate: 120, color: '#4dfff3', kind: 'proj', head: 'nova', spd: 6, psz: 7, splash: 95, heat: 60, cool: .5,
    desc: 'Sphère d\'énergie dévastatrice avec une énorme zone d\'explosion.' },
  singularity: { name: 'Singularité', tier: 3, cost: 1500, range: 165, dmg: 40, rate: 320, color: '#9b4dff', kind: 'vortex', head: 'void', spinHead: .09, vr: 58, dur: 100, pull: .7, heat: 60, cool: .4,
    desc: 'Crée un trou noir qui aspire les ennemis en arrière et les broie.' },
  storm:    { name: 'Tempête', tier: 3, cost: 1200, range: 160, dmg: 40, rate: 22, color: '#7db4ff', kind: 'chain', head: 'coil', chain: { n: 6, f: .85, r: 110 }, slow: { f: .6, t: 40 }, heat: 12, cool: .8, sfx: 'zap',
    desc: 'Orage ionique : chaîne de 6 rebonds qui ralentit.' },
  // ----- FUSION T4 -----
  apocalypse: { name: 'Apocalypse', tier: 4, cost: 2800, range: 340, dmg: 520, rate: 190, color: '#ffd23f', kind: 'orbital', head: 'apoc', strikes: 3, sr: 52, heat: 50, cool: .5,
    desc: 'Appelle 3 frappes orbitales sur les ennemis à portée. L\'arme ultime.' },
  // ----- RELIQUES T5 (après Oméga, en quintessence) -----
  lance:    { name: 'Lance-Néant', tier: 5, cost: 5200, range: 620, dmg: 2800, rate: 150, color: '#e9d8ff', kind: 'pierce', head: 'rail2', pierce: 1, heat: 60, cool: .3,
    desc: 'Relique : un rayon de néant traverse toute la carte en ligne droite, ignore le blindage et pulvérise tout ce qu\'il touche.' },
  annihil:  { name: 'Annihilateur', tier: 5, cost: 5600, range: 400, dmg: 900, rate: 200, color: '#fff08a', kind: 'orbital', head: 'apoc', strikes: 5, sr: 70, heat: 50, cool: .5,
    desc: 'Relique : 5 frappes orbitales géantes à chaque salve. Plus rien ne passe.' },
  sun:      { name: 'Soleil noir', tier: 5, cost: 5000, range: 230, dmg: 1400, rate: 110, color: '#ff6a3d', kind: 'proj', head: 'nova', spd: 5, psz: 10, splash: 150, heat: 60, cool: .5,
    desc: 'Relique : une étoile effondrée qui écrase des zones entières en explosant.' }
};
for (const k in TOWERS) TOWERS[k].key = k;

const RECIPES = [
  { a: 'blaster', b: 'sniper', r: 'plasma', n: 6 },
  { a: 'blaster', b: 'radar', r: 'tesla', n: 7 },
  { a: 'sniper', b: 'vulcan', r: 'laser', n: 9 },
  { a: 'titan', b: 'inferno', r: 'magma', n: 9 },
  { a: 'cryo', b: 'vulcan', r: 'blizzard', n: 8 },
  { a: 'sniper', b: 'computer', r: 'railgun', n: 14 },
  { a: 'aero', b: 'titan', r: 'swarm', n: 9 },
  { a: 'cryo', b: 'radar', r: 'stasis', n: 8 },
  { a: 'inferno', b: 'aero', r: 'phoenix', n: 8 },
  { a: 'fan', b: 'computer', r: 'nexus', n: 10 },
  { a: 'plasma', b: 'tesla', r: 'nova', n: 18 },
  { a: 'nexus', b: 'stasis', r: 'oracle', n: 20 },
  { a: 'laser', b: 'stasis', r: 'singularity', n: 22 },
  { a: 'blizzard', b: 'tesla', r: 'storm', n: 18 },
  { a: 'nova', b: 'railgun', r: 'apocalypse', n: 35 },
  { a: 'oracle', b: 'nexus', r: 'abyss', n: 30 },
  { a: 'apocalypse', b: 'singularity', r: 'lance', n: 40 },
  { a: 'apocalypse', b: 'storm', r: 'annihil', n: 40 },
  { a: 'abyss', b: 'nova', r: 'sun', n: 40 }
];
const TIER_NAMES = ['STANDARD', 'SOUTIEN', 'FUSION T2', 'FUSION T3', 'FUSION T4', 'RELIQUE T5'];
const COMBO_STEPS = [25, 50, 75, 100, 150, 200, 300, 500];
const COMBO_CALL = { 25: 'CARNAGE', 50: 'DÉCHAÎNÉ', 75: 'INARRÊTABLE', 100: 'APOCALYPTIQUE', 150: 'LÉGENDAIRE', 200: 'DIVIN', 300: 'COSMIQUE', 500: 'AU-DELÀ DU RÉEL' };
/* ---------- modes de jeu (écran Nouvelle partie) ---------- */
const GMODES = {
  classic: { n: 'Classique', c: '#00f3ff', d: 'Vagues infinies, un boss toutes les 5 vagues. Le mode de référence pour les records.' },
  rush:    { n: 'Boss Rush', c: '#ff2a6d', d: 'Un boss à chaque vague dès la vague 3. Crédits de départ ×1,5, primes ×1,3, fragments ×1,5.' },
  chaos:   { n: 'Chaos', c: '#ff8a3d', d: 'Un événement aléatoire presque à chaque vague, dès la vague 3. Fragments ×1,2.' },
  sandbox: { n: 'Bac à sable', c: '#39ff88', d: 'Crédits et nanites illimités, tous les plans de fusion débloqués : testez tout ! Ni succès, ni XP, ni records.' },
  custom:  { n: 'Partie perso', c: '#b48cff', d: 'Réglez vous-même ennemis, économie, boss et éléments (réglages ci-dessous, gardés pour la prochaine fois), puis choisissez la menace de base. Ni succès, ni XP, ni fragments, ni records.' }
};
/* ---------- réglages de la Partie perso : v = valeurs possibles, d = défaut ---------- */
const CUSTOM = [
  { k: 'hp', g: 'ENNEMIS', n: 'PV des ennemis', v: [.25, .5, .75, 1, 1.25, 1.5, 2, 3, 5], d: 1, f: 'x' },
  { k: 'spd', g: 'ENNEMIS', n: 'Vitesse', v: [.6, .8, 1, 1.2, 1.4, 1.6], d: 1, f: 'x' },
  { k: 'count', g: 'ENNEMIS', n: 'Nombre', v: [.5, .75, 1, 1.5, 2, 3], d: 1, f: 'x' },
  { k: 'boss', g: 'ENNEMIS', n: 'Un boss toutes les', v: [3, 5, 10], d: 5, f: 'w' },
  { k: 'money', g: 'ÉCONOMIE', n: 'Crédits de départ', v: [.5, 1, 2, 3, 5, 10], d: 1, f: 'x' },
  { k: 'bounty', g: 'ÉCONOMIE', n: 'Primes', v: [.5, .75, 1, 1.5, 2, 3], d: 1, f: 'x' },
  { k: 'lives', g: 'ÉCONOMIE', n: 'Intégrité du noyau', v: [.1, .25, .5, 1, 2, 5], d: 1, f: 'x' },
  { k: 'nano', g: 'ÉCONOMIE', n: 'Nanites de fin de vague', v: [.5, 1, 2, 3], d: 1, f: 'x' },
  { k: 'elem', g: 'ÉLÉMENTS', n: 'Plasma et abyssite gagnés', v: [.5, 1, 1.5, 2, 3, 5], d: 1, f: 'x' },
  { k: 'ecost', g: 'ÉLÉMENTS', n: 'Coût en éléments des T3/T4', v: [0, .5, 1, 1.5, 2], d: 1, f: 'x', z: 'GRATUIT' },
  { k: 'n0', g: 'ÉLÉMENTS', n: 'Nanites de départ', v: [0, 3, 10, 25, 50, 100], d: 3, f: 'n', i: '◈' },
  { k: 'p0', g: 'ÉLÉMENTS', n: 'Plasma de départ', v: [0, 3, 5, 10, 25, 50], d: 0, f: 'n', i: '✺' },
  { k: 'a0', g: 'ÉLÉMENTS', n: 'Abyssite de départ', v: [0, 2, 5, 10, 25], d: 0, f: 'n', i: '⬟' },
  { k: 'q0', g: 'ÉLÉMENTS', n: 'Quintessence de départ', v: [0, 2, 5, 10, 25], d: 0, f: 'n', i: '❂' },
  { k: 'omega', g: 'PARTIE', n: 'Niveaux Oméga après la vague', v: [10, 20, 30, 50, 75], d: 50, f: 'n' },
  { k: 'plans', g: 'PARTIE', n: 'Plans de fusion offerts', v: [0, 2, 3, 4], d: 0, l: ['AUCUN', 'T2', 'T2 + T3', 'TOUS'] },
  { k: 'ev', g: 'PARTIE', n: 'Événements aléatoires', v: [0, 1, 3], d: 1, l: ['AUCUN', 'NORMAUX', 'CHAOS'] },
  { k: 'jam', g: 'PARTIE', n: 'IEM des astéroïdes et de la foudre', v: [1, 0], d: 1, l: ['À PAYER', 'TEMPORAIRE'] }
];
const Custom = {
  norm(o) { const c = {}; for (const d of CUSTOM) c[d.k] = o && d.v.includes(o[d.k]) ? o[d.k] : d.d; return c; },
  get() { return this.norm(Store.s.cus); },
  txt(d, v) {
    if (d.l) return d.l[d.v.indexOf(v)];
    if (d.z && !v) return d.z;
    return d.f === 'x' ? '×' + String(v).replace('.', ',') : d.f === 'w' ? v + ' vagues' : v + (d.i ? ' ' + d.i : '');
  },
  // modificateurs de la partie (au lancement et au chargement d'une sauvegarde)
  apply(o) {
    const c = G.cus = this.norm(o), m = makeMut([]);
    Object.assign(m, { hp: c.hp, spd: c.spd, count: c.count, money: c.money, bounty: c.bounty, lives: c.lives, nano: c.nano, events: c.ev === 3 ? 3 : 1 });
    G.mut = m; G.mutKeys = []; G.events = c.ev > 0;
  },
  // ressources et plans offerts au départ
  start() {
    const c = G.cus;
    G.nanites += c.n0 - 3; G.res.p = c.p0; G.res.a = c.a0;
    if (c.p0) G.res.sp = 1;
    if (c.a0) G.res.sa = 1;
    G.res.q = c.q0; if (c.q0) G.res.sq = 1;
    for (const r of RECIPES) if (TOWERS[r.r].tier <= c.plans) G.unlocked.add(r.r);
  },
  differs() { const c = this.get(); return CUSTOM.some(d => c[d.k] !== d.d); },
  render() {
    const box = $('cus-box'), c = this.get();
    let h = '', g = '';
    for (const d of CUSTOM) {
      if (d.g !== g) { if (g) h += '</div>'; g = d.g; h += `<div class="cus-g"><div class="lbl-s">${g}</div>`; }
      const i = d.v.indexOf(c[d.k]), on = c[d.k] !== d.d;
      h += `<div class="cus-r${on ? ' on' : ''}"><span>${d.n}</span><span class="cus-s"><button data-k="${d.k}" data-s="-1" ${i ? '' : 'disabled'}>‹</button><b>${this.txt(d, c[d.k])}</b><button data-k="${d.k}" data-s="1" ${i < d.v.length - 1 ? '' : 'disabled'}>›</button></span></div>`;
    }
    h += '</div>';
    box.innerHTML = `<div class="cus-grid">${h}</div><div class="cus-foot"><span>Ces réglages s'ajoutent à la menace choisie (PV, intégrité, crédits, coûts en éléments).</span><button class="btn" id="cus-reset" ${this.differs() ? '' : 'disabled'}>RÉGLAGES PAR DÉFAUT</button></div>`;
    box.querySelectorAll('button[data-k]').forEach(b => b.onclick = () => {
      const d = CUSTOM.find(x => x.k === b.dataset.k), cur = this.get(), i = clamp(d.v.indexOf(cur[d.k]) + +b.dataset.s, 0, d.v.length - 1);
      cur[d.k] = d.v[i]; Store.s.cus = cur; Store.save(); Sfx.play('ui'); this.render();
    });
    $('cus-reset').onclick = () => { Store.s.cus = null; Store.save(); Sfx.play('ui'); this.render(); };
  }
};
const STRATS = ['PREMIER', 'FORT', 'FAIBLE', 'PROCHE', 'FOCUS'];

/* w : coût en « points de menace » — from : première vague d'apparition */
const ENEMIES = {
  drone:   { name: 'Drone', hp: 40, spd: 1.35, bounty: 6, leak: 2, r: 9, color: '#dff6ff', shape: 'orb', w: 1, from: 1 },
  scout:   { name: 'Éclaireur', hp: 22, spd: 2.5, bounty: 5, leak: 2, r: 7, color: '#ffe94d', shape: 'dart', rot: true, w: 1, from: 2 },
  shield:  { name: 'Gardien', hp: 55, shield: 55, spd: 1.15, bounty: 9, leak: 3, r: 10, color: '#4df3ff', shape: 'orb', w: 2, from: 3 },
  tank:    { name: 'Blindé', hp: 150, armor: 3, spd: .8, bounty: 13, leak: 5, r: 13, color: '#ff8a3d', shape: 'block', rot: true, w: 4, from: 4 },
  spectre: { name: 'Spectre', hp: 36, spd: 1.9, bounty: 8, leak: 3, r: 8, color: '#a7b4d8', shape: 'diamond', stealth: true, w: 2, from: 5 },
  medic:   { name: 'Médic', hp: 70, spd: 1.05, bounty: 11, leak: 3, r: 10, color: '#5dff7a', shape: 'cross', heal: true, w: 3, from: 6 },
  flyer:   { name: 'Volant', hp: 42, spd: 1.65, bounty: 8, leak: 3, r: 9, color: '#ff7ad9', shape: 'wing', rot: true, air: true, w: 2, from: 7 },
  glitch:  { name: 'Glitch', hp: 55, spd: 1.4, bounty: 9, leak: 3, r: 9, color: '#00ffd5', shape: 'glitch', blink: true, w: 2, from: 8 },
  jammer:  { name: 'Brouilleur', hp: 100, spd: 1.0, bounty: 13, leak: 4, r: 11, color: '#fff35c', shape: 'jammer', jam: true, w: 4, from: 9 },
  carrier: { name: 'Porteur', hp: 210, armor: 2, spd: .72, bounty: 15, leak: 6, r: 13, color: '#b05cff', shape: 'hex', rot: true, spawn: { type: 'scout', n: 4 }, w: 5, from: 11 },
  regen:   { name: 'Régénérateur', hp: 95, spd: 1.05, bounty: 11, leak: 3, r: 10, color: '#7dff4d', shape: 'regen', regen: .025, w: 3, from: 7 },
  sapper:  { name: 'Sapeur', hp: 85, armor: 1, spd: 1.25, bounty: 10, leak: 3, r: 9, color: '#c8a26b', shape: 'sapper', rot: true, sapper: true, w: 2, from: 8 },
  hive:    { name: 'Ruche', hp: 150, spd: .85, bounty: 12, leak: 4, r: 12, color: '#ffb000', shape: 'hive', spawn: { type: 'mite', n: 7, hp: .9 }, w: 4, from: 10 },
  phase:   { name: 'Déphaseur', hp: 80, spd: 1.35, bounty: 11, leak: 3, r: 9, color: '#b4a0ff', shape: 'phase', phase: { every: 240, dur: 80 }, w: 3, from: 12 },
  nullifier: { name: 'Annulateur', hp: 170, armor: 1, spd: 1.0, bounty: 13, leak: 4, r: 11, color: '#e8e8f0', shape: 'null', noSlow: true, w: 3, from: 13 },
  ram:     { name: 'Bélier', hp: 230, armor: 4, spd: .7, bounty: 16, leak: 6, r: 12, color: '#ff4d4d', shape: 'ram', rot: true, accel: true, heavy: true, w: 5, from: 14 },
  necro:   { name: 'Nécromant', hp: 160, spd: .8, bounty: 16, leak: 5, r: 11, color: '#7a4dff', shape: 'necro', summon: { type: 'wraith', every: 230, n: 1, max: 4 }, w: 5, from: 16 },
  frigate: { name: 'Frégate', hp: 260, armor: 2, shield: 120, spd: .9, bounty: 18, leak: 6, r: 13, color: '#ff9ad5', shape: 'frigate', rot: true, air: true, w: 5, from: 18 },
  juggernaut: { name: 'Mastodonte', hp: 900, armor: 7, spd: .42, bounty: 40, leak: 14, r: 16, color: '#9aa4b8', shape: 'jugg', rot: true, heavy: true, noSlow: true, w: 12, from: 20 },
  veil:    { name: 'Voileur', hp: 140, spd: 1.05, bounty: 15, leak: 4, r: 11, color: '#6de0ff', shape: 'veil', veil: { every: 280, r: 120 }, w: 4, from: 22 },
  mite:    { name: 'Mite', hp: 14, spd: 2.2, bounty: 2, leak: 1, r: 5, color: '#ffd46b', shape: 'mite', rot: true, w: 1, from: 999 },
  wraith:  { name: 'Revenant', hp: 70, spd: 1.55, bounty: 4, leak: 2, r: 8, color: '#a98bff', shape: 'wraith', w: 1, from: 999 }
};
const BOSSES = {
  colosse:  { name: 'COLOSSE', hp: 1500, armor: 3, spd: .5, bounty: 160, leak: 20, r: 22, color: '#ff3d3d', shape: 'boss1', rot: true, boss: true },
  hydre:    { name: 'HYDRE', hp: 1250, armor: 1.5, spd: .6, bounty: 160, leak: 20, r: 21, color: '#3dff8a', shape: 'boss2', boss: true, summon: { type: 'drone', every: 200, n: 2, max: 8 }, spawn: { type: 'scout', n: 6 } },
  overlord: { name: 'OVERLORD', hp: 1000, shield: 700, spd: .55, bounty: 180, leak: 25, r: 23, color: '#c43dff', shape: 'boss3', boss: true, jam: true, jamR: 150 },
  scission:   { name: 'SCISSION', hp: 1050, armor: 2, spd: .55, bounty: 150, leak: 20, r: 21, color: '#ff9f1c', shape: 'boss4', rot: true, boss: true, spawn: { type: 'shard', n: 2, hp: 1 } },
  sentinelle: { name: 'SENTINELLE', hp: 1250, shield: 400, spd: .5, bounty: 170, leak: 20, r: 22, color: '#4dd2ff', shape: 'boss5', boss: true, aura: { every: 240, r: 130, f: .3 } },
  sauteur:    { name: 'SAUTEUR', hp: 1150, armor: 3, spd: .45, bounty: 170, leak: 22, r: 20, color: '#ff5cf0', shape: 'boss6', rot: true, boss: true, leap: { every: 330, dist: 230 } }
};
/* MÉGA-BOSS : vague 50 (Léviathan), vague 100 (Oméga), puis en alternance toutes les 50 vagues.
   Plusieurs phases : à chaque seuil de PV, 2,5 s d'invulnérabilité puis de nouveaux pouvoirs. S'il atteint le noyau, c'est fini. */
// slowRes : les ralentissements et le gel n'ont que 70 % de leur effet sur lui
BOSSES.leviathan = { name: 'LÉVIATHAN', hp: 19000, shield: 2500, armor: 5, spd: .36, bounty: 2000, leak: 9999, r: 30, color: '#00e1ff', shape: 'mega1', rot: true, boss: true, mega: true, heavy: true, slowRes: .7,
  phases: [
    { n: 'Carapace abyssale', armor: 5, jam: { every: 360, r: 210, t: 120 } },
    { at: .7, n: 'Frénésie des profondeurs', armor: 1.5, spd: 1.3, shieldBack: .4, summon: { types: ['ram', 'hive', 'tank'], every: 420, n: 3 }, jam: { every: 420, r: 210, t: 120 } },
    { at: .4, n: 'Abysse', armor: 2, spd: 1.15, regen: .004, drain: { every: 420, n: 3, t: 240, r: 260 }, summon: { types: ['juggernaut', 'ram'], every: 540, n: 2 } },
    { at: .1, n: 'Raz-de-marée', armor: 1, spd: 1.4, jam: { every: 360, r: 230, t: 120 }, summon: { types: ['ram', 'juggernaut', 'hive'], every: 360, n: 2 } }
  ] };
BOSSES.omega = { name: 'OMÉGA', hp: 32000, shield: 9000, armor: 4, spd: .32, bounty: 4000, leak: 9999, r: 34, color: '#ff2bd6', shape: 'mega2', boss: true, mega: true, heavy: true,
  spawn: { type: 'echo', n: 3, hp: 1 },
  phases: [
    { n: 'Singularité éveillée', armor: 4, rift: { every: 480, n: 3 }, jam: { every: 420, r: 230, t: 100 } },
    { at: .75, n: 'Distorsion', armor: 3, blink: { every: 540, dist: 120 }, rift: { every: 420, n: 4 }, jam: { every: 420, r: 230, t: 100 } },
    { at: .5, n: 'Miroir', armor: 4, shieldBack: .6, aura: { every: 300, r: 190, f: .5 }, summon: { types: ['wraith'], every: 240, n: 4 }, blink: { every: 540, dist: 120 } },
    { at: .25, n: 'Effondrement', armor: 1.5, spd: 1.6, drain: { every: 360, n: 4, t: 240, r: 300 }, rift: { every: 360, n: 4 } }
  ] };
ENEMIES.echo = { name: 'Écho d\'Oméga', hp: 2400, armor: 3, spd: .95, bounty: 250, leak: 30, r: 18, color: '#ff7af0', shape: 'mega2', w: 0, from: 999 };
/* fragments de la Scission : jamais présents dans les vagues normales */
ENEMIES.shard =    { name: 'Fragment', hp: 380, armor: 1, spd: .8, bounty: 25, leak: 6, r: 14, color: '#ffbf5c', shape: 'boss4', rot: true, w: 0, from: 999, spawn: { type: 'shardlet', n: 2, hp: 1 } };
ENEMIES.shardlet = { name: 'Éclat', hp: 130, spd: 1.15, bounty: 8, leak: 3, r: 9, color: '#ffd9a0', shape: 'diamond', w: 0, from: 999 };
for (const k in ENEMIES) ENEMIES[k].key = k;
for (const k in BOSSES) BOSSES[k].key = k;
const BOSS_ORDER = ['colosse', 'hydre', 'overlord', 'scission', 'sentinelle', 'sauteur'];
const EDEF = k => ENEMIES[k] || BOSSES[k];

/* textes du Codex pour les ennemis */
const LORE = {
  drone: 'L\'infanterie de base de l\'essaim. Seul, il ne pèse rien ; en nombre, il use les défenses.',
  scout: 'Rapide et fragile. Il profite des trous dans la couverture de vos tourelles.',
  shield: 'Porte un bouclier qui se recharge s\'il n\'est plus touché pendant 3 secondes.',
  tank: 'Blindage épais : chaque impact perd une partie de ses dégâts. Les gros calibres le percent.',
  spectre: 'Invisible tant qu\'un Radar ou une Stase ne le révèle pas.',
  medic: 'Soigne les ennemis autour de lui à intervalles réguliers. Priorité absolue.',
  flyer: 'Survole le terrain : Inferno, Titan, Magma et les barricades ne le gênent pas.',
  glitch: 'Instable, il se téléporte en avant le long du chemin.',
  jammer: 'Son impulsion IEM neutralise les tourelles proches pendant 1,5 s.',
  carrier: 'Transporte quatre éclaireurs qu\'il libère à sa destruction.',
  shard: 'Moitié de Scission. Se brise à son tour en deux éclats.',
  regen: 'Ses tissus se reconstituent sans cesse : 2,5 % de ses PV par seconde. Il faut l\'abattre d\'un trait.',
  sapper: 'Désamorce les mines qu\'il croise et démolit les barricades dix fois plus vite.',
  hive: 'Une ruche ambulante : abattue, elle libère sept mites rapides.',
  phase: 'Bascule régulièrement hors de la réalité : intouchable et invisible pendant plus d\'une seconde.',
  nullifier: 'Insensible aux ralentissements, au gel et à la Cryo-Bombe.',
  ram: 'Accélère sans cesse en avançant, jusqu\'à doubler sa vitesse. Résiste aux trous noirs.',
  necro: 'Relève les morts : invoque des revenants tant qu\'il est en vie.',
  frigate: 'Navire volant blindé et protégé par un bouclier. Seul l\'anti-air en vient à bout.',
  juggernaut: 'Forteresse de sept points de blindage, insensible au gel et aux trous noirs. Lente, mais elle encaisse tout.',
  veil: 'Projette un voile qui rend les ennemis proches invisibles pendant 3 s. Un Radar perce le voile.',
  mite: 'Essaim libéré par une Ruche. Rapide, fragile, nombreux.',
  wraith: 'Mort revenu à la vie par un Nécromant.',
  shardlet: 'Dernier éclat d\'une Scission. Rapide, mais fragile.',
  leviathan: 'Méga-boss de la vague 50, protégé par un bouclier et en partie insensible aux ralentissements et au gel. Quatre phases : carapace et IEM géantes, puis frénésie et escorte blindée (bouclier rechargé), puis l\'Abysse qui régénère et neutralise vos meilleures tourelles, enfin le Raz-de-marée où il fonce vers le noyau. S\'il touche le noyau, la partie est perdue.',
  omega: 'Méga-boss de la vague 100. Quatre phases : failles d\'élites, distorsions, miroir de boucliers, puis effondrement. Abattu, il libère trois Échos. S\'il touche le noyau, la partie est perdue.',
  echo: 'Fragment d\'Oméga qui survit à sa destruction.',
  colosse: 'Forteresse ambulante au blindage massif. Lent, mais il encaisse tout.',
  hydre: 'Invoque des drones en avançant et libère six éclaireurs en mourant.',
  overlord: 'Bouclier colossal et impulsions IEM à large portée.',
  scission: 'Cristal instable : abattu, il se divise en deux fragments, puis en quatre éclats.',
  sentinelle: 'Projette des boucliers sur tous les ennemis qui l\'entourent.',
  sauteur: 'S\'immobilise, marque son point d\'atterrissage puis bondit loin en avant.'
};

const HINTS = {
  shield:  ['Gardiens', 'Bouclier régénérant : il se recharge s\'il n\'est plus touché pendant 3 s.'],
  tank:    ['Blindés', 'Le blindage réduit chaque impact. Préférez Sniper, Laser, Railgun ou les gros calibres.'],
  spectre: ['Spectres furtifs', 'Invisibles pour vos tourelles ! Construisez un RADAR (ou une Stase) pour les révéler.'],
  medic:   ['Médics', 'Ils soignent les ennemis proches. Éliminez-les en priorité (ciblage FAIBLE).'],
  flyer:   ['Volants', 'Inferno, Titan et Magma ne peuvent pas les toucher. L\'Aéro les détruit x2,5.'],
  glitch:  ['Glitchs', 'Ils se téléportent en avant le long du chemin. Ne les sous-estimez pas.'],
  jammer:  ['Brouilleurs', 'Leur impulsion IEM neutralise vos tourelles proches pendant 1,5 s. Touche D : payer pour les débrouiller tout de suite.'],
  carrier: ['Porteurs', 'À leur destruction, ils libèrent 4 éclaireurs.'],
  boss:    ['Alerte Boss', 'Un boss arrive dans cette vague. Préparez votre Frappe Orbitale !']
};

const WTHEMES = [
  { id: 'mix', name: 'Assaut mixte', w: 5 },
  { id: 'swarm', name: 'Essaim', w: 2, from: 4, mod: { drone: 3, scout: 3 }, countMul: 1.4, hpMul: .75 },
  { id: 'armor', name: 'Colonne blindée', w: 1.5, from: 6, mod: { tank: 4, carrier: 2 } },
  { id: 'air', name: 'Raid aérien', w: 1.5, from: 8, mod: { flyer: 6 } },
  { id: 'stealth', name: 'Opération furtive', w: 1.2, from: 6, mod: { spectre: 5 } },
  { id: 'tech', name: 'Guerre électronique', w: 1, from: 10, mod: { jammer: 3, glitch: 3 } },
  { id: 'rush', name: 'Ruée', w: 1.2, from: 4, mod: { scout: 5 }, gapMul: .55 },
  { id: 'hive', name: 'Nid', w: 1.2, from: 11, mod: { hive: 5, regen: 2 } },
  { id: 'heavy', name: 'Bulldozers', w: 1, from: 15, mod: { ram: 4, juggernaut: 3, tank: 2 }, countMul: .85 },
  { id: 'necro', name: 'Nécropole', w: 1, from: 17, mod: { necro: 4, regen: 2 } },
  { id: 'ghost', name: 'Brouillard', w: 1, from: 22, mod: { veil: 3, phase: 3, spectre: 3 } },
  { id: 'fleet', name: 'Armada', w: 1, from: 19, mod: { frigate: 4, flyer: 4 } }
];

const DIFFS = {
  recrue:    { name: 'RECRUE', hp: .7, lives: 150, money: 400, bounty: 1.15, frag: .5, color: '#39ff88', desc: 'Pour découvrir le jeu en douceur. Ennemis affaiblis, économie généreuse.' },
  standard:  { name: 'STANDARD', hp: 1, lives: 100, money: 300, bounty: 1, frag: 1, color: '#00f3ff', desc: 'L\'expérience équilibrée. Chaque décision compte.' },
  hardcore:  { name: 'HARDCORE', hp: 1.35, lives: 60, money: 260, bounty: .95, frag: 1.6, color: '#ff9500', desc: 'L\'esprit du protocole original. Peu de marge d\'erreur.' },
  cauchemar: { name: 'CAUCHEMAR', hp: 1.8, lives: 30, money: 240, bounty: .9, frag: 2.5, color: '#ff2a6d', desc: 'Ennemis surpuissants, noyau fragile. Pour les légendes.' }
};

/* Mutateurs du Défi du jour (2 tirés au sort chaque jour, identiques pour tout le monde) */
const MUTATORS = {
  rush:      { n: 'Ruée', i: '»', d: 'Ennemis 25% plus rapides.', spd: 1.25 },
  armor:     { n: 'Blindage lourd', i: '⛨', d: 'Tous les ennemis gagnent du blindage.', armorAdd: 2, armor: 1.5 },
  horde:     { n: 'Horde', i: '⁂', d: '+40% d\'ennemis, mais 25% moins résistants.', count: 1.4, hp: .75 },
  austerity: { n: 'Austérité', i: '¢', d: 'Crédits de départ -40%, primes +20%.', money: .6, bounty: 1.2 },
  nanotech:  { n: 'Nanotech', i: '◈', d: 'Nanites de fin de vague x2, primes -20%.', nano: 2, bounty: .8 },
  elite:     { n: 'Élite', i: '★', d: 'Élites 3x plus fréquents, dès la vague 4.', elite: 3 },
  titans:    { n: 'Titans', i: '☠', d: 'Boss +60% de PV, mais +5 nanites par boss.', bossHp: 1.6, bossNano: 5 },
  fragile:   { n: 'Noyau fragile', i: '♥', d: 'Intégrité -50%, fragments x1,5.', lives: .5, frag: 1.5 },
  chaos:     { n: 'Chaos', i: '☄', d: 'Un événement aléatoire presque à chaque vague, fragments x1,2.', events: 3, frag: 1.2 }
};
function makeMut(keys) {
  const m = { spd: 1, armor: 1, armorAdd: 0, count: 1, hp: 1, money: 1, bounty: 1, nano: 1, elite: 1, bossHp: 1, bossNano: 0, lives: 1, frag: 1, events: 1 };
  for (const k of keys) {
    const u = MUTATORS[k]; if (!u) continue;
    for (const p in m) if (u[p] !== undefined) m[p] = p === 'armorAdd' || p === 'bossNano' ? m[p] + u[p] : m[p] * u[p];
  }
  return m;
}
function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function todayStr() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
function dailyInfo(date = todayStr()) {
  const seed = hashStr('neon-daily-' + date), r = mulberry32(seed), keys = Object.keys(MUTATORS), a = keys.splice(Math.floor(r() * keys.length), 1)[0];
  return { date, seed: seed & 0x7fffffff, mutKeys: [a, keys[Math.floor(r() * keys.length)]] };
}

/* Arbre de compétences : 3 branches, 4 rangées, 3 colonnes */
const BRANCHES = [
  { name: 'ARSENAL', color: '#ff3d5a', desc: 'Puissance de feu' },
  { name: 'INGÉNIERIE', color: '#00e5ff', desc: 'Tourelles, chaleur, soutien' },
  { name: 'LOGISTIQUE', color: '#ffd23f', desc: 'Économie et survie' }
];
const SKILLS = {
  a1: { br: 0, row: 0, col: 1, i: '✦', n: 'Calibrage', max: 3, cost: [2, 3, 4], d: r => `+${8 * r}% dégâts pour toutes les tourelles.` },
  a2: { br: 0, row: 1, col: 0, i: '⌖', n: 'Analyse balistique', max: 3, cost: [3, 3, 4], req: [['a1', 1]], d: r => `+${4 * r}% de chances de coup critique (base 5%).` },
  a3: { br: 0, row: 1, col: 2, i: '◎', n: 'Acquisition', max: 2, cost: [3, 4], req: [['a1', 1]], d: r => `+${6 * r}% de portée pour toutes les tourelles.` },
  a4: { br: 0, row: 2, col: 0, i: '✸', n: 'Ogives', max: 2, cost: [4, 5], req: [['a2', 2]], d: r => `Dégâts critiques : x${(2 + .5 * r).toFixed(1)} (base x2).` },
  a5: { br: 0, row: 2, col: 2, i: '⟟', n: 'Perforation', max: 2, cost: [4, 5], req: [['a3', 1]], d: r => `Toutes les tourelles ignorent ${25 * r}% du blindage.` },
  a6: { br: 0, row: 3, col: 1, i: '⚡', n: 'Surcharge', max: 1, cost: [8], reqAny: [['a4', 1], ['a5', 1]], cap: true, d: () => 'Débloque la capacité SURCHARGE : cadence x2 sans surchauffe pendant 8 s.' },
  e1: { br: 1, row: 0, col: 1, i: '❄', n: 'Thermodynamique', max: 3, cost: [2, 2, 3], d: r => `+${25 * r}% de refroidissement.` },
  e2: { br: 1, row: 1, col: 0, i: '⚙', n: 'Logistique', max: 3, cost: [3, 3, 4], req: [['e1', 1]], d: r => `-${5 * r}% sur le coût de construction et d'amélioration.` },
  e3: { br: 1, row: 1, col: 2, i: '♨', n: 'Régulateur', max: 2, cost: [3, 4], req: [['e1', 1]], d: r => `-${20 * r}% de chaleur générée en Surcadence.` },
  e4: { br: 1, row: 2, col: 0, i: '⟲', n: 'Récupération', max: 2, cost: [2, 3], req: [['e2', 1]], d: r => `Revente à ${70 + 10 * r}% de la valeur investie (base 70%).` },
  e5: { br: 1, row: 2, col: 2, i: '⧉', n: 'Synergie', max: 2, cost: [4, 5], req: [['e3', 1]], d: r => `+${40 * r}% d'efficacité pour Ventilo, Ordi et Nexus.` },
  e6: { br: 1, row: 3, col: 1, i: '✺', n: 'Cryo-Bombe', max: 1, cost: [8], reqAny: [['e4', 1], ['e5', 1]], cap: true, d: () => 'Débloque la capacité CRYO-BOMBE : gèle tous les ennemis 3 s.' },
  c1: { br: 2, row: 0, col: 1, i: '$', n: 'Économie de guerre', max: 3, cost: [2, 3, 4], d: r => `+${10 * r}% de crédits par élimination.` },
  c2: { br: 2, row: 1, col: 0, i: '%', n: 'Intérêts', max: 2, cost: [4, 5], req: [['c1', 1]], d: r => `+${3 * r}% d'intérêts sur vos crédits à chaque fin de vague (plafonné).` },
  c3: { br: 2, row: 1, col: 2, i: '⊕', n: 'Aimant', max: 1, cost: [3], req: [['c1', 1]], d: () => 'Collecte automatique des bonus et +50% de chances de butin.' },
  c4: { br: 2, row: 2, col: 0, i: '♥', n: 'Coque nanite', max: 3, cost: [3, 3, 4], req: [['c2', 1]], d: r => `+${15 * r} intégrité max. et +${3 * r} réparée à chaque vague.` },
  c5: { br: 2, row: 2, col: 2, i: '⟳', n: 'Ferrailleur', max: 1, cost: [3], req: [['c3', 1]], d: () => '+2 charges de recyclage immédiates, butin des débris x2.' },
  c6: { br: 2, row: 3, col: 1, i: '☄', n: 'Frappe orbitale II', max: 1, cost: [8], reqAny: [['c4', 1], ['c5', 1]], cap: true, d: () => 'Frappe Orbitale : +75% de dégâts et -30% de recharge.' },
  // palier III : plasma
  a7:  { br: 0, row: 4, col: 0, cur: 'p', i: '✺', n: 'Munitions à plasma', max: 3, cost: [2, 3, 4], req: [['a6', 1]], d: r => `+${12 * r}% dégâts pour toutes les tourelles.` },
  a8:  { br: 0, row: 4, col: 2, cur: 'p', i: '♛', n: 'Tueur de titans', max: 2, cost: [3, 4], req: [['a6', 1]], d: r => `+${25 * r}% de dégâts contre les boss.` },
  a9:  { br: 0, row: 5, col: 1, cur: 'p', i: '☠', n: 'Exécution', max: 1, cost: [6], reqAny: [['a7', 1], ['a8', 1]], d: () => 'Les ennemis (hors boss) sous 8% de leurs PV sont achevés instantanément.' },
  e7:  { br: 1, row: 4, col: 0, cur: 'p', i: '≫', n: 'Cadence plasma', max: 3, cost: [2, 3, 4], req: [['e6', 1]], d: r => `+${8 * r}% de cadence de tir.` },
  e8:  { br: 1, row: 4, col: 2, cur: 'p', i: '⬡', n: 'Maillage', max: 1, cost: [5], req: [['e6', 1]], d: () => 'Ventilo, Ordi et Nexus agrandissent leur zone d\'un cran : 4 → 8 voisins (diagonales), et 8 → 12 pour le Nexus.' },
  e9:  { br: 1, row: 5, col: 1, cur: 'p', i: '⛨', n: 'Blindage IEM', max: 2, cost: [4, 6], reqAny: [['e7', 1], ['e8', 1]], d: r => `Brouillage, drain et étourdissement des tourelles -${35 * r}% de durée.` },
  c7:  { br: 2, row: 4, col: 0, cur: 'p', i: '✺', n: 'Prospection', max: 2, cost: [3, 4], req: [['c6', 1]], d: r => `+${r} plasma par boss vaincu.` },
  c8:  { br: 2, row: 4, col: 2, cur: 'p', i: '¤', n: 'Fonds souverain', max: 2, cost: [2, 3], req: [['c6', 1]], d: r => `Primes de fin de vague +${40 * r}%.` },
  c9:  { br: 2, row: 5, col: 1, cur: 'p', i: '⛉', n: 'Bouclier de noyau', max: 2, cost: [4, 6], reqAny: [['c7', 1], ['c8', 1]], d: r => `À chaque vague, les ${2 * r} premiers ennemis (hors boss) qui atteignent le noyau sont absorbés.` },
  // palier IV : abyssite
  a10: { br: 0, row: 6, col: 1, cur: 'a', top: true, i: '✹', n: 'Fureur abyssale', max: 3, cost: [2, 3, 4], req: [['a9', 1]], d: r => `+${25 * r}% dégâts et +${5 * r}% de coup critique.` },
  e10: { br: 1, row: 6, col: 1, cur: 'a', top: true, i: 'Ω', n: 'Protocole Oméga', max: 1, cost: [4], req: [['e9', 1]], d: () => 'Niveaux Oméga : +50% de dégâts par niveau au lieu de +35%.' },
  // palier V : quintessence (après Oméga), puis rangs sans limite
  a11: { br: 0, row: 7, col: 1, cur: 'q', top: true, i: '☄', n: 'Annihilation', max: 3, cost: [2, 3, 4], req: [['a10', 1]], d: r => `+${20 * r}% dégâts et dégâts critiques +${25 * r}%.` },
  e11: { br: 1, row: 7, col: 1, cur: 'q', top: true, i: '⚛', n: 'Surcharge quantique', max: 3, cost: [2, 3, 4], req: [['e10', 1]], d: r => `+${10 * r}% de cadence et -${10 * r}% de chaleur.` },
  c11: { br: 2, row: 7, col: 1, cur: 'q', top: true, i: '❂', n: 'Dividendes du néant', max: 2, cost: [3, 4], req: [['c10', 1]], d: r => `+${r} quintessence par boss après la vague ${QFROM} et +${20 * r}% de crédits par élimination.` },
  a12: { br: 0, row: 8, col: 1, cur: 'q', top: true, inf: true, i: '∞', n: 'Puissance infinie', max: Infinity, cost: [2], req: [['a11', 1]], d: r => `+${6 * r}% dégâts (sans limite, +1 ❂ de prix par rang).` },
  e12: { br: 1, row: 8, col: 1, cur: 'q', top: true, inf: true, i: '∞', n: 'Cadence infinie', max: Infinity, cost: [2], req: [['e11', 1]], d: r => `+${4 * r}% de cadence (sans limite, +1 ❂ de prix par rang).` },
  c12: { br: 2, row: 8, col: 1, cur: 'q', top: true, inf: true, i: '∞', n: 'Fortune infinie', max: Infinity, cost: [2], req: [['c11', 1]], d: r => `+${6 * r}% de crédits par élimination et de primes de vague (sans limite, +1 ❂ de prix par rang).` },
  c10: { br: 2, row: 6, col: 1, cur: 'a', top: true, i: '⬟', n: 'Filon abyssal', max: 1, cost: [3], req: [['c9', 1]], d: () => '+1 abyssite par boss vaincu après la vague 50 et +25% de crédits par élimination.' }
};

/* Héritage : améliorations permanentes achetées avec les Fragments */
/* coopération : Héritage d'équipe. Chacun garde ses crédits de départ ; pour le reste, l'équipe prend
   le meilleur rang de chacun (intégrité, recharge, primes, recyclage), et additionne nanites et plans */
function teamPerks(by) {
  const L = Object.values(by || {}).map(x => x || {}), mx = k => Math.max(0, ...L.map(x => x[k] || 0)), sum = k => L.reduce((a, x) => a + (x[k] || 0), 0);
  return { h_money: 0, h_lives: mx('h_lives'), h_cd: mx('h_cd'), h_bonus: mx('h_bonus'), h_recycle: mx('h_recycle'), h_nano: sum('h_nano'), h_bp: Math.min(4, sum('h_bp')) };
}
// rangs d'Héritage reçus d'un autre joueur : seulement des rangs connus, dans les limites
function cleanPerks(o) { const r = {}; for (const k in PERKS) { const v = o && +o[k]; if (v > 0) r[k] = Math.min(PERKS[k].max, Math.floor(v)); } return r; }
const PERKS = {
  h_money:   { n: 'Capital initial', i: '$', max: 5, cost: [3, 5, 8, 12, 16], d: '+40 crédits de départ par rang.' },
  h_lives:   { n: 'Blindage de coque', i: '♥', max: 3, cost: [4, 8, 14], d: '+15 intégrité maximale par rang.' },
  h_nano:    { n: 'Réserve nanite', i: '◈', max: 3, cost: [5, 9, 14], d: '+2 nanites de départ par rang.' },
  h_recycle: { n: 'Récupérateur', i: '⟳', max: 2, cost: [4, 9], d: '+1 charge de recyclage de départ par rang.' },
  h_cd:      { n: 'Commandement', i: '⌖', max: 3, cost: [6, 10, 15], d: '-8% de recharge des capacités par rang.' },
  h_bonus:   { n: 'Contrats de guerre', i: '%', max: 2, cost: [8, 14], d: '+25% de bonus de fin de vague par rang.' },
  h_bp:      { n: 'Archives', i: '✧', max: 2, cost: [12, 24], d: 'Commence avec un plan de fusion T2 aléatoire par rang.' }
};

const ACH = {
  first:    { n: 'Premier Sang', d: 'Éliminer un premier ennemi.', i: '✦' },
  wave10:   { n: 'Vétéran', d: 'Terminer la vague 10.', i: 'Ⅹ' },
  wave25:   { n: 'Légende', d: 'Terminer la vague 25.', i: '★' },
  wave50:   { n: 'Immortel', d: 'Terminer la vague 50.', i: '∞' },
  leviathan: { n: 'Chasseur d\'abysses', d: 'Vaincre le Léviathan, méga-boss de la vague 50.', i: '≋' },
  omega:    { n: 'Fin des temps', d: 'Vaincre Oméga, méga-boss de la vague 100.', i: 'Ω' },
  combo:    { n: 'Roi du Combo', d: 'Enchaîner 100 éliminations sans interruption.', i: '⚡' },
  rich:     { n: 'Magnat', d: 'Posséder 5 000 crédits.', i: '$' },
  maxlvl:   { n: 'Surcadencé', d: 'Améliorer une tourelle au niveau 10.', i: '▲' },
  meltdown: { n: 'Fusion du Cœur', d: 'Faire surchauffer une tourelle.', i: '♨' },
  fusion1:  { n: 'Alchimiste', d: 'Acquérir un premier plan de fusion.', i: '✧' },
  tier3:    { n: 'Ingénieur Stellaire', d: 'Acquérir un plan de fusion T3.', i: '✶' },
  apoc:     { n: 'Fin des Temps', d: 'Construire une tourelle Apocalypse.', i: '☀' },
  field:    { n: 'Soudure à Chaud', d: 'Fusionner deux tourelles directement sur le terrain.', i: '⚒' },
  boss:     { n: 'Tueur de Titans', d: 'Vaincre un boss.', i: '☠' },
  noleak:   { n: 'Inviolable', d: 'Terminer la vague 10 sans aucune fuite.', i: '⛨' },
  scholar:  { n: 'Érudit', d: 'Atteindre 15 rangs de compétences dans une partie.', i: '⟁' },
  recycler: { n: 'Ferrailleur', d: 'Recycler 10 débris (cumulé).', i: '⟳' },
  hard15:   { n: 'Masochiste', d: 'Atteindre la vague 15 en Hardcore ou Cauchemar.', i: '☢' },
  overdrive:{ n: 'Pleine Puissance', d: 'Utiliser les 3 capacités dans une même partie.', i: '✺' },
  daily:    { n: 'Défi Relevé', d: 'Atteindre la vague 15 lors d\'un Défi du jour.', i: '☼' },
  codex:    { n: 'Encyclopédiste', d: 'Compléter entièrement le Codex.', i: '❖' },
  chaos:    { n: 'Météorologue', d: 'Vivre 10 événements aléatoires dans une même partie.', i: '☄' },
  jackpot:  { n: 'Jackpot !', d: 'Aligner trois 7 à la machine à sous.', i: '7' },
  bookie:   { n: 'Bookmaker', d: 'Gagner 5 paris dans une même partie.', i: '⚖' },
  mpwin:    { n: 'Gladiateur', d: 'Remporter une partie en versus.', i: '⚔' },
  wave100:  { n: 'Centurion', d: 'Terminer la vague 100.', i: 'Ⅽ' },
  quint:    { n: 'Essence pure', d: 'Obtenir de la quintessence ❂.', i: '❂' },
  relic:    { n: 'Gardien des reliques', d: 'Poser une relique T5.', i: '♛' },
  abyss:    { n: 'Cœur des abysses', d: 'Poser un Cœur abyssal, soutien T4.', i: '⬟' },
  conduct:  { n: 'Chef d\'orchestre', d: 'Faire profiter une tourelle de trois types de soutien à la fois.', i: '♫' },
  infinite: { n: 'Sans limite', d: 'Acheter un rang infini dans l\'arbre de compétences.', i: '∞' },
  daily30:  { n: 'Champion du jour', d: 'Atteindre la vague 30 lors d\'un Défi du jour.', i: '☼' },
  coop30:   { n: 'Escouade', d: 'Atteindre la vague 30 en coopération.', i: '⛯' },
  architect:{ n: 'Architecte', d: 'Enregistrer une carte dans l\'éditeur de cartes.', i: '✎' },
  podium:   { n: 'Sur la carte du monde', d: 'Publier un score au classement en ligne du Défi du jour.', i: '♜' },
  mpcoop:   { n: 'Frères d\'armes', d: 'Tenir jusqu\'au bout une partie en coopération.', i: '⛨' }
};

const ABILS = {
  orbital:   { n: 'Frappe Orbitale', i: '☄', code: 'KeyQ', cd: 2400, targeted: true, radius: 110, color: '#ff2a6d',
    d: 'Frappe une zone ciblée avec des dégâts massifs adaptés à la vague.' },
  emp:       { n: 'Cryo-Bombe', i: '❄', code: 'KeyW', cd: 3600, skill: 'e6', color: '#3ad7ff',
    d: 'Gèle tous les ennemis pendant 3 s (boss : 1,5 s).' },
  overdrive: { n: 'Surcharge', i: '⚡', code: 'KeyE', cd: 4200, skill: 'a6', dur: 480, color: '#ffae00',
    d: 'Toutes les tourelles tirent 2x plus vite, sans surchauffe, pendant 8 s.' }
};

/* ---------- Pièges : posés SUR le chemin, à usage unique ou destructibles ---------- */
/* ---------- Événements aléatoires : surgissent pendant une vague (t : b = aubaine, m = menace, x = imprévu) ---------- */
const EVENTS = {
  meteor: { n: 'Pluie d\'astéroïdes', i: '☄', c: '#ff8a3d', t: 'x', w: 3, from: 4, d: 'Des astéroïdes s\'écrasent : dégâts massifs aux ennemis, mais les tourelles touchées sont sonnées. Certains laissent un débris recyclable.' },
  supply: { n: 'Ravitaillement', i: '⬙', c: '#39ff88', t: 'b', w: 3, from: 3, d: 'Une capsule atterrit sur la carte : cliquez-la avant qu\'elle ne s\'autodétruise (12 s).' },
  gold:   { n: 'Ruée vers l\'or', i: '$', c: '#ffd23f', t: 'b', w: 2.2, from: 5, dur: 900, mod: { bounty: 2 }, d: 'Primes doublées pendant 15 s.' },
  surge:  { n: 'Surtension', i: 'ϟ', c: '#00f3ff', t: 'b', w: 2, from: 5, dur: 600, mod: { rate: 1.4 }, d: 'Le réseau s\'emballe : cadence de tir +40 % pendant 10 s.' },
  solar:  { n: 'Tempête solaire', i: '☀', c: '#ffb13d', t: 'x', w: 2, from: 6, dur: 720, mod: { range: .8, dmg: 1.25 }, d: 'Portée des tourelles -20 % mais dégâts +25 % pendant 12 s.' },
  blood:  { n: 'Lune de sang', i: '◐', c: '#ff2a6d', t: 'x', w: 2, from: 8, dur: 720, spd: 1.3, mod: { bounty: 1.5 }, d: 'Ennemis 30 % plus rapides pendant 12 s… mais primes +50 %.' },
  comet:  { n: 'Comète', i: '✶', c: '#9fe8ff', t: 'b', w: 1.4, from: 10, d: 'Une comète remonte le chemin et pulvérise tout ce qu\'elle croise.' },
  rift:   { n: 'Faille dimensionnelle', i: '◎', c: '#c43dff', t: 'm', w: 1.4, from: 9, d: 'Une faille s\'ouvre au milieu du chemin et libère des ennemis supplémentaires (primes +50 %).' },
  storm:  { n: 'Orage IEM', i: '⚡', c: '#fff35c', t: 'x', w: 1.4, from: 12, d: 'La foudre frappe la carte : elle électrocute les ennemis mais sonne les tourelles proches.' }
};
/* ---------- Casino : symboles de la machine à sous (poids par rouleau) ---------- */
const SLOT_SYM = {
  c: { g: '¢', w: 27, col: '#ffd23f', n: 'Crédits' },
  n: { g: '◈', w: 16, col: '#00ffaa', n: 'Nanites' },
  k: { g: '★', w: 9, col: '#ff2bd6', n: 'Protocole' },
  a: { g: '☄', w: 11, col: '#ff8a3d', n: 'Capacités' },
  s: { g: '☠', w: 17, col: '#8a93a8', n: 'Crâne' },
  h: { g: '♥', w: 10, col: '#ff2a6d', n: 'Intégrité' },
  j: { g: '7', w: 10, col: '#ff3d3d', n: 'Sept' }
};
const SLOT_KEYS = Object.keys(SLOT_SYM);
const BET_LVL = [{ n: 'PRUDENTE', m: 1 }, { n: 'AUDACIEUSE', m: 3 }, { n: 'FOLLE', m: 8 }];
const BET_STAKE = [{ n: 'PETITE', m: 2 }, { n: 'GROSSE', m: 5 }, { n: 'ÉNORME', m: 12 }];
const EV_KIND = { b: ['AUBAINE', '#39ff88'], m: ['MENACE', '#ff2a6d'], x: ['IMPRÉVU', '#ffd23f'] };

const TRAPS = {
  mine:      { name: 'Mine', cost: 40, color: '#ff5544', max: 8, r: 58, d: 'Explose au passage d\'un ennemi au sol : gros dégâts de zone. Usage unique.' },
  barricade: { name: 'Barricade', cost: 120, color: '#ffae00', max: 4, d: 'Bloque les ennemis au sol, qui doivent la détruire pour passer. Les volants l\'ignorent.' }
};

/* ---------- Spécialisations : au niveau 5 (soutiens : 3), chaque tourelle choisit une voie ----------
   Les voies dépendent du type de tir ; elles multiplient (dmg, rate, range, splash…) ou ajoutent (crit, chain…). */
const SPEC_LVL = 5, SPEC_LVL_SUPPORT = 3;
const SPECS = {
  proj:     [{ n: 'Perforant', i: '⟟', d: '+35% de dégâts et ignore 40% du blindage.', dmg: 1.35, pierce: .4 },
             { n: 'Rafale', i: '⁂', d: '+45% de cadence de tir.', rate: 1.45 }],
  hitscan:  [{ n: 'Assassin', i: '⌖', d: '+25% de chances de critique, dégâts critiques x1,5.', crit: .25, critMul: 1.5 },
             { n: 'Tir rapide', i: '»', d: 'Cadence x1,8, mais -25% de dégâts par tir.', rate: 1.8, dmg: .75 }],
  mortar:   [{ n: 'Obus lourds', i: '✹', d: '+45% de rayon d\'explosion et +20% de dégâts.', splash: 1.45, dmg: 1.2 },
             { n: 'Barrage', i: '⁂', d: '+60% de cadence de tir.', rate: 1.6 }],
  cone:     [{ n: 'Napalm', i: '♨', d: 'Brûlures deux fois plus puissantes.', burn: 2 },
             { n: 'Torche', i: '◎', d: '+30% de portée et cône 40% plus large.', range: 1.3, cone: 1.4 }],
  chain:    [{ n: 'Surtension', i: '⚡', d: '+2 rebonds et moins de perte à chaque saut.', chain: 2, chainF: 1.08 },
             { n: 'Arc focalisé', i: '↯', d: '+55% de dégâts, mais -2 rebonds.', dmg: 1.55, chain: -2 }],
  beam:     [{ n: 'Fournaise', i: '♨', d: 'Montée en puissance 2x plus rapide et plafond +40%.', rampSpd: 2, rampMax: 1.4 },
             { n: 'Longue focale', i: '◎', d: '+35% de portée et +15% de dégâts.', range: 1.35, dmg: 1.15 }],
  pierce:   [{ n: 'Accélérateur', i: '»', d: '+50% de cadence de tir.', rate: 1.5 },
             { n: 'Surcharge', i: '✦', d: '+60% de dégâts par tir.', dmg: 1.6 }],
  pulse:    [{ n: 'Onde de choc', i: '◎', d: '+40% de portée.', range: 1.4 },
             { n: 'Gel profond', i: '❄', d: 'Ralentissement 30% plus fort et +30% de dégâts.', slow: 1.3, dmg: 1.3 }],
  missiles: [{ n: 'Salve', i: '⁂', d: '+2 missiles par tir.', missiles: 2 },
             { n: 'Ogives', i: '✹', d: '+50% de dégâts et +30% de zone.', dmg: 1.5, splash: 1.3 }],
  vortex:   [{ n: 'Horizon', i: '◎', d: 'Trou noir 25% plus grand.', vr: 1.25 },
             { n: 'Effondrement', i: '●', d: 'Dégâts du trou noir +50%.', dmg: 1.5 }],
  orbital:  [{ n: 'Bombardement', i: '⁂', d: '+2 frappes par salve.', strikes: 2 },
             { n: 'Lance divine', i: '☄', d: '+80% de dégâts, mais zone -20%.', dmg: 1.8, sr: .8 }],
  radar:    [{ n: 'Brouillage', i: '⌖', d: 'Marquage +15% supplémentaire.', mark: .15 },
             { n: 'Veille longue', i: '◎', d: '+50% de portée.', range: 1.5 }],
  support:  [{ n: 'Amplificateur', i: '▲', d: 'Effets de soutien +50%.', eff: 1.5 },
             { n: 'Rayonnement', i: '✺', d: 'Zone agrandie d\'un cran : les diagonales (8 voisins), ou les cases à 2 de distance si les diagonales sont déjà couvertes (12 voisins).', diag: true }],
  // le Nexus couvre déjà les diagonales : sa seconde voie va plus loin
  nexus:    [{ n: 'Amplificateur', i: '▲', d: 'Effets de soutien +50%.', eff: 1.5 },
             { n: 'Grand rayonnement', i: '✺', d: 'Zone agrandie : les cases à 2 de distance en ligne droite s\'ajoutent (12 voisins au lieu de 8).', diag: true }]
};

/* ---------- Commandant : niveau permanent, grades et doctrines ---------- */
const RANKS = ['Recrue', 'Soldat', 'Caporal', 'Sergent', 'Adjudant', 'Sous-lieutenant', 'Lieutenant', 'Capitaine', 'Commandant',
  'Lieutenant-colonel', 'Colonel', 'Général de brigade', 'Général de division', 'Général d\'armée', 'Maréchal', 'Légende'];
const XP_DIFF = { recrue: .6, standard: 1, hardcore: 1.4, cauchemar: 2 };

/* Doctrines : style de jeu choisi au lancement, débloquées en montant de niveau */
const DOCTRINES = {
  standard:  { n: 'Polyvalente', i: '◇', lvl: 1, d: 'Aucun bonus, aucun malus.' },
  artillery: { n: 'Artillerie', i: '✹', lvl: 3, d: 'Titan et Magma -25% de coût. Zones d\'explosion +15%.', kcost: { titan: .75, magma: .75 }, splash: 1.15 },
  engineer:  { n: 'Génie', i: '⚙', lvl: 5, d: 'Ventilo, Ordi et Nexus -40% de coût. Chaleur de surcadence -25%.', kcost: { fan: .6, computer: .6, nexus: .6 }, heat: .75 },
  banker:    { n: 'Finance', i: '¢', lvl: 7, d: '4% d\'intérêts dès le départ, mais -8% de dégâts.', interest: .04, dmg: .92 },
  alchemist: { n: 'Alchimie', i: '✧', lvl: 10, d: '+6 nanites de départ. Plans de fusion -20%.', nano: 6, bp: .8 },
  marksman:  { n: 'Précision', i: '⌖', lvl: 13, d: 'Sniper et Railgun +35% de dégâts. Critique +5%.', kdmg: { sniper: 1.35, railgun: 1.35 }, crit: .05 },
  bastion:   { n: 'Bastion', i: '⛨', lvl: 16, d: '+40 intégrité max. +2 réparés à chaque vague.', lives: 40, regen: 2 },
  blitz:     { n: 'Blitz', i: '»', lvl: 20, d: 'Cadence +15% pour toutes les tourelles, mais ennemis +10% plus rapides.', rate: 1.15, espd: 1.1 }
};

/* ---------- Missions : 3 objectifs actifs, remplacés dès qu'ils sont accomplis ----------
   ev : événement suivi — max : progression = meilleure valeur atteinte — fixed : objectif qui ne grandit pas avec les vagues */
const MISSIONS = [
  { id: 'kills',   i: '✦', base: 90,   ev: 'kill', d: n => `Éliminer ${n} ennemis` },
  { id: 'air',     i: '➶', base: 12,   ev: 'kill', from: 7, f: e => e.air, d: n => `Abattre ${n} volants` },
  { id: 'stealth', i: '◈', base: 8,    ev: 'kill', from: 5, f: e => e.stealth, d: n => `Éliminer ${n} spectres furtifs` },
  { id: 'armor',   i: '⛨', base: 8,    ev: 'kill', from: 4, f: e => e.type === 'tank' || e.type === 'carrier', d: n => `Détruire ${n} blindés ou porteurs` },
  { id: 'elite',   i: '★', base: 2,    ev: 'kill', from: 8, fixed: true, f: e => e.elite, d: n => `Éliminer ${n} ennemis d'élite` },
  { id: 'boss',    i: '☠', base: 1,    ev: 'kill', fixed: true, f: e => e.boss, near: true, d: () => 'Vaincre le prochain boss' },
  { id: 'burn',    i: '♨', base: 20,   ev: 'kill', f: e => e.burnT > 0, need: () => G.towers.some(t => t.d.burn), d: n => `Éliminer ${n} ennemis en feu` },
  { id: 'cold',    i: '❄', base: 30,   ev: 'kill', f: e => e.slowT > 0 || e.freezeT > 0, need: () => G.towers.some(t => t.d.slow), d: n => `Éliminer ${n} ennemis ralentis` },
  { id: 'combo',   i: '⚡', base: 30,   ev: 'combo', max: true, d: n => `Atteindre un combo de ${n}` },
  { id: 'clean',   i: '♥', base: 3,    ev: 'clean', fixed: true, d: n => `Repousser ${n} vagues sans aucune fuite` },
  { id: 'fuse',    i: '⚒', base: 1,    ev: 'fuse', fixed: true, need: () => G.unlocked.size > 0, d: () => 'Fusionner deux tourelles sur le terrain' },
  { id: 'upgrade', i: '▲', base: 10,   ev: 'upgrade', d: n => `Effectuer ${n} améliorations` },
  { id: 'level',   i: '▲', base: 6,    ev: 'level', max: true, fixed: true, d: n => `Monter une tourelle au niveau ${n}` },
  { id: 'crit',    i: '✸', base: 45,   ev: 'crit', d: n => `Infliger ${n} coups critiques` },
  { id: 'orbital', i: '☄', base: 6,    ev: 'orbital', max: true, fixed: true, d: n => `Toucher ${n} ennemis d'une seule Frappe Orbitale` },
  { id: 'early',   i: '⏩', base: 2,    ev: 'early', fixed: true, d: n => `Appeler ${n} vagues en avance` },
  { id: 'recycle', i: '⟳', base: 2,    ev: 'recycle', fixed: true, need: () => G.recycle > 0, d: n => `Recycler ${n} débris` },
  { id: 'rich',    i: '$', base: 1200, ev: 'money', max: true, d: n => `Posséder ${n} crédits` },
  { id: 'skill',   i: '⟁', base: 3,    ev: 'skill', fixed: true, d: n => `Acheter ${n} rangs de compétence` },
  { id: 'plan',    i: '✧', base: 1,    ev: 'plan', fixed: true, d: () => 'Synthétiser un plan de fusion' }
];

/* ---------- Protocoles : une carte à choisir parmi 3 après chaque vague ----------
   r : rareté (0 standard, 1 rare, 2 pacte) — mod : multiplicateurs cumulés — add : bonus additifs — now : effet immédiat */
const CARDS = {
  cash:     { cat: 'eco', r: 0, i: '¢', n: 'Subvention', d: () => `+${50 + 10 * G.waveNum} crédits immédiatement.`, now: () => { gain(50 + 10 * G.waveNum); } },
  nano:     { cat: 'eco', r: 0, i: '◈', n: 'Cache de nanites', d: () => '+2 nanites immédiatement.', now: () => { G.nanites += 2; } },
  repair:   { cat: 'def', r: 0, i: '♥', n: 'Réparations', d: () => '+15 intégrité (dans la limite du maximum).', need: () => G.lives < G.maxLives, now: () => { G.lives = Math.min(G.maxLives, G.lives + 15); } },
  recharge: { cat: 'tac', r: 0, i: '☄', n: 'Recharge express', d: () => 'Toutes les capacités sont rechargées.', need: () => Abil.keys.some(k => G.abil[k] > 0), now: () => { for (const k of Abil.keys) G.abil[k] = 0; } },
  scrap:    { cat: 'eco', r: 0, i: '⟳', n: 'Ferraille', d: () => '+2 charges de recyclage.', now: () => { G.recycle += 2; } },
  hull:     { cat: 'def', r: 0, i: '⛨', n: 'Coque renforcée', d: () => '+10 intégrité maximale (et actuelle).', max: 4, now: () => { G.maxLives += 10; G.lives += 10; } },
  dmg:      { cat: 'atk', r: 1, i: '✦', n: 'Munitions perforantes', d: () => '+5% de dégâts pour toutes les tourelles.', mod: { dmg: 1.05 }, max: 5 },
  rate:     { cat: 'atk', r: 1, i: '⚙', n: 'Servomoteurs', d: () => '+5% de cadence de tir.', mod: { rate: 1.05 }, max: 4 },
  range:    { cat: 'atk', r: 1, i: '◎', n: 'Optique longue', d: () => '+5% de portée.', mod: { range: 1.05 }, max: 3 },
  crit:     { cat: 'atk', r: 1, i: '⌖', n: 'Visée laser', d: () => '+3% de chances de critique.', add: { crit: .03 }, max: 3 },
  splash:   { cat: 'atk', r: 1, i: '✹', n: 'Charges creuses', d: () => '+12% de rayon d\'explosion.', mod: { splash: 1.12 }, max: 3, need: () => G.towers.some(t => t.d.splash) },
  burn:     { cat: 'atk', r: 1, i: '♨', n: 'Napalm', d: () => 'Brûlures +25%.', mod: { burn: 1.25 }, max: 3, need: () => G.towers.some(t => t.d.burn) },
  slow:     { cat: 'tac', r: 1, i: '❄', n: 'Azote liquide', d: () => 'Ralentissements 20% plus puissants.', mod: { slow: 1.2 }, max: 2, need: () => G.towers.some(t => t.d.slow) },
  bounty:   { cat: 'eco', r: 1, i: '$', n: 'Prime de guerre', d: () => '+6% de crédits par élimination.', mod: { bounty: 1.06 }, max: 3 },
  cool:     { cat: 'tac', r: 1, i: '♒', n: 'Caloducs', d: () => '+25% de refroidissement.', mod: { cool: 1.25 }, max: 3 },
  renovate: { cat: 'eco', r: 1, i: '▲', n: 'Rénovation', d: () => '+1 niveau gratuit pour vos 2 tourelles les plus faibles.', max: 3, need: () => G.towers.some(t => t.level < Math.min(10, Towers.maxLevel(t))),
    now: () => { G.towers.filter(t => t.level < Math.min(10, Towers.maxLevel(t))).sort((a, b) => a.level - b.level).slice(0, 2).forEach(t => { t.level++; t.born = performance.now() - 170; }); } },
  chain:    { cat: 'atk', r: 2, i: '⚡', n: 'Supraconducteurs', d: () => 'Arcs électriques : +1 rebond.', add: { chain: 1 }, max: 3, need: () => G.towers.some(t => t.d.chain) },
  pierce:   { cat: 'atk', r: 2, i: '⟟', n: 'Ogives à uranium', d: () => 'Toutes les tourelles ignorent 15% du blindage.', add: { pierce: .15 }, max: 3 },
  gift:     { cat: 'tac', r: 2, i: '✧', n: 'Plan offert', d: () => 'Un plan de fusion T2 aléatoire, gratuitement.', need: () => RECIPES.some(r => TOWERS[r.r].tier === 2 && Fusion.canResearch(r)),
    now: () => { const c = RECIPES.filter(r => TOWERS[r.r].tier === 2 && Fusion.canResearch(r)); const r = spick(c); G.unlocked.add(r.r); if (!G.demo) G.freshBp = r.r; UI.toast('Plan offert : ' + TOWERS[r.r].name, 'Constructible dès maintenant.', TOWERS[r.r].color, 4); } },
  greed:    { cat: 'pact', r: 2, pact: true, i: '☍', n: 'Pacte de cupidité', d: () => '+20% de crédits par élimination, mais ennemis 15% plus rapides et 10% plus résistants.', mod: { bounty: 1.2, espd: 1.15, ehp: 1.1 }, max: 1 },
  glass:    { cat: 'pact', r: 2, pact: true, i: '◬', n: 'Canon de verre', d: () => '+20% de dégâts, mais -25% d\'intégrité maximale.', mod: { dmg: 1.2 }, max: 1,
    now: () => { G.maxLives = Math.max(5, Math.round(G.maxLives * .75)); G.lives = Math.min(G.lives, G.maxLives); } },
  surge:    { cat: 'pact', r: 2, pact: true, i: '⚠', n: 'Survoltage', d: () => '+15% de cadence, mais la surcadence chauffe 2x plus.', mod: { rate: 1.15, heat: 2 }, max: 1 },
  horde:    { cat: 'pact', r: 2, pact: true, i: '⁂', n: 'Appel de la horde', d: () => 'Pendant 3 vagues : ennemis +30% de PV, mais +2 nanites et +30% de bonus de fin de vague.', timed: 3, ehp: 1.3, max: 1 },
  // ----- v9.1 : des protocoles qui changent la façon de jouer -----
  tokens:   { cat: 'eco', r: 0, i: '♣', n: 'Jetons de faveur', d: () => '+3 jetons de machine à sous pour cette préparation.', now: () => { G.tokens[Casino.pl()] = (G.tokens[Casino.pl()] || 0) + 3; } },
  bank:     { cat: 'eco', r: 0, i: '⌂', n: 'Coffre-fort', d: () => '+3% d\'intérêts sur vos crédits à chaque fin de vague.', add: { interest: .03 }, max: 2 },
  fund:     { cat: 'eco', r: 1, i: '⚑', n: 'Fonds de guerre', d: () => `+10 crédits par tourelle à chaque fin de vague (actuellement +${10 * G.towers.length}).`, add: { towerCash: 10 }, max: 2, need: () => G.towers.length >= 4 },
  rookie:   { cat: 'eco', r: 1, i: '⚒', n: 'Production de masse', d: () => 'Tourelles de base : construction et améliorations 12% moins chères.', mod: { t0cost: .88 }, max: 2 },
  exec:     { cat: 'atk', r: 1, i: '☠', n: 'Protocole d\'exécution', d: () => 'Les ennemis (hors boss) tombés sous 7% de leurs PV sont achevés instantanément.', add: { exec: .07 }, max: 2 },
  hunter:   { cat: 'atk', r: 1, i: '♛', n: 'Tueur de titans', d: () => '+20% de dégâts contre les boss.', mod: { bossDmg: 1.2 }, max: 3 },
  ambush:   { cat: 'atk', r: 1, i: '⚔', n: 'Embuscade', d: () => '+50% de dégâts contre les ennemis encore intacts (premier impact).', add: { fresh: .5 }, max: 2 },
  frost:    { cat: 'atk', r: 1, i: '❅', n: 'Fracture thermique', d: () => '+25% de dégâts contre les ennemis ralentis ou gelés.', add: { frostDmg: .25 }, max: 2, need: () => G.towers.some(t => t.d.slow) },
  aa:       { cat: 'atk', r: 1, i: '✈', n: 'Batteries antiaériennes', d: () => '+30% de dégâts contre les volants.', add: { airDmg: .3 }, max: 2, need: () => G.waveNum >= 5 },
  breaker:  { cat: 'atk', r: 1, i: '⛏', n: 'Brise-blindage', d: () => '+25% de dégâts contre les ennemis blindés.', add: { armDmg: .25 }, max: 2 },
  veteran:  { cat: 'atk', r: 1, i: '✪', n: 'Vétérans', d: () => 'Tourelles de niveau 8 ou plus : +25% de dégâts.', add: { vet: .25 }, max: 2, need: () => G.towers.some(t => t.level >= 5) },
  spec:     { cat: 'atk', r: 1, i: '⌬', n: 'Spécialisation', d: () => { const k = Cards.fav(); return k ? `+25% de dégâts pour toutes vos tourelles <b style="color:${TOWERS[k].color}">${TOWERS[k].name}</b> (votre arme la plus efficace).` : '+25% de dégâts pour votre type de tourelle le plus efficace.'; },
              need: () => !!Cards.fav(), max: 3, now: () => { const k = Cards.fav(); if (!k) return; const S = G.cx.spec || (G.cx.spec = {}); S[k] = (S[k] || 1) * 1.25; } },
  aegis:    { cat: 'def', r: 1, i: '⛉', n: 'Bouclier du noyau', d: () => 'À chaque vague, les 2 premiers ennemis qui atteignent le noyau sont absorbés (hors boss).', add: { aegis: 2 }, max: 2 },
  vamp:     { cat: 'def', r: 1, i: '♡', n: 'Siphon vital', d: () => '+1 intégrité toutes les 40 éliminations.', add: { vamp: 1 }, max: 2 },
  blood:    { cat: 'pact', r: 2, pact: true, i: '⚱', n: 'Pacte du sang', d: () => 'Chaque protocole propose 4 choix au lieu de 3, mais -20% d\'intégrité maximale.', add: { choices: 1 }, max: 1,
    now: () => { G.maxLives = Math.max(5, Math.round(G.maxLives * .8)); G.lives = Math.min(G.lives, G.maxLives); } },
  iron:     { cat: 'pact', r: 2, pact: true, i: '⚙', n: 'Pacte de fer', d: () => 'Constructions et améliorations -15%, mais les reventes ne rapportent plus rien (hors droit à l\'erreur).', mod: { cost: .85, refund: 0 }, max: 1 },
  titans:   { cat: 'pact', r: 2, pact: true, i: '♜', n: 'Pacte des titans', d: () => 'Boss +40% de PV, mais chaque boss abattu vous offre un protocole supplémentaire.', mod: { bossHp: 1.4 }, add: { bossCard: 1 }, max: 1, need: () => G.waveNum >= 3 },
  frenzy:   { cat: 'pact', r: 2, pact: true, i: '⚡', n: 'Pacte frénétique', d: () => '+30% de cadence de tir, mais -15% de portée.', mod: { rate: 1.3, range: .85 }, max: 1 },
  usury:    { cat: 'pact', r: 2, pact: true, i: '⧗', n: 'Pacte de l\'usure', d: () => '+2 nanites à chaque fin de vague, mais tous les ennemis gagnent +1 point de blindage.', add: { nanoW: 2, earmor: 1 }, max: 1 },
  chainx:   { cat: 'legend', r: 3, i: '✺', n: 'Réaction en chaîne', d: () => 'Les ennemis abattus explosent et infligent 20% de leurs PV max aux ennemis proches.', add: { chainx: 1 }, max: 1 },
  revive:   { cat: 'legend', r: 3, i: '♆', n: 'Second souffle', d: () => 'Une fois dans la partie : quand le noyau cède, il se reconstitue à 50% d\'intégrité.', add: { revive: 1 }, max: 1, need: () => !G.cx.rev },
  omni:     { cat: 'legend', r: 3, i: '◉', n: 'Œil omniscient', d: () => 'Toutes vos tourelles voient les ennemis furtifs et voilés.', add: { omni: 1 }, max: 1, need: () => G.waveNum >= 5 },
  orbit:    { cat: 'legend', r: 3, i: '☄', n: 'Satellite de combat', d: () => 'Recharge des capacités -40%.', mod: { abilCd: .6 }, max: 1 },
  lucky:    { cat: 'legend', r: 3, i: '✤', n: 'Fortune de guerre', d: () => '15% des éliminations rapportent une prime triple.', add: { lucky: .15 }, max: 1 },
  lethal:   { cat: 'legend', r: 3, i: '✠', n: 'Létalité', d: () => '+10% de chances de critique et dégâts critiques +100%.', add: { crit: .1, critDmg: 1 }, max: 1 }
};
const CARD_RARITY = [{ n: 'STANDARD', c: '#9fb0cc' }, { n: 'RARE', c: '#4db8ff' }, { n: 'PACTE', c: '#ff2bd6' }, { n: 'LÉGENDAIRE', c: '#ffd23f' }];
const CARD_CAT = { eco: 'ÉCONOMIE', atk: 'ATTAQUE', def: 'DÉFENSE', tac: 'TACTIQUE', pact: '', legend: '' };

