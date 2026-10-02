"""Preview (not implemented), 2 Oct 2026:
1. Test faucet in Profile (settings). The other developer's component is a card of token chips (USDC, TSLAx, GOOGLx,
   AAPLx, ANTHROPIC, OPENAI), one tap per token, and the note "Test tokens for the Vanna fork. SOL for fees is not
   included." Every option keeps that contract (same list, one tap per token, same note); only the look and the
   tap feedback (getting > sent) change, so nothing in the component's logic has to change.
2. Earn > vault tabs (Positions, Details, Activity, Collateral, Analytics) overflow: "Analytics" is cut off and
   nothing says the row scrolls. Four ways to fix it.

    python compare/tools/preview_faucet_tabs.py [--video]  -> compare/previews/faucet-tabs.html (+ renders/faucet-tabs-*.png, faucet-tap.mp4)
"""
import json, os, subprocess, sys, tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
CMP = os.path.dirname(HERE)
sys.path.insert(0, HERE)
import material_icons as mi   # noqa: E402

IMG = json.load(open(os.path.join(CMP, 'src', 'img.json'), encoding='utf8'))
TOKENS = [('USDC', '022fc945e265208f7997f02a7fbdd97f'), ('TSLAx', 'a9a1db51309a512ccf9302f8acc244d2'), ('GOOGLx', 'cad380b03cb4c689f02e014100f56452'),
          ('AAPLx', '74e439ecf30e3316195f26ae04a1689e'), ('ANTHROPIC', 'c0af4af206fcfbcf3cce92e51a5837cf'), ('OPENAI', '68c99bf0397471dc2d806cfaa2e15d53')]
NOTE = 'Test tokens for the Vanna fork. SOL for fees is not included.'


def ic(name, size=20, w='regular'):
    return '<svg width="%d" height="%d" viewBox="0 -960 960 960" fill="currentColor" aria-hidden="true">%s</svg>' % (size, size, ''.join('<path d="%s"/>' % d for d in mi.material(name, w)))


SB = '<div class="sb"><span>12:30</span><span>&#9679;&#9679;&#9679; &#9650; &#9646;</span></div>'
CHECK = ic('check', 14)


def profile_top():
    return (SB + '<div class="bar">' + ic('arrow_back', 24) + '<b>Profile</b></div>'
            '<div class="card"><div class="lab">Account</div><div class="kv"><span>Wallet balance</span><b>$4,812.40</b></div>'
            '<div class="kv"><span>Margin account</span><b><i class="act">Active</i><code>3pLm…Uw2c</code></b></div></div>')


def appearance():
    return ('<div class="card"><div class="lab">Appearance</div><div class="seg"><span>System</span><span class="on">Light</span><span>Dark</span></div></div>')


def faucet_head():
    return '<div class="fh"><div class="lab">Test faucet</div><span class="fork">Fork only</span></div>'


def note():
    return '<p class="fnote">' + ic('info', 16) + NOTE + '</p>'


def f_grid():
    tiles = ''.join('<button class="ft" data-tap><span class="lg"><img src="%s" alt=""><i class="ring"></i><i class="ok">%s</i></span><b>%s</b><small class="st">Get</small></button>'
                    % (IMG[k], CHECK, n) for n, k in TOKENS)
    return '<div class="ph">' + profile_top() + '<div class="card">' + faucet_head() + '<div class="fgrid">' + tiles + '</div>' + note() + '</div>' + appearance() + '</div>'


def f_rows():
    rows = ''.join('<div class="fr"><img src="%s" alt=""><b>%s</b><button class="get" data-tap><span class="t">Get</span><i class="spin"></i><span class="d">%s Sent</span></button></div>'
                   % (IMG[k], n, CHECK) for n, k in TOKENS)
    return '<div class="ph">' + profile_top() + '<div class="card">' + faucet_head() + '<div class="frows">' + rows + '</div>' + note() + '</div></div>'


