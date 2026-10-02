"""Preview (not implemented): six smooth styles for the top tabs (Portfolio · Earn · Trade · Farm), replacing the
slanted /-\\ folder tabs the user disliked (2 Oct 2026). Same header everywhere else: own-colour glow, plain bell,
the user's logo as given.

    python compare/tools/preview_tabstyles.py   -> compare/previews/tabstyles.html (+ renders/tabstyles-*.png)
"""
import os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
CMP = os.path.dirname(HERE)
sys.path.insert(0, HERE)
from preview_refresh import V, ic, WORDMARK, HERO, nav, PORT_BODY, MARKETS, SOL, CSS, ORDER   # noqa: E402
from preview_refresh2 import RAYS, CSS2, FAVICON, ICON                                     # noqa: E402

LABELS = [l for _, l in ORDER]
KEYS = [k for k, _ in ORDER]


def band_colors(space):
    return re.findall(r'#[0-9A-Fa-f]{6}', V[space]['band'])


# ---------------------------------------------------------------- A · soft stacked (Swiggy, rounded, no slants)
def path_soft(w, h, on, r=18, s=14):
    if on:   # rounded top, straight sides, concave shoulders flowing into the panel
        return ('M %d %d Q 0 %d 0 %d L 0 %d Q 0 0 %d 0 L %d 0 Q %d 0 %d %d L %d %d Q %d %d %d %d Z'
                % (-s, h + 1, h + 1, h + 1 - s, r, r, w - r, w, w, r, w, h + 1 - s, w, h + 1, w + s, h + 1))
    return 'M 0 %d L 0 %d Q 0 3 %d 3 L %d 3 Q %d 3 %d %d L %d %d Z' % (h, r + 3, r, w - r, w, w, r + 3, w, h)


def tabs_soft(space, icons=False):
    t = V[space]
    W, n, ov = 388, 4, 12
    H = 70 if icons else 52
    w = (W + ov * (n - 1)) / n
    ai = KEYS.index(space)
    out = []
    for i, key in enumerate(KEYS):
        on = key == space
        fill = t['panel'][0] if on else t['tab']
        svg = ('<svg width="%d" height="%d" viewBox="0 0 %d %d" style="position:absolute;left:0;top:0;overflow:visible;%s"><path d="%s" fill="%s"/></svg>'
               % (w, H + 1, w, H + 1, '' if on else 'filter:drop-shadow(-2px 0 6px rgba(0,0,0,.2))', path_soft(w, H, on), fill))
        icon = '<span style="display:flex;opacity:%s">%s</span>' % ('1' if on else '.8', ic(ICON[key], 22, 'fill' if on else 'regular')) if icons else ''
        out.append('<a class="ltab%s" style="left:%.1fpx;width:%.1fpx;height:%dpx;z-index:%d">%s<span class="lbl">%s<b>%s</b></span></a>'
                   % (' on' if on else '', i * (w - ov), w, H, 10 if on else 9 - abs(i - ai), svg, icon, LABELS[i]))
    return '<nav class="ltabs" style="height:%dpx;margin-top:16px">%s</nav>' % (H, ''.join(out))


# ---------------------------------------------------------------- B · liquid (only the selected tab has a shape)
def path_liquid(w, h, c=26, r=20):
    return ('M %d %d C %.1f %d 0 %d 0 %.1f L 0 %d Q 0 0 %d 0 L %d 0 Q %d 0 %d %d L %d %.1f C %d %d %.1f %d %d %d Z'
            % (-c, h + 1, -c * .4, h + 1, h - 4, h - c * .55, r, r, w - r, w, w, r, w, h - c * .55, w, h - 4, w + c * .4, h + 1, w + c, h + 1))


