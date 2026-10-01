"""Preview (not implemented): ideas for Portfolio's "Explore vanna" area and for a Farm screen without numbered steps.
Built from the research board (compare/previews/research.html). Vanna style: real header, tabs, brand mark, token icons,
Plus Jakarta Sans, Vanna tokens (light + dark via the toggle).

    python compare/tools/preview_ideas.py   -> compare/previews/ideas.html + compare/renders/ideas-explore.png, ideas-farm.png

Numbers: devnet 1 Oct 2026 (TSLAx vault 1.82%, Kamino USDC 5.03%, USDC borrow 0.81%, TSLAx $353.59) and the prototype's
wallet (1.25 TSLAx = $441.99). Health and liquidation figures are what the backend would send; shown here for layout.
"""
import json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
CMP = os.path.dirname(HERE)
sys.path.insert(0, HERE)
import material_icons as mi                               # noqa: E402
from spaces import switcher, lockup, band_style, panel_bg  # noqa: E402

IMG = json.load(open(os.path.join(CMP, 'src', 'img.json'), encoding='utf8'))
TSLA, USDC, SOL = IMG['a9a1db51309a512ccf9302f8acc244d2'], IMG['022fc945e265208f7997f02a7fbdd97f'], IMG['6fe33337309fb2af41d7bb3a0961ebff']
GOOG, AAPL, OPENAI = IMG['cad380b03cb4c689f02e014100f56452'], IMG['74e439ecf30e3316195f26ae04a1689e'], IMG['68c99bf0397471dc2d806cfaa2e15d53']
SPACE_INK = {'earn': '#137A82', 'trade': '#3F3AD8', 'farm': '#E0006B', 'portfolio': '#703AE6'}


def ic(name, weight='regular', size=22):
    return ('<svg width="%d" height="%d" viewBox="0 -960 960 960" fill="currentColor" aria-hidden="true">%s</svg>'
            % (size, size, ''.join('<path d="%s"></path>' % d for d in mi.material(name, weight))))


def coin(src, size=40, ring=False):
    return ('<img src="%s" alt="" style="width:%dpx;height:%dpx;border-radius:50%%;display:block;flex-shrink:0;%s">'
            % (src, size, size, 'box-shadow:0 0 0 2px var(--card)' if ring else ''))


def pair(a, b, size=40):
    return ('<span style="position:relative;width:%dpx;height:%dpx;flex-shrink:0;display:block">%s<span style="position:absolute;right:-4px;bottom:-4px">%s</span></span>'
            % (size, size, coin(a, size), coin(b, int(size * 0.6), True)))


def hf(v, label, tone):
    c = {'safe': 'var(--pos)', 'mod': 'var(--warn)', 'risk': 'var(--neg)'}[tone]
    return '<span style="display:inline-flex;align-items:center;gap:6px;white-space:nowrap"><span style="width:8px;height:8px;border-radius:50%%;background:%s"></span>%s · %s</span>' % (c, v, label)


def space_icon(space, name):
    return ('<span style="width:40px;height:40px;border-radius:50%%;flex-shrink:0;display:flex;align-items:center;justify-content:center;'
            'background:color-mix(in srgb, %s 14%%, var(--card));color:%s">%s</span>' % (SPACE_INK[space], 'var(--ink-%s)' % space, ic(name, 'regular', 22)))


def btn(label, kind='tonal', extra=''):
    style = {'tonal': 'background:var(--tv);color:var(--tvI)', 'primary': 'background:#703AE6;color:#FFFFFF',
             'text': 'background:transparent;color:var(--link);padding:0 8px', 'danger': 'background:var(--neg);color:#FFFFFF'}[kind]
    return '<span class="btn" style="%s;%s">%s</span>' % (style, extra, label)


# ---------------------------------------------------------------- shared chrome

def header(space, panel):
    return ('<div style="' + band_style(space) + ';color:#FFFFFF">'
            '<div class="sb"><span>12:30</span><span>&#9679;&#9679;&#9679; &#9650; &#9646;</span></div>'
            '<div style="height:52px;display:flex;align-items:center;gap:8px;padding:0 4px">' + lockup() + '<span style="flex:1"></span>'
            '<span style="width:44px;height:44px;display:flex;align-items:center;justify-content:center">' + ic('notifications', 'regular', 22) + '</span>'
            '<span style="width:36px;height:36px;border-radius:50%;background:#111;box-shadow:0 0 0 2px rgba(255,255,255,.7)"></span></div>'
            + switcher(space) + '</div>'
            '<div style="' + panel_bg(space) + 'border-radius:0 0 28px 28px;padding:20px 16px;color:#FFFFFF">' + panel + '</div>')


