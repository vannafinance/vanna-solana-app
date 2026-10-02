"""Preview (not implemented), 2 Oct 2026:
1. The first-time "What do you want to do?" page in four looks (two white, two in Vanna colour), same words.
2. Margin account without agreements. Vanna's docs: "The first margin action creates MarginAccount at
   ["margin", your_wallet]"; "If no account exists, the app sends user_create_margin" (no terms step).

    python compare/tools/preview_onboard.py   -> compare/previews/onboarding.html (+ renders/onboarding-*.png)
"""
import base64, json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
CMP = os.path.dirname(HERE)
sys.path.insert(0, HERE)
import material_icons as mi   # noqa: E402
from tx_motion import seal    # noqa: E402

LOGO = 'data:image/png;base64,' + base64.b64encode(open(os.path.join(os.path.dirname(CMP), 'assets', 'vanna-favicon-256.png'), 'rb').read()).decode()
IMG = json.load(open(os.path.join(CMP, 'src', 'img.json'), encoding='utf8'))
TSLA, USDC = IMG['a9a1db51309a512ccf9302f8acc244d2'], IMG['022fc945e265208f7997f02a7fbdd97f']


def ic(name, size=24, w='regular'):
    return '<svg width="%d" height="%d" viewBox="0 -960 960 960" fill="currentColor">%s</svg>' % (size, size, ''.join('<path d="%s"/>' % d for d in mi.material(name, w)))


SPACES = [  # key, name, icon, text, meta, colours (panel gradient, tint, ink)
    ('earn', 'Earn', 'savings', 'Supply USDC, SOL or stocks and earn the interest borrowers pay.', 'For lenders · No leverage · Withdraw anytime',
     ('#14919A', '#0B5F66'), '#E3F4F5', '#11727A'),
    ('trade', 'Trade', 'candlestick_chart', 'Long or short TSLAx, AAPLx and pre-IPO stocks, and swap any token.', 'For traders · Up to 5x',
     ('#6C63FF', '#3A33C4'), '#ECEBFE', '#3A33C4'),
    ('farm', 'Farm', 'psychiatry', 'Keep your stock as collateral, borrow USDC or SOL and earn on Kamino.', 'Leveraged yield · Up to 5x',
     ('#E2087A', '#A3004F'), '#FDE7F1', '#B0005A'),
]
TITLE, SUB, NOTE = 'What do you want to do?', 'Pick one to start. Everything stays one tap away at the top.', 'New to leverage? Start with Earn. Nothing is ever liquidated there.'
SB = '<div class="sb"><span>12:30</span><span>&#9679;&#9679;&#9679; &#9650; &#9646;</span></div>'


def chooser_white_rows():
    rows = ''.join('<div class="wr"><span class="wi" style="background:%s;color:%s">%s</span><div class="tx"><b>%s</b><span>%s</span><small>%s</small></div><span class="chev">%s</span></div>'
                   % (tint, ink, ic(icon, 24), name, text, meta, ic('chevron_right', 22)) for _, name, icon, text, meta, g, tint, ink in SPACES)
    return ('<div class="pw">' + SB + '<div class="glowtop"></div><div class="pad"><img class="logo" src="' + LOGO + '"><h1>' + TITLE + '</h1><p class="sub">' + SUB + '</p>' + rows +
            '<p class="note">' + ic('info', 18) + NOTE + '</p></div></div>')


def chooser_white_cards():
    cards = ''.join('<div class="wc"><span class="bar" style="background:linear-gradient(180deg,%s,%s)"></span><div class="tx"><div class="wch"><span class="wi sm" style="background:%s;color:%s">%s</span><b>%s</b>%s</div><span>%s</span><small>%s</small></div></div>'
                    % (g[0], g[1], tint, ink, ic(icon, 20), name, '<i class="rec">Start here</i>' if key == 'earn' else '', text, meta) for key, name, icon, text, meta, g, tint, ink in SPACES)
    return ('<div class="pw">' + SB + '<div class="pad"><img class="logo" src="' + LOGO + '"><h1>' + TITLE + '</h1><p class="sub">' + SUB + '</p><div class="cards">' + cards + '</div>'
            '<p class="note">' + NOTE + '</p></div></div>')