def f_sheet():
    tiles = ''.join('<button class="ft" data-tap><span class="lg"><img src="%s" alt=""><i class="ring"></i><i class="ok">%s</i></span><b>%s</b><small class="st">Get</small></button>'
                    % (IMG[k], CHECK, n) for n, k in TOKENS)
    stack = ''.join('<img src="%s" alt="" style="z-index:%d">' % (IMG[k], 9 - i) for i, (n, k) in enumerate(TOKENS[:4]))
    row = ('<div class="card"><button class="frow-open"><span class="stack">' + stack + '</span><span class="tx"><b>Test faucet</b><small>Get test tokens for the Vanna fork</small></span>'
           + ic('chevron_right', 22) + '</button></div>')
    sheet = ('<div class="scrim"></div><div class="sheet"><div class="grab"></div><div class="sh-h"><b>Test faucet</b><span class="fork">Fork only</span></div>'
             '<p class="sh-p">Tap a token to get some. Use them anywhere in Vanna.</p><div class="fgrid">' + tiles + '</div>' + note() + '</div>')
    return '<div class="ph">' + profile_top() + row + appearance() + sheet + '</div>'


# ---------------------------------------------------------------- vault tabs
TABS = ['Positions', 'Details', 'Activity', 'Collateral', 'Analytics']


def vault_top():
    return (SB + '<div class="bar">' + ic('arrow_back', 24) + '</div>'
            '<div class="vh"><img src="' + IMG['022fc945e265208f7997f02a7fbdd97f'] + '" alt=""><div><b>USDC vault</b><small>USD Coin · Vanna lending pool</small></div></div>'
            '<div class="apy"><small>Supply APY</small><b>0.03%</b></div>'
            '<div class="stats"><div><small>Total supply</small><b>$55.0K</b></div><div><small>Available</small><b>$52.2K</b></div><div><small>Utilization</small><b>5.2%</b></div></div>')


def vault_body():
    return ('<div class="pos"><div class="pr"><img src="' + IMG['022fc945e265208f7997f02a7fbdd97f'] + '" alt=""><div><b>$2,499.75</b><small>2,499.81 vUSDC shares</small></div></div>'
            '<div class="kv"><span>Interest earned</span><b class="pos-c">+0.81 USDC</b></div></div>'
            '<div class="acts"><span class="b out">Withdraw</span><span class="b fill">Supply</span></div>')


def t_fit():
    tabs = ''.join('<button class="tb%s" data-tab>%s</button>' % (' on' if i == 0 else '', t) for i, t in enumerate(TABS))
    return '<div class="ph vault">' + vault_top() + '<div class="tabs fit">' + tabs + '</div>' + vault_body() + '</div>'


def t_scroll():
    tabs = ''.join('<button class="pill%s" data-tab>%s</button>' % (' on' if i == 0 else '', t) for i, t in enumerate(TABS))
    return ('<div class="ph vault">' + vault_top() + '<div class="tabs-wrap"><div class="tabs scroll">' + tabs + '</div>'
            '<span class="fade fl"></span><span class="fade"></span><button class="more less" data-step="-1">' + ic('chevron_left', 20) + '</button>'
            '<button class="more" data-step="1">' + ic('chevron_right', 20) + '</button></div>' + vault_body() + '</div>')


def t_three():
    tabs = ''.join('<button class="tb%s" data-tab>%s</button>' % (' on' if i == 0 else '', t) for i, t in enumerate(['Positions', 'Activity', 'About']))
    return '<div class="ph vault">' + vault_top() + '<div class="tabs fit three">' + tabs + '</div>' + vault_body() + '</div>'


def t_more():
    tabs = ''.join('<button class="tb%s" data-tab>%s</button>' % (' on' if i == 0 else '', t) for i, t in enumerate(['Positions', 'Details', 'Activity']))
    menu = '<div class="menu">' + ''.join('<span>%s%s</span>' % (ic(i, 18), t) for i, t in (('shield', 'Collateral'), ('monitoring', 'Analytics'))) + '</div>'
    return ('<div class="ph vault">' + vault_top() + '<div class="tabs fit four">' + tabs + '<button class="tb mo" data-menu>More' + ic('expand_more', 18) + '</button>' + menu + '</div>'
            + vault_body() + '</div>')


