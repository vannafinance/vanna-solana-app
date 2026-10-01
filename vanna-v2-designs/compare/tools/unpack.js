// Unpacks the single-file prototype into editable sources for the "New" side.
//
//   node compare/tools/unpack.js            (refuses to overwrite compare/src)
//   node compare/tools/unpack.js --force    (starts the New side over from the current prototype)
//
// Output (compare/src):
//   screens.json   stem -> { t: template index, c: class index, p: props, w?: wraps another stem }
//   titles.json    stem -> panel title
//   rows.json      flow groups for the screen picker
//   img.json       image data URIs referenced as @IMG:<key>@ in templates and classes
//   tpl/NN-<Stem>.html   markup, with {{ holes }}, <sc-if> and <sc-for>
//   cls/NN-<Stem>.js     logic: tokens (L/D), state, handlers, renderVals()
//   changes.json   the change log shown in the comparison page
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const SRC_HTML = path.join(ROOT, 'prototype', 'vanna-v7-prototype.html');
const OUT = path.join(ROOT, 'compare', 'src');

function main() {
if (fs.existsSync(OUT) && !process.argv.includes('--force')) {
  console.error('compare/src already exists. Pass --force to start the New side over (this discards its edits).');
  process.exit(1);
}

const D = readData(SRC_HTML);

// Name each template and class after the first screen that uses it, so files are easy to find.
const tplName = {}, clsName = {};
for (const [stem, s] of Object.entries(D.screens)) {
  if (s.w) continue;
  if (!(s.t in tplName)) tplName[s.t] = stem;
  if (!(s.c in clsName)) clsName[s.c] = stem;
}
const pad = (i) => String(i).padStart(2, '0');

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(path.join(OUT, 'tpl'), { recursive: true });
fs.mkdirSync(path.join(OUT, 'cls'), { recursive: true });

D.tpls.forEach((t, i) => fs.writeFileSync(path.join(OUT, 'tpl', `${pad(i)}-${tplName[i] || 'unused'}.html`), t));
D.clss.forEach((c, i) => fs.writeFileSync(path.join(OUT, 'cls', `${pad(i)}-${clsName[i] || 'unused'}.js`), c));
for (const k of ['screens', 'titles', 'rows', 'img']) {
  fs.writeFileSync(path.join(OUT, `${k}.json`), JSON.stringify(D[k], null, 1));
}
fs.writeFileSync(path.join(OUT, 'changes.json'), '[]\n');
console.log(`Unpacked ${D.tpls.length} templates and ${D.clss.length} classes for ${Object.keys(D.screens).length} screens into compare/src`);
}

function readData(file) {
  const line = fs.readFileSync(file, 'utf8').split('\n').find((l) => l.startsWith('var D = '));
  if (!line) throw new Error('Could not find the screen data (var D = …) in ' + file);
  return JSON.parse(line.slice('var D = '.length).replace(/;\s*$/, ''));
}
module.exports = { readData };
if (require.main === module) main();
