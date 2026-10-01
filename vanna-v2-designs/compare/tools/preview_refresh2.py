"""Preview v2 (not implemented): the vibrant corner glow of Portfolio's panel in every space, calmer spacing, tighter layered tabs
(text only vs with icons), and sleeker Portfolio panel layouts. 1 Oct 2026 feedback on preview_refresh.py.

    python compare/tools/preview_refresh2.py [--video]   -> compare/previews/refresh2.html (+ renders/refresh2-*.png, refresh2-rays.mp4)
"""
import os, subprocess, sys, tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
CMP = os.path.dirname(HERE)
sys.path.insert(0, HERE)
from preview_refresh import (V, ic, mark, WORDMARK, HERO, nav, PORT_BODY, MARKETS, VAULTS, SOL, CSS, stats, ORDER)  # noqa: E402

RAYS = {'portfolio': ('', 'rgba(196,160,255,.75)'), 'earn': ('', 'rgba(110,236,226,.6)'),   # own-colour glow: light violet,
        'trade': ('', 'rgba(130,170,255,.8)'), 'farm': ('', 'rgba(255,120,190,.72)')}               # aqua, light blue, light pink
ICON = dict(portfolio='pie_chart', earn='savings', trade='candlestick_chart', farm='psychiatry')


def tab2(w, h, on, fill, flare=10, r=16):
    if on:
        s = 14
        d = ('M %d %d Q 0 %d %.1f %d L %d %d Q %d 0 %d 0 L %d 0 Q %d 0 %d %d L %.1f %d Q %d %d %d %d Z'
             % (-s, h + 1, h + 1, flare * .25, h + 1 - s, flare, r, flare, flare + r, w - flare - r, w - flare, w - flare, r, w - flare * .25, h + 1 - s, w, h + 1, w + s, h + 1))
        extra = ''
    else:
        d = ('M 0 %d L %d %d Q %d 2 %d 2 L %d 2 Q %d 2 %d %d L %d %d Z' % (h, flare, r + 2, flare, flare + r, w - flare - r, w - flare, w - flare, r + 2, w, h))
        top = 'M %d %d Q %d 2.5 %d 2.5 L %d 2.5 Q %d 2.5 %d %d' % (flare, r + 2, flare, flare + r, w - flare - r, w - flare, w - flare, r + 2)
        extra = '<path d="%s" fill="none" stroke="rgba(255,255,255,.18)" stroke-width="1"/>' % top
    return ('<svg width="%d" height="%d" viewBox="0 0 %d %d" style="position:absolute;left:0;top:0;overflow:visible;%s" aria-hidden="true"><path d="%s" fill="%s"/>%s</svg>'
            % (w, h + 1, w, h + 1, '' if on else 'filter:drop-shadow(-3px 0 5px rgba(0,0,0,.22))', d, fill, extra))


def tabs2(active, icons=False):
    t = V[active]
    W, n, overlap = 388, 4, 20
    H = 72 if icons else 52
    w = (W + overlap * (n - 1)) / n
    ai = [k for k, _ in ORDER].index(active)
    out = []
    for i, (key, label) in enumerate(ORDER):
        on = key == active
        icon = ('<span class="tico%s">%s</span>' % (' on' if on else '', ic(ICON[key], 18, 'fill' if on else 'regular'))) if icons else ''
        out.append('<a class="ltab%s" style="left:%.1fpx;width:%.1fpx;height:%dpx;z-index:%d">%s<span class="lbl">%s<b>%s</b></span></a>'
                   % (' on' if on else '', i * (w - overlap), w, H, 10 if on else 9 - abs(i - ai), tab2(w, H, on, t['panel'][0] if on else t['tab']), icon, label))
    return '<nav class="ltabs" style="height:%dpx;margin-top:18px">%s</nav>' % (H, ''.join(out))


def header2(active, hero, icons=False, gid='x', logo='tile'):
    t = V[active]
    ray, glow = RAYS[active]
    return ('<div class="hd2" style="--ray:%s">' % ray +
            '<div class="band" style="background:%s">' % t['band'] +
            '<div class="sb"><span>12:30</span><span>&#9679;&#9679;&#9679; &#9650; &#9646;</span></div>'
            '<div class="hdr" style="height:58px">' + ('<span class="logo-tile"><img src="' + FAVICON + '" alt="Vanna"></span>') + WORDMARK.replace('width="77.2" height="18"', 'width="82" height="19"') +
            '<span style="flex:1"></span><span class="bell">' + ic('notifications', 24) + '<i class="badge">3</i></span>'
            '<span class="glass avatar"><img src="' + SOL + '" alt=""></span></div>' + tabs2(active, icons) + '</div>'
            '<div class="panel" style="background:radial-gradient(110%% 90%% at 100%% 0%%, %s, transparent 60%%), linear-gradient(180deg,%s 0%%,%s 100%%)">%s</div>'
            % (glow, t['panel'][0], t['panel'][1], hero) +
            '</div>')


