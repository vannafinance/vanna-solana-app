"""Preview (not implemented): seven more top-tab styles, G to M, each a different idea (not rounded copies of A-F).
User, 2 Oct 2026: "more styles from G, different types, more creative" and "sleek doesn't mean you round it".

    python compare/tools/preview_tabstyles2.py   -> compare/previews/tabstyles2.html (+ renders/tabstyles2-*.png)
"""
import os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
CMP = os.path.dirname(HERE)
sys.path.insert(0, HERE)
from preview_refresh import V, ic, HERO, nav, PORT_BODY, MARKETS, CSS, ORDER     # noqa: E402
from preview_refresh2 import RAYS, CSS2, ICON                                   # noqa: E402
from preview_tabstyles import topbar, band_colors, CSS3, screen                 # noqa: E402

KEYS = [k for k, _ in ORDER]
LABEL = dict(ORDER)
DOT = {'portfolio': 'linear-gradient(135deg,#FC5457,#8B4DF7)', 'earn': '#2FC9C1', 'trade': '#6C8CFF', 'farm': '#FF4FA3'}


def surface(space, inner, extra_style=''):
    """one continuous header surface with the space's own-colour glow"""
    t = V[space]
    return ('<div class="hd2" style="background:radial-gradient(110%% 70%% at 100%% 0%%, %s, transparent 60%%), linear-gradient(180deg,%s 0%%,%s 42%%,%s 100%%);%s">'
            % (RAYS[space][1], band_colors(space)[0], t['panel'][0], t['panel'][1], extra_style) + inner + '</div>')


def hero(space, pad='14px 16px 20px'):
    return '<div class="panel" style="background:transparent;padding:%s">%s</div>' % (pad, HERO[space])


# G · Wallet stack: the other spaces are cards waiting behind the current one, like cards in a wallet
def g_wallet(space):
    t = V[space]
    others = [k for k in KEYS if k != space]
    strips = ''.join('<div class="wcard" style="margin:0 %dpx;background:linear-gradient(180deg,%s,%s)"><span>%s</span><em>%s</em></div>'
                     % (12 + (len(others) - 1 - i) * 10, V[k]['panel'][0], V[k]['panel'][1], LABEL[k], ic('north_east', 14))
                     for i, k in enumerate(others))
    front = ('<div class="wfront" style="background:radial-gradient(110%% 90%% at 100%% 0%%, %s, transparent 60%%), linear-gradient(180deg,%s,%s)">'
             '<div class="wtitle">%s</div>%s</div>' % (RAYS[space][1], t['panel'][0], t['panel'][1], LABEL[space], HERO[space]))
    return ('<div class="hd2 wallet" style="background:%s"><div class="band" style="background:transparent">' % t['band'] + topbar() + '</div>'
            '<div class="wstack">' + strips + front + '</div></div>')


# H · Expanding pill: icons only; the selected one opens into a pill with its name
def h_expand(space):
    t = V[space]
    items = ''.join(('<span class="xp on" style="color:%s">%s<b>%s</b></span>' % (t['ink'], ic(ICON[k], 20, 'fill'), LABEL[k])) if k == space
                    else '<span class="xp">%s</span>' % ic(ICON[k], 20) for k in KEYS)
    return surface(space, '<div class="band" style="background:transparent">' + topbar() + '<nav class="xps">' + items + '</nav></div>' + hero(space))


# I · Spotlight: text only; a soft light sits behind the current one
def i_spot(space):
    items = ''.join('<span class="%s">%s</span>' % ('on' if k == space else '', LABEL[k]) for k in KEYS)
    return surface(space, '<div class="band" style="background:transparent">' + topbar() + '<nav class="spot">' + items + '</nav></div>' + hero(space))


# J · Editorial: the current space is the title, the others sit beside it in small type
def j_title(space):
    others = ''.join('<span>%s</span>' % LABEL[k] for k in KEYS if k != space)
    return surface(space, '<div class="band" style="background:transparent">' + topbar() +
                   '<nav class="edit"><b>%s</b><span class="rest">%s</span></nav></div>' % (LABEL[space], others) + hero(space, '6px 16px 20px'))


