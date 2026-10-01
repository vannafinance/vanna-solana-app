"""Preview (not implemented): vibrant headers, Swiggy-style layered text tabs, gradient-pill bottom bar,
a Perps | Spot switch for Trade, and a one-screen margin-account page. 1 Oct 2026 feedback.

    python compare/tools/preview_refresh.py   -> compare/previews/refresh.html (+ renders/refresh-*.png)
"""
import json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
CMP = os.path.dirname(HERE)
sys.path.insert(0, HERE)
import material_icons as mi           # noqa: E402
import spaces                         # noqa: E402
from tx_motion import seal, CSS as TX_CSS   # noqa: E402  (the Vanna seal, same as transactions)

MARK = json.load(open(os.path.join(HERE, 'mark.json')))['d']
IMG = json.load(open(os.path.join(CMP, 'src', 'img.json'), encoding='utf8'))
TSLA, USDC, SOL = IMG['a9a1db51309a512ccf9302f8acc244d2'], IMG['022fc945e265208f7997f02a7fbdd97f'], IMG['6fe33337309fb2af41d7bb3a0961ebff']
GOOG, AAPL, OPENAI = IMG['cad380b03cb4c689f02e014100f56452'], IMG['74e439ecf30e3316195f26ae04a1689e'], IMG['68c99bf0397471dc2d806cfaa2e15d53']


def ic(name, size=22, weight='regular'):
    return ('<svg width="%d" height="%d" viewBox="0 -960 960 960" fill="currentColor" aria-hidden="true">%s</svg>'
            % (size, size, ''.join('<path d="%s"></path>' % d for d in mi.material(name, weight))))


def mark(size, gid):
    return ('<svg width="%d" height="%d" viewBox="11 12 232 232" aria-hidden="true"><defs><linearGradient id="%s" gradientUnits="userSpaceOnUse" x1="31.7" y1="73" x2="222.3" y2="183">'
            '<stop offset="0" stop-color="#FC5457"/><stop offset="1" stop-color="#703AE6"/></linearGradient></defs><path fill="url(#%s)" fill-rule="evenodd" d="%s"/></svg>' % (size, size, gid, gid, MARK))


LOCK = spaces.lockup()
WORDMARK = LOCK[LOCK.index('<svg', LOCK.index('</svg>')):LOCK.rindex('</span>')]

# vibrant space themes: band (behind status bar + tabs), unselected tab, panel (selected tab + hero), corner glow, nav pill
V = {
    'portfolio': dict(band='linear-gradient(180deg,#3E1A9E 0%,#4F22B8 100%)', tab='#6036C8', panel=('#7B3FEA', '#5A26C9'), glow='rgba(252,84,87,.55)', pill='linear-gradient(90deg,#FC5457,#8B4DF7)', ink='#703AE6'),
    'earn': dict(band='linear-gradient(180deg,#07494F 0%,#0B5F66 100%)', tab='#147179', panel=('#11838B', '#0B5F66'), glow='rgba(50,238,226,.38)', pill='linear-gradient(90deg,#2FC9C1,#11838B)', ink='#1C7C83'),
    'trade': dict(band='linear-gradient(180deg,#221D8C 0%,#2E28A8 100%)', tab='#3D37BC', panel=('#5A52F0', '#3A33C4'), glow='rgba(139,77,247,.55)', pill='linear-gradient(90deg,#8B4DF7,#4B44E0)', ink='#4B44E0'),
    'farm': dict(band='linear-gradient(180deg,#86003F 0%,#A3004F 100%)', tab='#B5165F', panel=('#E2087A', '#A3004F'), glow='rgba(252,84,87,.6)', pill='linear-gradient(90deg,#FC5457,#FF007A)', ink='#E0006B'),
}
ORDER = [('portfolio', 'Portfolio'), ('earn', 'Earn'), ('trade', 'Trade'), ('farm', 'Farm')]
CHIPS = {'earn': '1.82%', 'trade': '5x', 'farm': '5.03%'}   # optional live chip on a tab (variant), Swiggy's "22 mins"


