"""Test faucet in Profile (F3) and the vault tabs (T2), chosen 2 Oct 2026 from previews/faucet-tabs.html.

    python compare/tools/faucet_tabs.py      (safe to re-run)

1. Profile: after Account, one "Test faucet" row with the token logos stacked. Tapping it opens a sheet with a grid of
   tokens (USDC, TSLAx, GOOGLx, AAPLx, ANTHROPIC, OPENAI). One tap per token: a ring spins around its logo while
   the tokens are on the way, then a tick lands on it and it says Sent. The sheet is tagged "Fork only" and keeps the
   developer's note. It wraps the existing faucet component: same token list, same one call per token, same note
   (see compare/DEV-NOTES.md).
2. Earn > vault: the five tabs become pills in a row that scrolls. While there is more on a side, that edge fades
   into the page with a small arrow that scrolls on; at each end its arrow and fade go. The selected tab is always
   scrolled into view.
"""
import json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(os.path.dirname(HERE), 'src')
sys.path.insert(0, HERE)
import material_icons as mi            # noqa: E402
from tx_motion import matching_end     # noqa: E402

TOKENS = [('USDC', '022fc945e265208f7997f02a7fbdd97f'), ('TSLAx', 'a9a1db51309a512ccf9302f8acc244d2'), ('GOOGLx', 'cad380b03cb4c689f02e014100f56452'),
          ('AAPLx', '74e439ecf30e3316195f26ae04a1689e'), ('ANTHROPIC', 'c0af4af206fcfbcf3cce92e51a5837cf'), ('OPENAI', '68c99bf0397471dc2d806cfaa2e15d53')]
NOTE = 'Test tokens for the Vanna fork. SOL for fees is not included.'


def icon(name, size):
    return ('<svg width="%d" height="%d" viewBox="0 -960 960 960" fill="currentColor" aria-hidden="true">%s</svg>'
            % (size, size, ''.join('<path d="%s"></path>' % d for d in mi.material(name, 'regular'))))


def load(p):
    raw = open(p, encoding='utf8', newline='').read()
    return raw, raw.replace('\r\n', '\n'), '\r\n' in raw


def write(p, new, old, label, crlf=False):
    if crlf:
        new = new.replace('\n', '\r\n')
    if new != old:
        open(p, 'w', encoding='utf8', newline='').write(new)
        print('faucet/tabs:', label)


def drop_block(h, opener):
    while opener in h:
        a = h.index(opener)
        b = matching_end(h, a)
        if h[b:b + 1] == '\n':
            b += 1
        h = h[:a] + h[b:]
    return h


def find(kind, stem_start):
    d = os.path.join(SRC, kind)
    return os.path.join(d, [f for f in os.listdir(d) if f[3:].startswith(stem_start)][0])


# ---------------------------------------------------------------- 1. faucet
FAUCET_ROW = ('<div data-vn-faucet="row" style="border-radius: 16px; background: {{ t.card }}; box-shadow: {{ t.shadow }}; padding: 0 16px">'
              '<button type="button" onClick="{{ fShow }}" class="vn-frow" style="color: {{ t.text }}">'
              '<span class="vn-fstack">' + ''.join('<img src="@IMG:%s@" alt="" style="z-index: %d; box-shadow: 0 0 0 2px {{ t.card }}">' % (k, 9 - i) for i, (n, k) in enumerate(TOKENS[:4])) + '</span>'
              '<span class="vn-ftx"><b>Test faucet</b><small style="color: {{ t.text2 }}">Get test tokens for the Vanna fork</small></span>'
              '<span style="display: flex; color: {{ t.text2 }}">' + icon('chevron_right', 22) + '</span></button></div>\n')

