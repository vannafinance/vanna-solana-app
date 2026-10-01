"""Preview (not implemented): replace Portfolio's "Explore vanna" tiles, which repeat the top tabs, with
product actions that each carry one live number and one button (idea from Jupiter Mobile, in Vanna's style).

    python compare/tools/preview_explore.py   -> compare/previews/explore.html + compare/renders/preview-explore.png

Numbers are from devnet.solana.vanna.finance on 1 Oct 2026: TSLAx vault 1.82% supply APY (best vault), TSLAx $356.03
on Perps (up to 5x), Kamino USDC 5.03% supply APY, USDC borrow 0.81%. Wallet holdings are the prototype's (1.25 TSLAx).
"""
import json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
CMP = os.path.dirname(HERE)
sys.path.insert(0, HERE)
import material_icons as mi                               # noqa: E402
from spaces import switcher, lockup, band_style, panel_bg  # noqa: E402

IMG = json.load(open(os.path.join(CMP, 'src', 'img.json'), encoding='utf8'))
TSLA, USDC, SOL = IMG['a9a1db51309a512ccf9302f8acc244d2'], IMG['022fc945e265208f7997f02a7fbdd97f'], IMG['6fe33337309fb2af41d7bb3a0961ebff']

T = {
    'light': dict(page='#F7F7F7', card='#FFFFFF', text='#1F1F1F', text2='#595959', line='#F4F4F4', bd='#E5E7EB', pos='#1C7C83',
                  tv='#F1EBFD', tvI='#5029A3', link='#703AE6', nav='#FFFFFF', shadow='0 1px 2px rgba(17,17,17,0.04), 0 8px 24px rgba(17,17,17,0.05)'),
    'dark': dict(page='#111111', card='#1E1E1E', text='#FFFFFF', text2='#BFBFBF', line='#2C2C2C', bd='#2C2C2C', pos='#32EEE2',
                 tv='#2F1B61', tvI='#D3C2F7', link='#BDA4F4', nav='#1E1E1E', shadow='none'),
}


def icon(name, weight='regular', size=22):
    return ('<svg width="%d" height="%d" viewBox="0 -960 960 960" fill="currentColor" aria-hidden="true">%s</svg>'
            % (size, size, ''.join('<path d="%s"></path>' % d for d in mi.material(name, weight))))


def coin(src, size=40, extra=''):
    return '<img src="%s" alt="" style="width:%dpx;height:%dpx;border-radius:50%%;display:block;%s">' % (src, size, size, extra)


def pair(a, b, t, size=40):
    """Two tokens: what you keep (a) and what it earns with (b)."""
    s = int(size * 0.62)
    return ('<span style="position:relative;width:%dpx;height:%dpx;display:block">%s<span style="position:absolute;right:-4px;bottom:-4px">%s</span></span>'
            % (size, size, coin(a, size), coin(b, s, 'box-shadow:0 0 0 2px ' + t['card'])))


# space, token art, headline (number in teal), one line of context, the action
ACTIONS = [
    ('Earn', lambda t: coin(TSLA), 'Earn <b style="color:{pos}">1.82%</b> APY on TSLAx', 'You hold 1.25 TSLAx · no lockup', 'Supply'),
    ('Trade', lambda t: coin(TSLA), 'Long TSLAx up to 5x', '$356.03 · use USDC as collateral', 'Trade'),
    ('Farm', lambda t: pair(TSLA, USDC, t), 'Farm <b style="color:{pos}">5.03%</b> on Kamino', 'Keep TSLAx · borrow at 0.81%', 'Deploy'),
    ('Swap', lambda t: pair(SOL, USDC, t), 'Swap any token', 'Best route through Jupiter', 'Swap'),
]