CSS = r'''
:root{--text:#1F1F1F;--t2:#5F5F68;--line:#EFEDF4;--bd:#E3E1EA;--bg:#EDEBF3;--tv:#ECEBFE;--tvI:#3A33C4;--pos:#1C7C83;--teal:#11727A;--tt:#E3F4F5;
  --dec:cubic-bezier(.05,.7,.1,1);--std:cubic-bezier(.2,0,0,1);--spring:cubic-bezier(.34,1.4,.64,1)}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font-family:'Plus Jakarta Sans',system-ui,sans-serif;font-variant-numeric:tabular-nums}
.top{padding:22px 28px 0;max-width:1400px}.top h1{margin:0;font-size:24px;font-weight:600}.top p{margin:6px 0 0;font-size:14px;line-height:20px;color:var(--t2);max-width:1150px}
section{padding:6px 28px 26px}section h2{margin:18px 0 12px;font-size:18px;font-weight:600}.row{display:flex;gap:26px;flex-wrap:wrap;align-items:flex-start}
figure{margin:0;width:392px;display:flex;flex-direction:column;gap:10px}figcaption{font-size:13px;line-height:19px;color:var(--t2)}figcaption b{color:var(--text)}
.ph{position:relative;width:392px;height:820px;border-radius:36px;overflow:hidden;background:#F7F7F7;box-shadow:0 0 0 9px #0B0B0D,0 30px 60px -20px rgba(47,27,97,.4)}
.sb{height:30px;display:flex;justify-content:space-between;align-items:center;padding:0 22px;font-size:12px;font-weight:600}
.bar{height:52px;display:flex;align-items:center;gap:14px;padding:0 16px}.bar b{font-size:20px;font-weight:600}
button{font:inherit;color:inherit;border:0;background:none;padding:0;cursor:pointer}
.card{margin:10px 16px 0;background:#fff;border-radius:18px;padding:14px 16px;box-shadow:0 1px 2px rgba(17,17,17,.04),0 8px 24px rgba(17,17,17,.05)}
.lab{font-size:13px;color:var(--t2);font-weight:500}
.kv{display:flex;justify-content:space-between;align-items:center;padding:12px 0;font-size:14px}.kv+.kv{border-top:1px solid var(--line)}.kv span{color:var(--t2)}.kv b{font-weight:600;display:flex;align-items:center;gap:8px}
.act{font-style:normal;font-size:12px;font-weight:600;color:var(--teal);background:var(--tt);padding:3px 8px;border-radius:8px}code{font:500 12.5px ui-monospace,Menlo,monospace}
.card>.lab+.kv{margin-top:2px}
.seg{margin-top:10px;display:flex;background:#F1F0F4;border-radius:14px;padding:4px}.seg span{flex:1;text-align:center;padding:9px 0;border-radius:10px;font-size:14px;color:var(--t2)}.seg .on{background:#fff;color:var(--text);font-weight:600;box-shadow:0 1px 2px rgba(17,17,17,.08)}
/* faucet */
.fh{display:flex;align-items:center;justify-content:space-between}
.fork{font-size:11px;font-weight:700;letter-spacing:.04em;color:#8C5A00;background:#FFF3D6;padding:3px 8px;border-radius:8px}
.fnote{margin:12px 0 0;display:flex;gap:8px;font-size:12.5px;line-height:18px;color:var(--t2)}.fnote svg{flex-shrink:0;margin-top:1px;color:#8A8993}
.fgrid{margin-top:12px;display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.ft{height:92px;border-radius:16px;background:#F7F6FA;box-shadow:inset 0 0 0 1px var(--line);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;transition:transform 120ms var(--std),background 200ms}
.ft:active{transform:scale(.96)}.ft b{font-size:12.5px;font-weight:600}.ft .st{font-size:11.5px;font-weight:700;color:#4B44E0;height:14px}
.lg{position:relative;width:34px;height:34px;display:block}.lg img{width:34px;height:34px;border-radius:50%;display:block;transition:transform 300ms var(--spring)}
.lg .ring{position:absolute;inset:-4px;border-radius:50%;border:2.5px solid transparent;border-top-color:#4B44E0;opacity:0}
.lg .ok{position:absolute;right:-5px;bottom:-4px;width:18px;height:18px;border-radius:50%;background:var(--pos);color:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 2px #fff;transform:scale(0);transition:transform 300ms var(--spring)}
.busy .lg .ring{opacity:1;animation:spin 800ms linear infinite}.busy .st{color:var(--t2)}
.done{background:#EFF8F8}.done .lg .ok{transform:scale(1)}.done .st{color:var(--pos)}
@keyframes spin{to{transform:rotate(360deg)}}
.frows{margin-top:6px}.fr{display:flex;align-items:center;gap:12px;padding:9px 0}.fr+.fr{border-top:1px solid var(--line)}
.fr img{width:32px;height:32px;border-radius:50%}.fr b{flex:1;font-size:14px;font-weight:600}
.get{height:34px;min-width:72px;padding:0 14px;border-radius:17px;background:var(--tv);color:var(--tvI);font-size:13.5px;font-weight:700;display:flex;align-items:center;justify-content:center;gap:6px;transition:background 200ms,color 200ms,transform 120ms}
.get:active{transform:scale(.95)}.get .spin,.get .d{display:none}.get .spin{width:14px;height:14px;border-radius:50%;border:2px solid currentColor;border-right-color:transparent;animation:spin 700ms linear infinite}
.get.busy .t{display:none}.get.busy .spin{display:block}.get.done{background:var(--tt);color:var(--pos)}.get.done .t{display:none}.get.done .d{display:flex;align-items:center;gap:4px}
.frow-open{width:100%;display:flex;align-items:center;gap:12px;text-align:left;color:var(--t2)}.frow-open .tx{flex:1;display:flex;flex-direction:column;color:var(--text)}.frow-open .tx b{font-size:15px;font-weight:600}.frow-open .tx small{font-size:12.5px;color:var(--t2)}
.stack{display:flex}.stack img{width:26px;height:26px;border-radius:50%;box-shadow:0 0 0 2px #fff;position:relative}.stack img+img{margin-left:-9px}
.scrim{position:absolute;inset:0;background:rgba(17,14,32,.32)}
.sheet{position:absolute;left:0;right:0;bottom:0;background:#fff;border-radius:28px 28px 0 0;padding:12px 20px 26px;animation:up 340ms var(--dec)}@keyframes up{from{transform:translateY(100%)}}
.grab{width:32px;height:4px;border-radius:2px;background:var(--bd);margin:0 auto 16px}.sh-h{display:flex;align-items:center;justify-content:space-between}.sh-h b{font-size:20px;font-weight:600}
.sh-p{margin:6px 0 0;font-size:14px;color:var(--t2)}
/* vault */
.vault .bar{height:44px}.vh{display:flex;gap:12px;align-items:center;padding:4px 18px 0}.vh img{width:36px;height:36px;border-radius:50%}.vh b{display:block;font-size:17px;font-weight:600}.vh small{font-size:12.5px;color:var(--t2)}
.apy{padding:14px 18px 0}.apy small{display:block;font-size:12.5px;color:var(--t2)}.apy b{font-size:34px;line-height:42px;font-weight:600;color:var(--teal)}
.stats{display:grid;grid-template-columns:repeat(3,1fr);padding:14px 18px 0}.stats small{display:block;font-size:12px;color:var(--t2)}.stats b{font-size:15px;font-weight:600}
.tabs{display:flex;margin-top:16px}
.tabs.fit{padding:0 12px;border-bottom:1px solid var(--line);position:relative}
.tb{flex:1 1 0;height:46px;font-size:13px;font-weight:600;color:var(--t2);box-shadow:inset 0 -2px 0 transparent;transition:color 200ms,box-shadow 200ms;white-space:nowrap}
.tb.on{color:var(--teal);box-shadow:inset 0 -2.5px 0 var(--teal)}
.tabs.three .tb,.tabs.four .tb{font-size:14px}
.tb.mo{display:flex;align-items:center;justify-content:center;gap:2px}
.menu{position:absolute;right:12px;top:50px;z-index:5;background:#fff;border-radius:14px;padding:6px;box-shadow:0 14px 30px -10px rgba(17,11,46,.35),0 0 0 1px var(--line);display:flex;flex-direction:column;min-width:170px}
.menu span{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:10px;font-size:14px}.menu span:hover{background:#F4F3F8}.menu svg{color:var(--t2)}
.tabs-wrap{position:relative;margin-top:16px}.tabs.scroll{margin:0;padding:0 16px;gap:8px;overflow-x:auto;scrollbar-width:none;scroll-behavior:smooth}.tabs.scroll::-webkit-scrollbar{display:none}
.pill{flex-shrink:0;height:36px;padding:0 16px;border-radius:18px;font-size:14px;font-weight:600;color:var(--t2);box-shadow:inset 0 0 0 1px var(--bd);background:#fff;transition:all 200ms}
.pill.on{background:var(--teal);color:#fff;box-shadow:none}
.fade{position:absolute;right:0;top:0;bottom:0;width:72px;background:linear-gradient(90deg,rgba(247,247,247,0),#F7F7F7 62%);pointer-events:none;transition:opacity 200ms}
.more{position:absolute;right:10px;top:2px;width:32px;height:32px;border-radius:50%;background:#fff;box-shadow:0 2px 8px rgba(17,11,46,.18);display:flex;align-items:center;justify-content:center;color:var(--teal);transition:opacity 200ms}
.fade.fl{right:auto;left:0;background:linear-gradient(270deg,rgba(247,247,247,0),#F7F7F7 62%)}.more.less{right:auto;left:10px}
.at-end .fade:not(.fl),.at-end .more:not(.less),.at-start .fl,.at-start .less{opacity:0;pointer-events:none}
.pos{margin:14px 16px 0;background:#fff;border-radius:18px;padding:4px 16px;box-shadow:0 1px 2px rgba(17,17,17,.04),0 8px 24px rgba(17,17,17,.05)}
.pr{display:flex;gap:12px;align-items:center;padding:12px 0}.pr img{width:34px;height:34px;border-radius:50%}.pr b{display:block;font-size:16px}.pr small{font-size:12.5px;color:var(--t2)}
.pos .kv{border-top:1px solid var(--line)}.pos-c{color:var(--pos)}
.acts{position:absolute;left:16px;right:16px;bottom:22px;display:flex;gap:10px}.acts .b{flex:1;height:52px;border-radius:26px;display:flex;align-items:center;justify-content:center;font-weight:600}
.b.out{background:#fff;box-shadow:inset 0 0 0 1.5px var(--bd)}.b.fill{background:linear-gradient(90deg,#14919A,#0B5F66);color:#fff}
'''