def tab_shape(w, h, on, fill, flare=12, r=18):
    """Folder tab with slanted sides; the selected one has concave shoulders into the panel. Drawn at width w."""
    if on:
        s = 14
        d = ('M %d %d Q 0 %d %.1f %d L %d %d Q %d 0 %d 0 L %d 0 Q %d 0 %d %d L %.1f %d Q %d %d %d %d Z'
             % (-s, h + 1, h + 1, flare * .25, h + 1 - s, flare, r, flare, flare + r, w - flare - r, w - flare, w - flare, r, w - flare * .25, h + 1 - s, w, h + 1, w + s, h + 1))
    else:
        d = ('M 0 %d L %d %d Q %d 3 %d 3 L %d 3 Q %d 3 %d %d L %d %d Z'
             % (h, flare, r + 3, flare, flare + r, w - flare - r, w - flare, w - flare, r + 3, w, h))
    return ('<svg width="%d" height="%d" viewBox="0 0 %d %d" style="position:absolute;left:0;top:0;overflow:visible;%s" aria-hidden="true"><path d="%s" fill="%s"/></svg>'
            % (w, h + 1, w, h + 1, '' if on else 'filter:drop-shadow(-4px 0 6px rgba(0,0,0,.28))', d, fill))


def layered_tabs(active, chips=False, icons=False):
    """Swiggy: tabs touch and overlap; each sits a little behind the one nearer the selected tab."""
    t = V[active]
    W, n, overlap, H = 388, 4, 14, 58 if not icons else 74
    w = (W + overlap * (n - 1)) / n
    ai = [k for k, _ in ORDER].index(active)
    out = []
    for i, (key, label) in enumerate(ORDER):
        on = key == active
        z = 10 if on else 9 - abs(i - ai)
        x = i * (w - overlap)
        chip = ('<span class="tchip">%s</span>' % CHIPS[key]) if chips and key in CHIPS and not on else ''
        icon = ('<span style="display:flex;opacity:%s">%s</span>' % ('1' if on else '.8', ic(dict(portfolio='pie_chart', earn='savings', trade='candlestick_chart', farm='psychiatry')[key], 22, 'fill' if on else 'regular'))) if icons else ''
        out.append('<a class="ltab%s" style="left:%.1fpx;width:%.1fpx;height:%dpx;z-index:%d">%s<span class="lbl">%s<b>%s</b>%s</span></a>'
                   % (' on' if on else '', x, w, H, z, tab_shape(w, H, on, t['panel'][0] if on else t['tab']), icon, label, chip))
    return '<nav class="ltabs" style="height:%dpx">%s</nav>' % (H, ''.join(out))


def header(active, hero, chips=False, icons=False, gid='h'):
    t = V[active]
    return ('<div class="band" style="background:%s">' % t['band'] +
            '<div class="sb"><span>12:30</span><span>&#9679;&#9679;&#9679; &#9650; &#9646;</span></div>'
            '<div class="hdr"><span class="logo-tile">' + mark(30, gid) + '</span>' + WORDMARK.replace('width="77.2" height="18"', 'width="82" height="19"') +
            '<span style="flex:1"></span><span class="glass">' + ic('notifications', 22) + '<i class="badge">3</i></span>'
            '<span class="glass avatar"><img src="' + SOL + '" alt=""></span></div>' + layered_tabs(active, chips, icons) + '</div>'
            '<div class="panel" style="background:radial-gradient(120%% 80%% at 100%% 0%%, %s, transparent 55%%), linear-gradient(180deg,%s 0%%,%s 100%%)">%s</div>'
            % (t['glow'], t['panel'][0], t['panel'][1], hero))


def stats(items):
    return ('<div class="stats" style="grid-template-columns:repeat(%d,minmax(0,1fr))">' % len(items) +
            ''.join('<div><span>%s</span><b>%s</b></div>' % kv for kv in items) + '</div>')


HERO = {
    'portfolio': '<div class="two"><div><span class="k">Wallet balance</span><b class="big">$4,812<i>.40</i></b></div><div><span class="k">Margin account</span><b class="big">$10,592<i>.29</i></b></div></div>' + stats([('Health', '<i class="hdot"></i>1.69 · Safe'), ('Total borrowed', '$6,271.92'), ('Net earnings', '<em>+$1.37</em>')]),
    'earn': '<span class="k">Overall deposit</span><b class="big xl">$2,677<i>.87</i></b>' + stats([('Vaults', '2'), ('Earned', '<em>+$1.37</em>')]),
    'trade': '<span class="k">Net available collateral</span><b class="big xl">$4,320<i>.37</i></b>',
    'nomargin': '<span class="k">In your wallet</span><b class="big xl">$4,812<i>.40</i></b><span class="k2">ready to use as collateral</span>',
    'farm': '<span class="k">You earn</span><b class="big xl">4.38%<small> APY</small></b><span class="k2">≈ $19.36 a year, paid in USDC</span>' + stats([('Health', '<i class="hdot"></i>2.00 · Safe'), ('Liquidation', 'TSLAx below $35.36')]),
}
NAV = {'portfolio': [('Overview', 'home'), ('Lender', 'toll'), ('Trader', 'trending_up')],
       'earn': [('Vaults', 'savings'), ('Positions', 'layers'), ('History', 'history')],
       'trade': [('Markets', 'show_chart'), ('Positions', 'layers'), ('History', 'history')],
       'farm': [('Deploy', 'psychiatry'), ('Position', 'layers'), ('History', 'history')]}


