const fs = require('fs');
const dir = process.argv[2];
const files = fs.readdirSync(dir).filter(f => /^V7.*\.dc\.html$/.test(f));
const PAL = new Set('#FFFFFF #703AE6 #FC5457 #1F1F1F #BFBFBF #111111 #E5E7EB #2C2C2C #595959 #5029A3 #32EEE2 #1C7C83 #F7F7F7 #9F7BEE #1E1E1E #949494 #4B5563 #2F1B61 #F1EBFD #B33C3E #BDA4F4 #D3C2F7 #FF007A #FF3395 #DFDFDF #8D61EB #777777 #3E207F #155F64 #0B0B0B #FFE6F2 #FFB0D6 #FF8AC2 #FECACB #F4F4F4 #EBFCFD #BFF6FA #8C0043 #6B0033 #2440A9'.split(' '));
let bad = 0;
for (const f of files) {
  const src = fs.readFileSync(dir + '/' + f, 'utf8');
  const errs = [];
  const hexes = (src.match(/#[0-9a-fA-F]{6}\b/g) || []).map(h => h.toUpperCase());
  hexes.forEach(h => { if (!PAL.has(h)) errs.push('palette ' + h); });
  if (!src.includes('scrollbar-width:none')) errs.push('no scrollbar css');
  for (const tag of ['sc-if', 'sc-for', 'div', 'span', 'button', 'a', 'svg', 'section', 'header', 'nav', 'article', 'details', 'label']) {
    const o = (src.match(new RegExp('<' + tag + '[\\s>]', 'g')) || []).length;
    const c = (src.match(new RegExp('</' + tag + '>', 'g')) || []).length;
    if (o !== c) errs.push(`tag ${tag} ${o}/${c}`);
  }
  const holes = [...src.matchAll(/\{\{\s*([^}]*?)\s*\}\}/g)].map(m => m[1]);
  const asVars = new Set([...src.matchAll(/as="(\w+)"/g)].map(m => m[1]));
  holes.forEach(h => { if (!/^(true|false|[A-Za-z_$][\w$]*(\.[\w$]+)*)$/.test(h)) errs.push('hole expr ' + h); });
  const m = src.match(/class Component extends DCLogic \{([\s\S]*)\}\s*<\/script>/);
  if (m && !src.includes('<dc-import')) {
    let Cls;
    try {
      Cls = new Function('DCLogic', 'return class Component extends DCLogic {' + m[1] + '}')(class { constructor(p) { this.props = p; this.state = {}; } setState(s) { this.state = Object.assign({}, this.state, s); } });
    } catch (e) { errs.push('compile ' + e.message); }
    if (Cls) for (const dark of [false, true]) {
      const c = new Cls({ dark });
      const run = (depth) => {
        let v;
        try { v = c.renderVals(); } catch (e) { errs.push('render ' + e.message); return; }
        const roots = new Set(Object.keys(v));
        holes.forEach(h => { const r = h.split('.')[0]; if (!/^(true|false)$/.test(h) && !roots.has(r) && !asVars.has(r)) errs.push('missing ' + h); });
        // resolve top-level dotted holes
        holes.forEach(h => { const p = h.split('.'); if (roots.has(p[0]) && p.length > 1 && !Array.isArray(v[p[0]])) { let o = v; for (const k of p) { if (o == null) break; o = o[k]; } if (o === undefined) errs.push('undef ' + h); } });
        // arrays: check item fields used via as-vars
        if (depth > 0) {
          const fns = [];
          Object.values(v).forEach(x => { if (typeof x === 'function') fns.push(x); if (Array.isArray(x)) x.forEach(it => it && Object.values(it).forEach(y => typeof y === 'function' && fns.push(y))); });
          fns.forEach(fn => { const save = c.state; try { fn(); run(depth - 1); } catch (e) { errs.push('handler ' + e.message); } c.state = save; });
        }
      };
      run(2);
    }
  }
  const uniq = [...new Set(errs)];
  if (uniq.length) { bad++; console.log(f, uniq.slice(0, 8)); }
}
console.log('checked', files.length, 'files,', bad, 'with issues');
