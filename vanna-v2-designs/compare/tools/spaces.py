"""Super-app spaces: Portfolio (home) · Earn (lenders) · Trade (perps + swap) · Farm (leveraged yield).

    python compare/tools/spaces.py      (safe to re-run)

- Space headers: the product name and its back-to-Home arrow become the Vanna lockup, with the
  space tabs (Earn · Trade · Farm) underneath. Spaces are top level, so there is no back arrow.
- Trade gets one bottom bar: Markets · Swap · Positions · History. Swap takes Trade's colours.
- A first-launch chooser (V7Spaces): "What do you want to do?" with the three spaces.
- Welcome's "Explore first" and Connect's "Continue" open the chooser instead of the old Home hub.
"""
import json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(os.path.dirname(HERE), 'src')
sys.path.insert(0, HERE)
import material_icons as mi   # noqa: E402

hits = {}


def count(k, n=1):
    hits[k] = hits.get(k, 0) + n


def icon(name, weight='regular', size=20, extra=''):
    return ('<svg width="%d" height="%d" viewBox="0 -960 960 960" fill="currentColor" aria-hidden="true"%s>%s</svg>'
            % (size, size, extra, ''.join('<path d="%s"></path>' % d for d in mi.material(name, weight))))


SPACES = [  # key, label, root stem, icon, icon-tile gradient, deep colour (selected card text)
    ('portfolio', 'Portfolio', 'V7Home', 'pie_chart', 'linear-gradient(155deg, #FC5457 -25%, #703AE6 45%, #2F1B61 110%)', '#2F1B61'),
    ('earn', 'Earn', 'V7Earn', 'savings', 'linear-gradient(155deg, #703AE6 -20%, #3E207F 50%, #111111 125%)', '#3E207F'),
    ('trade', 'Trade', 'V7Perps', 'candlestick_chart', 'linear-gradient(155deg, #8D61EB -10%, #703AE6 35%, #2F1B61 110%)', '#2F1B61'),
    ('farm', 'Farm', 'V7Farm', 'psychiatry', 'linear-gradient(155deg, #FC5457 -20%, #FF007A 40%, #8C0043 110%)', '#8C0043'),
]
TEMPLATES = {  # template prefix -> (space, selected bottom tab)
    '02-': ('portfolio', None), '04-': ('portfolio', None), '05-': ('portfolio', None),
    '07-': ('trade', 'Markets'), '12-': ('trade', 'Markets'), '13-': ('trade', 'Swap'), '14-': ('trade', 'History'),
    '10-': ('trade', 'Positions'), '11-': ('trade', 'History'),
    '15-': ('earn', None), '18-': ('earn', None), '19-': ('earn', None),
    '20-': ('farm', None), '21-': ('farm', None), '22-': ('farm', None), '24-': ('farm', None),
}
TRADE_NAV = [('Markets', 'V7Perps', 'show_chart'), ('Swap', 'V7Swap', 'swap_horiz'),
             ('Positions', 'V7PerpsPositions', 'layers'), ('History', 'V7PerpsHistory', 'history')]
PERPS_GRAD = 'linear-gradient(155deg, #8D61EB -10%, #703AE6 35%, #2F1B61 110%)'
SWAP_GRAD = 'linear-gradient(155deg, #FF007A -30%, #703AE6 55%, #3E207F 110%)'


def lockup():
    home = open(os.path.join(SRC, 'tpl', '02-V7Home.html'), encoding='utf8').read()
    start = home.index('<span style="display: flex; align-items: center; gap: 10px"><svg width="30" height="30" viewBox="11 12 232 232"')
    second_svg = home.index('<svg', home.index('</svg>', start))
    end = home.index('</svg></span>', second_svg) + len('</svg></span>')
    return brand_mark(home[start:end])


# The Vanna mark keeps its brand colours on every screen (coral #FC5457 -> violet #703AE6), never white (user, 1 Oct 2026).
# On dark headers only the wordmark is white, the usual inverse lockup.
MARK_GRAD = ('<defs><linearGradient id="vnMarkHd" gradientUnits="userSpaceOnUse" x1="31.7" y1="73" x2="222.3" y2="183">'
             '<stop offset="0" stop-color="#FC5457"></stop><stop offset="1" stop-color="#703AE6"></stop></linearGradient></defs>')