def nav(space, sel=0, dark=False):
    t = V[space]
    items = []
    for i, (label, name) in enumerate(NAV[space]):
        on = i == sel
        items.append('<span class="nitem"><span class="npill" style="%s">%s</span><span class="nlbl" style="%s">%s</span></span>'
                     % ('background:%s;color:#fff;box-shadow:0 4px 12px -4px rgba(0,0,0,.35)' % t['pill'] if on else 'color:var(--text2)',
                        ic(name, 22, 'fill' if on else 'regular'), 'color:%s;font-weight:600' % ('#fff' if dark else t['ink']) if on else '', label))
    return '<nav class="bnav">' + ''.join(items) + '</nav>'


def body_rows(rows):
    return '<div class="card list">' + ''.join(
        '<div class="row"><img src="%s" alt=""><span class="grow"><b>%s</b><span>%s</span></span><span class="r"><b>%s</b><span class="%s">%s</span></span></div>' % r for r in rows) + '</div>'


PORT_BODY = ('<div class="h2">Your positions <a>See all</a></div>' + body_rows([
    (TSLA, 'TSLAx', '<span style="color:var(--link);font-weight:600">Long 3x</span>', '<span class="pos">+$152.52</span>', 's', '+10.89%'),
    (OPENAI, 'OPENAI', '<span style="color:var(--neg);font-weight:600">Short 2x</span>', '<span class="pos">+$57.71</span>', 's', '+5.77%')]))
MARKETS = body_rows([(TSLA, 'TSLAx-USDC', 'Borrow 4.77% · Liquidity $24.0K', '$353.59', 's pos', '+1.2%'),
                     (GOOG, 'GOOGLx-USDC', 'Borrow 1.25% · Liquidity $61.2K', '$339.93', 's neg', '−0.4%'),
                     (AAPL, 'AAPLx-USDC', 'Borrow 0.36% · Liquidity $45.2K', '$332.37', 's pos', '+0.6%')])


VAULTS = body_rows([(TSLA, 'TSLAx', 'Supplied $38.9K · Borrowed $14.9K', '<span class="pos">1.82%</span>', 's', 'APY'),
                    (GOOG, 'GOOGLx', 'Supplied $68.0K · Borrowed $6.8K', '<span class="pos">0.13%</span>', 's', 'APY'),
                    (SOL, 'SOL', 'Supplied $36.8K · Borrowed $3.4K', '<span class="pos">0.11%</span>', 's', 'APY')])


def phone(inner, cap, dark=False, extra=''):
    return ('<figure class="ph"><div class="screen%s">%s</div><figcaption>%s</figcaption></figure>' % (' dk' if dark else '', inner + extra, cap))


def screen(space, body, sel=0, chips=False, icons=False, dark=False, gid=None):
    return ('<div class="scroll">' + header(space, HERO[space], chips, icons, gid or ('g' + space + str(chips) + str(icons) + str(dark))) +
            '<div class="body">' + body + '</div></div>' + nav(space, sel, dark))


def segmented(options, sel):
    return '<div class="seg">' + ''.join('<span class="%s">%s</span>' % ('on' if i == sel else '', o) for i, o in enumerate(options)) + '</div>'


SWAP_CARD = ('<div class="card" style="padding:14px 16px"><div class="kv0"><span>You pay</span><span>Balance 3,120.40</span></div>'
             '<div class="amt"><b>250.00</b><span class="tok"><img src="' + USDC + '">USDC</span></div>'
             '<div class="flip">' + ic('swap_vert', 20) + '</div>'
             '<div class="kv0"><span>You receive</span><span>Balance 1.25</span></div><div class="amt"><b>0.707</b><span class="tok"><img src="' + TSLA + '">TSLAx</span></div></div>'
             '<div class="cta" style="background:' + V['trade']['pill'] + '">Swap · approve in wallet</div>')


