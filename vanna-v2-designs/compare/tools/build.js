// Builds the two sides of the comparison page.
//
//   node compare/tools/build.js           build once
//   node compare/tools/build.js --watch   rebuild whenever compare/src changes
//
//   compare/current.html  the prototype exactly as it is on the branch (left side)
//   compare/new.html      the prototype rebuilt from compare/src (right side)
//   compare/meta.js       change log + build stamp, read by compare/index.html
//
// Both sides get the same small bridge so compare/index.html can drive them (theme, device size,
// navigation). The bridge never changes how a screen looks at the design size (412 × 915).
const fs = require('fs');
const path = require('path');
const { readData } = require('./unpack.js');

const ROOT = path.resolve(__dirname, '..', '..');
const CMP_DIR = () => path.join(ROOT, 'compare');
// Frozen copy of the branch prototype: the Current side is always built from this and never edited.
const ORIGINAL = path.join(CMP_DIR(), 'baseline', 'vanna-v7-prototype.html');
const CMP = path.join(ROOT, 'compare');
const SRC = path.join(CMP, 'src');

function packSrc() {
  const list = (dir) => fs.readdirSync(path.join(SRC, dir)).filter((f) => /^\d+-/.test(f)).sort();
  const byIndex = (dir) => {
    const out = [];
    for (const f of list(dir)) out[parseInt(f, 10)] = fs.readFileSync(path.join(SRC, dir, f), 'utf8');
    return out;
  };
  const json = (f) => JSON.parse(fs.readFileSync(path.join(SRC, f), 'utf8'));
  return { screens: json('screens.json'), tpls: byIndex('tpl'), clss: byIndex('cls'), img: json('img.json'), rows: json('rows.json'), titles: json('titles.json') };
}

// Exact-text patches to the prototype shell. Each must match once, so a changed shell fails loudly.
const PATCHES = [
  {
    // Fit the phone to any device size instead of the fixed 412 × 915, and skip the side panel when embedded.
    from: /function doFit\(\) \{[\s\S]*?\n\}\naddEventListener\('resize', doFit\); doFit\(\);/,
    to: `function doFit() {
  var W = window.__vnW || 412, H = window.__vnH || 915, embed = document.documentElement.classList.contains('vn-embed');
  var wide = !embed && innerWidth >= 900, pad = embed ? 30 : 0;
  var aw = embed ? innerWidth - pad * 2 : (wide ? innerWidth - 380 - 64 : innerWidth - 12), ah = embed ? innerHeight - pad * 2 : innerHeight - (wide ? 64 : 12);
  var k = Math.min(window.__vnZoom || 1, aw / W, ah / H);
  phone.style.width = W + 'px'; phone.style.height = H + 'px';
  phone.style.transform = 'scale(' + k + ')';
  fit.style.width = (W * k) + 'px'; fit.style.height = (H * k) + 'px';
}
window.__vnFit = doFit;
addEventListener('resize', doFit); doFit();`,
  },
  {
    // Tell the comparison page which screen is showing.
    from: '  afterRender(); syncPanel();\n',
    to: '  afterRender(); syncPanel();\n  if (window.__vnOnGo) window.__vnOnGo(shown, opt);\n',
  },
  {
    // Let top-level navigation set the back stack (Android: Back from any space goes to the start destination).
    from: 'window.__vn = { go: go, back: back,',
    to: 'window.__vnSetStack = function (s, stem) { hist = s.slice(); go(stem, { push: false }); };\nwindow.__vn = { go: go, back: back,',
  },
];