def stat_row(items):
    return ('<div style="margin-top:16px;padding-top:14px;border-top:1px solid rgba(255,255,255,.16);display:grid;grid-template-columns:repeat(%d,minmax(0,1fr));gap:12px">' % len(items)
            + ''.join('<div style="min-width:0;%s"><div style="font-size:12px;color:rgba(255,255,255,.72)">%s</div><div style="font-size:15px;font-weight:600;white-space:nowrap">%s</div></div>'
                      % ('' if i == 0 else 'padding-left:12px;border-left:1px solid rgba(255,255,255,.18)', k, v) for i, (k, v) in enumerate(items)) + '</div>')


def portfolio_panel(wallet='$4,812<span style="opacity:.56">.40</span>', margin='$10,592<span style="opacity:.56">.29</span>', stats=None):
    stats = stats or [('Net available', '$4,320.37'), ('Total borrowed', '$6,271.92'), ('Net earnings', '<span style="color:#32EEE2">+$1.37</span>')]
    return ('<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">'
            '<div><div style="font-size:14px;opacity:.78">Wallet balance</div><div class="big">' + wallet + '</div></div>'
            '<div><div style="font-size:14px;opacity:.78">Margin account</div><div class="big">' + margin + '</div></div></div>' + stat_row(stats))


NAVS = {'portfolio': [('Overview', 'home', True), ('Lender', 'toll', False), ('Trader', 'trending_up', False)],
        'farm': [('Deploy', 'psychiatry', True), ('Position', 'layers', False), ('History', 'history', False)]}


def nav(space):
    ink = 'var(--ink-farm-nav)' if space == 'farm' else 'var(--link)'
    return ('<nav class="nav">' + ''.join(
        '<span style="color:%s"><span style="height:32px;display:flex;align-items:center">%s</span><span style="font-size:12px;%s">%s</span></span>'
        % (ink if on else 'var(--text2)', ic(i, 'fill' if on else 'regular', 22), 'font-weight:600' if on else '', l) for l, i, on in NAVS[space]) + '</nav>')


def phone(space, panel, body, cap, tag='', sticky='', overlay=''):
    return ('<figure class="phone"><div class="screen"><div class="scroll' + (' has-sticky' if sticky else '') + '">' + header(space, panel) +
            '<div class="body">' + body + '</div></div>' + sticky + nav(space) + overlay + '</div>'
            '<figcaption><b>' + tag + '</b>' + cap + '</figcaption></figure>')


def h2(text, right=''):
    return '<div class="h2"><span>%s</span>%s</div>' % (text, '<span class="link">%s</span>' % right if right else '')


def positions_card(n=2):
    rows = [(TSLA, 'TSLAx', 'Long 3x', '+$152.52', '+10.89%'), (OPENAI, 'OPENAI', 'Short 2x', '+$57.71', '+5.77%'), (GOOG, 'GOOGLx farm', 'Farm 4x', '+$1.47', '4.23% net APR')][:n]
    return h2('Your positions', 'See all') + '<div class="card list">' + ''.join(
        '<div class="row">%s<span class="grow"><span class="t">%s</span><span class="s">%s</span></span><span class="r"><span class="t pos">%s</span><span class="s">%s</span></span></div>'
        % (coin(s, 36), n_, k, p, q) for s, n_, k, p, q in rows) + '</div>'


# ---------------------------------------------------------------- Explore ideas

def next_step_idle():
    return ('<div class="card nudge"><div style="display:flex;gap:12px;align-items:flex-start">' + coin(TSLA, 40) +
            '<span class="grow"><span class="eyebrow">NEXT STEP</span><span class="t">1.25 TSLAx is sitting idle</span>'
            '<span class="s2">Supply it to the TSLAx vault: <b class="pos">1.82% APY</b>, about $8 a year. No leverage, withdraw anytime.</span></span>'
            '<span class="x" aria-label="Dismiss">' + ic('close', 'regular', 20) + '</span></div>'
            '<div class="actions">' + btn('Supply TSLAx', 'primary') + btn('Not now', 'text') + '</div></div>')


def next_step_risk():
    return ('<div class="card nudge risk"><div style="display:flex;gap:12px;align-items:flex-start">'
            '<span class="ic-risk">' + ic('warning', 'fill', 22) + '</span>'
            '<span class="grow"><span class="eyebrow neg">NEEDS ATTENTION</span><span class="t">Your TSLAx long is close to liquidation</span>'
            '<span class="s2">Health&nbsp; ' + hf('1.18', 'At risk', 'risk') + '. Liquidation happens at 1.10. Add collateral or reduce the position.</span></span></div>'
            '<div class="actions">' + btn('Add collateral', 'primary') + btn('View position', 'text') + '</div></div>')


