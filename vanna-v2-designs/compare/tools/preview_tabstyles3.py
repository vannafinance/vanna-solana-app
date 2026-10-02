"""Preview (not implemented): five more top-tab ideas, N to R, replacing J (user, 2 Oct 2026: "J is not good").

    python compare/tools/preview_tabstyles3.py   -> compare/previews/tabstyles3.html (+ renders/tabstyles3-*.png)
"""
import os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
CMP = os.path.dirname(HERE)
sys.path.insert(0, HERE)
from preview_refresh import V, ic, HERO, PORT_BODY, MARKETS, CSS, ORDER          # noqa: E402
from preview_refresh2 import RAYS, CSS2                                           # noqa: E402
from preview_tabstyles import topbar, CSS3, screen                                # noqa: E402
from preview_tabstyles2 import surface, hero, CSS4, DOT, KEYS, LABEL              # noqa: E402

MINI = {'portfolio': ('$9.1K', 'total'), 'earn': ('1.82%', 'best APY'), 'trade': ('5x', 'max'), 'farm': ('5.03%', 'Kamino')}


def band_open(space, inner):
    return '<div class="band" style="background:transparent">' + topbar() + inner + '</div>'


# N · Live tabs: each space shows its one key number, so the switcher is also a summary
def n_live(space):
    cells = ''.join('<span class="%s"><small>%s</small><b>%s</b><i>%s</i></span>' % ('on' if k == space else '', LABEL[k], MINI[k][0], MINI[k][1]) for k in KEYS)
    return surface(space, band_open(space, '<nav class="live">' + cells + '</nav>') + hero(space))


# O · Colour ribbon: four words over a four-colour ribbon; the current colour is lit
def o_ribbon(space):
    words = ''.join('<span class="%s">%s</span>' % ('on' if k == space else '', LABEL[k]) for k in KEYS)
    bar = ''.join('<i class="%s" style="background:%s"></i>' % ('on' if k == space else '', DOT[k]) for k in KEYS)
    return surface(space, band_open(space, '<nav class="rib"><div class="w">' + words + '</div><div class="b">' + bar + '</div></nav>') + hero(space))


# P · Space tiles: four small tiles, each in its own space's colours (Swiggy's picture tiles, in colour)
def p_tiles(space):
    tiles = ''.join('<span class="%s" style="background:linear-gradient(150deg,%s,%s)"><em>%s</em><b>%s</b></span>'
                    % ('on' if k == space else '', V[k]['panel'][0], V[k]['panel'][1], ic(dict(portfolio='pie_chart', earn='savings', trade='candlestick_chart', farm='psychiatry')[k], 18), LABEL[k])
                    for k in KEYS)
    return surface(space, band_open(space, '<nav class="tiles2">' + tiles + '</nav>') + hero(space))


# Q · Pointer: plain words; the panel below rises into a soft bump under the current one
def q_pointer(space):
    t = V[space]
    i = KEYS.index(space)
    words = ''.join('<span class="%s">%s</span>' % ('on' if k == space else '', LABEL[k]) for k in KEYS)
    cx = 12 + (i + .5) * 388 / 4          # centre of the current word (band has 12px padding)
    bump = ('<svg class="bump" width="120" height="24" viewBox="0 0 120 24" style="left:%.1fpx"><path d="M0 24 C 34 24 38 0 60 0 C 82 0 86 24 120 24 Z" fill="%s"/></svg>'
            % (cx - 60, t['panel'][0]))
    return ('<div class="hd2"><div class="band" style="background:%s">' % t['band'] + topbar() + '<nav class="ptr">' + words + '</nav></div>'
            '<div class="panel" style="position:relative;background:radial-gradient(110%% 90%% at 100%% 0%%, %s, transparent 60%%), linear-gradient(180deg,%s 0%%,%s 100%%)">%s%s</div></div>'
            % (RAYS[space][1], t['panel'][0], t['panel'][1], bump, HERO[space]))


# R · Switcher: the current space name with a chevron; the four spaces open in a menu (shown open in R2)
def r_switch(space, open_=False):
    menu = ''
    if open_:
        menu = ('<div class="swmenu">' + ''.join('<span class="%s"><i style="background:%s"></i><b>%s</b><em>%s</em>%s</span>'
                                                 % ('on' if k == space else '', DOT[k], LABEL[k], MINI[k][0] + ' ' + MINI[k][1], ic('check', 18) if k == space else '')
                                                 for k in KEYS) + '</div>')
    return surface(space, band_open(space, '<nav class="sw"><b>%s</b>%s<span class="sp"></span><span class="hint">4 spaces</span></nav>' % (LABEL[space], ic('expand_more', 24 if not open_ else 24))) + hero(space)) + menu


