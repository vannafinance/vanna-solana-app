"""Preview (not implemented): Swiggy-style folder tabs for Vanna, and a minimal space chooser.

    python compare/tools/preview_tabs.py      -> compare/previews/top-tabs.html (+ PNG via shots)
"""
import json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
CMP = os.path.dirname(HERE)
sys.path.insert(0, HERE)
import material_icons as mi   # noqa: E402
from spaces import lockup     # noqa: E402

MARK = json.load(open(os.path.join(HERE, 'mark.json')))['d']


def icon(name, weight='regular', size=26):
    return ('<svg width="%d" height="%d" viewBox="0 -960 960 960" fill="currentColor" aria-hidden="true">%s</svg>'
            % (size, size, ''.join('<path d="%s"></path>' % d for d in mi.material(name, weight))))


TABS = [('portfolio', 'Portfolio', 'pie_chart'), ('earn', 'Earn', 'savings'), ('trade', 'Trade', 'candlestick_chart'), ('farm', 'Farm', 'psychiatry')]
# per space: header band (dark, behind status bar), the panel colour the selected tab flows into, and the panel's lower colour
THEME = {
    'portfolio': ('linear-gradient(180deg, #1A0B2E 0%, #2A1150 100%)', '#5B2BC0', '#3B1C82'),
    'earn': ('linear-gradient(180deg, #120A24 0%, #22134A 100%)', '#4A27A6', '#2C1767'),
    'trade': ('linear-gradient(180deg, #130A2C 0%, #251258 100%)', '#6A35DE', '#3F1F96'),
    'farm': ('linear-gradient(180deg, #2A0618 0%, #4A0A2C 100%)', '#E0006B', '#9A0049'),
}
HERO = {
    'portfolio': ('Wallet balance', '$4,812<span style="opacity:.56">.40</span>', [('Margin account', '$10,592.29'), ('Total borrowed', '$6,271.92'), ('Net earnings', '<span style="color:#32EEE2">+$1.37</span>')]),
    'earn': ('Your deposits', '$2,677<span style="opacity:.56">.87</span>', [('Earning', '+$1.37'), ('Best vault', 'TSLAx 1.82%'), ('Withdraw', 'Anytime')]),
    'trade': ('Net available collateral', '$4,320<span style="opacity:.56">.37</span>', [('Open PnL', '<span style="color:#32EEE2">+$210.23</span>'), ('Positions', '2'), ('Health', '1.69 · Safe')]),
    'farm': ('Projected net profit', '≈$19.36<span style="opacity:.7">/yr</span>', [('Health', '2.00'), ('Leverage', '2.0x'), ('Pool', 'Kamino USDC')]),
}


def tab_svg(w, h, active, fill):
    """Folder-tab shape: rounded top, sides flaring out at the bottom. The selected tab adds concave shoulders
    so it flows into the panel below; the others are cut straight at the bottom."""
    r, flare = 16, 6
    if active:
        s = 12   # shoulder radius
        d = ('M %d %d Q %d %d %d %d L %d %d Q %d 0 %d 0 L %d 0 Q %d 0 %d %d L %d %d Q %d %d %d %d Z'
             % (-s, h, 0, h, 0 + flare * 0.2, h - s, flare, r, flare, flare + r, w - flare - r, w - flare, w - flare, r,
                w - flare * 0.2, h - s, w, h, w + s, h))
    else:
        d = ('M 0 %d L %d %d Q %d 2 %d 2 L %d 2 Q %d 2 %d %d L %d %d Z'
             % (h, flare, r + 2, flare, flare + r, w - flare - r, w - flare, w - flare, r + 2, w, h))
    return ('<svg width="%d" height="%d" viewBox="0 0 %d %d" style="position:absolute;left:0;top:0;overflow:visible" aria-hidden="true">'
            '<path d="%s" fill="%s"></path></svg>' % (w, h, w, h, d, fill))


def phone(active):
    band, panel, panel2 = THEME[active]
    W, gap, n = 412 - 24, 6, len(TABS)
    tw = (W - gap * (n - 1)) / n
    tabs = []
    for i, (key, label, ic) in enumerate(TABS):
        on = key == active
        fill = panel if on else 'rgba(255,255,255,0.07)'
        tabs.append(
            '<a style="position:relative;display:block;width:%.1fpx;height:86px;color:#FFFFFF;text-decoration:none;%s">%s'
            '<span style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;padding-top:4px">'
            '<span style="display:flex;opacity:%s">%s</span><span style="font-size:13px;line-height:16px;font-weight:%s;opacity:%s">%s</span></span></a>'
            % (tw, 'z-index:2' if on else '', tab_svg(tw, 86, on, fill), '1' if on else '.78', icon(ic, 'fill' if on else 'regular', 28 if on else 26),
               600 if on else 500, '1' if on else '.78', label))
    lbl, big, stats = HERO[active]
    stat_html = ''.join('<div style="display:flex;flex-direction:column;gap:2px;%s"><span style="font-size:12px;color:rgba(255,255,255,.72)">%s</span>'
                        '<span style="font-size:15px;font-weight:600">%s</span></div>' % ('' if i == 0 else 'padding-left:12px;border-left:1px solid rgba(255,255,255,.18)', k, v)
                        for i, (k, v) in enumerate(stats))
    lock = lockup()
    return f'''
<div class="phone"><div class="screen">
  <div style="background:{band};padding:0 12px;color:#FFFFFF">
    <div class="sb"><span>12:30</span><span>●●● ▲ ▮</span></div>
    <div style="height:52px;display:flex;align-items:center;gap:8px;padding:0 4px">{lock}<span style="flex:1"></span>
      <span style="width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center">{icon('notifications','regular',22)}</span>
      <span style="width:36px;height:36px;border-radius:50%;background:#111;box-shadow:0 0 0 2px rgba(255,255,255,.7)"></span></div>
    <div style="margin-top:10px;display:flex;gap:{gap}px;position:relative">{''.join(tabs)}</div>
  </div>
  <div style="position:relative;margin:0;padding:18px 28px 20px;border-radius:0 0 28px 28px;background:linear-gradient(180deg,{panel} 0%,{panel2} 100%);color:#FFFFFF">
    <div style="font-size:14px;color:rgba(255,255,255,.8)">{lbl}</div>
    <div style="font-size:32px;line-height:40px;font-weight:600;letter-spacing:-.02em">{big}</div>
    <div style="margin-top:14px;padding-top:12px;border-top:1px solid rgba(255,255,255,.16);display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px">{stat_html}</div>
  </div>
  <div style="padding:16px">
    <div style="height:18px;width:40%;border-radius:6px;background:#E8E6EE"></div>
    <div style="margin-top:12px;height:72px;border-radius:16px;background:#FFFFFF;box-shadow:0 1px 2px rgba(17,17,17,.05)"></div>
    <div style="margin-top:10px;height:72px;border-radius:16px;background:#FFFFFF;box-shadow:0 1px 2px rgba(17,17,17,.05)"></div>
  </div>
</div><div class="cap">{dict((k, l) for k, l, _ in TABS)[active]} selected</div></div>'''