JS = r'''
document.querySelectorAll('[data-tap]').forEach(function (b) {
  b.addEventListener('click', function () {
    if (b.classList.contains('busy')) return;
    var st = b.querySelector('.st');
    b.classList.remove('done'); b.classList.add('busy'); if (st) st.textContent = 'Getting…';
    setTimeout(function () { b.classList.remove('busy'); b.classList.add('done'); if (st) st.textContent = 'Sent'; }, 1200);
    setTimeout(function () { b.classList.remove('done'); if (st) st.textContent = 'Get'; }, 3600);
  });
});
document.querySelectorAll('.tabs').forEach(function (row) {
  row.querySelectorAll('[data-tab]').forEach(function (t) {
    t.addEventListener('click', function () { row.querySelectorAll('[data-tab]').forEach(function (x) { x.classList.toggle('on', x === t); }); });
  });
});
document.querySelectorAll('.tabs-wrap').forEach(function (w) {
  var row = w.querySelector('.tabs');
  function sync() { w.classList.toggle('at-start', row.scrollLeft <= 8); w.classList.toggle('at-end', row.scrollLeft + row.clientWidth >= row.scrollWidth - 8); }
  row.addEventListener('scroll', sync); sync();
  w.querySelectorAll('[data-step]').forEach(function (b) { b.addEventListener('click', function () { row.scrollBy({ left: 160 * +b.getAttribute('data-step'), behavior: 'smooth' }); }); });
  row.querySelectorAll('[data-tab]').forEach(function (t, i, all) { t.addEventListener('click', function () {
    var x = i === 0 ? 0 : i === all.length - 1 ? row.scrollWidth : Math.min(Math.max(row.scrollLeft, t.offsetLeft + t.offsetWidth - row.clientWidth + 60), t.offsetLeft - 60);
    row.scrollTo({ left: x, behavior: 'smooth' }); }); });
});
document.querySelectorAll('[data-menu]').forEach(function (m) {
  var menu = m.parentNode.querySelector('.menu'); menu.style.display = 'none';
  m.addEventListener('click', function () { menu.style.display = menu.style.display === 'none' ? 'flex' : 'none'; });
});
'''


