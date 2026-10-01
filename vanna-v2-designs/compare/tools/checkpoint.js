// Checkpoints for the New side, so any design change can be reverted.
//
//   node compare/tools/checkpoint.js save "before material icons"
//   node compare/tools/checkpoint.js list
//   node compare/tools/checkpoint.js restore 3        (saves the current state first, then restores #3)
//
// A checkpoint is a full copy of compare/src in compare/checkpoints/NNN-<name>/.
const fs = require('fs');
const path = require('path');

const CMP = path.resolve(__dirname, '..');
const SRC = path.join(CMP, 'src');
const DIR = path.join(CMP, 'checkpoints');
fs.mkdirSync(DIR, { recursive: true });

const list = () => fs.readdirSync(DIR).filter((d) => /^\d{3}-/.test(d)).sort();
const slug = (s) => String(s || 'checkpoint').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48);

function save(name) {
  const n = String(list().length + 1).padStart(3, '0');
  const dest = path.join(DIR, `${n}-${slug(name)}`);
  fs.cpSync(SRC, dest, { recursive: true });
  fs.writeFileSync(path.join(dest, '.checkpoint.json'), JSON.stringify({ name, saved: new Date().toISOString() }, null, 1));
  console.log(`Saved checkpoint ${n}: ${name}`);
  return dest;
}

const [cmd, arg] = process.argv.slice(2);
if (cmd === 'save') save(arg);
else if (cmd === 'list') list().forEach((d) => {
  let meta = {}; try { meta = JSON.parse(fs.readFileSync(path.join(DIR, d, '.checkpoint.json'), 'utf8')); } catch (e) {}
  console.log(d.slice(0, 3), ' ', meta.saved ? meta.saved.slice(0, 16).replace('T', ' ') : '', ' ', meta.name || d.slice(4));
});
else if (cmd === 'restore') {
  const pick = list().find((d) => d.startsWith(String(arg).padStart(3, '0')));
  if (!pick) { console.error('No checkpoint ' + arg + '. Run: node compare/tools/checkpoint.js list'); process.exit(1); }
  save('auto-save before restoring ' + pick);
  fs.rmSync(SRC, { recursive: true, force: true });
  fs.cpSync(path.join(DIR, pick), SRC, { recursive: true });
  fs.rmSync(path.join(SRC, '.checkpoint.json'), { force: true });
  console.log('Restored ' + pick + '. Run: node compare/tools/build.js');
} else {
  console.log('Usage: node compare/tools/checkpoint.js save "<name>" | list | restore <number>');
}