def your_vanna(rows):
    return h2('Your Vanna') + '<div class="card list">' + ''.join(rows) + '</div>'


def vrow(space, icon_name, title, sub, right):
    return ('<div class="row">' + space_icon(space, icon_name) + '<span class="grow"><span class="t">%s</span><span class="s">%s</span></span>%s</div>' % (title, sub, right))


def num(v, s, pos=True):
    return '<span class="r"><span class="t %s">%s</span><span class="s">%s</span></span>' % ('pos' if pos else '', v, s)


def chev():
    return '<span style="color:var(--text2);display:flex">' + ic('chevron_right', 'regular', 22) + '</span>'


VANNA_ROWS = [   # one row per space; tapping opens that space's positions, so there is no separate "Your positions" list
    vrow('earn', 'savings', 'Earn', '2 vaults · USDC, SOL', num('$2,677.87', 'supplied', False)),
    vrow('trade', 'candlestick_chart', 'Trade', '2 positions · ' + hf('1.69', 'Safe', 'safe'), num('+$210.23', 'open PnL')),
    vrow('farm', 'psychiatry', 'Farm', 'GOOGLx 4× · ' + hf('1.33', 'Moderate', 'mod'), num('+$1.47', 'earned')),
]


def explore_ideas():
    p = portfolio_panel()
    out = []
    out.append(phone('portfolio', p, next_step_idle() + your_vanna(VANNA_ROWS),
                     ' One "next step" card (only when useful), then one row per space with your own numbers. It replaces both the tiles and "Your positions": tap a row to see that space\'s positions.',
                     '1 · Next step + Your Vanna (recommended).'))
    out.append(phone('portfolio', p, next_step_risk() + your_vanna(VANNA_ROWS),
                     ' Same layout when something is wrong: risk always wins the top slot and cannot be dismissed. Below 1.50 the dot turns pink, at 1.10 it is liquidated.',
                     '1b · Same idea, risk state.'))
    newp = portfolio_panel('$250<span style="opacity:.56">.00</span>', '$0<span style="opacity:.56">.00</span>',
                           [('Net available', '$0.00'), ('Total borrowed', '$0.00'), ('Net earnings', '$0.00')])
    pitch = [vrow('earn', 'savings', 'Earn <span class="chip">Start here</span>', 'Up to <b class="pos">1.82% APY</b> · no leverage', chev()),
             vrow('trade', 'candlestick_chart', 'Trade', 'Long or short TSLAx up to 5x', chev()),
             vrow('farm', 'psychiatry', 'Farm', '<b class="pos">5.03%</b> on Kamino with your stock', chev())]
    learn = ('<div class="card list"><div class="row">' + space_icon('portfolio', 'school') + '<span class="grow"><span class="t" style="font-size:14px">New to leverage?</span>'
             '<span class="s">How health and liquidation work, in 2 minutes</span></span>' + chev() + '</div></div>')
    out.append(phone('portfolio', newp, your_vanna(pitch) + learn,
                     ' Before any deposit the rows are short pitches with real numbers, Earn marked as the safe place to start. After the first deposit they turn into idea 1.',
                     '1c · Same idea, new user.'))
    tiles = [('earn', 'savings', 'Earn', '$2,677.87', '2 vaults'), ('trade', 'candlestick_chart', 'Trade', '+$210.23', '2 open · 1.69'),
             ('farm', 'psychiatry', 'Farm', '+$1.47', '1 farm · 1.33')]
    grad = {'earn': 'linear-gradient(155deg,#1C9AA3 -20%,#137A82 45%,#0A464B 115%)', 'trade': 'linear-gradient(155deg,#6B67F0 -10%,#3F3AD8 40%,#231F86 110%)',
            'farm': 'linear-gradient(155deg,#FC5457 -20%,#FF007A 40%,#8C0043 110%)', 'portfolio': 'linear-gradient(155deg,#8D61EB -10%,#703AE6 45%,#3E207F 110%)'}
    tile_html = '<div class="tiles">' + ''.join(
        '<div class="tile" style="background:%s"><span class="tic">%s</span><span class="tn">%s</span><span class="tv">%s</span><span class="ts">%s</span></div>'
        % (grad[s], ic(i, 'regular', 20), n, v, sub) for s, i, n, v, sub in tiles) + '</div>'
    out.append(phone('portfolio', p, h2('Your Vanna') + tile_html,
                     ' Keeps today\'s tiles and colours, but each shows your number instead of a slogan, and they replace "Your positions". Swap is dropped here because Trade already has it.',
                     '2 · Tiles with your numbers.'))
    assets = h2('Your assets') + '<div class="card list">' + ''.join(
        '<div class="row">%s<span class="grow"><span class="t">%s</span><span class="s">%s</span></span>%s</div>' % (coin(s, 36), n, sub, r) for s, n, sub, r in [
            (TSLA, 'TSLAx', '1.25 · $353.59', num('$441.99', '+1.2% today')),
            (USDC, 'USDC', '3,120.40 · $1.00', num('$3,120.40', '0.0% today', False)),
            (SOL, 'SOL', '1.50 · $118.58', num('$177.87', '−0.8% today', False))]) + '</div>'
    out.append(phone('portfolio', p, assets + positions_card(3),
                     ' Like Phantom: what is in your wallet, then your positions as today. Built only from data the app already has (balances and prices).',
                     '3 · Your assets + positions.'))
    out.append(phone('portfolio', p, assets + positions_card(3),
                     ' Tapping an asset opens what you can do with it, each with its one key number. No quick-actions row, so nothing repeats the tabs; the actions only appear when asked for.',
                     '3b · Tap an asset.', overlay=asset_sheet()))
    return ''.join(out)