def chooser_violet():
    rows = ''.join('<div class="vr"><span class="wi" style="background:linear-gradient(150deg,%s,%s);color:#fff">%s</span><div class="tx"><b>%s</b><span>%s</span><small>%s</small></div><span class="chev">%s</span></div>'
                   % (g[0], g[1], ic(icon, 24), name, text, meta, ic('chevron_right', 22)) for _, name, icon, text, meta, g, tint, ink in SPACES)
    return ('<div class="pv">' + SB + '<div class="pad"><img class="logo" src="' + LOGO + '"><h1>' + TITLE + '</h1><p class="sub">' + SUB + '</p><div class="sheetv">' + rows +
            '<p class="note dark">' + ic('info', 18) + NOTE + '</p></div></div></div>')


def chooser_tiles():
    tiles = ''.join('<div class="tl" style="background:radial-gradient(120%% 90%% at 100%% 0%%, rgba(255,255,255,.28), transparent 55%%), linear-gradient(150deg,%s,%s)"><div class="tlh"><span class="tli">%s</span><b>%s</b><span class="chev">%s</span></div><span>%s</span><small>%s</small></div>'
                    % (g[0], g[1], ic(icon, 22), name, ic('arrow_forward', 20), text, meta) for _, name, icon, text, meta, g, tint, ink in SPACES)
    return ('<div class="pd">' + SB + '<div class="pad"><img class="logo" src="' + LOGO + '"><h1>' + TITLE + '</h1><p class="sub">' + SUB + '</p><div class="tiles">' + tiles + '</div>'
            '<p class="note dk">' + NOTE + '</p></div></div>')


def dark_page(inner):
    """Option 4's page, refined: near-black, with a soft coral-violet glow living in the top-right corner."""
    return ('<div class="pd2">' + SB + '<div class="pad"><img class="logo" src="' + LOGO + '"><h1>' + TITLE + '</h1><p class="sub">' + SUB + '</p>' + inner +
            '<p class="note dk2">' + ic('info', 18) + NOTE + '</p></div></div>')


def tile_bg(g):
    return 'background:radial-gradient(120%% 90%% at 100%% 0%%, rgba(255,255,255,.22), transparent 55%%), linear-gradient(150deg,%s,%s)' % g


def chooser_tiles_badge():
    """4a: the audience is a solid white badge at the top of each tile; the rest of the meta are glass chips."""
    out = ''
    for _, name, icon, text, meta, g, tint, ink in SPACES:
        who, *facts = meta.split(' · ')
        out += ('<div class="tl2" style="%s"><div class="tlh"><span class="tli">%s</span><b>%s</b><span class="who" style="color:%s">%s</span></div>'
                '<span class="d">%s</span><div class="fx">%s<span class="go">%s</span></div></div>'
                % (tile_bg(g), ic(icon, 22), name, ink, who, text, ''.join('<i>%s</i>' % f for f in facts), ic('arrow_forward', 20)))
    return dark_page('<div class="tiles">' + out + '</div>')