def header():
    return ('<div style="' + band_style('portfolio') + '">'
            '<div class="sb"><span>12:30</span><span>&#9679;&#9679;&#9679; &#9650; &#9646;</span></div>'
            '<header style="height:52px;display:flex;align-items:center;gap:8px;padding:0 4px">' + lockup() + '<span style="flex:1"></span>'
            '<span style="width:44px;height:44px;display:flex;align-items:center;justify-content:center">' + icon('notifications', 'regular', 22) + '</span>'
            '<span style="width:36px;height:36px;border-radius:50%;background:#111;box-shadow:0 0 0 2px rgba(255,255,255,.7)"></span></header>'
            + switcher('portfolio') + '</div>'
            '<div style="' + panel_bg('portfolio') + ' border-radius:0 0 28px 28px;padding:20px 16px 20px 16px">'
            '<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px">'
            '<div><div style="font-size:14px;color:rgba(255,255,255,.78)">Wallet balance</div><div style="font-size:30px;line-height:38px;font-weight:600;letter-spacing:-.02em">$4,812<span style="color:rgba(255,255,255,.56)">.40</span></div></div>'
            '<div><div style="font-size:14px;color:rgba(255,255,255,.78)">Margin account</div><div style="font-size:30px;line-height:38px;font-weight:600;letter-spacing:-.02em">$10,592<span style="color:rgba(255,255,255,.56)">.29</span></div></div></div>'
            '<div style="margin-top:20px;padding-top:16px;border-top:1px solid rgba(255,255,255,.16);display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px">'
            '<div><div style="font-size:12px;color:rgba(255,255,255,.72)">Net available</div><div style="font-size:16px;font-weight:600">$4,320.37</div></div>'
            '<div style="padding-left:12px;border-left:1px solid rgba(255,255,255,.18)"><div style="font-size:12px;color:rgba(255,255,255,.72)">Total borrowed</div><div style="font-size:16px;font-weight:600">$6,271.92</div></div>'
            '<div style="padding-left:12px;border-left:1px solid rgba(255,255,255,.18)"><div style="font-size:12px;color:rgba(255,255,255,.72)">Net earnings</div><div style="font-size:16px;font-weight:600;color:#32EEE2">+$1.37</div></div></div></div>')


def bottom_nav(t):
    items = [('Overview', 'home', True), ('Lender', 'toll', False), ('Trader', 'trending_up', False)]
    return ('<nav style="position:absolute;left:0;right:0;bottom:0;height:80px;padding:12px 12px 16px;background:%s;display:flex">' % t['nav'] + ''.join(
        '<span style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;color:%s"><span style="height:32px;display:flex;align-items:center">%s</span>'
        '<span style="font-size:12px;%s">%s</span></span>' % (t['link'] if on else t['text2'], icon(ic, 'fill' if on else 'regular', 22), 'font-weight:600' if on else '', lbl)
        for lbl, ic, on in items) + '</nav>')


def section_title(t, text):
    return '<h2 style="margin:0 0 12px;font-size:20px;line-height:28px;font-weight:600;color:%s">%s</h2>' % (t['text'], text)


def option_a(t):
    """A list of action rows in one card. Calm: the hero keeps the only big number on the screen."""
    rows = []
    for i, (space, art, title, sub, cta) in enumerate(ACTIONS):
        rows.append(
            '<div style="min-height:68px;display:flex;align-items:center;gap:12px;%s">' % ('' if i == 0 else 'border-top:1px solid ' + t['line']) +
            '<span style="flex-shrink:0">' + art(t) + '</span>'
            '<span style="flex:1;min-width:0;display:flex;flex-direction:column;gap:2px">'
            '<span style="font-size:16px;line-height:22px;font-weight:600;color:%s">%s</span>' % (t['text'], title.format(**t)) +
            '<span style="font-size:12px;line-height:16px;color:%s;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">%s</span></span>' % (t['text2'], sub) +
            '<span style="flex-shrink:0;height:36px;padding:0 16px;border-radius:18px;background:%s;color:%s;font-size:14px;font-weight:600;display:flex;align-items:center">%s</span></div>'
            % (t['tv'], t['tvI'], cta))
    return (section_title(t, 'Put your assets to work') +
            '<div style="border-radius:16px;background:%s;box-shadow:%s;padding:4px 16px">%s</div>' % (t['card'], t['shadow'], ''.join(rows)))