def asset_sheet():
    rows = [('earn', 'savings', 'Supply to Earn', 'Earn <b class="pos">1.82% APY</b> · no leverage, withdraw anytime'),
            ('farm', 'psychiatry', 'Farm with it', 'Keep it as collateral, earn <b class="pos">5.03%</b> on Kamino'),
            ('trade', 'swap_horiz', 'Swap', 'Into USDC, SOL or any token')]
    return ('<div class="scrim"></div><div class="sheet"><div class="grab"></div>'
            '<div style="display:flex;align-items:center;gap:12px">' + coin(TSLA, 44) +
            '<span class="grow"><span class="t" style="font-size:20px;line-height:28px">TSLAx</span><span class="s">1.25 in your wallet · $441.99</span></span></div>'
            '<div class="list" style="margin-top:12px">' + ''.join(
                '<div class="row" style="border-top:1px solid var(--line)">' + space_icon(sp, i) + '<span class="grow"><span class="t">%s</span><span class="s">%s</span></span>%s</div>' % (t, s, chev())
                for sp, i, t, s in rows) + '</div></div>')


# ---------------------------------------------------------------- Farm ideas

LEV = {'1.5×': ('2.11%', '$9.33', '220.99', '3.00', 'Safe', 'safe', '$17.68', '95%'), '2×': ('4.22%', '$18.65', '441.99', '2.00', 'Safe', 'safe', '$35.36', '90%'),
       '3×': ('8.44%', '$37.31', '883.98', '1.50', 'Safe', 'safe', '$70.72', '80%'), '5×': ('16.88%', '$74.61', '1,767.96', '1.25', 'Moderate', 'mod', '$141.44', '60%')}


def farm_panel(lev='2×', label='You earn'):   # header = the result; inputs live below, so nothing repeats
    apy, yr, bor, h, hl, tone, liq, fall = LEV[lev]
    tone_c = {'safe': '#32EEE2', 'mod': '#FFB0D6'}[tone]
    return ('<div style="font-size:14px;opacity:.8">' + label + '</div><div class="big2">' + apy + ' <span style="font-size:18px;font-weight:600;opacity:.8">APY</span></div>'
            '<div style="font-size:14px;opacity:.85">≈ ' + yr + ' a year, paid in USDC</div>'
            + stat_row([('Health', '<span style="display:inline-flex;align-items:center;gap:6px"><span style="width:8px;height:8px;border-radius:50%;background:' + tone_c + '"></span>' + h + ' · ' + hl + '</span>'),
                        ('Liquidates if TSLA', 'falls below ' + liq)]))


def pool_chip():
    return ('<div class="card pool">' + pair(USDC, USDC, 36).replace(USDC, USDC, 1) +
            '<span class="grow"><span class="s">Yield pool</span><span class="t">Kamino · USDC <b class="pos">5.03%</b></span></span>' + ic('expand_more', 'regular', 22) + '</div>')


def deposit_card():
    return ('<div class="card"><div class="lbl"><span>You deposit</span><span>Wallet 1.25 · <b class="link">Max</b></span></div>'
            '<div style="display:flex;align-items:center;justify-content:space-between;margin-top:6px"><span class="amt">1.25</span>'
            '<span class="tok">' + coin(TSLA, 28) + 'TSLAx' + ic('expand_more', 'regular', 18) + '</span></div><div class="s">≈ $441.99</div></div>')