def screen2(space, body, hero=None, icons=False, gid=None, logo='tile', dark=False):
    return ('<div class="scroll">' + header2(space, hero or HERO[space], icons, gid or ('r' + space + str(icons) + logo), logo) +
            '<div class="body">' + body + '</div></div>' + nav(space, 0))


PANEL_A = ('<div class="lrow"><span class="k">Total value</span><span class="hchip"><i class="hdot"></i>1.69 · Safe</span></div>'
           '<b class="big xl">$9,132<i>.77</i></b><span class="k2"><em class="earn">+$1.37</em> earned so far</span>'
           + stats([('Wallet', '$4,812.40'), ('Margin account', '$10,592.29'), ('Borrowed', '$6,271.92')]))
PANEL_B = ('<div class="pair"><div><span class="k">Wallet balance</span><b class="big">$4,812<i>.40</i></b></div><span class="vr"></span>'
           '<div><span class="k">Margin account</span><b class="big">$10,592<i>.29</i></b></div></div>'
           '<div class="chips"><span class="gchip"><i class="hdot"></i>Health 1.69 · Safe</span><span class="gchip">Borrowed $6,271.92</span><span class="gchip"><em class="earn">+$1.37</em> earned</span></div>')

CSS2 = r'''
.hd2{position:relative;overflow:hidden;border-radius:0 0 28px 28px;isolation:isolate}
.hd2 .panel{border-radius:0}
.hd2 .hdr{position:relative;z-index:21}
.bell{position:relative;width:40px;height:40px;display:flex;align-items:center;justify-content:center;color:#fff}
.bell .badge{position:absolute;top:4px;right:4px;min-width:16px;height:16px;border-radius:8px;background:#FF007A;color:#fff;font-style:normal;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 2px rgba(255,255,255,.85)}
.hd2 .logo-tile img{width:30px;height:30px;display:block}
.rays{position:absolute;inset:-10% -10% 0 0;z-index:20;pointer-events:none;mix-blend-mode:screen;opacity:.55;transform-origin:100% 0;
  background:conic-gradient(from 198deg at 100% 0%, transparent 0deg, var(--ray) 5deg, transparent 11deg, transparent 19deg, var(--ray) 23deg, transparent 28deg,
    transparent 37deg, var(--ray) 40deg, transparent 45deg, transparent 56deg, var(--ray) 58deg, transparent 62deg, transparent 360deg);
  -webkit-mask:radial-gradient(120% 95% at 100% 0%, #000 0%, rgba(0,0,0,.55) 38%, transparent 72%);mask:radial-gradient(120% 95% at 100% 0%, #000 0%, rgba(0,0,0,.55) 38%, transparent 72%);
  filter:blur(5px);animation:sway 9s ease-in-out infinite}
@keyframes sway{0%,100%{transform:rotate(0deg);opacity:.5}50%{transform:rotate(3deg);opacity:.62}}
.glowdot{position:absolute;right:-60px;top:-60px;width:220px;height:220px;z-index:19;pointer-events:none;mix-blend-mode:screen;opacity:.75}
.tico{width:30px;height:30px;border-radius:10px;background:rgba(255,255,255,.14);display:flex;align-items:center;justify-content:center}
.tico.on{background:rgba(255,255,255,.24);box-shadow:inset 0 0 0 1px rgba(255,255,255,.3)}
.lrow{display:flex;justify-content:space-between;align-items:center}
.hchip,.gchip{height:28px;padding:0 10px;border-radius:14px;background:rgba(255,255,255,.16);box-shadow:inset 0 0 0 1px rgba(255,255,255,.2);display:inline-flex;align-items:center;gap:6px;font-size:12.5px;font-weight:600;white-space:nowrap}
.earn{font-style:normal;color:#9FFFF6;font-weight:600}
.pair{display:flex;align-items:stretch;gap:16px}.pair>div{flex:1}.vr{width:1px;background:rgba(255,255,255,.25)}
.chips{margin-top:16px;display:flex;gap:8px;flex-wrap:wrap}
'''


FAVICON = 'data:image/png;base64,' + __import__('base64').b64encode(open(os.path.join(os.path.dirname(CMP), 'assets', 'vanna-favicon-256.png'), 'rb').read()).decode()   # the user's logo, as given


WHITE_MARK = ('<svg width="32" height="32" viewBox="11 12 232 232" aria-hidden="true" style="flex-shrink:0"><path fill="#FFFFFF" fill-rule="evenodd" d="%s"/></svg>'
              % __import__('json').load(open(os.path.join(HERE, 'mark.json')))['d'])


def ph(inner, cap, dark=False):
    return '<figure class="ph"><div class="screen' + (' dk' if dark else '') + '">' + inner + '</div><figcaption>' + cap + '</figcaption></figure>'