def chooser_badge_calm(dark):
    """4a, calmer: one badge is the only pill; the facts become a quiet line; no arrow button (the whole tile is the button).
    dark=True keeps the colour to the icon, a soft corner tint and the badge, on a dark tile."""
    out = ''
    for _, name, icon, text, meta, g, tint, ink in SPACES:
        who, *facts = meta.split(' · ')
        if dark:
            bg = 'background:radial-gradient(90%% 120%% at 0%% 0%%, %s55, transparent 60%%), #1A1721' % g[0]
            icon_html = '<span class="tli" style="background:linear-gradient(150deg,%s,%s)">%s</span>' % (g[0], g[1], ic(icon, 22))
            badge = '<span class="who" style="background:%s;color:%s">%s</span>' % (tint, ink, who)
        else:
            bg = 'background:linear-gradient(150deg,%s,%s)' % g
            icon_html = '<span class="tli">%s</span>' % ic(icon, 22)
            badge = '<span class="who" style="color:%s">%s</span>' % (ink, who)
        out += ('<div class="tl5%s" style="%s"><div class="tlh">%s<b>%s</b>%s</div><span class="d">%s</span><span class="q">%s</span></div>'
                % (' dk' if dark else '', bg, icon_html, name, badge, text, ' · '.join(facts)))
    return dark_page('<div class="tiles calm">' + out + '</div>')


def chooser_tiles_eyebrow():
    """4b: the audience reads first, as a bold eyebrow over the name; the facts sit on a darker band along the bottom."""
    out = ''
    for _, name, icon, text, meta, g, tint, ink in SPACES:
        who, *facts = meta.split(' · ')
        out += ('<div class="tl3" style="%s"><div class="top3"><div class="tlh"><span class="tli">%s</span><div><em>%s</em><b>%s</b></div><span class="chev">%s</span></div>'
                '<span class="d">%s</span></div><div class="band">%s</div></div>'
                % (tile_bg(g), ic(icon, 22), who, name, ic('arrow_forward', 20), text, '<span class="sep"></span>'.join('<span>%s</span>' % f for f in facts)))
    return dark_page('<div class="tiles">' + out + '</div>')


def chooser_tiles_strip():
    """4c: a white strip closes each tile and carries the whole line in the space's own colour, the audience in bold."""
    out = ''
    for _, name, icon, text, meta, g, tint, ink in SPACES:
        who, *facts = meta.split(' · ')
        out += ('<div class="tl4"><div class="tlc" style="%s"><div class="tlh"><span class="tli">%s</span><b>%s</b><span class="chev">%s</span></div><span class="d">%s</span></div>'
                '<div class="strip" style="color:%s"><b>%s</b>%s</div></div>'
                % (tile_bg(g), ic(icon, 22), name, ic('arrow_forward', 20), text, ink, who, ''.join('<span>· %s</span>' % f for f in facts)))
    return dark_page('<div class="tiles">' + out + '</div>')


# ---------------------------------------------------------------- margin account
ORDER = ('<div class="ord">' + SB + '<div class="obar">' + ic('arrow_back', 24) + '<b>Open position</b></div>'
         '<div class="oc"><div class="orow"><img src="' + TSLA + '"><div><b>TSLAx-USDC</b><span>Long 3x</span></div></div></div>'
         '<div class="oc"><div class="kv"><span>Collateral</span><b>500 USDC</b></div><div class="kv"><span>Position size</span><b>$1,500.00</b></div><div class="kv"><span>Liquidation</span><b>$250.20</b></div></div>')


def margin_inline():
    return (ORDER + '<div class="first"><span class="fi">' + ic('account_balance_wallet', 20) + '</span><div><b>Your first trade</b><span>Vanna also opens your margin account, once, in the same approval. It holds your collateral for Trade and Farm.</span></div></div>'
            '<div class="ctab">Open account &amp; Long 3x · approve in wallet</div></div>')


def margin_inline_done():
    return (ORDER + '</div><div class="veil"></div><div class="sh"><div class="gr"></div>' + '<span class="sealw">' + seal(64) + '</span>'
            '<h3>Margin account opened</h3><p>Long 3x TSLAx placed · account 3pLm…Uw2c</p>'
            '<div class="acts"><span class="b out">Done</span><span class="b fill">View position</span></div></div>')