def margin_full():
    slot = ('<div class="slot" id="mgSlot"><div class="slot-card" id="mgCard">' + mark(30, 'gm') + '<span>Margin account</span><i></i><i style="width:40%"></i>'
            '<span class="mgseal" id="mgSeal"></span></div></div>')
    return ('<div class="mg">' + slot +
            '<h3 id="mgH">Oh no, you don’t have a margin account yet</h3>'
            '<p id="mgP">It holds the collateral behind your trades. Create it once, then trade Perps and Farm from it.</p>'
            '<div class="facts" id="mgF"><span>' + ic('bolt', 16) + 'Up to 5x</span><span>' + ic('swap_horiz', 16) + 'Perps + Farm</span><span>' + ic('lock_open', 16) + 'Withdraw anytime</span></div>'
            '<div class="cta" id="mgCta" style="background:' + V['trade']['pill'] + '">Create margin account</div>'
            '<div class="sub" id="mgSub">One approval in your wallet</div></div>')


def margin_sheet():
    return ('<div class="veil"></div><div class="sheet"><div class="grab"></div>'
            '<div style="display:flex;gap:14px;align-items:center"><div class="slot sm"><div class="slot-card">' + mark(22, 'gm2') + '</div></div>'
            '<div><h3 style="margin:0;font-size:20px;line-height:26px;text-align:left">One step before your first trade</h3>'
            '<p style="margin:4px 0 0;text-align:left">Your Long 3x TSLAx needs a margin account. You create it once.</p></div></div>'
            '<div class="facts" style="justify-content:flex-start;margin-top:16px"><span>' + ic('bolt', 16) + 'Up to 5x</span><span>' + ic('swap_horiz', 16) + 'Perps + Farm</span><span>' + ic('lock_open', 16) + 'Withdraw anytime</span></div>'
            '<div class="cta" style="background:' + V['trade']['pill'] + ';margin-top:18px">Create account and continue</div>'
            '<div class="sub" style="margin-top:10px">Not now</div></div>')


ORDER_BODY = ('<div class="card list"><div class="row"><img src="' + TSLA + '"><span class="grow"><b>TSLAx-USDC</b><span>Long 3x · $1,500.00</span></span></div></div>'
              '<div class="card list"><div class="kvr"><span>Collateral</span><b>500 USDC</b></div><div class="kvr"><span>Entry price</span><b>$353.59</b></div><div class="kvr"><span>Liquidation</span><b>$250.20</b></div></div>')