def lev_chips(sel='2×'):
    return ('<div class="card"><div class="lbl"><span>Leverage</span></div><div class="chips">' +
            ''.join('<span class="chipb%s">%s%s</span>' % (' on' if k == sel else '', ic('check', 'regular', 16) if k == sel else '', k) for k in ['1.5×', '2×', '3×', '5×']) +
            '<span class="chipb">' + ic('tune', 'regular', 16) + 'Custom</span></div>'
            '<div class="s" style="margin-top:10px">Borrows ' + LEV[sel][2] + ' USDC from Vanna at 0.81%</div></div>')


def details_row():
    return ('<div class="card list"><div class="row" style="min-height:52px"><span class="grow"><span class="t" style="font-size:14px">Details</span>'
            '<span class="s">Pool usage, fees and how it works</span></span>' + ic('expand_more', 'regular', 22) + '</div></div>')


STICKY = '<div class="sticky">' + btn('Review', 'primary', 'width:100%;height:52px;border-radius:26px;font-size:16px') + '</div>'


def sheet():
    rows = [('You deposit', '1.25 TSLAx · $441.99'), ('You borrow', '441.99 USDC at 0.81%'), ('Kamino pays', '5.03% on it'),
            ('Health', hf('2.00', 'Safe', 'safe')), ('Liquidation', 'if TSLA &lt; $35.36'), ('Network fee', '≈ 0.00005 SOL')]
    return ('<div class="scrim"></div><div class="sheet"><div class="grab"></div><div class="t" style="font-size:20px">Review farm</div>'
            '<div class="big3">≈ $18.65 <span style="font-size:16px;color:var(--text2);font-weight:500">a year</span></div>'
            '<div class="s">4.22% APY on your TSLAx, variable</div><div class="list" style="margin-top:12px">' +
            ''.join('<div class="kv"><span>%s</span><b>%s</b></div>' % r for r in rows) +
            '</div><div class="warnline">' + ic('info', 'regular', 18) + '<span>Rates change. If Kamino pays less than the borrow rate, you pay instead of earn.</span></div>' +
            btn('Approve in wallet' + ic('account_balance_wallet', 'regular', 18), 'primary', 'width:100%;height:52px;border-radius:26px;font-size:16px;gap:8px;margin-top:14px') + '</div>')


def slider_card():
    marks = ['1x', '2x', '3x', '4x', '5x']
    return ('<div class="card"><div class="lbl"><span>Leverage</span></div>'
            '<div class="slider"><div class="track"></div><div class="fill" style="width:25%"></div>' +
            ''.join('<span class="mk" style="left:%d%%"><i%s></i>%s</span>' % (i * 25, ' class="on"' if i <= 1 else '', m) for i, m in enumerate(marks)) +
            '<span class="thumb" style="left:25%"><img src="' + IMG['ef5faa62df31da21c9379ab31ec4247a'] + '" alt=""></span></div>'
            '<div class="s" style="margin-top:4px">Borrows 441.99 USDC from Vanna at 0.81%</div></div>')