CHOICES = [('savings', 'Earn', 'Supply USDC, SOL or stocks and earn the interest borrowers pay.', 'For lenders · No leverage · Withdraw anytime'),
           ('candlestick_chart', 'Trade', 'Long or short TSLAx, AAPLx and pre-IPO stocks, and swap any token.', 'For traders · Up to 5x'),
           ('psychiatry', 'Farm', 'Keep your stock as collateral, borrow USDC or SOL and earn on Kamino.', 'Leveraged yield · Up to 5x')]


def chooser():
    rows = ''.join(
        f'''<a style="display:flex;gap:16px;align-items:flex-start;padding:18px 4px;border-top:1px solid #ECEAF1;text-decoration:none;color:#1F1F1F">
          <span style="color:#703AE6;display:flex;padding-top:2px">{icon(ic, 'regular', 28)}</span>
          <span style="flex:1;display:flex;flex-direction:column;gap:4px"><span style="font-size:18px;line-height:24px;font-weight:600">{t}</span>
          <span style="font-size:14px;line-height:20px;color:#595959">{body}</span><span style="font-size:12px;line-height:16px;color:#8A8A96">{meta}</span></span>
          <span style="color:#8A8A96;display:flex;align-self:center">{icon('chevron_right', 'regular', 22)}</span></a>'''
        for ic, t, body, meta in CHOICES)
    mark = ('<svg width="34" height="34" viewBox="11 12 232 232"><defs><linearGradient id="g1" gradientUnits="userSpaceOnUse" x1="31.7" y1="73" x2="222.3" y2="183">'
            '<stop offset="0" stop-color="#FC5457"/><stop offset="1" stop-color="#703AE6"/></linearGradient></defs><path fill="url(#g1)" fill-rule="evenodd" d="%s"/></svg>') % MARK
    return f'''
<div class="phone"><div class="screen" style="background:#FFFFFF">
  <div class="sb" style="color:#1F1F1F;padding:0 24px"><span>12:30</span><span>●●● ▲ ▮</span></div>
  <div style="padding:40px 20px 0">{mark}
    <h1 style="margin:28px 0 0;font-size:28px;line-height:36px;font-weight:600;letter-spacing:-.01em;color:#1F1F1F">What do you want to do?</h1>
    <p style="margin:8px 0 24px;font-size:16px;line-height:24px;color:#595959">Pick one to start. Everything stays one tap away at the top.</p>
    {rows}
    <div style="border-top:1px solid #ECEAF1"></div>
    <p style="margin:18px 4px 0;font-size:14px;line-height:20px;color:#595959">New to leverage? Start with Earn. Nothing is ever liquidated there.</p>
  </div>
</div><div class="cap">Chooser, minimal (first launch only)</div></div>'''


def main():
    html = f'''<!doctype html><html><head><meta charset="utf-8"><title>Preview: Vanna top tabs</title>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600&display=swap" rel="stylesheet">
<style>
body{{margin:0;background:#EDEBF3;font-family:'Plus Jakarta Sans',system-ui,sans-serif;font-variant-numeric:tabular-nums}}
.wrap{{display:flex;gap:28px;padding:28px;align-items:flex-start}}
.phone{{display:flex;flex-direction:column;align-items:center;gap:12px}}
.screen{{width:412px;height:760px;border-radius:36px;overflow:hidden;background:#F7F7F7;box-shadow:0 0 0 9px #0B0B0D,0 30px 60px -20px rgba(47,27,97,.4)}}
.sb{{height:28px;display:flex;align-items:center;justify-content:space-between;padding:0 12px;font-size:12px;font-weight:600}}
.cap{{font-size:14px;color:#595959;font-weight:500}}
</style></head><body><div class="wrap">{phone('portfolio')}{phone('trade')}{phone('farm')}{chooser()}</div></body></html>'''
    out = os.path.join(CMP, 'previews'); os.makedirs(out, exist_ok=True)
    open(os.path.join(out, 'top-tabs.html'), 'w', encoding='utf8').write(html)
    print(os.path.join(out, 'top-tabs.html'))


if __name__ == '__main__':
    main()
