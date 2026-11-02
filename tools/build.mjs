// Assemble le jeu en un seul fichier : src/index.html + src/style.css + src/js/*.js (dans l'ordre des numéros)
// → neon-warfare.html. Aucune dépendance, Node 18 ou plus.
//   node tools/build.mjs           assemble neon-warfare.html
//   node tools/build.mjs --check   vérifie seulement que neon-warfare.html correspond à src/ (code de sortie 1 sinon)
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = p => readFileSync(join(root, p), 'utf8').replace(/\r\n/g, '\n');
const tpl = read('src/index.html');
for (const mark of ['/*@CSS*/\n', '/*@JS*/\n']) if (tpl.split(mark).length !== 2) throw new Error(`src/index.html doit contenir une seule fois ${mark.trim()}`);
const css = read('src/style.css');
const mods = readdirSync(join(root, 'src/js')).filter(f => /^\d+-.+\.js$/.test(f)).sort();
const js = mods.map(f => {
  const t = read('src/js/' + f);
  if (!t.endsWith('\n')) throw new Error(`src/js/${f} doit finir par un saut de ligne`);
  return t;
}).join('');
// remplacement par fonction : le contenu peut contenir des « $ » sans être interprété
const out = tpl.replace('/*@CSS*/\n', () => css).replace('/*@JS*/\n', () => js);

const target = join(root, 'neon-warfare.html');
if (process.argv.includes('--check')) {
  const cur = existsSync(target) ? readFileSync(target, 'utf8').replace(/\r\n/g, '\n') : '';
  if (cur !== out) { console.error('neon-warfare.html ne correspond pas à src/ : lancez « node tools/build.mjs ».'); process.exit(1); }
  console.log(`neon-warfare.html est à jour (${mods.length} modules).`);
} else {
  writeFileSync(target, out);
  console.log(`neon-warfare.html assemblé : ${mods.length} modules, ${(out.length / 1024).toFixed(0)} Ko.`);
}