def main():
    s1 = ''.join([
        ph(screen2('portfolio', PORT_BODY), '<b>Portfolio:</b> a lighter violet glow on the violet header.'),
        ph(screen2('trade', MARKETS), '<b>Trade:</b> a light blue glow on the blue header.'),
        ph(screen2('earn', '<div class="h2">Vaults</div>' + VAULTS), '<b>Earn:</b> a light aqua glow on teal.'),
        ph(screen2('farm', '<div class="card" style="height:140px"></div><div class="card" style="height:140px"></div>'), '<b>Farm:</b> a light pink glow on magenta.'),
    ])
    s2 = ''.join([
        ph(screen2('portfolio', PORT_BODY, icons=True), '<b>With icons:</b> each tab gets its icon in a soft glass square above the label (Swiggy has pictures there).'),
        ph(screen2('trade', MARKETS, icons=True), '<b>Trade with icons.</b>'),
        ph(screen2('farm', '<div class="card" style="height:140px"></div><div class="card" style="height:140px"></div>', icons=True), '<b>Farm with icons.</b>'),
    ])
    s3 = ''.join([
        ph(screen2('portfolio', PORT_BODY, gid='pt'), '<b>Today\'s panel:</b> two big numbers side by side, which leaves a gap in the middle and two "headlines" competing.'),
        ph(screen2('portfolio', PORT_BODY, hero=PANEL_A, gid='pa'), '<b>A · One headline (recommended):</b> Total value $9,132.77 (wallet + margin account − borrowed), health as a chip next to it, the breakdown underneath. One number to read, nothing repeated.'),
        ph(screen2('portfolio', PORT_BODY, hero=PANEL_B, gid='pb'), '<b>B · Two numbers, joined:</b> the same two balances with a thin divider, and the rest as glass chips instead of a stats row.'),
    ])
    s4 = ''.join([
        ph(screen2('portfolio', PORT_BODY, gid='lg1'), '<b>Light mode.</b> Your logo exactly as given (favicon), no tile, no glow.'),
        ph(screen2('portfolio', PORT_BODY, gid='lg2'), '<b>Dark mode.</b> Identical: the header is a brand surface.', dark=True),
        ph(screen2('trade', MARKETS, gid='lg3'), '<b>On Trade.</b>'),
        ph(screen2('farm', '<div class="card" style="height:140px"></div>', gid='lg4'), '<b>On Farm.</b>'),
    ])
    page = ('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Vanna refresh v2</title>'
            '<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet"><style>' + CSS + CSS2 + '</style></head><body>'
            '<div class="top"><h1>Refresh v2: vibrant glow in every space, calmer spacing, tighter tabs</h1><p>Previews only. Every space gets a rich glow on the right side in a lighter shade of its own colour (violet on violet, blue on blue). The tabs sit lower to give the top some air, overlap more (no gaps between them) and get a soft highlight edge. Colours are placeholders until the brand gradients arrive.</p></div>'
            '<section id="r1"><h2>1 · Portfolio\'s vibrant glow in every space (text-only tabs)</h2><div class="row-wrap">' + s1 + '</div></section>'
            '<section id="r2"><h2>2 · The same tabs with icons</h2><div class="row-wrap">' + s2 + '</div></section>'
            '<section id="r3"><h2>3 · Portfolio panel: closing the gap</h2><div class="row-wrap">' + s3 + '</div></section>'
            '<section id="r4"><h2>4 · Logo: original gradient, no tile, same in light and dark</h2><div class="row-wrap">' + s4 + '</div></section></body></html>')
    out = os.path.join(CMP, 'previews', 'refresh2.html')
    open(out, 'w', encoding='utf8').write(page)
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
        b = p.chromium.launch(); pg = b.new_page(viewport={'width': 1880, 'height': 1000})
        pg.goto('file:///' + out.replace('\\', '/'), wait_until='networkidle'); pg.wait_for_timeout(900)
        pg.evaluate("document.querySelectorAll('.rays').forEach(r => r.style.animationPlayState = 'paused')")
        for sid in ('r1', 'r2', 'r3', 'r4'):
            pg.locator('#' + sid).screenshot(path=os.path.join(CMP, 'renders', 'refresh2-%s.png' % sid))
        b.close()
        if '--video' in sys.argv:
            with tempfile.TemporaryDirectory() as tmp:
                b = p.chromium.launch()
                ctx = b.new_context(viewport={'width': 1760, 'height': 560}, record_video_dir=tmp, record_video_size={'width': 1760, 'height': 560})
                pg = ctx.new_page(); pg.goto('file:///' + out.replace('\\', '/'), wait_until='networkidle')
                pg.evaluate("""() => { document.querySelector('.top').style.display = 'none'; document.querySelectorAll('section').forEach(s => s.style.display = s.id === 'r1' ? '' : 'none');
                    document.querySelectorAll('#r1 h2, figcaption').forEach(e => e.style.display = 'none'); }""")
                pg.wait_for_timeout(9500); webm = pg.video.path(); ctx.close(); b.close()
                mp4 = os.path.join(CMP, 'renders', 'refresh2-rays.mp4')
                subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-ss', '0.5', '-i', webm, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', mp4], check=True)
                print(mp4)
    print(out)


if __name__ == '__main__':
    main()