def brand_mark(h):
    return re.sub(r'(<svg width="30" height="30" viewBox="11 12 232 232"[^>]*>)<path fill="#FFFFFF" fill-rule="evenodd"',
                  lambda m: m.group(1) + MARK_GRAD + '<path fill="url(#vnMarkHd)" fill-rule="evenodd"', h)


# Swiggy-style folder tabs (approved 1 Oct 2026, preview: compare/previews/top-tabs.html).
# Per space: the dark band behind status bar, header and tabs; the panel colour the selected tab flows into; the panel's lower colour.
THEME = {
    'portfolio': ('linear-gradient(180deg, #1A0B2E 0%, #2A1150 100%)', '#5B2BC0', '#3B1C82'),
    # Earn = Vanna teal, Trade = indigo (Vanna violet shifted to blue), chosen 1 Oct 2026 so no two spaces look alike.
    # White text on every panel colour is >= 4.5:1 (teal 5.1, indigo 7.5). Preview: compare/previews/space-colors.html
    'earn': ('linear-gradient(180deg, #04181A 0%, #0A2E31 100%)', '#137A82', '#0A464B'),
    'trade': ('linear-gradient(180deg, #0B0C2A 0%, #161A55 100%)', '#3F3AD8', '#231F86'),
    'farm': ('linear-gradient(180deg, #2A0618 0%, #4A0A2C 100%)', '#E0006B', '#9A0049'),
}
TAB_H, TAB_R, TAB_FLARE, TAB_SHOULDER = 86, 16, 6, 12
TAB_SIDE = TAB_FLARE + TAB_R        # width of each fixed-shape side; the middle stretches, so tabs keep their shape at any width


def tab_svg(on, fill):
    """Folder-tab shape (rounded top, sides flaring out). The selected tab adds concave shoulders and runs 1px into the
    panel below so the two read as one surface; the others are cut straight. Left and right sides are fixed paths
    (the right one is anchored at x=100%), the middle is a rect, so the shape is exact at every tab width."""
    h, r, f, s, side = TAB_H, TAB_R, TAB_FLARE, TAB_SHOULDER, TAB_SIDE
    if on:
        h += 1
        left = 'M %d %d Q 0 %d %.1f %d L %d %d Q %d 0 %d 0 L %d 0 L %d %d Z' % (-s, h, h, f * 0.2, h - s, f, r, f, side, side + 1, side + 1, h)
        right = 'M %d %d Q 0 %d %.1f %d L %d %d Q %d 0 %d 0 L %d 0 L %d %d Z' % (s, h, h, -f * 0.2, h - s, -f, r, -f, -side, -side - 1, -side - 1, h)
        top = 0
    else:
        left = 'M 0 %d L %d %d Q %d 2 %d 2 L %d %d Z' % (h, f, r + 2, f, side, side, h)
        right = 'M 0 %d L %d %d Q %d 2 %d 2 L %d %d Z' % (h, -f, r + 2, -f, -side, -side, h)
        top = 2
    return ('<svg width="100%" height="' + str(h) + '" style="position: absolute; left: 0; top: 0; overflow: visible" aria-hidden="true">'
            '<path d="' + left + '" fill="' + fill + '"></path>'
            '<rect x="' + str(side) + '" y="' + str(top) + '" height="' + str(h - top) + '" fill="' + fill + '" style="width: calc(100% - ' + str(2 * side) + 'px)"></rect>'
            '<svg x="100%" y="0" width="1" height="' + str(h) + '" style="overflow: visible"><path d="' + right + '" fill="' + fill + '"></path></svg></svg>')