def margin_screen():
    return ('<div class="ord">' + SB + '<div class="tradehd"><img src="' + LOGO + '"><b>vanna</b></div>'
            '<div class="ms"><div class="slot"><div class="mcard"><img src="' + LOGO + '"><span>Margin account</span><i></i><i style="width:45%"></i></div></div>'
            '<h3>Oh no, you don’t have a margin account yet</h3><p>It holds the collateral behind your trades. Open it once, then trade and farm from it.</p>'
            '<div class="facts"><span>' + ic('bolt', 16) + 'Up to 5x</span><span>' + ic('swap_horiz', 16) + 'Trade + Farm</span><span>' + ic('lock_open', 16) + 'Withdraw anytime</span></div></div>'
            '<div class="ctab">Open margin account</div><p class="foot">One approval in your wallet. No forms, no agreements.</p></div>')


def margin_banner():
    rows = ''.join('<div class="kv mk"><span style="display:flex;align-items:center;gap:10px;color:inherit"><img src="%s" style="width:32px;height:32px;border-radius:50%%"><b>%s</b></span><b>%s</b></div>' % r
                   for r in [(TSLA, 'TSLAx-USDC', '$372.40'), (IMG['cad380b03cb4c689f02e014100f56452'], 'GOOGLx-USDC', '$339.93'), (IMG['74e439ecf30e3316195f26ae04a1689e'], 'AAPLx-USDC', '$332.37')])
    return ('<div class="ord">' + SB + '<div class="tradehd"><img src="' + LOGO + '"><b>vanna</b></div>'
            '<div class="ban"><div><b>Open your margin account</b><span>One tap, then go long or short up to 5x.</span></div><span class="bb">Open</span></div>'
            '<div class="oc" style="margin-top:12px">' + rows + '</div></div>')