CSS = r'''
.slot{transition:border-color 300ms,background 300ms}.slot.done{border-style:solid;border-color:#5A52F0;background:rgba(90,82,240,.07)}
.slot-card{transition:transform 560ms cubic-bezier(.34,1.4,.64,1),opacity 220ms}.slot-card.in{opacity:1!important;transform:none!important;animation:none!important}
.mgseal{position:absolute;right:-14px;top:-14px;width:44px;height:44px}.slot-card{position:relative}
.mgfade{transition:opacity 180ms,transform 220ms}.mgfade.off{opacity:0;transform:translateY(6px)}
.cta.wait{background:#EDEBFD!important;color:#3A33C4;box-shadow:none}
.vn-loader2{width:16px;height:16px;background:currentColor;display:inline-block;margin-right:8px;animation:vnShapes 1100ms cubic-bezier(.2,0,0,1) infinite}

:root{--page:#F7F7F7;--card:#FFFFFF;--text:#1F1F1F;--text2:#595959;--line:#F1EFF5;--bd:#E5E7EB;--pos:#1C7C83;--neg:#B33C3E;--link:#703AE6;--bg:#EDEBF3}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font-family:'Plus Jakarta Sans',system-ui,sans-serif;font-variant-numeric:tabular-nums}
.top{padding:24px 28px 0;max-width:1500px}.top h1{margin:0;font-size:24px;font-weight:600}.top p{margin:6px 0 0;font-size:14px;line-height:20px;color:var(--text2);max-width:1000px}
section{padding:6px 28px 26px}section h2{margin:20px 0 4px;font-size:19px;font-weight:600}section>p{margin:0 0 14px;font-size:13.5px;line-height:20px;color:var(--text2);max-width:1040px}
.row-wrap{display:flex;gap:26px;flex-wrap:wrap;align-items:flex-start}
.ph{margin:0;width:412px;display:flex;flex-direction:column;gap:10px}figcaption{font-size:13px;line-height:19px;color:var(--text2)}figcaption b{color:var(--text)}
.screen{position:relative;height:860px;border-radius:36px;overflow:hidden;background:var(--page);box-shadow:0 0 0 9px #0B0B0D,0 30px 60px -20px rgba(47,27,97,.4)}
.screen.short{height:520px}
.screen.dk{--page:#111111;--card:#1E1E1E;--text:#FFFFFF;--text2:#BFBFBF;--line:#2C2C2C;--bd:#2C2C2C;--pos:#32EEE2;--neg:#FC5457;--link:#BDA4F4;color:var(--text)}
.scroll{position:absolute;inset:0 0 80px 0;overflow:hidden}
.band{padding:0 12px;color:#fff}.sb{height:30px;display:flex;align-items:center;justify-content:space-between;padding:0 8px;font-size:12px;font-weight:600}
.hdr{height:54px;display:flex;align-items:center;gap:10px;padding:0 4px}
.logo-tile{display:flex;align-items:center;justify-content:center}
.glass{position:relative;width:40px;height:40px;border-radius:50%;background:rgba(255,255,255,.18);box-shadow:inset 0 0 0 1px rgba(255,255,255,.22);display:flex;align-items:center;justify-content:center;color:#fff}
.glass .badge{position:absolute;top:2px;right:2px;min-width:16px;height:16px;border-radius:8px;background:#FF007A;color:#fff;font-style:normal;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 2px rgba(255,255,255,.9)}
.glass.avatar img{width:32px;height:32px;border-radius:50%}
.ltabs{position:relative;margin-top:8px}
.ltab{position:absolute;top:0;color:#fff;text-decoration:none}
.ltab .lbl{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;padding-top:4px;font-size:15px;line-height:18px}
.ltab .lbl b{font-weight:500;opacity:.78}.ltab.on .lbl b{font-weight:700;opacity:1;font-size:16px}
.tchip{height:18px;padding:0 6px;border-radius:6px;background:rgba(255,255,255,.2);font-size:11px;font-weight:700;display:flex;align-items:center}
.panel{padding:18px 16px 20px;border-radius:0 0 28px 28px;color:#fff}
.k{display:block;font-size:14px;color:rgba(255,255,255,.82)}.k2{display:block;font-size:14px;color:rgba(255,255,255,.88);margin-top:2px}
.big{display:block;font-size:28px;line-height:36px;font-weight:600;letter-spacing:-.02em}.big i{font-style:normal;opacity:.6}.big.xl{font-size:36px;line-height:44px}.big small{font-size:18px;opacity:.8}
.two{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.stats{margin-top:14px;padding-top:12px;border-top:1px solid rgba(255,255,255,.2);display:grid;gap:12px}
.stats div{display:flex;flex-direction:column;gap:2px}.stats div+div{padding-left:12px;border-left:1px solid rgba(255,255,255,.22)}
.stats span{font-size:12px;color:rgba(255,255,255,.78)}.stats b{font-size:15px;font-weight:600;display:flex;align-items:center;gap:6px}.stats em{font-style:normal;color:#9FFFF6}
.hdot{width:8px;height:8px;border-radius:50%;background:#32EEE2;display:inline-block}
.body{padding:16px;display:flex;flex-direction:column;gap:12px}
.h2{display:flex;justify-content:space-between;align-items:baseline;font-size:19px;font-weight:600}.h2 a{font-size:14px;color:var(--link)}
.card{border-radius:16px;background:var(--card);box-shadow:0 1px 2px rgba(17,17,17,.04),0 8px 24px rgba(17,17,17,.05)}.card.list{padding:4px 16px}
.row{min-height:64px;display:flex;align-items:center;gap:12px}.row+.row{border-top:1px solid var(--line)}.row img{width:36px;height:36px;border-radius:50%}
.grow{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}.grow b,.r b{font-size:15px;font-weight:600}.grow span,.r span{font-size:12px;color:var(--text2)}
.r{display:flex;flex-direction:column;align-items:flex-end}.pos{color:var(--pos)!important}.neg{color:var(--neg)!important}
.kvr{min-height:44px;display:flex;justify-content:space-between;align-items:center;font-size:14px}.kvr+.kvr{border-top:1px solid var(--line)}.kvr span{color:var(--text2)}
.bnav{position:absolute;left:0;right:0;bottom:0;height:80px;padding:10px 8px 14px;background:var(--card);display:flex;box-shadow:0 -1px 0 var(--line)}
.nitem{flex:1;display:flex;flex-direction:column;align-items:center;gap:4px}.npill{width:60px;height:32px;border-radius:16px;display:flex;align-items:center;justify-content:center}
.nlbl{font-size:12px;color:var(--text2)}
.seg{display:flex;padding:4px;border-radius:999px;background:var(--card);box-shadow:inset 0 0 0 1px var(--bd);width:max-content}
.seg span{height:36px;padding:0 20px;border-radius:999px;display:flex;align-items:center;font-size:14px;font-weight:600;color:var(--text2)}
.seg span.on{background:var(--text);color:var(--page)}
.kv0{display:flex;justify-content:space-between;font-size:12px;color:var(--text2)}
.amt{display:flex;justify-content:space-between;align-items:center;margin:6px 0 10px}.amt b{font-size:28px;font-weight:600}
.tok{height:40px;padding:0 12px 0 6px;border-radius:20px;background:var(--page);display:flex;align-items:center;gap:8px;font-weight:600}.tok img{width:28px;height:28px;border-radius:50%}
.flip{width:36px;height:36px;margin:-4px auto 6px;border-radius:50%;background:var(--page);display:flex;align-items:center;justify-content:center;color:var(--link)}
.cta{height:52px;border-radius:26px;color:#fff;font-size:16px;font-weight:600;display:flex;align-items:center;justify-content:center;box-shadow:0 10px 24px -10px rgba(75,68,224,.7)}
.mg{padding:8px 8px 0;text-align:center;display:flex;flex-direction:column;align-items:center}
.mg h3{margin:18px 0 0;font-size:22px;line-height:28px;font-weight:600}.mg p,.sheet p{margin:8px 0 0;font-size:14px;line-height:20px;color:var(--text2)}
.mg .cta{width:100%;margin-top:22px}.sub{margin-top:12px;font-size:12px;color:var(--text2);text-align:center}
.facts{display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin-top:16px}
.facts span{height:30px;padding:0 10px;border-radius:15px;background:var(--card);box-shadow:inset 0 0 0 1px var(--bd);display:inline-flex;align-items:center;gap:6px;font-size:12.5px;font-weight:600;color:var(--text)}
.facts span svg{color:#4B44E0}
.slot{width:230px;height:132px;border-radius:22px;border:2px dashed #B9B4F2;background:repeating-linear-gradient(135deg,rgba(90,82,240,.05) 0 10px,transparent 10px 20px);display:flex;align-items:center;justify-content:center;position:relative}
.slot-card{width:180px;height:100px;border-radius:16px;background:linear-gradient(135deg,#FFFFFF,#F1EBFD);box-shadow:0 14px 30px -14px rgba(75,68,224,.6);padding:12px;display:flex;flex-direction:column;gap:7px;opacity:.55;transform:rotate(-6deg) translateY(-6px);animation:float 3.2s ease-in-out infinite}
.slot-card span{font-size:12px;font-weight:600;color:#3A33C4;text-align:left}.slot-card i{height:7px;border-radius:4px;background:#DCD6FA;width:70%}
.slot.sm{width:76px;height:76px;border-radius:18px}.slot.sm .slot-card{width:52px;height:52px;padding:0;align-items:center;justify-content:center;border-radius:14px}
@keyframes float{0%,100%{transform:rotate(-6deg) translateY(-6px)}50%{transform:rotate(-4deg) translateY(-11px)}}
.veil{position:absolute;inset:0;background:rgba(10,8,18,.45)}.sheet{position:absolute;left:0;right:0;bottom:0;border-radius:28px 28px 0 0;background:var(--card);padding:10px 20px 26px}
.grab{width:32px;height:4px;border-radius:2px;background:var(--bd);margin:0 auto 18px}
.note{max-width:1040px;background:#fff;border-radius:16px;padding:14px 18px;font-size:13.5px;line-height:20px;color:var(--text2);margin-bottom:14px}.note b{color:var(--text)}
'''