def switcher(active):
    """Top tabs Portfolio · Earn · Trade · Farm. The selected one is a folder tab in its panel colour; plain white icons."""
    panel = THEME[active][1]
    tabs = []
    for key, label, stem, ic, grad, deep in SPACES:
        on = key == active
        tabs.append(
            '<a href="' + stem + '.dc.html"' + (' aria-current="page"' if on else '') + ' class="vn-tab" style="position: relative; z-index: ' + ('2' if on else '1') +
            '; flex: 1 1 0; min-width: 0; height: ' + str(TAB_H) + 'px; border-radius: 16px 16px 0 0; color: #FFFFFF; text-decoration: none">'
            + tab_svg(on, panel if on else 'rgba(255,255,255,0.07)') +
            '<span style="position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; padding-top: 4px">'
            '<span style="display: flex; opacity: ' + ('1' if on else '0.78') + '">' + icon(ic, 'fill' if on else 'regular', 28 if on else 26) + '</span>'
            '<span style="font-size: 13px; line-height: 16px; white-space: nowrap; font-weight: ' + ('600' if on else '500') + '; opacity: ' + ('1' if on else '0.78') + '">' + label + '</span></span></a>')
    return ('<nav class="vn-space" aria-label="Vanna spaces" style="margin-top: 10px; display: flex; gap: 6px; position: relative">' + ''.join(tabs) + '</nav>')


def band_style(space):
    return 'position: relative; z-index: 1; background: ' + THEME[space][0] + '; padding: 36px 12px 0 12px'


def panel_bg(space):
    return 'background: linear-gradient(180deg, ' + THEME[space][1] + ' 0%, ' + THEME[space][2] + ' 100%);'


def folder_header(h, space):
    """Split the space's hero <section> into a dark band (status bar, header, tabs) and the panel the selected tab
    flows into (the screen's existing hero content). Safe to re-run: an already split hero only gets refreshed."""
    if 'class="vn-hero"' in h:
        h = re.sub(r'<nav class="vn-space".*?</nav>', lambda m: switcher(space), h, count=1, flags=re.S)
        h = re.sub(r'(class="vn-band" style=")[^"]*', lambda m: m.group(1) + band_style(space), h, count=1)
        h = re.sub(r'(class="vn-panel" style="[^"]*?)background: linear-gradient\(180deg[^;]*;', lambda m: m.group(1) + panel_bg(space), h, count=1)
        count('header: folder tabs (refreshed)')
        return h
    m = re.search(r'<section style="background: [^"]*?; border-radius: 0 0 28px 28px; padding: 36px 16px (\d+)px 16px; color: #FFFFFF">(.*?)</section>', h, flags=re.S)
    if not m:
        return h
    pad_bottom, inner = m.group(1), m.group(2)
    nav = re.search(r'<nav class="vn-space".*?</nav>', inner, flags=re.S)
    head, rest = inner[:nav.start()], inner[nav.end():]
    head = head.replace('<header style="height: 52px;', '<header style="height: 52px; padding: 0 4px;', 1)
    rest = rest.strip()
    rest = re.sub(r'^(<div[^>]*? style=")margin-top: \d+px; ', lambda mm: mm.group(1), rest, count=1)    # the panel's padding spaces it now
    if rest:
        panel = ('<div class="vn-panel" style="' + panel_bg(space) + ' border-radius: 0 0 28px 28px; padding: 20px 16px ' + pad_bottom + 'px 16px">\n' + rest + '\n</div>')
    else:   # nothing in the hero (Swap): a short lip so the selected tab still lands on something
        panel = '<div class="vn-panel" style="' + panel_bg(space) + ' border-radius: 0 0 20px 20px; height: 20px; padding: 0 16px"></div>'
    new = ('<section class="vn-hero" style="color: #FFFFFF">\n<div class="vn-band" style="' + band_style(space) + '">' + head + switcher(space) +
           '\n</div>\n' + panel + '\n</section>')
    count('header: folder tabs')
    return h[:m.start()] + new + h[m.end():]