// Android device chrome drawn over the screen when embedded: bezel, punch-hole camera, status bar and
// gesture handle. Status bar and handle switch between light and dark ink from the pixels under them.
const DEVICE_CSS = `
.vn-embed .panel,.vn-embed .menu-btn,.vn-embed .scrim{display:none!important}
.vn-embed body{background:transparent}.vn-embed .stage{padding:0}
#screen>*:first-child{width:100%!important;height:100%!important}
.vn-embed .phone{border-radius:var(--vn-r,44px);box-shadow:0 0 0 9px #0B0B0D,0 0 0 10px #34343A,0 0 0 11px rgba(0,0,0,.25),0 48px 90px -24px rgba(47,27,97,.42),0 16px 36px -12px rgba(17,17,17,.30)}
.vn-chrome{position:absolute;inset:0;pointer-events:none;z-index:150;font:600 13px/1 'Plus Jakarta Sans',system-ui,sans-serif;font-variant-numeric:tabular-nums;color:#FFFFFF}
.vn-chrome.ink-dark{color:#1F1F1F}
.vn-sb{position:absolute;left:0;right:0;top:0;height:28px;padding:0 20px 0 24px;display:flex;align-items:center;justify-content:space-between}
.vn-sb .ic{display:flex;align-items:center;gap:5px}
.vn-sb svg{display:block;fill:currentColor}
.vn-cam{position:absolute;left:50%;top:8px;width:12px;height:12px;margin-left:-6px;border-radius:50%;background:#050506;box-shadow:inset 0 0 0 2px #17171B}
.vn-gest{position:absolute;left:50%;bottom:7px;width:108px;height:4px;margin-left:-54px;border-radius:2px;background:currentColor;opacity:.9}
.vn-tablet .vn-cam{display:none}
.vn-tablet .vn-gest{width:160px;margin-left:-80px}
.vn-tablet .vn-sb{padding:0 24px 0 28px}
.vn-nav3{position:absolute;left:0;right:0;bottom:0;height:48px;padding:0 17%;display:none;grid-template-columns:repeat(3,1fr);align-items:center;justify-items:center;pointer-events:auto}
.vn-nav3 button{width:56px;height:40px;border:0;border-radius:20px;background:transparent;color:inherit;display:flex;align-items:center;justify-content:center;cursor:pointer;padding:0}
.vn-nav3 button:active{background:rgba(127,127,127,.18)}
.vn-nav3 svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:2;stroke-linejoin:round}
.vn-3btn #screen{bottom:48px}
.vn-3btn .vn-gest{display:none}
.vn-3btn .vn-nav3{display:grid}
.vn-tablet .vn-nav3{padding:0 34%}
`;

const STATUS_ICONS = '<svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true"><path d="M2 22h20V2z"/></svg>'
  + '<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3a4.24 4.24 0 0 0-6 0zm-4-4l2 2a7.07 7.07 0 0 1 10 0l2-2C15.14 9.14 8.87 9.14 5 13z"/></svg>'
  + '<svg width="22" height="14" viewBox="0 0 26 14" aria-hidden="true"><rect x="1" y="1" width="21" height="12" rx="3.5" fill="none" stroke="currentColor" stroke-opacity=".45" stroke-width="1.4"/><rect x="3" y="3" width="14" height="8" rx="2"/><rect x="23.2" y="4.6" width="1.8" height="4.8" rx=".9" fill-opacity=".45"/></svg>';

