/* ============================== ASTUCES (une seule fois chacune) ============================== */
const TIPS = [
  { id: 'up', w: () => G.waveNum >= 2 && G.phase === 'prep' && G.towers.length >= 2 && !G.towers.some(t => t.level > 1),
    t: 'Améliorer', d: () => `Cliquez une tourelle puis ▲ AMÉLIORER (${Keys.lbl('up') || '—'}). <kbd>Maj</kbd> + ${Keys.lbl('up') || '—'} améliore toutes vos tourelles du même type.` },
  { id: 'lab', w: () => G.nanites >= 6 && ![...G.unlocked].some(k => TOWERS[k] && TOWERS[k].tier >= 2),
    t: 'Labo de fusion', d: () => `Vos nanites ◈ achètent des <b>plans</b> au Labo (${Keys.lbl('lab') || '—'}) : deux tourelles voisines fusionnent alors en une tourelle bien plus forte.` },
  { id: 'fuse', w: () => G.fusePairs && G.fusePairs.some(f => f.owned),
    t: 'Fusion possible', d: () => 'Deux de vos tourelles peuvent fusionner : sélectionnez l\'une d\'elles, puis choisissez la fusion dans le panneau.' },
  { id: 'tree', w: () => G.waveNum >= 3 && Skills.total() === 0 && Skills.anyBuyable(),
    t: 'Arbre de compétences', d: () => `Les nanites ◈ paient aussi des compétences qui renforcent toute la partie (${Keys.lbl('tree') || '—'}).` },
  { id: 'support', w: () => G.waveNum >= 4 && G.towers.filter(t => t.d.kind !== 'support').length >= 5 && !G.towers.some(t => t.d.kind === 'support'),
    t: 'Tourelles de soutien', d: () => 'Le <b>Ventilo</b> refroidit et l\'<b>Ordi</b> renforce les tourelles qui le touchent : placez-les au milieu d\'un groupe.' },
  { id: 'boss', w: () => G.phase === 'prep' && (G.waveNum + 1) % Waves.bossEv() === 0 && G.waveNum >= 3,
    t: 'Boss en approche', d: () => `La prochaine vague a un <b>boss</b> : gardez la Frappe orbitale (${Keys.lbl('orbital') || '—'}) pour lui, et regardez l'aperçu de vague en haut.` },
  { id: 'casino', w: () => G.waveNum >= 4 && G.phase === 'prep' && !G.net,
    t: 'Casino', d: () => `Entre deux vagues, tentez la machine à sous ou pariez sur la prochaine vague (${Keys.lbl('casino') || '—'}).` },
  { id: 'jam', w: () => G.towers.some(t => t.stun > 0 && t.jamP),
    t: 'Tourelle hors ligne', d: () => `Une IEM a coupé des tourelles : ${Keys.lbl('unjam') || '—'} les débrouille contre des crédits.` },
  { id: 'quint', w: () => (G.res.q || 0) >= 2,
    t: 'Quintessence ❂', d: () => `Elle débloque le palier V de l'arbre (${Keys.lbl('tree') || '—'}), ses rangs infinis, et les reliques T5 au Labo (${Keys.lbl('lab') || '—'}).` },
  { id: 'plasma', w: () => G.res.p >= 3,
    t: 'Plasma ✺', d: () => 'Le plasma paie le palier III de l\'arbre et les plans <b>T3</b> au Labo ; chaque pose d\'une T3 en coûte aussi.' },
  { id: 'spec', w: () => G.towers.some(t => Towers.needsSpec(t) && Act.owns(t)),
    t: 'Spécialisation', d: () => 'Une tourelle peut choisir sa voie (losange doré) : ouvrez-la, le choix est définitif et nécessaire pour continuer à l\'améliorer.' }
];
const Tips = {
  t: 0,
  check() {
    if (!G || G.demo || G.replay || G.over || Store.s.tips === false || UI.blocking()) return;
    const now = performance.now(); if (now - this.t < 25000) return;
    const seen = Store.data.tips || (Store.data.tips = {});
    for (const T of TIPS) {
      if (seen[T.id]) continue;
      let ok = false; try { ok = T.w(); } catch (e) { ok = false; }
      if (!ok) continue;
      seen[T.id] = 1; Store.save(); this.t = now;
      UI.toast('💡 ' + T.t, T.d(), '#00f3ff', 8);
      return;
    }
  }
};