def fig(inner, cap):
    return '<figure>' + inner + '<figcaption>' + cap + '</figcaption></figure>'


def build():
    s1 = (fig(f_grid(), '<b>F1 · Logo grid (recommended).</b> The same grid the component already has, with each token\'s logo. Tap: a ring spins around the logo, then a teal tick lands on it and the label says Sent. A "Fork only" tag makes clear it never shows on mainnet.') +
          fig(f_rows(), '<b>F2 · Rows.</b> One row per token with a Get button that turns into a spinner, then "Sent". The clearest, but six rows make Profile longer.') +
          fig(f_sheet(), '<b>F3 · One row, then a sheet.</b> Profile keeps a single "Test faucet" row with stacked logos; tapping opens the grid in a sheet. Tidiest settings page.'))
    s2 = (fig(t_fit(), '<b>T1 · All five fit (recommended).</b> Same five tabs, equal width, slightly smaller text: nothing hides, so there is nothing to discover. Smallest change for the developers.') +
          fig(t_scroll(), '<b>T2 · Scroll with a hint.</b> Pills that scroll. While there is more on a side, that edge fades into the page with a small arrow that scrolls on; each arrow and fade disappear at its own end.') +
          fig(t_three(), '<b>T3 · Three tabs.</b> Positions | Activity | About, where About is one page with Details, Collateral and Analytics as sections. Fewest choices.') +
          fig(t_more(), '<b>T4 · Three + More.</b> The three most used tabs, and More opens a small menu with Collateral and Analytics (shown open).'))
    page = ('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Faucet and vault tabs</title>'
            '<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet"><style>' + CSS + '</style></head><body>'
            '<div class="top"><h1>Test faucet and vault tabs</h1><p>Previews only, everything is tappable. The faucet options keep the existing component\'s contract (the same token list, one tap per token, the same note), so only its look and tap feedback change.</p></div>'
            '<section id="f"><h2>Test faucet in Profile</h2><div class="row">' + s1 + '</div></section>'
            '<section id="t"><h2>Earn › vault: tabs that don\'t hide</h2><div class="row">' + s2 + '</div></section>'
            '<script>' + JS + '</script></body></html>')
    out = os.path.join(CMP, 'previews', 'faucet-tabs.html')
    open(out, 'w', encoding='utf8').write(page)
    return out