# K · Colour-keyed: each space carries its own colour dot, so the colour system teaches itself
def k_dots(space):
    t = V[space]
    items = ''.join('<span class="%s" style="%s"><i style="background:%s"></i>%s</span>' % ('on' if k == space else '', 'color:%s' % t['ink'] if k == space else '', DOT[k], LABEL[k])
                    for k in KEYS)
    return surface(space, '<div class="band" style="background:transparent">' + topbar() + '<nav class="dots">' + items + '</nav></div>' + hero(space))


# L · Hairline index: numbered like a magazine contents line, a thin rule fills under the current one
def l_index(space):
    items = ''.join('<span class="%s"><small>0%d</small>%s</span>' % ('on' if k == space else '', i + 1, LABEL[k]) for i, k in enumerate(KEYS))
    return surface(space, '<div class="band" style="background:transparent">' + topbar() + '<nav class="idx">' + items + '</nav></div>' + hero(space))


# M · Floating island: the switcher floats over the bottom edge of the header, between the numbers and the page
def m_island(space):
    t = V[space]
    items = ''.join('<span class="%s" style="%s">%s</span>' % ('on' if k == space else '', 'background:%s' % t['pill'] if k == space else '', LABEL[k]) for k in KEYS)
    return (surface(space, '<div class="band" style="background:transparent">' + topbar() + '</div>' + hero(space, '2px 16px 44px')) +
            '<nav class="island">' + items + '</nav>')


CSS4 = r'''
.wallet{padding-bottom:0}
.wstack{display:flex;flex-direction:column;margin-top:6px}
.wcard{height:38px;margin-bottom:-12px;border-radius:18px 18px 0 0;padding:7px 16px 0;display:flex;justify-content:space-between;color:#fff;font-size:13px;font-weight:600;
  box-shadow:0 -2px 10px rgba(0,0,0,.18)}
.wcard span{opacity:.92}.wcard em{display:flex;opacity:.7}
.wfront{position:relative;border-radius:22px 22px 28px 28px;padding:12px 16px 20px;color:#fff;box-shadow:0 -6px 18px rgba(0,0,0,.25)}
.wtitle{font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;opacity:.85;margin-bottom:10px}
.xps{margin:14px 4px 0;display:flex;align-items:center;justify-content:space-between}
.xp{width:48px;height:48px;border-radius:24px;display:flex;align-items:center;justify-content:center;color:#fff;background:rgba(255,255,255,.12);box-shadow:inset 0 0 0 1px rgba(255,255,255,.16)}
.xp.on{width:auto;padding:0 18px 0 14px;gap:8px;background:#fff;box-shadow:0 6px 18px -8px rgba(0,0,0,.45)}.xp.on b{font-size:15px}
.spot{margin:12px 4px 0;display:flex;justify-content:space-between}
.spot span{position:relative;padding:12px 10px;font-size:15px;font-weight:500;color:rgba(255,255,255,.6)}
.spot span.on{color:#fff;font-weight:700}
.spot span.on::before{content:'';position:absolute;inset:-6px -12px;border-radius:50%;background:radial-gradient(closest-side,rgba(255,255,255,.34),transparent);z-index:-1}
.spot{position:relative;z-index:0}
.edit{margin:10px 4px 0;display:flex;align-items:baseline;gap:14px}
.edit b{font-size:30px;line-height:38px;font-weight:700;letter-spacing:-.02em;color:#fff}
.edit .rest{display:flex;gap:14px}.edit .rest span{font-size:14px;font-weight:500;color:rgba(255,255,255,.62)}
.dots{margin:14px 4px 0;display:flex;gap:8px}
.dots span{height:38px;padding:0 13px;border-radius:19px;display:flex;align-items:center;gap:7px;font-size:14px;font-weight:500;color:#fff;background:rgba(255,255,255,.1)}
.dots i{width:8px;height:8px;border-radius:50%;box-shadow:0 0 0 2px rgba(255,255,255,.25)}
.dots span.on{background:#fff;font-weight:700}.dots span.on i{box-shadow:none}
.idx{margin:16px 4px 0;display:flex;border-top:1px solid rgba(255,255,255,.2)}
.idx span{flex:1;position:relative;padding:10px 0 4px;display:flex;flex-direction:column;gap:2px;font-size:15px;font-weight:500;color:rgba(255,255,255,.62)}
.idx small{font-size:10px;font-weight:600;letter-spacing:.1em;opacity:.8}
.idx span.on{color:#fff;font-weight:700}.idx span.on::before{content:'';position:absolute;left:0;right:12px;top:-1px;height:2px;background:#fff}
.island{position:relative;z-index:30;margin:-28px 16px 0;height:56px;padding:6px;border-radius:28px;background:var(--card);display:flex;
  box-shadow:0 12px 30px -12px rgba(17,11,46,.45),0 0 0 1px rgba(17,17,17,.04)}
.island span{flex:1;border-radius:22px;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:600;color:var(--text2)}
.island span.on{color:#fff;font-weight:700}
'''