def trade_nav(selected, swap_context=False):
    """History opens on the list that fits where you are: Swaps from Swap, Perps from Markets / Positions."""
    items = []
    for label, stem, ic in TRADE_NAV:
        if label == 'History' and swap_context:
            stem = 'V7SwapHistory'
        on = label == selected
        ink = '{{ t.link }}' if on else '{{ t.text2 }}'
        items.append(
            '<a href="%s.dc.html"%s style="flex: 1 1 0; height: 56px; display: flex; flex-direction: column; align-items: center; gap: 4px; text-decoration: none">'
            '<span style="width: 64px; height: 32px; border-radius: 16px; background: transparent; color: %s; display: flex; align-items: center; justify-content: center">%s</span>'
            '<span style="font-size: 12px; line-height: 16px;%s color: %s">%s</span></a>'
            % (stem, ' aria-current="page"' if on else '', ink, icon(ic, 'fill' if on else 'regular', 22), ' font-weight: 600;' if on else '', ink, label))
    return ('<nav aria-label="Trade" class="vn-navbar" style="position: absolute; left: 0; right: 0; bottom: 0; z-index: 10; height: 80px; '
            'padding: 12px 12px 16px 12px; background: {{ t.card }}; display: flex; align-items: flex-start">\n' + '\n'.join(items) + '\n</nav>')


CHOOSER = '''<div style="width: 412px; height: 915px; position: relative; overflow: hidden; background: {{ t.page }}; color: {{ t.text }}; font-family: 'Plus Jakarta Sans', system-ui, sans-serif; font-variant-numeric: tabular-nums">
<div class="vn-main" style="position: absolute; inset: 0; overflow-y: auto; padding-bottom: 32px">
<div style="padding: 68px 20px 0 20px">
__MARK__
<h1 style="margin: 28px 0 0 0; font-size: 28px; line-height: 36px; font-weight: 600; letter-spacing: -0.01em">What do you want to do?</h1>
<p style="margin: 8px 0 24px 0; font-size: 16px; line-height: 24px; color: {{ t.text2 }}">Pick one to start. Everything stays one tap away at the top.</p>
__ROWS__
<div style="border-top: 1px solid {{ t.bd }}"></div>
<p style="margin: 18px 4px 0 4px; font-size: 14px; line-height: 20px; color: {{ t.text2 }}">New to leverage? Start with Earn. Nothing is ever liquidated there.</p>
</div>
</div>
</div>'''

# Minimal chooser (approved 1 Oct 2026): rows, a violet outline icon, no tiles, no chips
CHOICES = [
    ('V7Earn', 'savings', 'Earn', 'Supply USDC, SOL or stocks and earn the interest borrowers pay.', 'For lenders · No leverage · Withdraw anytime'),
    ('V7Perps', 'candlestick_chart', 'Trade', 'Long or short TSLAx, AAPLx and pre-IPO stocks, and swap any token.', 'For traders · Up to 5x'),
    ('V7Farm', 'psychiatry', 'Farm', 'Keep your stock as collateral, borrow USDC or SOL and earn on Kamino.', 'Leveraged yield · Up to 5x'),
]


def chooser():
    mark = json.load(open(os.path.join(HERE, 'mark.json')))
    mark_svg = ('<svg width="34" height="34" viewBox="11 12 232 232" role="img" aria-label="Vanna" style="display: block">'
                '<defs><linearGradient id="vnChG" gradientUnits="userSpaceOnUse" x1="31.7" y1="73" x2="222.3" y2="183"><stop offset="0" stop-color="#FC5457"></stop>'
                '<stop offset="1" stop-color="#703AE6"></stop></linearGradient></defs><path fill="url(#vnChG)" fill-rule="evenodd" d="' + mark['d'] + '"></path></svg>')
    rows = []
    for stem, ic, title, body, meta in CHOICES:
        rows.append(
            '<a href="' + stem + '.dc.html" style="min-height: 48px; padding: 18px 4px; border-top: 1px solid {{ t.bd }}; color: {{ t.text }}; text-decoration: none; display: flex; gap: 16px; align-items: flex-start">'
            '<span style="color: {{ t.link }}; display: flex; padding-top: 2px; flex-shrink: 0">' + icon(ic, 'regular', 28) + '</span>'
            '<span style="flex-grow: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px"><span style="font-size: 18px; line-height: 24px; font-weight: 600">' + title + '</span>'
            '<span style="font-size: 14px; line-height: 20px; color: {{ t.text2 }}">' + body + '</span>'
            '<span style="font-size: 12px; line-height: 16px; color: {{ t.text2 }}">' + meta + '</span></span>'
            '<span style="align-self: center; color: {{ t.text2 }}; display: flex">' + icon('chevron_right', 'regular', 22) + '</span></a>')
    return CHOOSER.replace('__MARK__', mark_svg).replace('__ROWS__', '\n'.join(rows))