def tabs_liquid(space, icons=False):
    t = V[space]
    H = 72 if icons else 54
    w = 388 / 4
    out = []
    for i, key in enumerate(KEYS):
        on = key == space
        svg = ('<svg width="%d" height="%d" viewBox="0 0 %d %d" style="position:absolute;left:0;top:0;overflow:visible"><path d="%s" fill="%s"/></svg>'
               % (w, H + 1, w, H + 1, path_liquid(w, H), t['panel'][0])) if on else ''
        icon = '<span style="display:flex;opacity:%s">%s</span>' % ('1' if on else '.75', ic(ICON[key], 22, 'fill' if on else 'regular')) if icons else ''
        out.append('<a class="ltab%s" style="left:%.1fpx;width:%.1fpx;height:%dpx;z-index:%d">%s<span class="lbl">%s<b>%s</b></span></a>'
                   % (' on' if on else '', i * w, w, H, 10 if on else 1, svg, icon, LABELS[i]))
    return '<nav class="ltabs" style="height:%dpx;margin-top:16px">%s</nav>' % (H, ''.join(out))


# ---------------------------------------------------------------- C · glass segmented pill
def tabs_segment(space):
    t = V[space]
    return ('<nav class="seg3">' + ''.join('<span class="%s" style="%s">%s</span>' % ('on' if k == space else '', 'color:%s' % t['ink'] if k == space else '', l)
                                         for k, l in ORDER) + '</nav>')


# ---------------------------------------------------------------- D · text with a soft underline
def tabs_underline(space):
    return ('<nav class="und">' + ''.join('<span class="%s">%s<i></i></span>' % ('on' if k == space else '', l) for k, l in ORDER) + '</nav>')


# ---------------------------------------------------------------- E · separate chips
def tabs_chips(space):
    t = V[space]
    return ('<nav class="chp">' + ''.join('<span class="%s" style="%s">%s</span>' % ('on' if k == space else '', 'color:%s' % t['ink'] if k == space else '', l)
                                        for k, l in ORDER) + '</nav>')


def topbar():
    return ('<div class="sb"><span>12:30</span><span>&#9679;&#9679;&#9679; &#9650; &#9646;</span></div>'
            '<div class="hdr" style="height:58px"><span class="logo-tile"><img src="' + FAVICON + '" alt="Vanna"></span>' + WORDMARK.replace('width="77.2" height="18"', 'width="82" height="19"') +
            '<span style="flex:1"></span><span class="bell">' + ic('notifications', 24) + '<i class="badge">3</i></span>'
            '<span class="glass avatar"><img src="' + SOL + '" alt=""></span></div>')


def header_joined(space, tabs):
    """band with tabs, the selected tab flows into the panel (A, B, F)"""
    t = V[space]
    glow = RAYS[space][1]
    return ('<div class="hd2"><div class="band" style="background:%s">' % t['band'] + topbar() + tabs + '</div>'
            '<div class="panel" style="background:radial-gradient(110%% 90%% at 100%% 0%%, %s, transparent 60%%), linear-gradient(180deg,%s 0%%,%s 100%%)">%s</div></div>'
            % (glow, t['panel'][0], t['panel'][1], HERO[space]))


def header_single(space, tabs):
    """one continuous surface: top bar, tabs, then the numbers (C, D, E)"""
    t = V[space]
    glow = RAYS[space][1]
    top = band_colors(space)[0]
    return ('<div class="hd2" style="background:radial-gradient(110%% 70%% at 100%% 0%%, %s, transparent 60%%), linear-gradient(180deg,%s 0%%,%s 42%%,%s 100%%)">'
            % (glow, top, t['panel'][0], t['panel'][1]) +
            '<div class="band" style="background:transparent">' + topbar() + tabs + '</div><div class="panel" style="background:transparent;padding-top:14px">' + HERO[space] + '</div></div>')


def screen(space, header, body):
    return '<div class="scroll">' + header + '<div class="body">' + body + '</div></div>' + nav(space, 0)