FAUCET_SHEET = ('<sc-if value="{{ fOpen }}" hint-placeholder-val="{{ false }}">\n'
                '<div aria-hidden="true" class="vn-fveil" onClick="{{ fHide }}"></div>\n'
                '<div role="dialog" aria-label="Test faucet" class="vn-fsheet" style="background: {{ t.card }}; color: {{ t.text }}">\n'
                '<div class="vn-fgrab" style="background: {{ t.bd }}"></div>\n'
                '<div class="vn-fhead"><b>Test faucet</b><span class="vn-fork">Fork only</span></div>\n'
                '<p class="vn-fsub" style="color: {{ t.text2 }}">Tap a token to get some. Use them anywhere in Vanna.</p>\n'
                '<div class="vn-fgrid"><sc-for list="{{ faucet }}" as="f" hint-placeholder-count="6">'
                '<button type="button" onClick="{{ f.pick }}" aria-label="{{ f.aria }}" class="{{ f.cls }}" style="background: {{ t.page }}; box-shadow: inset 0 0 0 1px {{ t.line }}; color: {{ t.text }}">'
                '<span class="vn-flg"><img src="{{ f.icon }}" alt=""><i class="vn-fring"></i><i class="vn-fok" style="box-shadow: 0 0 0 2px {{ t.card }}">' + icon('check', 14) + '</i></span>'
                '<b>{{ f.sym }}</b><small>{{ f.label }}</small></button></sc-for></div>\n'
                '<p class="vn-fnote" style="color: {{ t.text2 }}"><span style="display: flex; flex-shrink: 0; margin-top: 1px">' + icon('info', 16) + '</span>' + NOTE + '</p>\n'
                '</div>\n</sc-if>\n')

FAUCET_JS = r'''/* faucet (tools/faucet_tabs.py): one call per token, as the existing faucet component does */
var __fo = this.state.__fo === undefined ? !!this.props.faucetOpen : this.state.__fo;
var __fs = this.state.__fs || {};
var __FT = [__TOKENS__];
var __fset = function (sym, st) { var o = {}; o[sym] = st; self.setState({ __fs: Object.assign({}, self.state.__fs, o) }); };
__v.fOpen = __fo;
__v.fShow = function () { self.setState({ __fo: true }); };
__v.fHide = function () { self.setState({ __fo: false }); };
__v.faucet = __FT.map(function (x) {
  var st = __fs[x[0]] || '';
  return { sym: x[0], icon: x[1], label: st === 'busy' ? 'Getting…' : (st === 'done' ? 'Sent' : 'Get'), aria: 'Get test ' + x[0],
    cls: 'vn-ft' + (st ? ' vn-ft-' + st : ''),
    pick: function () { if ((self.state.__fs || {})[x[0]] === 'busy') return; __fset(x[0], 'busy');
      setTimeout(function () { __fset(x[0], 'done'); setTimeout(function () { if ((self.state.__fs || {})[x[0]] === 'done') __fset(x[0], ''); }, 2400); }, 1200); } };
});
/* end faucet */
'''.replace('__TOKENS__', ', '.join("['%s', '@IMG:%s@']" % (n, k) for n, k in TOKENS))


def profile():
    p = find('tpl', 'V7Profile.html')
    h0, h, crlf = load(p)
    h = re.sub(r'<div data-vn-faucet="row".*?</div>\n', '', h)
    h = drop_block(h, '<sc-if value="{{ fOpen }}"')
    appear = '<div style="border-radius: 16px; background: {{ t.card }}; box-shadow: {{ t.shadow }}; padding: 0 16px 16px 16px">\n<div style="height: 44px; display: flex; align-items: center; font-size: 12px; font-weight: 600; color: {{ t.text2 }}">Appearance</div>'
    assert h.count(appear) == 1, 'Profile appearance card'
    h = h.replace(appear, FAUCET_ROW + appear)
    end = h.rstrip()
    assert end.endswith('</div>')
    h = end[:-len('</div>')] + FAUCET_SHEET + '</div>'
    write(p, h, h0, os.path.basename(p), crlf)
    c = find('cls', 'V7Profile.js')
    j0, j, crlf = load(c)
    j = re.sub(r'/\* faucet .*?/\* end faucet \*/\n', '', j, flags=re.S)
    i = j.rindex('return __v;')
    j = j[:i] + FAUCET_JS + j[i:]
    write(c, j, j0, os.path.basename(c), crlf)