JS = r'''<script>
(function () {
  var SEAL = __SEAL__;
  function $(i) { return document.getElementById(i); }
  function swap(el, html) { el.classList.add('mgfade', 'off'); setTimeout(function () { el.innerHTML = html; el.classList.remove('off'); }, 180); }
  function run() {
    var H = $('mgH'), P = $('mgP'), F = $('mgF'), C = $('mgCta'), S = $('mgSub');
    if (!H) return;
    H.innerHTML = 'Oh no, you don’t have a margin account yet'; P.innerHTML = 'It holds the collateral behind your trades. Create it once, then trade Perps and Farm from it.';
    F.style.opacity = 1; C.className = 'cta'; C.innerHTML = 'Create margin account'; S.style.opacity = 1;
    $('mgSlot').classList.remove('done'); $('mgCard').classList.remove('in'); $('mgSeal').innerHTML = '';
    setTimeout(function () { C.style.transform = 'scale(.97)'; setTimeout(function () { C.style.transform = ''; }, 140); }, 1100);
    setTimeout(function () { C.classList.add('wait'); C.innerHTML = '<span class="vn-loader2"></span>Waiting for Phantom'; }, 1250);
    setTimeout(function () { $('mgSlot').classList.add('done'); $('mgCard').classList.add('in'); }, 3300);
    setTimeout(function () { $('mgSeal').innerHTML = SEAL; }, 3750);
    setTimeout(function () { swap(H, 'You’re all set'); swap(P, 'Margin account 3pLm…Uw2c is ready. Your trades and farms use it from now on.'); F.style.opacity = 0; S.style.opacity = 0;
      C.classList.remove('wait'); C.innerHTML = 'Start trading'; }, 4100);
  }
  run(); setInterval(run, 8200);
})();
</script>'''


