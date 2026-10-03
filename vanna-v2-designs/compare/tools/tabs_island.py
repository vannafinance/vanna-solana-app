"""Top space switcher, style M "Floating island" (chosen 3 Oct 2026 from previews/tabstyles2.html).

    python compare/tools/tabs_island.py      (safe to re-run; run after spaces.py)

Replaces the folder tabs. The header becomes one continuous surface in the space's colours with its own-colour glow
(the same values as the M preview: preview_refresh.V and preview_refresh2.RAYS), and Portfolio · Earn · Trade · Farm
sit in a white pill bar that floats over the header's bottom edge, between the numbers and the page. The current
space fills its pill with the space gradient. Links, Back behaviour and the reselect-to-top tap are unchanged
(the bar keeps the class vn-space that runtime.js listens to).
"""
import os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(os.path.dirname(HERE), 'src')
sys.path.insert(0, HERE)
from spaces import SPACES, TEMPLATES          # noqa: E402
from preview_refresh import V                 # noqa: E402
from preview_refresh2 import RAYS             # noqa: E402

OVERLAP = 28   # half of the 56dp bar sits over the header


def surface(space):
    t = V[space]
    band0 = re.findall(r'#[0-9A-Fa-f]{6}', t['band'])[0]
    return ('color: #FFFFFF; position: relative; z-index: 1; border-radius: 0 0 28px 28px; background: radial-gradient(110% 70% at 100% 0%, '
            + RAYS[space][1] + ', transparent 60%), linear-gradient(180deg, ' + band0 + ' 0%, ' + t['panel'][0] + ' 42%, ' + t['panel'][1] + ' 100%)')


def island(space):
    items = []
    for key, label, stem, _, _, _ in SPACES:
        if key == space:
            items.append('<a href="%s.dc.html" aria-current="page" class="vn-isl-on" style="background: %s">%s</a>' % (stem, V[key]['pill'], label))
        else:
            items.append('<a href="%s.dc.html" style="color: {{ t.text2 }}">%s</a>' % (stem, label))
    return ('<div class="vn-islandw"><nav class="vn-space vn-island" aria-label="Vanna spaces" style="background: {{ t.card }}">'
            + ''.join(items) + '</nav></div>\n')


def convert(h, space):
    if 'class="vn-hero"' not in h:
        return h
    # 1. one surface: the section carries the colours, band and panel go transparent
    h = re.sub(r'<section class="vn-hero" style="[^"]*">', lambda m: '<section class="vn-hero" style="' + surface(space) + '">', h, count=1)
    h = re.sub(r'(<div class="vn-band" style=")[^"]*', lambda m: m.group(1) + 'position: relative; z-index: 1; background: transparent; padding: 36px 12px 0 12px', h, count=1)

    def panel(m):
        st = m.group(2)
        pb = re.search(r'data-pb="(\d+)"', m.group(0))
        if 'height: 20px' in st or 'data-lip' in m.group(0):           # Swap: nothing in the hero, a short lip for the bar to sit on
            return '<div class="vn-panel" data-lip="1" style="background: transparent; height: ' + str(OVERLAP + 8) + 'px; padding: 0 16px"'
        if pb:
            base = int(pb.group(1))
        else:
            mm = re.search(r'padding: \d+px 16px (\d+)px 16px', st)
            base = int(mm.group(1)) if mm else 20
        return ('<div class="vn-panel" data-pb="%d" style="background: transparent; border-radius: 0; padding: 6px 16px %dpx 16px"' % (base, base + OVERLAP))
    h = re.sub(r'<div class="vn-panel"( data-[a-z]+="\d+")? style="([^"]*)"', panel, h, count=1)
    # 2. the switcher leaves the band and floats under the section
    h = re.sub(r'<nav class="vn-space" aria-label="Vanna spaces".*?</nav>\n?', '', h, count=1, flags=re.S)
    h = re.sub(r'<div class="vn-islandw">.*?</nav></div>\n', '', h, count=1, flags=re.S)
    end = h.index('</section>', h.index('class="vn-hero"')) + len('</section>')
    nl = '\n' if h[end:end + 1] == '\n' else ''
    return h[:end] + nl + island(space) + h[end + len(nl):]


CSS = r'''
/* ===== tabs-island (tools/tabs_island.py) ===== */
.vn-islandw { position: relative; z-index: 30; margin-top: -28px; padding: 0 16px; }
.vn-island { height: 56px; padding: 6px; border-radius: 28px; display: flex; box-shadow: 0 12px 30px -12px rgba(17, 11, 46, 0.45), 0 0 0 1px rgba(17, 17, 17, 0.04); }
.vn-isdark .vn-island { box-shadow: 0 12px 30px -12px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.06); }
.vn-island a { flex: 1 1 0; min-width: 0; border-radius: 22px; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 600; text-decoration: none; white-space: nowrap; transition: background 200ms cubic-bezier(0.2, 0, 0, 1); }
.vn-island a.vn-isl-on { color: #FFFFFF; font-weight: 700; box-shadow: 0 4px 12px -4px rgba(0, 0, 0, 0.35); }
.vn-island a:not(.vn-isl-on):active { background: rgba(127, 127, 127, 0.12); }
.vn-wide .vn-islandw .vn-island { max-width: 520px; margin: 0 auto; }
/* ===== end tabs-island ===== */
'''


def styles():
    p = os.path.join(SRC, 'styles.css')
    s0 = s = open(p, encoding='utf8').read()
    s = re.sub(r'\n/\* ===== tabs-island.*?/\* ===== end tabs-island ===== \*/\n', '\n', s, flags=re.S)
    s = s.rstrip('\n') + '\n' + CSS
    if s != s0:
        open(p, 'w', encoding='utf8').write(s)
        print('island: styles.css')


def main():
    styles()
    d = os.path.join(SRC, 'tpl')
    for f in sorted(os.listdir(d)):
        space = TEMPLATES.get(f[:3], (None,))[0]
        if not space:
            continue
        p = os.path.join(d, f)
        raw = open(p, encoding='utf8', newline='').read()
        crlf = '\r\n' in raw
        h = convert(raw.replace('\r\n', '\n'), space)
        if crlf:
            h = h.replace('\n', '\r\n')
        if h != raw:
            open(p, 'w', encoding='utf8', newline='').write(h)
            print('island:', f, space)


if __name__ == '__main__':
    main()