# ---------------------------------------------------------------- 2. vault tabs
OLD_TABS = re.compile(r'<div role="tablist" style="margin: 12px -20px 0 -20px; padding: 0 4px; display: flex; gap: 0; overflow-x: auto; border-bottom: 1px solid \{\{ t\.bd \}\}">\n'
                      r'<sc-for list="\{\{ tabs \}\}" as="b" hint-placeholder-count="6">.*?</sc-for>\n</div>\n', re.S)
NEW_TABS = ('<div class="vn-tabsw" style="margin: 12px -20px 0 -20px">\n'
            '<div role="tablist" class="vn-tabscroll">'
            '<sc-for list="{{ tabs }}" as="b" hint-placeholder-count="6"><button type="button" role="tab" aria-selected="{{ b.on }}" onClick="{{ b.pick }}" class="vn-pill">{{ b.label }}</button></sc-for></div>\n'
            '<span aria-hidden="true" class="vn-tabfade vn-tabfade-l"></span><span aria-hidden="true" class="vn-tabfade vn-tabfade-r"></span>\n'
            '<button type="button" class="vn-tabarrow vn-tabless" data-vn-step="-1" aria-label="Earlier tabs">' + icon('chevron_left', 20) + '</button>'
            '<button type="button" class="vn-tabarrow vn-tabmore" data-vn-step="1" aria-label="More tabs">' + icon('chevron_right', 20) + '</button>\n'
            '</div>\n')


def vault():
    p = find('tpl', 'V7EarnVault.html')
    h0, h, crlf = load(p)
    if 'class="vn-tabsw"' in h:
        a = h.index('<div class="vn-tabsw"')
        b = h.index('</button>\n</div>\n', a) + len('</button>\n</div>\n')
        h = h[:a] + NEW_TABS + h[b:]
    else:
        assert len(OLD_TABS.findall(h)) == 1, 'vault tab row'
        h = OLD_TABS.sub(lambda m: NEW_TABS, h)
    write(p, h, h0, os.path.basename(p), crlf)


# ---------------------------------------------------------------- registry, styles, runtime
def registry():
    sp, tp, rp = (os.path.join(SRC, f) for f in ('screens.json', 'titles.json', 'rows.json'))
    screens, titles, rows = (json.load(open(x, encoding='utf8')) for x in (sp, tp, rp))
    before = json.dumps([screens, titles, rows])
    screens['V7ProfileFaucet'] = {'w': 'V7Profile', 'p': {'faucetOpen': True}}
    titles['V7ProfileFaucet'] = 'Profile · test faucet'
    for row in rows:
        stems = [s for s, _ in row[1]]
        if 'V7Profile' in stems and 'V7ProfileFaucet' not in stems:
            row[1].insert(stems.index('V7Profile') + 1, ['V7ProfileFaucet', titles['V7ProfileFaucet']])
    if json.dumps([screens, titles, rows]) != before:
        for x, d in ((sp, screens), (tp, titles), (rp, rows)):
            json.dump(d, open(x, 'w', encoding='utf8'), indent=1)
        print('faucet/tabs: screens/titles/rows')