def main():
    sec1 = ''.join([
        phone(screen('portfolio', PORT_BODY), '<b>Portfolio.</b> The coral→violet energy of Current is back: a bright gradient with a soft coral glow in the corner. Tabs are text only; the selected one is the panel colour, the others sit behind it in a slightly lighter band colour, each one tucked behind its neighbour like Swiggy.'),
        phone(screen('trade', MARKETS, sel=0), '<b>Trade.</b> Indigo-violet instead of the dark navy. The logo keeps its own gradient, with no tile behind it; the bell and the avatar sit in glass circles like Current.'),
        phone(screen('earn', '<div class="h2">Vaults</div>' + VAULTS, sel=0), '<b>Earn.</b> A brighter teal. All white text still reads at 4.5:1 or better.'),
        phone(screen('farm', '<div class="card" style="height:150px"></div><div class="card" style="height:150px"></div>', sel=0), '<b>Farm.</b> Hot pink to magenta, closer to Current\'s Farm.'),
    ])
    sec1b = ''.join([
        phone(screen('trade', MARKETS, chips=True), '<b>Variant: text + a live chip.</b> Like Swiggy\'s "22 mins" badge: each other space shows one live number (Earn 1.82% best APY, Trade 5x, Farm 5.03%). Optional; it must never repeat a number already on the screen.'),
        phone(screen('trade', MARKETS, icons=True), '<b>Variant: small icons kept.</b> Same layered tabs with today\'s icons, for comparison. Text only is calmer and closer to Swiggy.'),
        phone(screen('portfolio', PORT_BODY, dark=True, gid='gdk'), '<b>Dark mode.</b> The headers stay vibrant (they are brand surfaces, like Current); only the page below goes dark. The bottom bar pill keeps its gradient.', dark=True),
    ])
    navs = ''.join('<div style="width:412px"><div class="screen short" style="height:auto;border-radius:20px;position:relative;height:84px">' + nav(s, 0) + '</div><div style="height:10px"></div>'
                   '<div class="screen short dk" style="height:84px;border-radius:20px;position:relative">' + nav(s, 1, True) + '</div></div>' for s, _ in ORDER)
    seg_a = ('<div class="scroll">' + header('trade', HERO['trade']) + '<div class="body">' + segmented(['Perps', 'Spot'], 0) + MARKETS + '</div></div>' + nav('trade'))
    seg_b = ('<div class="scroll">' + header('trade', HERO['trade'], gid='gsb') + '<div class="body">' + segmented(['Perps', 'Spot'], 1) + SWAP_CARD + '</div></div>' + nav('trade'))
    mfull = ('<div class="scroll">' + header('trade', HERO['nomargin'], gid='gmf') + '<div class="body">' + margin_full() + '</div></div>' + nav('trade'))
    msheet = ('<div class="scroll">' + header('trade', HERO['trade'], gid='gms') + '<div class="body">' + ORDER_BODY + '</div></div>' + nav('trade')) + margin_sheet()
    page = ('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Vanna refresh preview</title>'
            '<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet"><style>' + CSS + TX_CSS + '</style></head><body>'
            '<div class="top"><h1>Refresh: vibrant headers, layered tabs, gradient nav, Trade switch, margin account</h1>'
            '<p>Previews only, nothing is built. Same Vanna palette (violet #703AE6, coral #FC5457, pink #FF007A, teal) but brighter, like Current; tabs taken further towards Swiggy; every number appears once per screen.</p></div>'
            '<section id="s1"><h2>1 · Vibrant headers with Swiggy-style layered tabs (text only)</h2><p>Today the bands are near-black navy and the panels dim. Here each space gets a vivid gradient; the selected tab is the panel colour and flows into it, the other tabs are a lighter shade of the band and overlap like Swiggy\'s, each slightly behind the one nearer the selection. Icons are gone: the label is the tab.</p><div class="row-wrap">' + sec1 + '</div></section>'
            '<section id="s1b"><h2>1b · Variants</h2><div class="row-wrap">' + sec1b + '</div></section>'
            '<section id="s2"><h2>2 · Bottom bar: a gradient pill, in each space\'s colours</h2><p>Like Current\'s "Lender" pill: the selected item sits on a short gradient pill (white icon), the label takes the space\'s colour. Light above, dark below.</p><div class="row-wrap">' + navs + '</div></section>'
            '<section id="s3"><h2>3 · A Perps | Spot switch for Trade (owner\'s idea, like Lending | Spot)</h2>'
            '<div class="note"><b>What this is.</b> On the web app\'s Portfolio, Lender has a <b>Lending | Spot</b> switch that changes what the page shows. The same idea for Trade: one switch at the top of Trade between <b>Perps</b> (leveraged markets) and <b>Spot</b> (swap any token). It is the standard pattern in trading apps: Binance and Bybit put <b>Spot | Futures</b> (or Derivatives) at the top of the trade screen, Coinbase Advanced has <b>Spot | Futures</b>, Hyperliquid has <b>Perps | Spot</b> (from my knowledge of these apps, not fresh research). '
            '<b>What changes:</b> Swap leaves the bottom bar, which becomes Markets · Positions · History; Spot shows the swap form in place; History already has Perps | Swaps, so the two match. <b>What to watch:</b> one switch per screen; positions stay Perps only (spot holdings are your assets on Portfolio).</div>'
            '<div class="row-wrap">' + phone(seg_a, '<b>Perps selected:</b> the market list, as today.') + phone(seg_b, '<b>Spot selected:</b> the swap form appears in place, with Trade\'s gradient on the button instead of a flat fill.') + '</div></section>'
            '<section id="s4"><h2>4 · Margin account: one screen, no scroll, a bit of feeling</h2><p>Today it is a long scrolling page with a band, a card, a list of benefits and a snackbar saying the same thing. Here it fits on one screen: an empty account slot (the account card floats above it, waiting), one honest line, three facts as chips, one button.</p>'
            '<div class="row-wrap">' + phone(mfull, '<b>A · Full screen (recommended when someone opens Trade the first time).</b> "Oh no, you don\'t have a margin account yet", then why it matters in one line. When created, the card drops into the slot and gets the Vanna seal (same motion as transactions), then it continues.') +
            phone(msheet, '<b>B · In context (when they tap Long / Short first).</b> A short sheet over the order: "One step before your first trade". "Create account and continue" opens the wallet once and goes straight back to the order.') + '</div></section>'
            + JS.replace('__SEAL__', json.dumps(seal(44))) + '</body></html>')
    out = os.path.join(CMP, 'previews', 'refresh.html')
    open(out, 'w', encoding='utf8').write(page)
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
        b = p.chromium.launch(); pg = b.new_page(viewport={'width': 1880, 'height': 1000})
        pg.goto('file:///' + out.replace('\\', '/'), wait_until='networkidle'); pg.wait_for_timeout(900)
        for sid in ('s1', 's1b', 's2', 's3', 's4'):
            pg.locator('#' + sid).screenshot(path=os.path.join(CMP, 'renders', 'refresh-%s.png' % sid))
        b.close()
    print(out)


if __name__ == '__main__':
    main()