def option_b(t):
    """Swipeable cards, one per space; the next card peeks so people know to swipe."""
    cards = []
    for space, art, title, sub, cta in ACTIONS:
        cards.append(
            '<div style="flex:0 0 232px;border-radius:16px;background:%s;box-shadow:%s;padding:16px;display:flex;flex-direction:column;gap:12px">' % (t['card'], t['shadow']) +
            '<div style="display:flex;align-items:center;justify-content:space-between">' + art(t) +
            '<span style="height:24px;padding:0 8px;border-radius:8px;background:%s;color:%s;font-size:12px;font-weight:600;display:flex;align-items:center">%s</span></div>' % (t['tv'], t['tvI'], space) +
            '<div style="display:flex;flex-direction:column;gap:4px;min-height:64px"><span style="font-size:18px;line-height:24px;font-weight:600;color:%s">%s</span>' % (t['text'], title.format(**t)) +
            '<span style="font-size:13px;line-height:18px;color:%s">%s</span></div>' % (t['text2'], sub) +
            '<span style="height:40px;border-radius:20px;background:%s;color:%s;font-size:14px;font-weight:600;display:flex;align-items:center;justify-content:center">%s</span></div>'
            % (t['tv'], t['tvI'], cta))
    return (section_title(t, 'Put your assets to work') +
            '<div style="margin:0 -16px;padding:0 16px 4px;display:flex;gap:12px;overflow:hidden">%s</div>' % ''.join(cards))


def positions(t):
    rows = [(TSLA, 'TSLAx', 'Long 3x', '+$152.52', '+10.89%'), (IMG['68c99bf0397471dc2d806cfaa2e15d53'], 'OPENAI', 'Short 2x', '+$57.71', '+5.77%')]
    return ('<div style="margin-top:24px;display:flex;justify-content:space-between;align-items:center">' + section_title(t, 'Your positions').replace('margin:0 0 12px', 'margin:0') +
            '<span style="font-size:14px;color:%s">See all</span></div>' % t['link'] +
            '<div style="margin-top:12px;border-radius:16px;background:%s;box-shadow:%s;padding:4px 16px">' % (t['card'], t['shadow']) + ''.join(
                '<div style="height:64px;display:flex;align-items:center;gap:12px;%s">%s<span style="flex:1;display:flex;flex-direction:column"><span style="font-size:16px;font-weight:600;color:%s">%s</span>'
                '<span style="font-size:12px;color:%s">%s</span></span><span style="display:flex;flex-direction:column;align-items:flex-end"><span style="font-size:16px;font-weight:600;color:%s">%s</span>'
                '<span style="font-size:12px;color:%s">%s</span></span></div>' % ('' if i == 0 else 'border-top:1px solid ' + t['line'], coin(src, 36), t['text'], name, t['text2'], kind, t['pos'], pnl, t['text2'], pct)
                for i, (src, name, kind, pnl, pct) in enumerate(rows)) + '</div>')


def phone(body, mode, cap):
    t = T[mode]
    return ('<div class="phone"><div class="screen" style="background:%s">' % t['page'] + header() +
            '<div style="padding:24px 16px 96px">' + body(t) + positions(t) + '</div>' + bottom_nav(t) +
            '</div><div class="cap">%s</div></div>' % cap)


def main():
    html = ('<!doctype html><html><head><meta charset="utf-8"><title>Preview: Explore replacement</title>'
            '<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600&display=swap" rel="stylesheet"><style>'
            "body{margin:0;background:#EDEBF3;font-family:'Plus Jakarta Sans',system-ui,sans-serif;font-variant-numeric:tabular-nums}"
            '.wrap{display:flex;gap:28px;padding:28px;align-items:flex-start}.phone{display:flex;flex-direction:column;align-items:center;gap:12px}'
            '.screen{position:relative;width:412px;height:900px;border-radius:36px;overflow:hidden;color:#FFFFFF;box-shadow:0 0 0 9px #0B0B0D,0 30px 60px -20px rgba(47,27,97,.4)}'
            '.sb{height:28px;margin-top:-28px;display:flex;align-items:center;justify-content:space-between;padding:0 4px;font-size:12px;font-weight:600}'
            '.cap{font-size:14px;color:#595959;font-weight:500}</style></head><body><div class="wrap">'
            + phone(option_a, 'light', 'A · Action rows (recommended)') + phone(option_a, 'dark', 'A · Dark')
            + phone(option_b, 'light', 'B · Swipe cards') + '</div></body></html>')
    out = os.path.join(CMP, 'previews', 'explore.html')
    open(out, 'w', encoding='utf8').write(html)
    png = os.path.join(CMP, 'renders', 'preview-explore.png')
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
        b = p.chromium.launch(); pg = b.new_page(viewport={'width': 1420, 'height': 1000}, device_scale_factor=2)
        pg.goto('file:///' + out.replace('\\', '/')); pg.wait_for_timeout(1200)
        pg.screenshot(path=png, full_page=True); b.close()
    print(out); print(png)


if __name__ == '__main__':
    main()