CSS = r'''
/* ===== faucet-tabs (tools/faucet_tabs.py) ===== */
.vn-frow { width: 100%; min-height: 64px; padding: 0; border: 0; background: transparent; display: flex; align-items: center; gap: 12px; text-align: left; font: inherit; cursor: pointer; }
.vn-fstack { display: flex; flex-shrink: 0; } .vn-fstack img { width: 26px; height: 26px; border-radius: 50%; position: relative; } .vn-fstack img + img { margin-left: -9px; }
.vn-ftx { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; } .vn-ftx b { font-size: 15px; line-height: 20px; font-weight: 600; } .vn-ftx small { font-size: 12.5px; line-height: 16px; }
.vn-fveil { position: absolute; inset: 0; z-index: 50; background: rgba(10, 8, 18, 0.32); animation: vnVeil 200ms cubic-bezier(0.2, 0, 0, 1); }
.vn-fsheet { position: absolute; z-index: 51; left: 0; right: 0; bottom: 0; border-radius: 28px 28px 0 0; padding: 12px 20px 26px; animation: vnTxSheet 340ms cubic-bezier(0.05, 0.7, 0.1, 1); box-shadow: 0 -10px 30px -12px rgba(17, 11, 46, 0.28); }
.vn-wide .vn-fsheet { left: 50%; right: auto; width: min(560px, calc(100% - 48px)); margin-left: calc(min(560px, calc(100% - 48px)) / -2); border-radius: 28px; bottom: 24px; }
.vn-fgrab { width: 32px; height: 4px; border-radius: 2px; margin: 0 auto 16px; }
.vn-fhead { display: flex; align-items: center; justify-content: space-between; } .vn-fhead b { font-size: 20px; line-height: 26px; font-weight: 600; }
.vn-fork { font-size: 11px; font-weight: 700; letter-spacing: 0.04em; color: #8C5A00; background: #FFF3D6; padding: 3px 8px; border-radius: 8px; }
.vn-fsub { margin: 6px 0 0; font-size: 14px; line-height: 20px; }
.vn-fgrid { margin-top: 14px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.vn-ft { height: 92px; border: 0; border-radius: 16px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; font: inherit; cursor: pointer; transition: transform 120ms cubic-bezier(0.2, 0, 0, 1); }
.vn-ft:active { transform: scale(0.96); } .vn-ft b { font-size: 12.5px; font-weight: 600; } .vn-ft small { font-size: 11.5px; line-height: 14px; font-weight: 700; color: #4B44E0; }
.vn-isdark .vn-ft small { color: #B9B4FF; }
.vn-flg { position: relative; width: 34px; height: 34px; display: block; } .vn-flg img { width: 34px; height: 34px; border-radius: 50%; display: block; }
.vn-fring { position: absolute; inset: -4px; border-radius: 50%; border: 2.5px solid transparent; border-top-color: #4B44E0; opacity: 0; }
.vn-fok { position: absolute; right: -5px; bottom: -4px; width: 18px; height: 18px; border-radius: 50%; background: #1C7C83; color: #FFFFFF; display: flex; align-items: center; justify-content: center; transform: scale(0); transition: transform 300ms cubic-bezier(0.34, 1.4, 0.64, 1); }
.vn-ft-busy .vn-fring { opacity: 1; animation: vnSpin 800ms linear infinite; } .vn-ft-busy small { color: inherit; opacity: 0.6; }
.vn-ft-done .vn-fok { transform: scale(1); } .vn-ft-done small { color: #1C7C83; } .vn-isdark .vn-ft-done small { color: #32EEE2; }
@keyframes vnSpin { to { transform: rotate(360deg); } }
.vn-fnote { margin: 14px 0 0; display: flex; gap: 8px; font-size: 12.5px; line-height: 18px; }

/* vault tabs: a scrolling row that says so */
.vn-tabsw { position: relative; }
.vn-tabscroll { display: flex; gap: 8px; padding: 0 20px; overflow-x: auto; scrollbar-width: none; scroll-behavior: smooth; } .vn-tabscroll::-webkit-scrollbar { display: none; }
.vn-pill { flex-shrink: 0; height: 36px; padding: 0 16px; border: 0; border-radius: 18px; background: #FFFFFF; color: #5F5F68; box-shadow: inset 0 0 0 1px #E5E7EB; font: 600 14px 'Plus Jakarta Sans', system-ui, sans-serif; white-space: nowrap; cursor: pointer; transition: background 200ms, color 200ms; }
.vn-isdark .vn-pill { background: #1E1E1E; color: #BFBFBF; box-shadow: inset 0 0 0 1px #2C2C2C; }   /* in CSS, not template holes: list items keep their first colours on a theme switch */
.vn-pill[aria-selected="true"] { background: #11727A; color: #FFFFFF; box-shadow: none; }
.vn-tabfade { position: absolute; top: 0; bottom: 0; width: 72px; pointer-events: none; transition: opacity 200ms; }
.vn-tabfade-r { right: 0; background: linear-gradient(90deg, rgba(247, 247, 247, 0), #F7F7F7 62%); }
.vn-tabfade-l { left: 0; background: linear-gradient(270deg, rgba(247, 247, 247, 0), #F7F7F7 62%); }
.vn-isdark .vn-tabfade-r { background: linear-gradient(90deg, rgba(17, 17, 17, 0), #111111 62%); }
.vn-isdark .vn-tabfade-l { background: linear-gradient(270deg, rgba(17, 17, 17, 0), #111111 62%); }
.vn-tabarrow { position: absolute; top: 2px; width: 32px; height: 32px; border: 0; border-radius: 50%; background: #FFFFFF; color: #11727A; box-shadow: 0 2px 8px rgba(17, 11, 46, 0.18); display: flex; align-items: center; justify-content: center; cursor: pointer; transition: opacity 200ms; }
.vn-tabmore { right: 10px; } .vn-tabless { left: 10px; }
.vn-isdark .vn-tabarrow { background: #1E1E1E; color: #32EEE2; }
/* each arrow and its fade only while there is more on that side */
.vn-tab-end .vn-tabfade-r, .vn-tab-end .vn-tabmore, .vn-tab-start .vn-tabfade-l, .vn-tab-start .vn-tabless { opacity: 0; pointer-events: none; }
/* ===== end faucet-tabs ===== */
'''