CSS5 = r'''
.live{margin:14px 4px 0;display:grid;grid-template-columns:repeat(4,1fr);gap:6px}
.live span{padding:9px 10px 8px;border-radius:16px;display:flex;flex-direction:column;gap:1px;color:rgba(255,255,255,.7);box-shadow:inset 0 0 0 1px rgba(255,255,255,.14)}
.live small{font-size:12px;font-weight:600}.live b{font-size:16px;line-height:20px;font-weight:700;color:#fff}.live i{font-style:normal;font-size:10.5px;opacity:.75}
.live span.on{background:#fff;box-shadow:0 6px 16px -8px rgba(0,0,0,.45);color:var(--link)}.live span.on b{color:#1F1F1F}
.rib{margin:12px 4px 0}.rib .w{display:flex}.rib .w span{flex:1;padding:8px 0;font-size:15px;font-weight:500;color:rgba(255,255,255,.66)}
.rib .w span.on{color:#fff;font-weight:700}
.rib .b{display:flex;gap:4px;align-items:center;height:8px}.rib .b i{flex:1;height:3px;border-radius:2px;opacity:.45}.rib .b i.on{height:6px;border-radius:3px;opacity:1;box-shadow:0 0 0 1.5px rgba(255,255,255,.7)}
.tiles2{margin:14px 4px 0;display:flex;gap:8px}
.tiles2 span{flex:1;height:66px;border-radius:16px;padding:9px 10px;display:flex;flex-direction:column;justify-content:space-between;color:#fff;box-shadow:inset 0 0 0 1px rgba(255,255,255,.18);opacity:.82}
.tiles2 em{display:flex;opacity:.9}.tiles2 b{font-size:13.5px;font-weight:600}
.tiles2 span.on{opacity:1;box-shadow:0 0 0 2px #fff,0 8px 18px -8px rgba(0,0,0,.5);transform:translateY(-2px)}
.ptr{margin:14px 0 0;display:flex}
.ptr span{flex:1;text-align:center;padding:10px 0 28px;font-size:15px;font-weight:500;color:rgba(255,255,255,.62)}
.ptr span.on{color:#fff;font-weight:700}
.bump{position:absolute;top:-23px}
.sw{margin:12px 4px 0;display:flex;align-items:center;gap:4px;color:#fff}
.sw b{font-size:22px;font-weight:700;letter-spacing:-.01em}.sw .sp{flex:1}
.sw .hint{height:26px;padding:0 10px;border-radius:13px;background:rgba(255,255,255,.14);font-size:12px;font-weight:600;display:flex;align-items:center}
.swmenu{position:absolute;z-index:40;left:16px;right:16px;top:142px;padding:6px;border-radius:20px;background:var(--card);box-shadow:0 18px 40px -12px rgba(17,11,46,.55)}
.swmenu span{height:52px;padding:0 12px;border-radius:14px;display:flex;align-items:center;gap:10px;color:var(--text)}
.swmenu span.on{background:rgba(112,58,230,.08);color:var(--link)}
.swmenu i{width:10px;height:10px;border-radius:50%}.swmenu b{font-size:15px;font-weight:600}.swmenu em{flex:1;text-align:right;font-style:normal;font-size:12.5px;color:var(--text2)}
'''

STYLES = [
    ('n', 'N · Live tabs', n_live, 'Each space shows its one key number (Portfolio total, Earn best APY, Trade max leverage, Farm rate), so the switcher doubles as a summary; the current one is white.'),
    ('o', 'O · Colour ribbon', o_ribbon, 'Four words over a thin four-colour ribbon (violet, teal, blue, pink); the current colour is lit. Teaches the colour system in one line.'),
    ('p', 'P · Space tiles', p_tiles, 'Four small tiles, each in its own space\'s colours with its icon, like Swiggy\'s picture tiles; the current one is outlined and lifted.'),
    ('q', 'Q · Pointer', q_pointer, 'Plain words; the panel below rises into a soft bump under the current one, so it is clearly "this one" without any tab box.'),
    ('r', 'R · Switcher', lambda s: r_switch(s), 'Just the current space name with a chevron. The cleanest header and the most room, but the other spaces are one tap away instead of visible.'),
    ('r2', 'R · Switcher, open', lambda s: r_switch(s, True), 'Tapping it opens the four spaces with their colour and key number.'),
]


def ph(inner, cap):
    return '<figure class="ph"><div class="screen">' + inner + '</div><figcaption>' + cap + '</figcaption></figure>'


def main():
    s1 = ''.join(ph(screen('portfolio', fn('portfolio'), PORT_BODY), '<b>%s.</b> %s' % (name, why)) for _, name, fn, why in STYLES)
    s2 = ''.join(ph(screen('trade', fn('trade'), MARKETS), '<b>%s</b> on Trade.' % name) for _, name, fn, why in STYLES[:5])
    page = ('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Vanna tab styles N-R</title>'
            '<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet"><style>' + CSS + CSS2 + CSS3 + CSS4 + CSS5 + '</style></head><body>'
            '<div class="top"><h1>Top tabs: five more ideas (N to R)</h1><p>Previews only, replacing J.</p></div>'
            '<section id="v1"><h2>On Portfolio</h2><div class="row-wrap">' + s1 + '</div></section>'
            '<section id="v2"><h2>On Trade</h2><div class="row-wrap">' + s2 + '</div></section></body></html>')
    out = os.path.join(CMP, 'previews', 'tabstyles3.html')
    open(out, 'w', encoding='utf8').write(page)
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
        b = p.chromium.launch(); pg = b.new_page(viewport={'width': 1800, 'height': 1000})
        pg.goto('file:///' + out.replace('\\', '/'), wait_until='networkidle'); pg.wait_for_timeout(900)
        for sid in ('v1', 'v2'):
            pg.locator('#' + sid).screenshot(path=os.path.join(CMP, 'renders', 'tabstyles3-%s.png' % sid))
        for i, (key, *_r) in enumerate(STYLES):
            pg.locator('#v1 .screen').nth(i).screenshot(path=os.path.join(CMP, 'renders', 'tabstyles3-%s.png' % key))
        b.close()
    print(out)


if __name__ == '__main__':
    main()