CSS = r'''
:root{--text:#1F1F1F;--t2:#5F5F68;--line:#EFEDF4;--bd:#E3E1EA;--bg:#EDEBF3}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font-family:'Plus Jakarta Sans',system-ui,sans-serif}
.top{padding:22px 28px 0;max-width:1400px}.top h1{margin:0;font-size:24px;font-weight:600}.top p{margin:6px 0 0;font-size:14px;line-height:20px;color:var(--t2);max-width:1150px}
section{padding:6px 28px 26px}section h2{margin:18px 0 12px;font-size:18px;font-weight:600}.row{display:flex;gap:26px;flex-wrap:wrap;align-items:flex-start}
figure{margin:0;width:392px;display:flex;flex-direction:column;gap:10px}figcaption{font-size:13px;line-height:19px;color:var(--t2)}figcaption b{color:var(--text)}
.ph{position:relative;width:392px;height:820px;border-radius:36px;overflow:hidden;box-shadow:0 0 0 9px #0B0B0D,0 30px 60px -20px rgba(47,27,97,.4)}
.ph>.pw,.ph>.pv,.ph>.pd,.ph>.pd2,.ph>.ord{position:absolute;inset:0}
.sb{height:30px;display:flex;justify-content:space-between;align-items:center;padding:0 22px;font-size:12px;font-weight:600}
.pad{position:relative;padding:28px 20px 0}.logo{width:36px;height:36px;display:block}
h1{margin:22px 0 0;font-size:28px;line-height:34px;font-weight:700;letter-spacing:-.015em}.sub{margin:8px 0 22px;font-size:15px;line-height:22px;color:var(--t2)}
.tx{flex:1;min-width:0;display:flex;flex-direction:column;gap:4px}.tx b{font-size:18px;line-height:24px;font-weight:700}.tx span{font-size:14px;line-height:20px;color:var(--t2)}.tx small{font-size:12px;color:#8A8993;font-weight:500}
.wi{width:48px;height:48px;border-radius:16px;display:flex;align-items:center;justify-content:center;flex-shrink:0}.wi.sm{width:32px;height:32px;border-radius:10px}
.chev{color:#9B9AA5;display:flex;align-self:center}
.note{margin:18px 2px 0;display:flex;gap:8px;font-size:13.5px;line-height:19px;color:var(--t2)}.note svg{flex-shrink:0;margin-top:1px;color:#703AE6}
/* white rows */
.pw{background:#FFFFFF}.glowtop{position:absolute;left:0;right:0;top:0;height:260px;background:radial-gradient(70% 90% at 85% 0%,rgba(252,84,87,.12),transparent 60%),radial-gradient(70% 80% at 15% 0%,rgba(112,58,230,.12),transparent 60%)}
.wr{display:flex;gap:14px;align-items:flex-start;padding:16px 4px;border-top:1px solid var(--line)}.wr:last-of-type{border-bottom:1px solid var(--line)}
/* white cards */
.cards{display:flex;flex-direction:column;gap:12px}
.wc{position:relative;display:flex;border-radius:20px;background:#fff;box-shadow:0 0 0 1px var(--line),0 10px 24px -14px rgba(47,27,97,.25);padding:16px 16px 16px 22px;overflow:hidden}
.wc .bar{position:absolute;left:0;top:0;bottom:0;width:6px}.wch{display:flex;align-items:center;gap:10px}
.rec{margin-left:auto;font-style:normal;font-size:11.5px;font-weight:700;color:#11727A;background:#E3F4F5;padding:4px 8px;border-radius:8px}
/* violet page */
.pv{background:radial-gradient(90% 50% at 100% 0%,rgba(252,84,87,.55),transparent 60%),linear-gradient(180deg,#3E1A9E 0%,#5A26C9 38%,#2A1170 100%);color:#fff}
.pv .sub{color:rgba(255,255,255,.82)}.sheetv{background:#fff;color:var(--text);border-radius:24px;padding:4px 16px 16px;box-shadow:0 20px 40px -18px rgba(0,0,0,.5)}
.vr{display:flex;gap:14px;padding:16px 0;align-items:flex-start}.vr+.vr{border-top:1px solid var(--line)}.note.dark{margin-top:10px;padding-top:12px;border-top:1px solid var(--line)}
/* colour tiles */
.pd{background:radial-gradient(80% 40% at 90% 0%,rgba(112,58,230,.35),transparent 60%),#121016;color:#fff}.pd .sub{color:#B9B7C6}
.tiles{display:flex;flex-direction:column;gap:12px}.tl{border-radius:22px;padding:16px;color:#fff;display:flex;flex-direction:column;gap:6px;box-shadow:0 14px 30px -16px rgba(0,0,0,.6)}
.tlh{display:flex;align-items:center;gap:10px}.tlh b{font-size:19px;font-weight:700}.tlh .chev{margin-left:auto;color:#fff;opacity:.9}
.tli{width:36px;height:36px;border-radius:12px;background:rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center}
.tl span{font-size:14px;line-height:20px;color:rgba(255,255,255,.92)}.tl small{font-size:12px;color:rgba(255,255,255,.75);font-weight:600}.note.dk{color:#B9B7C6}
/* option 4, refined: dark page with life in the top-right corner */
.pd2{background:radial-gradient(56% 21% at 100% 0%,rgba(252,84,87,.55),rgba(252,84,87,0) 72%),radial-gradient(44% 17% at 72% 0%,rgba(112,58,230,.55),rgba(112,58,230,0) 72%),radial-gradient(34% 14% at 100% 17%,rgba(226,8,122,.22),rgba(226,8,122,0) 72%),#0E0C13;color:#fff;overflow:hidden}.pd2 .sub{color:#B9B7C6}.pd2 .pad{z-index:1}
.note.dk2{color:#A9A7B6}.note.dk2 svg{color:#C9B8FF}
.tl2,.tl3,.tl4{border-radius:22px;color:#fff;box-shadow:0 16px 30px -18px rgba(0,0,0,.8)}
.tl2 .d,.tl3 .d,.tl4 .d{font-size:14px;line-height:20px;color:rgba(255,255,255,.94)}
/* 4a badge */
.tl2{padding:14px 16px 14px;display:flex;flex-direction:column;gap:8px}
.tl2 .tlh b{font-size:19px;font-weight:700}
.who{margin-left:auto;height:26px;padding:0 10px;border-radius:13px;background:#fff;font-size:12.5px;font-weight:700;display:inline-flex;align-items:center;box-shadow:0 4px 10px -4px rgba(0,0,0,.35)}
.fx{display:flex;align-items:center;gap:6px;flex-wrap:wrap}.fx i{font-style:normal;height:26px;padding:0 10px;border-radius:13px;background:rgba(255,255,255,.18);box-shadow:inset 0 0 0 1px rgba(255,255,255,.28);font-size:12.5px;font-weight:600;display:inline-flex;align-items:center}
.fx .go{margin-left:auto;width:34px;height:34px;border-radius:50%;background:rgba(255,255,255,.18);display:flex;align-items:center;justify-content:center}
/* 4a calmer */
.tiles.calm{gap:14px}.tl5{border-radius:22px;padding:16px;display:flex;flex-direction:column;gap:6px;color:#fff}
.tl5 .tlh{margin-bottom:4px}.tl5 .tlh b{font-size:19px;font-weight:700}.tl5 .d{font-size:14px;line-height:20px;color:rgba(255,255,255,.92)}
.tl5 .q{font-size:12.5px;font-weight:600;color:rgba(255,255,255,.72)}
.tl5.dk{box-shadow:inset 0 0 0 1px rgba(255,255,255,.07)}.tl5.dk .d{color:#D9D7E3}.tl5.dk .q{color:#9A98A8}
/* 4b eyebrow + band */
.tl3{overflow:hidden}.top3{padding:14px 16px 12px;display:flex;flex-direction:column;gap:8px}
.tl3 .tlh>div{display:flex;flex-direction:column}.tl3 em{font-style:normal;font-size:11.5px;font-weight:800;letter-spacing:.09em;text-transform:uppercase;color:#fff;opacity:.95}
.tl3 .tlh b{font-size:19px;line-height:22px;font-weight:700}.tl3 .chev{margin-left:auto;color:#fff}
.band{display:flex;align-items:center;gap:10px;padding:9px 16px;background:rgba(10,6,24,.28);font-size:12.5px;font-weight:700;color:#fff}.band .sep{width:4px;height:4px;border-radius:50%;background:rgba(255,255,255,.6)}
/* 4c white strip */
.tl4{overflow:hidden;background:#fff}.tlc{padding:14px 16px 12px;display:flex;flex-direction:column;gap:8px}
.tl4 .tlh b{font-size:19px;font-weight:700}.tl4 .chev{margin-left:auto;color:#fff}
.strip{display:flex;align-items:center;gap:6px;padding:9px 16px;font-size:13px;font-weight:600}.strip b{font-weight:800}
/* margin */
.ord{background:#F7F7F7}.obar{height:56px;display:flex;align-items:center;gap:14px;padding:0 16px}.obar b{font-size:20px;font-weight:600}
.oc{margin:10px 16px 0;background:#fff;border-radius:18px;padding:4px 16px;box-shadow:0 1px 2px rgba(17,17,17,.04),0 8px 24px rgba(17,17,17,.05)}
.orow{display:flex;gap:12px;align-items:center;padding:10px 0}.orow img{width:40px;height:40px;border-radius:50%}.orow b{display:block;font-size:16px}.orow span{font-size:13px;color:#703AE6;font-weight:600}
.kv{display:flex;justify-content:space-between;align-items:center;padding:12px 0;font-size:14px}.kv+.kv{border-top:1px solid var(--line)}.kv span{color:var(--t2)}.kv.mk{padding:12px 0}
.first{position:absolute;left:16px;right:16px;bottom:100px;display:flex;gap:12px;padding:14px;border-radius:18px;background:#F1EBFD}
.first .fi{width:36px;height:36px;border-radius:12px;background:#fff;color:#5029A3;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.first b{display:block;font-size:14.5px;color:#3B1C82}.first span{font-size:13px;line-height:18px;color:#4C3D7A}
.ctab{position:absolute;left:16px;right:16px;bottom:28px;height:56px;border-radius:28px;background:linear-gradient(90deg,#6C63FF,#4B44E0);color:#fff;font-size:15.5px;font-weight:600;display:flex;align-items:center;justify-content:center}
.veil{position:absolute;inset:0;background:rgba(17,14,32,.24)}
.sh{position:absolute;left:0;right:0;bottom:0;background:#fff;border-radius:28px 28px 0 0;padding:12px 20px 26px;text-align:center;display:flex;flex-direction:column;align-items:center}
.sh .gr{width:32px;height:4px;border-radius:2px;background:var(--bd);margin-bottom:18px}.sh h3{margin:14px 0 0;font-size:20px}.sh p{margin:6px 0 0;font-size:14px;color:var(--t2)}
.acts{margin-top:20px;display:flex;gap:10px;width:100%}.acts .b{flex:1;height:50px;border-radius:25px;display:flex;align-items:center;justify-content:center;font-weight:600}
.b.out{box-shadow:inset 0 0 0 1.5px var(--bd)}.b.fill{background:linear-gradient(90deg,#6C63FF,#4B44E0);color:#fff}
.tradehd{height:110px;padding:24px 18px 0;display:flex;align-items:flex-start;gap:8px;color:#fff;border-radius:0 0 24px 24px;background:radial-gradient(110% 90% at 100% 0%,rgba(130,170,255,.6),transparent 60%),linear-gradient(180deg,#221D8C,#3A33C4)}
.tradehd img{width:28px;height:28px}.tradehd b{font-size:22px}
.ms{padding:26px 22px 0;text-align:center;display:flex;flex-direction:column;align-items:center}.ms h3{margin:20px 0 0;font-size:22px;line-height:28px}.ms p{margin:8px 0 0;font-size:14.5px;line-height:21px;color:var(--t2)}
.slot{width:230px;height:132px;border-radius:22px;border:2px dashed #B9B4F2;display:flex;align-items:center;justify-content:center;background:repeating-linear-gradient(135deg,rgba(90,82,240,.05) 0 10px,transparent 10px 20px)}
.mcard{width:180px;height:100px;border-radius:16px;background:linear-gradient(135deg,#fff,#F1EBFD);box-shadow:0 14px 30px -14px rgba(75,68,224,.6);padding:12px;display:flex;flex-direction:column;gap:7px;transform:rotate(-6deg) translateY(-6px);opacity:.7}
.mcard img{width:24px;height:24px}.mcard span{font-size:12px;font-weight:600;color:#3A33C4;text-align:left}.mcard i{height:7px;border-radius:4px;background:#DCD6FA;width:70%}
.facts{display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin-top:16px}.facts span{height:30px;padding:0 10px;border-radius:15px;background:#fff;box-shadow:inset 0 0 0 1px var(--bd);display:inline-flex;align-items:center;gap:6px;font-size:12.5px;font-weight:600}.facts svg{color:#4B44E0}
.foot{position:absolute;left:0;right:0;bottom:8px;text-align:center;font-size:12px;color:var(--t2);margin:0}
.ban{margin:14px 16px 0;padding:14px 14px 14px 16px;border-radius:18px;background:#fff;display:flex;align-items:center;gap:12px;box-shadow:0 0 0 1.5px #D9D3FB}
.ban div{flex:1}.ban b{display:block;font-size:15px}.ban span{font-size:13px;color:var(--t2)}.ban .bb{color:#fff;flex-shrink:0;height:40px;padding:0 18px;border-radius:20px;background:linear-gradient(90deg,#6C63FF,#4B44E0);color:#fff;font-weight:600;font-size:14px;display:flex;align-items:center}
'''