RUNTIME = r'''
/* ===== faucet-tabs (tools/faucet_tabs.py) =====
   Scrolling tab rows (.vn-tabscroll): the arrow scrolls on, the fade and arrow go at the end, and the selected tab
   is always in view. An arrow and its fade show only while there is more on that side. */
(function () {
  'use strict';
  var screen = document.getElementById('screen');
  if (!screen) return;
  function sync(row) {
    var w = row.parentNode; if (!w) return;
    w.classList.toggle('vn-tab-start', row.scrollLeft <= 8);
    w.classList.toggle('vn-tab-end', row.scrollLeft + row.clientWidth >= row.scrollWidth - 8);
  }
  screen.addEventListener('click', function (e) {
    var b = e.target.closest('[data-vn-step]'); if (!b) return;
    var row = b.parentNode.querySelector('.vn-tabscroll'); if (row) row.scrollBy({ left: 160 * +b.getAttribute('data-vn-step'), behavior: 'smooth' });
  });
  screen.addEventListener('scroll', function (e) { if (e.target.classList && e.target.classList.contains('vn-tabscroll')) sync(e.target); }, true);
  function scan() {
    screen.querySelectorAll('.vn-tabscroll').forEach(function (row) {
      var on = row.querySelector('[aria-selected="true"]');
      if (on && row.__vnOn !== on.textContent) {
        row.__vnOn = on.textContent;
        var tabs = row.querySelectorAll('[role="tab"]'), first = on === tabs[0], last = on === tabs[tabs.length - 1];
        var l = on.offsetLeft - 60, r = on.offsetLeft + on.offsetWidth - row.clientWidth + 60;   /* clear of the arrows */
        var x = first ? 0 : last ? row.scrollWidth : (row.scrollLeft > l ? l : (row.scrollLeft < r ? r : row.scrollLeft));
        row.scrollTo({ left: x, behavior: 'instant' });
        setTimeout(function () { sync(row); }, 60);
      }
      sync(row);
    });
  }
  new MutationObserver(scan).observe(screen, { childList: true, subtree: true, attributes: true, attributeFilter: ['aria-selected', 'class'] });   /* a re-render (e.g. theme switch) resets the row's classes */
  scan(); setTimeout(scan, 120);   /* the first screen may already be on the page */
})();
/* ===== end faucet-tabs ===== */
'''


def styles_runtime():
    for name, block, tag in (('styles.css', CSS, 'faucet-tabs'), ('runtime.js', RUNTIME, 'faucet-tabs')):
        p = os.path.join(SRC, name)
        s0 = s = open(p, encoding='utf8').read()
        s = re.sub(r'\n/\* ===== ' + tag + r'.*?/\* ===== end ' + tag + r' ===== \*/\n', '\n', s, flags=re.S)
        s = s.rstrip('\n') + '\n' + block
        if s != s0:
            open(p, 'w', encoding='utf8').write(s)
            print('faucet/tabs:', name)


if __name__ == '__main__':
    registry()
    styles_runtime()
    profile()
    vault()