STYLES = [
    ('g', 'G · Wallet stack', g_wallet, 'The other spaces wait behind the current one as cards, in their own colours, like a card wallet. Tap a card behind to bring it forward. The most "coming from behind" of all, without any tab shapes.'),
    ('h', 'H · Expanding pill', h_expand, 'Icons only; the current space opens into a white pill with its name. Compact and clear, very modern (Android 16 style).'),
    ('i', 'I · Spotlight', i_spot, 'Just words. A soft light glows behind the current one. Nothing else: no boxes, no lines.'),
    ('j', 'J · Title', j_title, 'The current space is the page title in big type; the other three sit beside it, small. Reads like a premium app header.'),
    ('k', 'K · Colour-keyed', k_dots, 'Each space has its own colour dot (violet, teal, blue, pink), so people learn the colours; the current one is white.'),
    ('l', 'L · Index line', l_index, 'Numbered like a magazine contents line; a thin white rule marks the current one. Quiet and editorial.'),
    ('m', 'M · Floating island', m_island, 'The switcher floats over the bottom edge of the header, between the numbers and the page, with the space gradient on the current one.'),
]


def ph(inner, cap):
    return '<figure class="ph"><div class="screen">' + inner + '</div><figcaption>' + cap + '</figcaption></figure>'


def main():
    s1 = ''.join(ph(screen('portfolio', fn('portfolio'), PORT_BODY), '<b>%s.</b> %s' % (name, why)) for _, name, fn, why in STYLES)
    s2 = ''.join(ph(screen('trade', fn('trade'), MARKETS), '<b>%s</b> on Trade.' % name) for _, name, fn, why in STYLES)
    page = ('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Vanna tab styles G-M</title>'
            '<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet"><style>' + CSS + CSS2 + CSS3 + CSS4 + '</style></head><body>'
            '<div class="top"><h1>Top tabs: seven more ideas (G to M)</h1><p>Previews only. Each one is a different way to switch spaces, not a rounded copy of A to F.</p></div>'
            '<section id="u1"><h2>On Portfolio</h2><div class="row-wrap">' + s1 + '</div></section>'
            '<section id="u2"><h2>The same seven on Trade</h2><div class="row-wrap">' + s2 + '</div></section></body></html>')
    out = os.path.join(CMP, 'previews', 'tabstyles2.html')
    open(out, 'w', encoding='utf8').write(page)
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
        b = p.chromium.launch(); pg = b.new_page(viewport={'width': 1800, 'height': 1000})
        pg.goto('file:///' + out.replace('\\', '/'), wait_until='networkidle'); pg.wait_for_timeout(900)
        for sid in ('u1', 'u2'):
            pg.locator('#' + sid).screenshot(path=os.path.join(CMP, 'renders', 'tabstyles2-%s.png' % sid))
        for i, (key, *_r) in enumerate(STYLES):
            pg.locator('#u1 .screen').nth(i).screenshot(path=os.path.join(CMP, 'renders', 'tabstyles2-%s.png' % key))
            pg.locator('#u2 .screen').nth(i).screenshot(path=os.path.join(CMP, 'renders', 'tabstyles2-%s-trade.png' % key))
        b.close()
    print(out)


if __name__ == '__main__':
    main()