def fig(inner, cap):
    return '<figure><div class="ph">' + inner + '</div><figcaption>' + cap + '</figcaption></figure>'


def main():
    s1 = (fig(chooser_white_rows(), '<b>1 · White, refined.</b> Your layout and words, with each space\'s colour on its icon tile, a faint coral-violet glow behind the logo and the note set apart with an icon.') +
          fig(chooser_white_cards(), '<b>2 · White cards.</b> Each space is a card with its colour on the edge; Earn carries a small "Start here".') +
          fig(chooser_violet(), '<b>3 · Vanna violet.</b> The brand gradient fills the page; the three choices sit on one white card.') +
          fig(chooser_tiles(), '<b>4 · Colour tiles.</b> Each space is a tile in its own colour on a dark page, the same colours people then see in the tabs.'))
    s2 = (fig(margin_inline(), '<b>A · Inside the first trade (recommended).</b> No separate page: the first Long, Short or Farm shows one line, and the button says it opens the account too. One approval.') +
          fig(margin_inline_done(), '<b>A · Done.</b> The same balanced sheet as every transaction: the seal, "Margin account opened" and the trade.') +
          fig(margin_screen(), '<b>B · One screen.</b> If someone opens Trade before trading: a calm one-screen page, no scrolling, no agreements, one button.') +
          fig(margin_banner(), '<b>C · Banner.</b> A small card on top of Markets; the markets stay visible and usable.'))
    s3 = (fig(chooser_tiles_badge(), '<b>4a · Audience badge.</b> "For lenders", "For traders", "Leveraged yield" sit in a solid white badge on each tile, in the space\'s own colour; the other facts are small glass chips.') +
          fig(chooser_tiles_eyebrow(), '<b>4b · Audience first.</b> The audience is the first thing you read, in bold capitals above the name; the facts sit on a darker band along the bottom of the tile.') +
          fig(chooser_tiles_strip(), '<b>4c · White strip.</b> Each tile ends in a white strip carrying the whole line in the space\'s colour, the audience in bold. The most legible of the three.'))
    s4 = (fig(chooser_tiles_badge(), '<b>4a · as sent.</b> Four to five pills per tile on three full-strength gradients: everything is equally loud.') +
          fig(chooser_badge_calm(False), '<b>4a · calmer.</b> The badge is the only pill. Facts become one quiet line, the arrow button goes (the whole tile is the button), more air between tiles.') +
          fig(chooser_badge_calm(True), '<b>4a · calm, dark tiles.</b> Colour lives in the icon, a soft corner tint and the badge; the page stays dark and the badge is the brightest thing on each tile.'))
    page = ('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Vanna onboarding</title>'
            '<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet"><style>' + CSS + '</style></head><body>'
            '<div class="top"><h1>First launch and the margin account</h1><p>Previews only. The chooser keeps your exact words. The margin account follows how Vanna really works: the first margin action creates it, with no terms step.</p></div>'
            '<section id="o4"><h2>4a, calmer</h2><div class="row">' + s4 + '</div></section>'
            '<section id="o3"><h2>Option 4, refined: the audience you can’t miss</h2><div class="row">' + s3 + '</div></section>'
            '<section id="o1"><h2>"What do you want to do?": four looks</h2><div class="row">' + s1 + '</div></section>'
            '<section id="o2"><h2>Margin account without agreements</h2><div class="row">' + s2 + '</div></section></body></html>')
    out = os.path.join(CMP, 'previews', 'onboarding.html')
    open(out, 'w', encoding='utf8').write(page)
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
        b = p.chromium.launch(); pg = b.new_page(viewport={'width': 1760, 'height': 1000})
        pg.goto('file:///' + out.replace('\\', '/'), wait_until='networkidle'); pg.wait_for_timeout(900)
        for sid in ('o4', 'o3', 'o1', 'o2'):
            pg.locator('#' + sid + ' .row').screenshot(path=os.path.join(CMP, 'renders', 'onboarding-%s.png' % sid))
        b.close()
    print(out)


if __name__ == '__main__':
    main()