def add_chooser():
    screens = json.load(open(os.path.join(SRC, 'screens.json'), encoding='utf8'))
    titles = json.load(open(os.path.join(SRC, 'titles.json'), encoding='utf8'))
    rows = json.load(open(os.path.join(SRC, 'rows.json'), encoding='utf8'))
    tpl_dir, cls_dir = os.path.join(SRC, 'tpl'), os.path.join(SRC, 'cls')
    if 'V7Spaces' in screens:
        t, c = screens['V7Spaces']['t'], screens['V7Spaces']['c']
    else:
        t, c = len(os.listdir(tpl_dir)), len(os.listdir(cls_dir))
        screens['V7Spaces'] = {'t': t, 'c': c, 'p': {'dark': False}}
        titles['V7Spaces'] = 'Choose a space'
        rows[0][1].insert(1, ['V7Spaces', 'Choose a space'])
        count('chooser: registered')
    open(os.path.join(tpl_dir, '%02d-V7Spaces.html' % t), 'w', encoding='utf8').write(chooser())
    # logic: just the theme tokens, taken from an existing screen
    base = open(os.path.join(cls_dir, '00-V7Welcome.js'), encoding='utf8').read()
    open(os.path.join(cls_dir, '%02d-V7Spaces.js' % c), 'w', encoding='utf8').write(base)
    for name, data in (('screens', screens), ('titles', titles), ('rows', rows)):
        json.dump(data, open(os.path.join(SRC, name + '.json'), 'w', encoding='utf8'), indent=1)


def main():
    lock = lockup()
    for f in sorted(os.listdir(os.path.join(SRC, 'tpl'))):
        path = os.path.join(SRC, 'tpl', f)
        h = open(path, encoding='utf8').read(); before = h
        h2 = brand_mark(h)
        if h2 != h:
            count('logo: brand gradient mark'); h = h2
        if f[:3] in TEMPLATES:
            space, tab = TEMPLATES[f[:3]]
            h, n = re.subn(r'<a href="V7Home\.dc\.html" aria-label="Back to Vanna home".*?</a><span style="display: flex; align-items: center; gap: 8px; margin-left: 4px">.*?'
                           r'<span style="font-size: 20px; line-height: 28px; font-weight: 600">[^<]*</span></span>', lambda m: lock, h, count=1, flags=re.S)
            count('header: product name -> Vanna lockup', n)
            if 'class="vn-space"' not in h:
                h, n = re.subn(r'</header>', lambda m: '</header>\n' + switcher(space), h, count=1)
                count('header: top tabs', n)
            h = folder_header(h, space)
            if space == 'earn':   # Earn's bottom bar takes its space colour (Vanna teal, theme-aware), like Farm's pink
                h, n = re.subn(r'<nav aria-label="[^"]*" class="vn-navbar".*?</nav>', lambda m: m.group(0).replace('{{ t.link }}', '{{ t.pos }}'), h, count=1, flags=re.S)
                count('earn: bottom bar in teal', n)
            if space == 'trade':
                h, n = re.subn(r'<nav aria-label="[^"]*" class="vn-navbar".*?</nav>', lambda m: trade_nav(tab, f[:3] in ('13-', '14-')), h, count=1, flags=re.S)
                count('trade: one bottom bar', n)
                if SWAP_GRAD in h:
                    h = h.replace(SWAP_GRAD, PERPS_GRAD); count('swap: trade colours')
        # start destination: the chooser, not the old Home hub
        if f.startswith(('00-', '01-')):
            h, n = re.subn(r'<a href="V7Home\.dc\.html"( style="height: 52px)', r'<a href="V7Spaces.dc.html"\1', h)
            count('welcome: explore first -> chooser', n)
            h, n = re.subn(r'<a href="V7Home\.dc\.html"( style="margin-top: 24px; width: 100%; height: 52px)', r'<a href="V7Spaces.dc.html"\1', h)
            count('connect: continue -> chooser', n)
        if h != before:
            open(path, 'w', encoding='utf8').write(h)
    add_chooser()
    for k, v in hits.items():
        print('%4d  %s' % (v, k))


if __name__ == '__main__':
    main()
