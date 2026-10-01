"""Preview (not implemented): a distinct colour per space. Portfolio (violet) and Farm (magenta) stay; Earn and Trade
are too close to Portfolio's violet today. White text contrast on each panel colour is >= 4.5:1.

    python compare/tools/preview_colors.py   -> compare/previews/space-colors.html + compare/renders/preview-space-colors.png
"""
import os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
CMP = os.path.dirname(HERE)
sys.path.insert(0, HERE)
import spaces                                   # noqa: E402
from preview_tabs import HERO, icon             # noqa: E402

CURRENT = dict(spaces.THEME)
OPTIONS = {   # band, panel top, panel bottom
    'earn teal': ('linear-gradient(180deg, #04181A 0%, #0A2E31 100%)', '#137A82', '#0A464B'),
    'trade indigo': ('linear-gradient(180deg, #0B0C2A 0%, #161A55 100%)', '#3F3AD8', '#231F86'),
    'trade graphite': ('linear-gradient(180deg, #0A0A0D 0%, #18181D 100%)', '#2E2E38', '#18181E'),
}
ROWS = [
    ('Now: Earn and Trade are both violet, like Portfolio', {}),
    ('Proposal 1 (recommended): Earn teal · Trade indigo', {'earn': OPTIONS['earn teal'], 'trade': OPTIONS['trade indigo']}),
    ('Proposal 2: Earn teal · Trade graphite (pro, dark)', {'earn': OPTIONS['earn teal'], 'trade': OPTIONS['trade graphite']}),
]


def screen(space):
    lbl, big, stats = HERO[space]
    stat_html = ''.join('<div style="display:flex;flex-direction:column;gap:2px;%s"><span style="font-size:12px;color:rgba(255,255,255,.72)">%s</span>'
                        '<span style="font-size:15px;font-weight:600">%s</span></div>' % ('' if i == 0 else 'padding-left:12px;border-left:1px solid rgba(255,255,255,.18)', k, v)
                        for i, (k, v) in enumerate(stats))
    return ('<div class="screen"><div style="' + spaces.band_style(space) + '">'
            '<header style="height:52px;display:flex;align-items:center;gap:8px;padding:0 4px">' + spaces.lockup() + '<span style="flex:1"></span>'
            '<span style="display:flex">' + icon('notifications', 'regular', 22) + '</span></header>' + spaces.switcher(space) + '</div>'
            '<div style="' + spaces.panel_bg(space) + ' border-radius:0 0 28px 28px;padding:20px 16px">'
            '<div style="font-size:14px;color:rgba(255,255,255,.8)">' + lbl + '</div>'
            '<div style="font-size:32px;line-height:40px;font-weight:600;letter-spacing:-.02em">' + big.replace('#32EEE2', '#FFFFFF') + '</div>'
            '<div style="margin-top:14px;padding-top:12px;border-top:1px solid rgba(255,255,255,.16);display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px">'
            + stat_html.replace('#32EEE2', '#FFFFFF') + '</div></div></div>')


def main():
    rows = []
    for title, over in ROWS:
        spaces.THEME.clear(); spaces.THEME.update(CURRENT); spaces.THEME.update(over)
        rows.append('<h2>%s</h2><div class="row">%s</div>' % (title, ''.join(screen(s) for s in ('portfolio', 'earn', 'trade', 'farm'))))
    spaces.THEME.clear(); spaces.THEME.update(CURRENT)
    html = ('<!doctype html><html><head><meta charset="utf-8"><title>Preview: space colours</title>'
            '<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600&display=swap" rel="stylesheet"><style>'
            "body{margin:0;padding:8px 28px 28px;background:#EDEBF3;font-family:'Plus Jakarta Sans',system-ui,sans-serif;font-variant-numeric:tabular-nums}"
            'h2{margin:24px 0 12px;font-size:18px;font-weight:600;color:#1F1F1F}.row{display:flex;gap:20px}'
            '.screen{width:412px;border-radius:24px;overflow:hidden;background:#F7F7F7;color:#FFFFFF;padding-bottom:20px}'
            '</style></head><body>' + ''.join(rows) + '</body></html>')
    out = os.path.join(CMP, 'previews', 'space-colors.html')
    open(out, 'w', encoding='utf8').write(html)
    png = os.path.join(CMP, 'renders', 'preview-space-colors.png')
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
        b = p.chromium.launch(); pg = b.new_page(viewport={'width': 1764, 'height': 900}, device_scale_factor=1.5)
        pg.goto('file:///' + out.replace('\\', '/')); pg.wait_for_timeout(1200)
        pg.screenshot(path=png, full_page=True); b.close()
    print(png)


if __name__ == '__main__':
    main()