def farm_ideas():
    out = []
    body = pool_chip() + deposit_card() + lev_chips() + details_row()
    out.append(phone('farm', farm_panel(), body,
                     ' No numbered steps. The header shows the result live (APY, money a year, health, liquidation); you only touch the amount and leverage. The long table moves into Details.',
                     '1 · One panel (recommended).', sticky=STICKY))
    out.append(phone('farm', farm_panel(), body, ' Rates, fees and the wallet step only appear here, in one sheet, then the wallet opens.',
                     '1b · Review sheet.', overlay=sheet()))
    out.append(phone('farm', farm_panel(), pool_chip() + deposit_card() + slider_card() + details_row(),
                     ' Same one-panel idea but keeps today\'s slider with the Vanna mark as the handle. Closest to the current screen.',
                     '2 · One panel, current slider.', sticky=STICKY))
    presets = h2('How hard should your TSLAx work?') + ''.join(
        '<div class="card preset%s"><div style="display:flex;justify-content:space-between;align-items:center"><span class="t">%s <span class="s" style="display:inline">%s</span></span>%s</div>'
        '<div style="display:flex;align-items:baseline;gap:8px;margin-top:4px"><span class="big3 pos" style="font-size:24px">%s</span><span class="s">≈ %s a year</span></div>'
        '<div class="s" style="margin-top:6px">%s · liquidates if TSLA falls %s</div></div>'
        % (' on' if k == '2×' else '', name, k, ic('radio_button_checked' if k == '2×' else 'radio_button_unchecked', 'fill' if k == '2×' else 'regular', 22),
           LEV[k][0], LEV[k][1], hf(LEV[k][3], LEV[k][4], LEV[k][5]), LEV[k][7])
        for name, k in [('Steady', '1.5×'), ('Balanced', '2×'), ('Boosted', '5×')]) + '<div class="link" style="text-align:center;margin-top:12px;font-weight:600">Custom leverage</div>'
    preset_panel = ('<div style="font-size:14px;opacity:.8">Farm your TSLAx</div><div class="big2">1.25 <span style="font-size:18px;opacity:.8">TSLAx</span></div>'
                    '<div style="font-size:14px;opacity:.85">≈ $441.99 in your wallet · Kamino USDC pool</div>')
    out.append(phone('farm', preset_panel, presets,
                     ' Three named choices instead of a number; the amount comes on the next screen. Easiest for newcomers, but it markets the 5× option and adds a screen.',
                     '3 · Presets.', sticky=STICKY.replace('Review', 'Continue')))
    home_panel = ('<div style="font-size:14px;opacity:.8">Your farms</div><div class="big2">$1,231<span style="opacity:.56">.40</span></div>'
                  + stat_row([('Earned', '<span style="color:#32EEE2">+$1.47</span>'), ('Net APR', '4.23%')]))
    strat = h2('Your farms') + '<div class="card list">' + vrow_farm(GOOG, 'GOOGLx → Kamino USDC', '4× · since 12 Sep', '<span class="s" style="font-size:14px;color:var(--text)">' + hf('1.33', 'Moderate', 'mod') + '</span>') + '</div>'
    strat += h2('Start a farm') + '<div class="card list">' + ''.join(vrow_farm(s, n, sub, num(up, 'up to', True)) for s, n, sub, up in [
        (TSLA, 'TSLAx → Kamino USDC', 'You hold 1.25 · borrow at 0.81%', '16.9%'),
        (AAPL, 'AAPLx → Kamino USDC', 'Borrow at 0.81%', '16.9%'),
        (TSLA, 'TSLAx → Kamino SOL', 'Borrow SOL at 1.16%', '9.2%')]) + '</div>'
    out.append(phone('farm', home_panel, strat,
                     ' Farm opens on your farms and a list of ready-made strategies; tapping one opens idea 1 with the pool already chosen. Best once there are several pools.',
                     '4 · Strategy list first.'))
    return ''.join(out)


def vrow_farm(src, title, sub, right):
    return ('<div class="row">' + pair(src, USDC, 40) + '<span class="grow"><span class="t">%s</span><span class="s">%s</span></span>%s</div>' % (title, sub, right))