const BRIDGE = `<script>
(function () {
  'use strict';
  var q = new URLSearchParams(location.search), side = q.get('side') || '';
  if (q.get('embed') === '1') document.documentElement.classList.add('vn-embed');
  var css = document.createElement('style');
  css.textContent = ${JSON.stringify(DEVICE_CSS)};
  document.head.appendChild(css);

  /* device chrome */
  var phone = document.getElementById('phone'), screenEl = document.getElementById('screen');
  var chrome = document.createElement('div'); chrome.className = 'vn-chrome'; chrome.setAttribute('aria-hidden', 'true');
  chrome.innerHTML = '<div class="vn-sb"><span>12:30</span><span class="ic">' + ${JSON.stringify(STATUS_ICONS)} + '</span></div><div class="vn-cam"></div><div class="vn-gest"></div>'
    + '<div class="vn-nav3"><button type="button" data-k="back" aria-label="Back"><svg viewBox="0 0 24 24"><path d="M17 4.5 6.5 12 17 19.5Z"/></svg></button>'
    + '<button type="button" data-k="home" aria-label="Home"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="7.5"/></svg></button>'
    + '<button type="button" data-k="recents" aria-label="Recent apps"><svg viewBox="0 0 24 24"><rect x="5.5" y="5.5" width="13" height="13" rx="2.5"/></svg></button></div>';
  chrome.addEventListener('click', function (e) {
    var b = e.target.closest('.vn-nav3 button'); if (!b || !window.__vn) return;
    if (b.dataset.k === 'back') window.__vn.back(); else if (b.dataset.k === 'home') window.__vn.go('V7Home');
  });
  function embedded() { return document.documentElement.classList.contains('vn-embed'); }
  function syncChrome() {
    if (embedded() && !chrome.parentNode) phone.appendChild(chrome);
    if (!embedded() && chrome.parentNode) chrome.remove();
    var w = window.__vnW || 412, tablet = w >= 600;
    chrome.classList.toggle('vn-tablet', tablet);
    phone.classList.toggle('vn-wide', tablet);
    phone.style.setProperty('--vn-r', tablet ? '28px' : '44px');
    paintInk();
  }
  function lum(c) {
    var m = c.match(/rgba?\\(([^)]+)\\)/); if (!m) return null;
    var p = m[1].split(',').map(parseFloat); if (p.length > 3 && p[3] < 0.5) return null;
    return (0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2]) / 255;
  }
  function inkAt(y, x) {
    var r = phone.getBoundingClientRect(), k = r.width / (window.__vnW || 412);
    var els = document.elementsFromPoint(x === undefined ? r.left + r.width / 2 : r.left + x * k, r.top + y * k);
    for (var i = 0; i < els.length; i++) {
      if (!screenEl.contains(els[i])) continue;
      for (var el = els[i]; el && el !== screenEl; el = el.parentElement) {
        var cs = getComputedStyle(el);
        if (cs.backgroundImage && cs.backgroundImage.indexOf('gradient') >= 0 && el.offsetHeight > 40) return 'light';
        var L = lum(cs.backgroundColor); if (L !== null) return L < 0.55 ? 'light' : 'dark';
      }
    }
    return 'light';
  }
  function surfaceAt(y) {
    var r = phone.getBoundingClientRect(), k = r.width / (window.__vnW || 412);
    var els = document.elementsFromPoint(r.left + r.width / 2, r.top + y * k);
    for (var i = 0; i < els.length; i++) {
      if (!screenEl.contains(els[i])) continue;
      for (var el = els[i]; el && el !== screenEl; el = el.parentElement) {
        var cs = getComputedStyle(el);
        if (cs.backgroundImage && cs.backgroundImage.indexOf('gradient') >= 0 && el.offsetHeight > 40) return 'rgb(17, 17, 17)';
        if (lum(cs.backgroundColor) !== null) return cs.backgroundColor;
      }
    }
    return 'rgb(17, 17, 17)';
  }
  var inkQueued = false;
  function paintInk() {
    if (inkQueued) return; inkQueued = true;
    requestAnimationFrame(function () {
      inkQueued = false; if (!chrome.parentNode) return;
      var sb = chrome.querySelector('.vn-sb'), w = window.__vnW || 412;
      sb.children[0].style.color = inkAt(14, 30) === 'dark' ? '#1F1F1F' : '#FFFFFF';     /* the time, top left */
      sb.children[1].style.color = inkAt(14, w - 40) === 'dark' ? '#1F1F1F' : '#FFFFFF'; /* the icons, top right */
      chrome.querySelector('.vn-gest').style.color = inkAt((window.__vnH || 915) - 9) === 'dark' ? '#1F1F1F' : '#FFFFFF';
      var nav3 = chrome.querySelector('.vn-nav3');
      if (phone.classList.contains('vn-3btn')) {
        var bg = surfaceAt((window.__vnH || 915) - 52);
        nav3.style.background = bg; nav3.style.color = (lum(bg) || 0) < 0.55 ? '#FFFFFF' : '#1F1F1F';
      }
    });
  }
  function syncDark() { try { phone.classList.toggle('vn-isdark', !!window.__vn.app().inst.props.dark); } catch (e) {} }
  new MutationObserver(function () { syncDark(); paintInk(); }).observe(screenEl, { subtree: true, childList: true, attributes: true, attributeFilter: ['style'] });
  screenEl.addEventListener('scroll', paintInk, true);
  syncChrome();
  function post(m) { m.vn = m.vn || 'state'; m.side = side; try { parent.postMessage(m, '*'); } catch (e) {} }
  function state(extra) { var a = window.__vn && window.__vn.app(); post(Object.assign({ stem: a ? a.shown : null, mode: window.__vn ? window.__vn.mode() : null }, extra || {})); }
  window.__vnOnGo = function (stem, opt) { state({ nav: true, back: !!(opt && opt.back), user: !window.__vnRemote }); };
  window.addEventListener('load', function () {
    var set = window.__vnSetTheme;
    window.__vnSetTheme = function (m) { set(m); syncDark(); state({ theme: true, user: !window.__vnRemote }); };
    var D = null; try { D = window.__vnData; } catch (e) {}
    post({ vn: 'ready', rows: D && D.rows, titles: D && D.titles });
    state();
  });
  function tick(el, on) { if (el && el.checked !== on) { el.checked = on; el.dispatchEvent(new Event('change')); } }
  window.addEventListener('message', function (e) {
    var m = e.data; if (!m || !m.vnCmd || !window.__vn) return;
    window.__vnRemote = true;
    try {
      switch (m.vnCmd) {
        case 'go': window.__vn.go(m.stem); break;
        case 'back': window.__vn.back(); break;
        case 'restart': window.__vn.restart(); if (m.mode) window.__vnSetTheme(m.mode); break;
        case 'theme': window.__vnSetTheme(m.mode); break;
        case 'outcome': window.__vn.setOutcome(m.o); break;
        case 'offline': tick(document.getElementById('offTog'), !!m.on); break;
        case 'gate': tick(document.getElementById('gateTog'), !!m.on); break;
        case 'device': window.__vnW = m.w; window.__vnH = m.h; window.__vnZoom = m.zoom || 1; window.__vnFit(); syncChrome(); break;
        case 'bg': document.documentElement.style.background = m.color; document.body.style.background = m.color; document.documentElement.style.colorScheme = m.scheme || 'normal'; break;
        case 'navstyle': phone.classList.toggle('vn-nav-swiggy', m.style === 'swiggy'); break;
        case 'navmode': phone.classList.toggle('vn-3btn', m.mode === '3btn'); paintInk(); break;
        case 'panel': document.documentElement.classList.toggle('vn-embed', !m.show); window.__vnFit(); syncChrome(); break;
        case 'scroll': var s = document.querySelector('#screen [style*="overflow-y: auto"]'); if (s) s.scrollTop = m.top; break;
      }
    } finally { window.__vnRemote = false; }
  });
})();
</script>
`;