def shots(out, video):
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page(viewport={'width': 1760, 'height': 1000})
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto('file:///' + out.replace('\\', '/'), wait_until='networkidle'); pg.wait_for_timeout(600)
        # show the states: one token getting, one sent; the More menu open
        pg.evaluate("""() => { document.querySelectorAll('#f figure').forEach(f => { const t = f.querySelectorAll('[data-tap]'); if (t[1]) t[1].click(); });
            document.querySelectorAll('[data-menu]').forEach(m => m.click()); }""")
        pg.wait_for_timeout(1500)
        pg.evaluate("() => document.querySelectorAll('#f figure').forEach(f => { const t = f.querySelectorAll('[data-tap]'); if (t[3]) t[3].click(); })")
        pg.wait_for_timeout(300)
        for sid in ('f', 't'):
            pg.locator('#' + sid + ' .row').screenshot(path=os.path.join(CMP, 'renders', 'faucet-tabs-%s.png' % sid))
        print('errors:', errs[:3])
        if video:
            with tempfile.TemporaryDirectory() as tmp:
                ctx = b.new_context(viewport={'width': 1300, 'height': 860}, record_video_dir=tmp, record_video_size={'width': 1300, 'height': 860})
                v = ctx.new_page(); v.goto('file:///' + out.replace('\\', '/'), wait_until='networkidle')
                v.evaluate("() => { document.querySelector('.top').style.display = 'none'; document.querySelector('#t').style.display = 'none'; document.querySelectorAll('h2, figcaption').forEach(e => e.style.display = 'none'); }")
                v.wait_for_timeout(500)
                for i in (0, 2, 5):
                    v.evaluate("i => document.querySelectorAll('#f figure').forEach(f => { const t = f.querySelectorAll('[data-tap]'); if (t[i]) t[i].click(); })", i)
                    v.wait_for_timeout(900)
                v.wait_for_timeout(3000)
                webm = v.video.path(); ctx.close()
                mp4 = os.path.join(CMP, 'renders', 'faucet-tap.mp4')
                subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-ss', '0.4', '-i', webm, '-vf', 'crop=1300:850:0:0', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', mp4], check=True)
                print(mp4)
        b.close()


if __name__ == '__main__':
    o = build()
    print(o)
    shots(o, '--video' in sys.argv)