CSS = '''
:root{--page:#F7F7F7;--card:#FFFFFF;--text:#1F1F1F;--text2:#595959;--line:#F4F4F4;--bd:#E5E7EB;--pos:#1C7C83;--neg:#B33C3E;--warn:#8C0043;--link:#703AE6;
--tv:#F1EBFD;--tvI:#5029A3;--tr:#FFE6F2;--nav:#FFFFFF;--shadow:0 1px 2px rgba(17,17,17,.04),0 8px 24px rgba(17,17,17,.05);--bg:#EDEBF3;
--ink-earn:#137A82;--ink-trade:#3F3AD8;--ink-farm:#E0006B;--ink-portfolio:#703AE6;--ink-farm-nav:#FF007A}
:root[data-theme="dark"]{--page:#111111;--card:#1E1E1E;--text:#FFFFFF;--text2:#BFBFBF;--line:#2C2C2C;--bd:#2C2C2C;--pos:#32EEE2;--neg:#FC5457;--warn:#FFB0D6;--link:#BDA4F4;
--tv:#2F1B61;--tvI:#D3C2F7;--tr:#3A0F22;--nav:#1E1E1E;--shadow:none;--bg:#1A1A1F;--ink-earn:#32EEE2;--ink-trade:#A9A6FF;--ink-farm:#FF7AB8;--ink-portfolio:#BDA4F4;--ink-farm-nav:#FF7AB8}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font-family:'Plus Jakarta Sans',system-ui,sans-serif;font-variant-numeric:tabular-nums}
.top{max-width:1500px;padding:24px 28px 0;display:flex;gap:16px;align-items:center;flex-wrap:wrap}.top h1{margin:0;font-size:24px;font-weight:600}
.top p{margin:0;flex-basis:100%;color:var(--text2);font-size:14px;max-width:900px}
.top button{height:36px;padding:0 14px;border-radius:18px;border:1px solid rgba(127,127,127,.3);background:var(--card);color:var(--text);font:600 14px 'Plus Jakarta Sans';cursor:pointer}
section{padding:8px 28px 28px}section h2{font-size:20px;font-weight:600;margin:20px 0 4px}section>p{margin:0 0 16px;color:var(--text2);font-size:14px;max-width:900px}
.row-wrap{display:flex;gap:28px;flex-wrap:wrap;align-items:flex-start}
.phone{margin:0;display:flex;flex-direction:column;gap:12px;width:412px;max-width:calc(100vw - 32px)}
.screen{position:relative;height:860px;border-radius:36px;overflow:hidden;background:var(--page);box-shadow:0 0 0 9px #0B0B0D,0 30px 60px -20px rgba(47,27,97,.4)}
.scroll{position:absolute;inset:0 0 80px 0;overflow-y:auto}.scroll.has-sticky{bottom:152px}
figcaption{font-size:14px;line-height:20px;color:var(--text2)}figcaption b{color:var(--text)}
.sb{height:28px;margin-top:-28px;display:flex;align-items:center;justify-content:space-between;padding:0 4px;font-size:12px;font-weight:600}
.big{font-size:28px;line-height:36px;font-weight:600;letter-spacing:-.02em}.big2{font-size:36px;line-height:44px;font-weight:600;letter-spacing:-.02em}
.big3{font-size:30px;line-height:38px;font-weight:600;letter-spacing:-.02em}
.body{padding:16px 16px 24px;display:flex;flex-direction:column;gap:12px}
.h2{display:flex;justify-content:space-between;align-items:baseline;margin-top:8px;font-size:20px;line-height:28px;font-weight:600}
.link{color:var(--link);font-size:14px}.pos{color:var(--pos)}.neg{color:var(--neg)}
.card{border-radius:16px;background:var(--card);box-shadow:var(--shadow);padding:16px}.card.list{padding:4px 16px}
.row{min-height:68px;display:flex;align-items:center;gap:12px}.row+.row{border-top:1px solid var(--line)}
.grow{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
.t{font-size:16px;line-height:22px;font-weight:600}.s{font-size:12px;line-height:16px;color:var(--text2)}.s2{font-size:14px;line-height:20px;color:var(--text2)}
.r{display:flex;flex-direction:column;align-items:flex-end;text-align:right}
.btn{height:40px;padding:0 16px;border-radius:20px;font-size:14px;font-weight:600;display:inline-flex;align-items:center;justify-content:center;white-space:nowrap;flex-shrink:0}
.nudge .eyebrow,.eyebrow{font-size:12px;font-weight:600;letter-spacing:.04em;color:var(--link)}.eyebrow.neg{color:var(--neg)}
.nudge .x{color:var(--text2);display:flex}.actions{display:flex;gap:8px;margin-top:14px;padding-left:52px}
.nudge.risk{box-shadow:inset 0 0 0 1.5px var(--neg),var(--shadow)}.ic-risk{width:40px;height:40px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:var(--tr);color:var(--neg)}
.steps{margin-top:10px}.step{min-height:56px;display:flex;align-items:center;gap:12px;color:var(--text2)}.step+.step{border-top:1px solid var(--line)}
.step .grow{color:var(--text);font-size:14px;font-weight:600}.step.done{color:var(--pos)}.step.done .grow{color:var(--text2);text-decoration:line-through;font-weight:500}
.tiles{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.tile{height:132px;border-radius:16px;padding:12px;color:#fff;display:flex;flex-direction:column}
.tic{width:32px;height:32px;border-radius:50%;background:rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center}
.tn{margin-top:auto;font-size:14px;font-weight:600;opacity:.9}.tv{font-size:18px;line-height:24px;font-weight:600;white-space:nowrap}.ts{font-size:12px;opacity:.8}
.qa{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.qa>span{display:flex;flex-direction:column;align-items:center;gap:6px;font-size:12px;font-weight:600}
.qic{width:52px;height:52px;border-radius:50%;background:var(--card);box-shadow:var(--shadow);display:flex;align-items:center;justify-content:center;color:var(--link)}
.chip{font-size:11px;font-weight:600;padding:2px 6px;border-radius:6px;background:var(--tv);color:var(--tvI);vertical-align:middle;margin-left:4px}
.pool{display:flex;align-items:center;gap:12px;padding:12px 16px}.lbl{display:flex;justify-content:space-between;font-size:14px;color:var(--text2)}
.amt{font-size:32px;line-height:40px;font-weight:600}.tok{height:44px;padding:0 10px 0 6px;border-radius:22px;background:var(--page);display:flex;align-items:center;gap:8px;font-weight:600}
.chips{display:flex;gap:8px;margin-top:10px;flex-wrap:wrap}.chipb{height:36px;padding:0 14px;border-radius:8px;border:1px solid var(--bd);display:inline-flex;align-items:center;gap:4px;font-size:14px;font-weight:600}
.chipb.on{background:var(--tv);color:var(--tvI);border-color:transparent}
.sticky{position:absolute;left:0;right:0;bottom:80px;padding:10px 16px;background:var(--page);box-shadow:0 -1px 0 var(--line)}
.nav{position:absolute;left:0;right:0;bottom:0;height:80px;padding:12px 12px 16px;background:var(--nav);display:flex}
.nav>span{flex:1;display:flex;flex-direction:column;align-items:center;gap:4px}
.scrim{position:absolute;inset:0;background:rgba(17,17,17,.42)}.sheet{position:absolute;left:0;right:0;bottom:0;border-radius:28px 28px 0 0;background:var(--card);padding:10px 20px 24px}
.grab{width:32px;height:4px;border-radius:2px;background:var(--bd);margin:0 auto 14px}
.kv{min-height:44px;display:flex;align-items:center;justify-content:space-between;gap:12px;font-size:14px;border-top:1px solid var(--line)}.kv span{color:var(--text2)}.kv b{font-weight:600;text-align:right}
.warnline{margin-top:10px;display:flex;gap:8px;font-size:12px;line-height:16px;color:var(--text2)}
.slider{position:relative;height:64px;margin:6px 14px 0}.track{position:absolute;left:0;right:0;top:19px;height:4px;border-radius:2px;background:var(--line)}
.fill{position:absolute;left:0;top:19px;height:4px;border-radius:2px;background:linear-gradient(90deg,#FC5457,#703AE6)}
.mk{position:absolute;top:14px;width:44px;margin-left:-22px;display:flex;flex-direction:column;align-items:center;gap:12px;font-size:12px;font-weight:600;color:var(--text2)}
.mk i{width:14px;height:14px;border-radius:50%;background:var(--bd);border:2px solid var(--card)}.mk i.on{background:#703AE6}
.thumb{position:absolute;top:7px;width:28px;height:28px;margin-left:-14px;border-radius:50%;background:#703AE6;box-shadow:0 4px 12px rgba(112,58,230,.45);display:flex;align-items:center;justify-content:center}
.thumb img{width:16px;height:16px;filter:brightness(0) invert(1)}
.preset{border:1.5px solid transparent}.preset.on{border-color:var(--link)}.preset .t{font-size:16px}
'''