function shell(html, D, label) {
  let out = html;
  for (const p of PATCHES) {
    const hits = typeof p.from === 'string' ? out.split(p.from).length - 1 : (out.match(new RegExp(p.from, 'g')) || []).length;
    if (hits !== 1) throw new Error(`Shell patch did not match exactly once (${hits}) for ${label}: ${String(p.from).slice(0, 60)}`);
    out = out.replace(p.from, () => p.to);
  }
  if (D) {
    const lines = out.split('\n');
    const i = lines.findIndex((l) => l.startsWith('var D = '));
    lines[i] = 'var D = ' + JSON.stringify(D).replace(/<\/script/gi, '<\\/script') + ';';
    out = lines.join('\n');
  }
  out = out.replace('\nvar IMGRE = ', '\nwindow.__vnData = { rows: D.rows, titles: D.titles };\nvar IMGRE = ');
  out = out.replace(/<title>[^<]*<\/title>/, `<title>Vanna · ${label}</title>`);
  const back = fs.readFileSync(path.join(__dirname, 'device-back.js'), 'utf8');
  return out.replace('</body>', () => BRIDGE + '<script>\n' + back + '</script>\n</body>');
}

// New only: its own stylesheet, and the 2026 mark as favicon and panel logo.
function newShell(html) {
  const mark = 'data:image/svg+xml;base64,' + fs.readFileSync(path.join(ROOT, 'assets', 'vanna-mark-2026.svg')).toString('base64');
  let out = html.replace(/<link rel="icon" href="[^"]*">/, () => `<link rel="icon" href="${mark}">`);
  out = out.replace(/(<div class="panel-head"><img src=")[^"]*(")/, (m, a, b) => a + mark + b);
  const css = path.join(SRC, 'styles.css');
  if (fs.existsSync(css)) out = out.replace('</head>', () => `<style>\n${fs.readFileSync(css, 'utf8')}</style>\n</head>`);
  // Margin account in place (tools/margin_envelope.py): a new trader is never sent to a separate margin page.
  // The first order opens the account as step 1 of 2 (Markets' banner has its own screen, V7MarginCreate), and the
  // account counts once either succeeds.
  for (const [from, to] of [
    ["if (gateOn() && !hasMargin && stem === 'V7PerpsOrder') { toast('First trade: set up your margin account (one time)'); stem = 'V7MarginCreate'; s = D.screens[stem]; shown = stem; extra = {}; }",
     "if (gateOn() && !hasMargin && stem === 'V7PerpsOrder') { extra = Object.assign({}, extra, { noAcct: true }); }"],
    ["if (app.stem && app.stem.indexOf('V7Margin') === 0 && app.inst.state.__ok) hasMargin = true;",
     "if (app.stem && app.inst && (app.inst.state.__acct || (app.stem.indexOf('V7Margin') === 0 && app.inst.state.__ok))) hasMargin = true;"],
  ]) {
    if (!out.includes(from)) throw new Error('newShell: the margin gate in the shell changed');
    out = out.replace(from, () => to);
  }
  const charts = path.join(SRC, 'charts.js');   // live charts (vnLine, vnRateCurve), mounted by runtime.js
  if (fs.existsSync(charts)) out = out.replace('</body>', () => `<script>\n${fs.readFileSync(charts, 'utf8')}</script>\n</body>`);
  const rt = path.join(SRC, 'runtime.js');
  if (fs.existsSync(rt)) out = out.replace('</body>', () => `<script>\n${fs.readFileSync(rt, 'utf8')}</script>\n</body>`);
  // the wallet's own approval screen (MWA), with Material icons and the Vanna mark filled in
  const ws = fs.readFileSync(path.join(__dirname, 'wallet_sheet.js'), 'utf8')
    .replace('var IC = __IC__', () => 'var IC = ' + JSON.stringify(walletIcons()))
    .replace('MARK = __MARK__', () => 'MARK = ' + JSON.stringify(JSON.parse(fs.readFileSync(path.join(__dirname, 'mark.json'), 'utf8')).d));
  out = out.replace('</body>', () => `<script>\n${ws}</script>\n</body>`);
  return out;
}

// first path of each Material icon the wallet screen uses (cached by material_icons.py)
function walletIcons() {
  const pick = { fingerprint: 'regular', account_balance_wallet: 'fill1_', check_circle: 'fill1_', verified_user: 'regular', local_gas_station: 'regular', swap_vert: 'regular' };
  const out = {};
  for (const [name, v] of Object.entries(pick)) {
    const svg = fs.readFileSync(path.join(__dirname, 'material-cache', `${name}__${v}.svg`), 'utf8');
    out[name] = (svg.match(/ d="([^"]+)"/) || [])[1] || '';
  }
  return out;
}

function build() {
  const t0 = Date.now();
  const original = fs.readFileSync(ORIGINAL, 'utf8');
  fs.writeFileSync(path.join(CMP, 'current.html'), shell(original, null, 'Current'));
  fs.writeFileSync(path.join(CMP, 'new.html'), newShell(shell(original, packSrc(), 'New')));
  fs.copyFileSync(path.join(ROOT, 'assets', 'vanna-mark-2026.svg'), path.join(CMP, 'mark.svg'));
  let changes = [];
  try { changes = JSON.parse(fs.readFileSync(path.join(SRC, 'changes.json'), 'utf8')); } catch (e) { console.warn('changes.json is not valid JSON:', e.message); }
  const stamp = Date.now();
  fs.writeFileSync(path.join(CMP, 'meta.js'), `window.VN_META = ${JSON.stringify({ stamp, changes }, null, 1)};\nif (window.__vnMetaLoaded) window.__vnMetaLoaded(window.VN_META);\n`);
  console.log(`Built current.html + new.html in ${Date.now() - t0} ms (stamp ${stamp})`);
}

build();
if (process.argv.includes('--watch')) {
  let timer = null;
  fs.watch(SRC, { recursive: true }, () => {
    clearTimeout(timer);
    timer = setTimeout(() => { try { build(); } catch (e) { console.error('Build failed:', e.message); } }, 150);
  });
  console.log('Watching compare/src …');
}