CSS3 = r'''
.seg3{margin:14px 4px 0;display:flex;padding:4px;border-radius:999px;background:rgba(255,255,255,.14);box-shadow:inset 0 0 0 1px rgba(255,255,255,.16)}
.seg3 span{flex:1;height:40px;border-radius:999px;display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:500;color:rgba(255,255,255,.82)}
.seg3 span.on{background:#fff;font-weight:700;box-shadow:0 4px 14px -6px rgba(0,0,0,.4)}
.und{margin:12px 4px 0;display:flex;border-bottom:1px solid rgba(255,255,255,.16)}
.und span{flex:1;height:46px;position:relative;display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:500;color:rgba(255,255,255,.72)}
.und span.on{color:#fff;font-weight:700}.und i{display:none}
.und span.on i{display:block;position:absolute;bottom:-1px;left:50%;width:32px;height:4px;margin-left:-16px;border-radius:4px 4px 0 0;background:#fff}
.chp{margin:14px 4px 0;display:flex;gap:8px}
.chp span{height:40px;padding:0 18px;border-radius:20px;display:flex;align-items:center;font-size:15px;font-weight:500;color:#fff;background:rgba(255,255,255,.14);box-shadow:inset 0 0 0 1px rgba(255,255,255,.18)}
.chp span.on{background:#fff;font-weight:700;box-shadow:0 4px 14px -6px rgba(0,0,0,.4)}
'''

STYLES = [
    ('a', 'A · Soft stacked', lambda s: header_joined(s, tabs_soft(s)),
     'Swiggy\'s idea kept (tabs tucked behind each other, the selected one flows into the panel) but every corner is round and the sides are straight. No slants.'),
    ('b', 'B · Liquid', lambda s: header_joined(s, tabs_liquid(s)),
     'Only the selected tab has a shape: a rounded tab that melts into the panel with long smooth curves. The others are plain text. Calmest of the connected styles.'),
    ('c', 'C · Glass pill', lambda s: header_single(s, tabs_segment(s)),
     'A frosted pill track; the selected space is a white pill in the space\'s colour. The header becomes one smooth surface.'),
    ('d', 'D · Underline', lambda s: header_single(s, tabs_underline(s)),
     'Text only, the selected one bold with a short rounded bar under it (Material tabs). The most minimal.'),
    ('e', 'E · Chips', lambda s: header_single(s, tabs_chips(s)),
     'Four separate rounded chips; the selected one is white. Light and modern, like Revolut and Jupiter.'),
    ('f', 'F · Liquid with icons', lambda s: header_joined(s, tabs_liquid(s, icons=True)),
     'Style B with an icon above each label, for comparison.'),
]


def ph(inner, cap):
    return '<figure class="ph"><div class="screen">' + inner + '</div><figcaption>' + cap + '</figcaption></figure>'


def main():
    s1 = ''.join(ph(screen('portfolio', fn('portfolio'), PORT_BODY), '<b>%s.</b> %s' % (name, why)) for _, name, fn, why in STYLES)
    s2 = ''.join(ph(screen('trade', fn('trade'), MARKETS), '<b>%s</b> on Trade.' % name) for _, name, fn, why in STYLES)
    page = ('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Vanna tab styles</title>'
            '<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet"><style>' + CSS + CSS2 + CSS3 + '</style></head><body>'
            '<div class="top"><h1>Top tabs: six smooth styles</h1><p>Previews only. No slanted /-\\ edges anywhere: every shape is round. Same header otherwise (own-colour glow, plain bell, your logo as given).</p></div>'
            '<section id="t1"><h2>On Portfolio</h2><div class="row-wrap">' + s1 + '</div></section>'
            '<section id="t2"><h2>The same six on Trade</h2><div class="row-wrap">' + s2 + '</div></section></body></html>')
    out = os.path.join(CMP, 'previews', 'tabstyles.html')
    open(out, 'w', encoding='utf8').write(page)
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
        b = p.chromium.launch(); pg = b.new_page(viewport={'width': 1360, 'height': 1000})
        pg.goto('file:///' + out.replace('\\', '/'), wait_until='networkidle'); pg.wait_for_timeout(900)
        for sid in ('t1', 't2'):
            pg.locator('#' + sid).screenshot(path=os.path.join(CMP, 'renders', 'tabstyles-%s.png' % sid))
        # close-ups of the headers only
        figs = pg.locator('#t1 .screen')
        for i, (key, *_r) in enumerate(STYLES):
            figs.nth(i).screenshot(path=os.path.join(CMP, 'renders', 'tabstyles-%s.png' % key))
        b.close()
    print(out)


if __name__ == '__main__':
    main()