def main():
    page = ('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Vanna ideas: Explore and Farm</title>'
            '<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600&display=swap" rel="stylesheet"><style>' + CSS + '</style></head><body>'
            '<div class="top"><h1>Ideas: Explore and Farm</h1><button id="theme" type="button">Dark mode</button>'
            '<p>Previews only, nothing is built yet. Every screen uses Vanna\'s real header, tabs, colours and token icons. Numbers are devnet (1 Oct 2026) and the prototype wallet; health and liquidation come from the backend. Scroll inside a phone to see the rest of it.</p></div>'
            '<section id="explore"><h2>Portfolio: what replaces "Explore vanna"</h2><p>The four tiles repeat the top tabs. Each idea uses the space for your own state instead.</p><div class="row-wrap">'
            + explore_ideas() + '</div></section>'
            '<section id="farm"><h2>Farm: no numbered steps</h2><p>Today: pool → 1 deposit → 2 leverage → a long table → profit. In every idea the result lives in the header and updates as you change the amount or leverage.</p><div class="row-wrap">'
            + farm_ideas() + '</div></section>'
            '<script>document.getElementById("theme").onclick=function(){var d=document.documentElement.dataset.theme!=="dark";document.documentElement.dataset.theme=d?"dark":"light";this.textContent=d?"Light mode":"Dark mode";};</script>'
            '</body></html>')
    out = os.path.join(CMP, 'previews', 'ideas.html')
    open(out, 'w', encoding='utf8').write(page)
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
        b = p.chromium.launch(); pg = b.new_page(viewport={'width': 2400, 'height': 1000}, device_scale_factor=1)
        pg.goto('file:///' + out.replace('\\', '/'), wait_until='networkidle'); pg.wait_for_timeout(1000)
        for sec in ('explore', 'farm'):
            pg.locator('#' + sec).screenshot(path=os.path.join(CMP, 'renders', 'ideas-%s.png' % sec))
        pg.evaluate('document.documentElement.dataset.theme="dark"'); pg.wait_for_timeout(200)
        for sec in ('explore', 'farm'):
            pg.locator('#' + sec).screenshot(path=os.path.join(CMP, 'renders', 'ideas-%s-dark.png' % sec))
        b.close()
    print(out)


if __name__ == '__main__':
    main()
