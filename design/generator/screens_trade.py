from common import *
import random

PAIRS_JS = """var pairsAll = [
{ pair: 'TSLAx-USDC', name: 'Tesla xStock', price: '$353.59', cap: 'Borrow 4.77%% · Liquidity $24.0K', icon: '%(TSLAx)s', kind: 'xStocks', star: true },
{ pair: 'GOOGLx-USDC', name: 'Alphabet xStock', price: '$339.93', cap: 'Borrow 1.25%% · Liquidity $61.2K', icon: '%(GOOGLx)s', kind: 'xStocks', star: false },
{ pair: 'AAPLx-USDC', name: 'Apple xStock', price: '$332.37', cap: 'Borrow 0.36%% · Liquidity $45.2K', icon: '%(AAPLx)s', kind: 'xStocks', star: false },
{ pair: 'ANTHROPIC-USDC', name: 'Anthropic PreStock', price: '$1,042.77', cap: 'Borrow 0.40%% · Liquidity $127.3K', icon: '%(ANTHROPIC)s', kind: 'PreStocks', star: false },
{ pair: 'OPENAI-USDC', name: 'OpenAI PreStock', price: '$2,117.09', cap: 'Borrow 0.59%% · Liquidity $254.3K', icon: '%(OPENAI)s', kind: 'PreStocks', star: true }
];
""" % TOK


def perps_markets():
    hero_inner = hero_stats('Net available collateral', '$4,320<span style="color: rgba(255,255,255,0.56)">.37</span>') + f"""
<a href="V7PerpsPositions.dc.html" style="margin-top: 16px; padding-top: 14px; border-top: 1px solid rgba(255,255,255,0.16); display: flex; align-items: center; gap: 12px; color: #FFFFFF; text-decoration: none">
<span style="display: flex"><img src="{TOK['TSLAx']}" alt="" style="width: 28px; height: 28px; border-radius: 999px; border: 2px solid #2F1B61"><img src="{TOK['OPENAI']}" alt="" style="width: 28px; height: 28px; border-radius: 999px; border: 2px solid #2F1B61; margin-left: -8px"></span>
<span style="flex-grow: 1; font-size: 14px; font-weight: 600">2 open positions</span>
<span style="font-size: 16px; font-weight: 600; color: #32EEE2">+$210.23</span>
<span style="display: flex; opacity: 0.8">{CHEV}</span>
</a>"""
    row = f"""<sc-for list="{{{{ pairs }}}}" as="p" hint-placeholder-count="5">
<a href="V7PerpsMarket.dc.html" style="height: 72px; display: flex; align-items: center; gap: 12px; border-top: 1px solid {{{{ t.line }}}}; text-decoration: none; color: {{{{ t.text }}}}">
<img src="{{{{ p.icon }}}}" alt="" style="width: 40px; height: 40px; border-radius: 999px; flex-shrink: 0">
<span style="flex-grow: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px"><span style="font-size: 14px; line-height: 20px; font-weight: 600; display: flex; align-items: center; gap: 6px">{{{{ p.pair }}}}<sc-if value="{{{{ p.star }}}}" hint-placeholder-val="{{{{ false }}}}"><span style="color: #9F7BEE; display: flex">{ic('star', 14, 'fill')}</span></sc-if></span><span style="font-size: 12px; line-height: 16px; color: {{{{ t.text2 }}}}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis">{{{{ p.cap }}}}</span></span>
<span style="font-size: 14px; line-height: 20px; font-weight: 600">{{{{ p.price }}}}</span>
</a>
</sc-for>"""
    body = scroller(f"""{hero('perps', hero_inner)}
<div style="padding: 16px 16px 0 16px; display: flex; flex-direction: column; gap: 12px">
<label style="height: 48px; padding: 0 16px; border-radius: 24px; background: {{{{ t.card }}}}; box-shadow: {{{{ t.shadow }}}}; border: 1px solid {{{{ t.bd }}}}; display: flex; align-items: center; gap: 10px; color: {{{{ t.text2 }}}}">{ic('magnifying-glass', 18)}<input type="text" placeholder="Search markets" aria-label="Search markets" style="flex-grow: 1; border: 0; outline: 0; background: transparent; font-size: 14px; color: {{{{ t.text }}}}"></label>
<div style="margin: 0 -16px; padding: 0 16px; overflow-x: auto">{chips('filters', 'c', 4)}</div>
<div style="border-radius: 20px; background: {{{{ t.card }}}}; box-shadow: {{{{ t.shadow }}}}; padding: 0 16px">
<div style="height: 40px; display: flex; align-items: center; justify-content: space-between; font-size: 12px; color: {{{{ t.text2 }}}}"><span>Market</span><span>Mark price</span></div>
{row}
</div>
</div>""") + '\n' + capsule('perps', 'Markets')
    js = SEG_JS + PAIRS_JS + """var f = this.state.f || 'All';
var filters = chipList(['All','xStocks','PreStocks','Watchlist'], f, 'f');
var pairs = pairsAll.filter(function (p) { return f === 'All' || (f === 'Watchlist' ? p.star : p.kind === f); });
return { t: t, filters: filters, pairs: pairs };"""
    page('V7Perps', 'Perps markets', body, js)


def candles():
    random.seed(7)
    W, H, n = 380, 184, 34
    vals = []
    p = 318.0
    for i in range(n):
        o = p
        c = o + random.uniform(-6, 7.2)
        hi = max(o, c) + random.uniform(0.5, 4)
        lo = min(o, c) - random.uniform(0.5, 4)
        vals.append((o, hi, lo, c))
        p = c
    # force last close near 353.59
    shift = 353.59 - vals[-1][3]
    vals = [(o + shift * i / n, h + shift * i / n, l + shift * i / n, c + shift * i / n) for i, (o, h, l, c) in enumerate(vals)]
    lo_all = min(v[2] for v in vals) - 4
    hi_all = max(v[1] for v in vals) + 4
    y = lambda v: round(8 + (hi_all - v) / (hi_all - lo_all) * (H - 16), 1)
    step = (W - 44) / n
    out = [f'<svg width="{W}" height="{H}" viewBox="0 0 {W} {H}" role="img" aria-label="TSLAx price, 1 day candles, illustrative" style="display: block">']
    for g in range(4):
        gy = 8 + g * (H - 16) / 3
        val = hi_all - g * (hi_all - lo_all) / 3
        out.append(f'<line x1="0" y1="{gy:.1f}" x2="{W - 44}" y2="{gy:.1f}" stroke="{{{{ t.line }}}}" stroke-width="1"></line><text x="{W}" y="{gy + 4:.1f}" text-anchor="end" font-size="10" fill="{{{{ t.text2 }}}}">{val:.0f}</text>')
    for i, (o, h, l, c) in enumerate(vals):
        cx = i * step + step / 2
        col = '#703AE6' if c >= o else '#FC5457'
        top, bot = y(max(o, c)), y(min(o, c))
        out.append(f'<line x1="{cx:.1f}" y1="{y(h)}" x2="{cx:.1f}" y2="{y(l)}" stroke="{col}" stroke-width="1.2"></line><rect x="{cx - step * 0.32:.1f}" y="{top}" width="{step * 0.64:.1f}" height="{max(bot - top, 1.2):.1f}" rx="1" fill="{col}"></rect>')
    ly = y(353.59)
    out.append(f'<line x1="0" y1="{ly}" x2="{W - 44}" y2="{ly}" stroke="#703AE6" stroke-width="1" stroke-dasharray="3 3"></line><rect x="{W - 42}" y="{ly - 9}" width="42" height="18" rx="4" fill="#703AE6"></rect><text x="{W - 21}" y="{ly + 4}" text-anchor="middle" font-size="10" font-weight="600" fill="#FFFFFF">353.59</text>')
    out.append('</svg>')
    return ''.join(out)


def perps_market():
    top = f"""<header style="height: 56px; margin-top: 28px; padding: 0 8px 0 4px; display: flex; align-items: center; gap: 4px">
<a href="V7Perps.dc.html" aria-label="Back" style="width: 48px; height: 48px; border-radius: 24px; color: {{{{ t.text }}}}; display: flex; align-items: center; justify-content: center">{ic('arrow-left', 22)}</a>
<button type="button" onClick="{{{{ toggleDd }}}}" aria-haspopup="listbox" aria-expanded="{{{{ ddAria }}}}" style="height: 44px; padding: 0 12px 0 6px; border-radius: 22px; border: 1px solid {{{{ t.bd }}}}; background: {{{{ t.card }}}}; color: {{{{ t.text }}}}; display: flex; align-items: center; gap: 8px; font-size: 16px; font-weight: 600"><img src="{{{{ cur.icon }}}}" alt="" style="width: 30px; height: 30px; border-radius: 999px">{{{{ cur.pair }}}}<span style="display: flex; transform: {{{{ ddRot }}}}">{ic('caret-down', 16)}</span></button>
<span style="flex-grow: 1"></span>
<button type="button" aria-label="Add to watchlist" aria-pressed="true" style="width: 44px; height: 44px; border-radius: 22px; border: 0; background: transparent; color: #9F7BEE; display: flex; align-items: center; justify-content: center">{ic('star', 22, 'fill')}</button>
</header>"""
    stat = lambda k, v, bl=False: f'<div style="padding: 12px 0 12px {"16px" if bl else "0"}; display: flex; flex-direction: column; gap: 2px;{" border-left: 1px solid {{ t.line }};" if bl else ""}"><span style="font-size: 12px; line-height: 16px; color: {{{{ t.text2 }}}}">{k}</span><span style="font-size: 14px; line-height: 20px; font-weight: 600">{v}</span></div>'
    dd = f"""<sc-if value="{{{{ dd }}}}" hint-placeholder-val="{{{{ false }}}}">
<div aria-hidden="true" onClick="{{{{ toggleDd }}}}" style="position: absolute; inset: 0; background: {{{{ t.scrim }}}}"></div>
<div role="listbox" aria-label="Markets" style="position: absolute; top: 132px; left: 16px; right: 16px; border-radius: 20px; background: {{{{ t.card }}}}; box-shadow: 0 16px 40px rgba(17,17,17,0.24); padding: 8px; color: {{{{ t.text }}}}">
<sc-for list="{{{{ opts }}}}" as="o" hint-placeholder-count="5">
<button type="button" role="option" aria-selected="{{{{ o.sel }}}}" onClick="{{{{ o.pick }}}}" style="width: 100%; height: 56px; padding: 0 12px; border: 0; border-radius: 14px; background: {{{{ o.bg }}}}; color: {{{{ t.text }}}}; display: flex; align-items: center; gap: 12px; text-align: left"><img src="{{{{ o.icon }}}}" alt="" style="width: 32px; height: 32px; border-radius: 999px"><span style="flex-grow: 1; display: flex; flex-direction: column"><span style="font-size: 14px; line-height: 20px; font-weight: 600">{{{{ o.pair }}}}</span><span style="font-size: 12px; line-height: 16px; color: {{{{ t.text2 }}}}">{{{{ o.name }}}}</span></span><span style="font-size: 14px; font-weight: 600">{{{{ o.price }}}}</span></button>
</sc-for>
</div>
</sc-if>"""
    body = f"""<div style="position: absolute; inset: 0; overflow-y: auto; padding-bottom: 112px">
{top}
<div style="padding: 8px 16px 0 16px">
<div style="font-size: 36px; line-height: 44px; font-weight: 600; letter-spacing: -0.02em">{{{{ cur.price }}}}</div>
<div style="font-size: 14px; line-height: 20px; color: {{{{ t.text2 }}}}">Mark price · {{{{ cur.name }}}}</div>
<div style="margin-top: 16px">{candles()}</div>
<div role="tablist" aria-label="Chart range" style="margin-top: 8px; display: flex; gap: 4px">
<sc-for list="{{{{ ranges }}}}" as="r" hint-placeholder-count="5">
<button type="button" role="tab" aria-selected="{{{{ r.on }}}}" onClick="{{{{ r.pick }}}}" style="flex: 1 1 0; height: 32px; border-radius: 16px; border: 0; background: {{{{ r.bg }}}}; color: {{{{ r.fg }}}}; font-size: 12px; font-weight: 600">{{{{ r.label }}}}</button>
</sc-for>
</div>
<div style="margin-top: 16px; border-radius: 20px; background: {{{{ t.card }}}}; box-shadow: {{{{ t.shadow }}}}; padding: 0 16px; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr))">
{stat('Borrow APY', '4.77%')}{stat('USDC borrow APY', '0.65%', True)}
</div>
<div style="margin-top: 8px; border-radius: 20px; background: {{{{ t.card }}}}; box-shadow: {{{{ t.shadow }}}}; padding: 0 16px; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr))">
{stat('Liquidity', '$24,044 · 68 TSLAx')}{stat('Max leverage', '5x', True)}
</div>
<a href="V7PerpsPositions.dc.html" style="margin-top: 12px; height: 64px; padding: 0 16px; border-radius: 20px; background: {{{{ t.card }}}}; box-shadow: {{{{ t.shadow }}}}; display: flex; align-items: center; gap: 12px; text-decoration: none; color: {{{{ t.text }}}}">
<span style="height: 20px; padding: 0 8px; border-radius: 6px; background: #703AE6; color: #FFFFFF; font-size: 12px; line-height: 20px; font-weight: 600; white-space: nowrap; flex-shrink: 0">Long 3x</span>
<span style="flex-grow: 1; min-width: 0; display: flex; flex-direction: column"><span style="font-size: 14px; line-height: 20px; font-weight: 600">Your position</span><span style="font-size: 12px; line-height: 16px; color: {{{{ t.text2 }}}}; white-space: nowrap">12.31 TSLAx · liq. $250.20</span></span>
<span style="font-size: 16px; font-weight: 600; color: {{{{ t.pos }}}}">+$152.52</span><span style="color: {{{{ t.text2 }}}}; display: flex">{CHEV}</span></a>
<details style="margin-top: 8px; border-radius: 20px; background: {{{{ t.card }}}}; box-shadow: {{{{ t.shadow }}}}; padding: 0 16px"><summary style="height: 56px; display: flex; align-items: center; justify-content: space-between; font-size: 14px; font-weight: 600; list-style: none; cursor: pointer">How funding and liquidation work<span style="color: {{{{ t.text2 }}}}; display: flex">{ic('caret-down', 16)}</span></summary><p style="margin: 0 0 16px 0; font-size: 12px; line-height: 18px; color: {{{{ t.text2 }}}}">You borrow from Vanna vaults to open leverage and pay the borrow APY while the position is open. If your margin account health reaches 1.10, the position is liquidated with a dynamic penalty of 0–15%.</p></details>
</div>
</div>
<div style="position: absolute; left: 0; right: 0; bottom: 0; padding: 12px 16px 24px 16px; background: {{{{ t.page }}}}; border-top: 1px solid {{{{ t.line }}}}; display: flex; gap: 8px">
<a href="V7PerpsOrder.dc.html" style="flex: 1 1 0; height: 52px; border-radius: 26px; background: #703AE6; color: #FFFFFF; font-size: 16px; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 8px; text-decoration: none">{ic('trend-up', 18)}Long</a>
<a href="V7PerpsOrder.dc.html" style="flex: 1 1 0; height: 52px; border-radius: 26px; background: #B33C3E; color: #FFFFFF; font-size: 16px; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 8px; text-decoration: none">{ic('trend-down', 18)}Short</a>
</div>
{dd}"""
    js = PAIRS_JS + """var r = this.state.r || '1D';
var ranges = ['1H','4H','1D','1W','1M'].map(function (l) { var on = l === r; return { label: l, on: on ? 'true' : 'false', bg: on ? t.card : 'transparent', fg: on ? t.text : t.text2, pick: function () { self.setState({ r: l }); } }; });
var sel = this.state.sel || 'TSLAx-USDC';
var cur = pairsAll.filter(function (p) { return p.pair === sel; })[0];
var dd = !!this.state.dd;
var opts = pairsAll.map(function (p) { var on = p.pair === sel; return { pair: p.pair, name: p.name, price: p.price, icon: p.icon, sel: on ? 'true' : 'false', bg: on ? t.page : 'transparent', pick: function () { self.setState({ sel: p.pair, dd: false }); } }; });
return { t: t, ranges: ranges, cur: cur, dd: dd, ddAria: dd ? 'true' : 'false', ddRot: dd ? 'rotate(180deg)' : 'none', opts: opts, toggleDd: function () { self.setState({ dd: !dd }); } };"""
    page('V7PerpsMarket', 'TSLAx market', body, js, props={})


def perps_order():
    body = f"""<div style="position: absolute; inset: 0; overflow-y: auto; padding-bottom: 112px">
{topbar('Open position', 'V7PerpsMarket')}
<div style="padding: 8px 16px 0 16px; display: flex; flex-direction: column; gap: 12px">
<div style="height: 56px; padding: 0 16px; border-radius: 20px; background: {{{{ t.card }}}}; box-shadow: {{{{ t.shadow }}}}; display: flex; align-items: center; gap: 12px">{token('TSLAx', 32)}<span style="flex-grow: 1; font-size: 14px; font-weight: 600">TSLAx-USDC</span><span style="font-size: 14px; font-weight: 600">$353.59</span></div>
<div role="tablist" aria-label="Direction" style="height: 52px; padding: 4px; border-radius: 26px; background: {{{{ t.seg }}}}; display: flex; gap: 4px">
<sc-for list="{{{{ sides }}}}" as="s" hint-placeholder-count="2">
<button type="button" role="tab" aria-selected="{{{{ s.on }}}}" onClick="{{{{ s.pick }}}}" style="flex: 1 1 0; height: 44px; border-radius: 22px; border: 0; background: {{{{ s.bg }}}}; color: {{{{ s.fg }}}}; font-size: 16px; font-weight: 600">{{{{ s.label }}}}</button>
</sc-for>
</div>
<div style="border-radius: 20px; background: {{{{ t.card }}}}; box-shadow: {{{{ t.shadow }}}}; padding: 16px">
<div style="display: flex; justify-content: space-between; font-size: 12px; line-height: 16px; color: {{{{ t.text2 }}}}"><span>Collateral</span><span>Available $4,320.37</span></div>
<div style="margin-top: 8px; display: flex; align-items: center; gap: 12px"><span style="flex-grow: 1; font-size: 32px; line-height: 40px; font-weight: 600; color: {{{{ amtC }}}}">{{{{ amt }}}}</span><span style="height: 40px; padding: 0 12px 0 6px; border-radius: 20px; background: {{{{ t.page }}}}; display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 600">{token('USDC', 28)}USDC</span></div>
<div style="margin-top: 12px; display: flex; gap: 8px">
<sc-for list="{{{{ quick }}}}" as="q" hint-placeholder-count="4">
<button type="button" onClick="{{{{ q.pick }}}}" aria-pressed="{{{{ q.on }}}}" style="flex: 1 1 0; height: 36px; border-radius: 18px; border: 1px solid {{{{ q.bd }}}}; background: {{{{ q.bg }}}}; color: {{{{ q.fg }}}}; font-size: 12px; font-weight: 600">{{{{ q.label }}}}</button>
</sc-for>
</div>
<sc-if value="{{{{ err }}}}" hint-placeholder-val="{{{{ false }}}}"><div style="margin-top: 12px; display: flex; gap: 6px; font-size: 12px; line-height: 16px; color: {{{{ t.neg }}}}">{ic("warning-circle", 16)}<span>{{{{ err }}}}</span></div></sc-if>
</div>
<div style="border-radius: 20px; background: {{{{ t.card }}}}; box-shadow: {{{{ t.shadow }}}}; padding: 16px">
<div style="display: flex; justify-content: space-between; font-size: 12px; line-height: 16px; color: {{{{ t.text2 }}}}"><span>Leverage</span><span style="font-weight: 600; color: {{{{ t.text }}}}">{{{{ levLabel }}}}</span></div>
<div role="radiogroup" aria-label="Leverage" style="margin-top: 12px; display: flex; gap: 8px">
<sc-for list="{{{{ levs }}}}" as="l" hint-placeholder-count="5">
<button type="button" role="radio" aria-checked="{{{{ l.on }}}}" onClick="{{{{ l.pick }}}}" style="flex: 1 1 0; height: 44px; border-radius: 22px; border: 1px solid {{{{ l.bd }}}}; background: {{{{ l.bg }}}}; color: {{{{ l.fg }}}}; font-size: 14px; font-weight: 600">{{{{ l.label }}}}</button>
</sc-for>
</div>
</div>
<div style="border-radius: 20px; background: {{{{ t.card }}}}; box-shadow: {{{{ t.shadow }}}}; padding: 4px 16px">
<sc-for list="{{{{ sum }}}}" as="s" hint-placeholder-count="5">
<div style="min-height: 48px; display: flex; align-items: center; justify-content: space-between; gap: 12px; font-size: 14px; border-bottom: 1px solid {{{{ t.line }}}}"><span style="color: {{{{ t.text2 }}}}">{{{{ s.k }}}}</span><span style="font-weight: 600; text-align: right; color: {{{{ s.c }}}}">{{{{ s.v }}}}</span></div>
</sc-for>
<div style="padding: 12px 0; display: flex; gap: 8px; font-size: 12px; line-height: 16px; color: {{{{ hfC }}}}">{ic('info', 16)}<span>{{{{ hfNote }}}}</span></div>
</div>
</div>
</div>
<div style="position: absolute; left: 0; right: 0; bottom: 0; padding: 12px 16px 24px 16px; background: {{{{ t.page }}}}; border-top: 1px solid {{{{ t.line }}}}">
<button type="button" onClick="{{{{ go }}}}" aria-disabled="{{{{ dis }}}}" style="width: 100%; height: 56px; border-radius: 28px; border: 0; background: {{{{ ctaBg }}}}; color: {{{{ ctaFg }}}}; font-size: 16px; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 8px">{{{{ cta }}}}{ic('wallet', 18)}</button>
</div>
""" + tx_overlay('{{ doneTitle }}', '{{ doneText }}', 'Backpack', 'this order', 'View position', 'V7PerpsPositions')
    js = """var side = this.state.side || 'Long', lev = this.state.lev || 3, amt = this.state.amt === undefined ? 500 : this.state.amt;
var px = 353.59, isL = side === 'Long', sideC = isL ? '#703AE6' : '#B33C3E';
var sides = ['Long','Short'].map(function (l) { var on = l === side; return { label: l, on: on ? 'true' : 'false', bg: on ? (l === 'Long' ? '#703AE6' : '#B33C3E') : 'transparent', fg: on ? '#FFFFFF' : t.text2, pick: function () { self.setState({ side: l }); } }; });
var levs = [1,2,3,4,5].map(function (v) { var on = v === lev; return { label: v + 'x', on: on ? 'true' : 'false', bg: on ? t.chipOn : 'transparent', fg: on ? t.chipOnFg : t.text, bd: on ? t.chipOn : t.bd, pick: function () { self.setState({ lev: v }); } }; });
var Q = [['25%', 1080.09], ['50%', 2160.19], ['75%', 3240.28], ['Max', 4320.37]];
var quick = Q.map(function (q) { var on = Math.abs(q[1] - amt) < 0.01; return { label: q[0], on: on ? 'true' : 'false', bg: on ? t.tv : 'transparent', fg: on ? t.tvI : t.text, bd: on ? t.tv : t.bd, pick: function () { self.setState({ amt: q[1] }); } }; });
var size = amt * lev, units = size / px;
var liq = isL ? px * (1 - 0.8 / lev) : px * (1 + 0.7273 / lev);
var hf = Math.max(1.12, 1.69 - (size - amt) / 20000);
var sum = [
{ k: 'Position size', v: money(size) + ' · ' + units.toFixed(4) + ' TSLAx', c: t.text },
{ k: 'Entry price', v: money(px), c: t.text },
{ k: 'Liquidation price', v: money(liq), c: t.text },
{ k: 'Borrow cost', v: (isL ? '0.65% USDC' : '4.77% TSLAx') + ' APY', c: t.text },
{ k: 'Fees', v: money(size * 0.0003), c: t.text }
];
var avail = 4320.37, over = amt > avail, risky = !over && hf < 1.3;
return { t: t, sides: sides, levs: levs, quick: quick, sum: sum, amt: amt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), amtC: over ? t.neg : t.text,
err: over ? 'Only $4,320.37 is available in your margin account. Lower the amount.' : false, dis: over ? 'true' : 'false', ctaFg: over ? t.offFg : '#FFFFFF',
go: function () { if (!over) self.setState({ __tx: 'sign', __st: 1, __why: '' }); },
hfC: risky ? t.neg : t.text2, hfNote: risky ? 'Account health would drop to ' + hf.toFixed(2) + ', close to liquidation at 1.10. Lower the leverage or the amount.' : 'After this trade your account health is ' + hf.toFixed(2) + '. Liquidation happens at 1.10.', levLabel: lev + 'x · ' + money(size) + ' position', hfAfter: hf.toFixed(2), ctaBg: over ? t.off : sideC, doneTitle: 'Your ' + side.toLowerCase() + ' is open', cta: over ? 'Not enough margin available' : 'Open ' + side.toLowerCase() + ' · approve in wallet', doneText: units.toFixed(4) + ' TSLAx ' + side.toLowerCase() + ' at ' + money(px) + ' · ' + lev + 'x · liq. ' + money(liq) };"""
    for stem, tx, st in [('V7PerpsOrder', '', '{}'), ('V7PerpsOrderSign', 'sign', '{}'), ('V7PerpsOrderConfirm', 'confirm', '{}'), ('V7PerpsOrderDone', 'done', '{}'),
                         ('V7PerpsOrderNoFunds', '', '{ amt: 5000 }'), ('V7PerpsOrderRisky', '', '{ amt: 4320.37, lev: 5 }'), ('V7PerpsOrderFailed', 'failed', "{ __why: 'network' }"), ('V7PerpsOrderRejected', 'rejected', '{}')]:
        page(stem, 'Open position', body, js, state=st, tx_default=tx)


def swap():
    hero_inner = f"""<div style="margin-top: 20px; display: flex; align-items: center; justify-content: space-between">
<span style="font-size: 14px; line-height: 20px; color: #BFBFBF">Swap from</span>
<span style="font-size: 12px; line-height: 16px; color: #BFBFBF">Best route · 0.5% slippage</span>
</div>
<button type="button" onClick="{{{{ toggleSrc }}}}" aria-haspopup="listbox" aria-expanded="{{{{ srcAria }}}}" style="margin-top: 8px; width: 100%; height: 64px; padding: 0 16px; border-radius: 18px; border: 0; background: rgba(255,255,255,0.08); color: #FFFFFF; display: flex; align-items: center; gap: 12px; text-align: left">
<span style="width: 36px; height: 36px; border-radius: 12px; background: #2F1B61; color: #BDA4F4; display: flex; align-items: center; justify-content: center">{ic('wallet', 18)}</span>
<span style="flex-grow: 1; display: flex; flex-direction: column"><span style="font-size: 16px; line-height: 24px; font-weight: 600">{{{{ src.name }}}}</span><span style="font-size: 12px; line-height: 16px; color: #BFBFBF">{{{{ src.cap }}}}</span></span>
<span style="display: flex; transform: {{{{ srcRot }}}}">{ic('caret-down', 18)}</span>
</button>
<sc-if value="{{{{ srcOpen }}}}" hint-placeholder-val="{{{{ false }}}}">
<div role="listbox" aria-label="Swap from" style="margin-top: 8px; border-radius: 18px; background: rgba(255,255,255,0.06); padding: 4px">
<sc-for list="{{{{ srcs }}}}" as="s" hint-placeholder-count="2">
<button type="button" role="option" aria-selected="{{{{ s.sel }}}}" onClick="{{{{ s.pick }}}}" style="width: 100%; height: 56px; padding: 0 12px; border: 0; border-radius: 14px; background: {{{{ s.bg }}}}; color: #FFFFFF; display: flex; align-items: center; gap: 12px; text-align: left"><span style="flex-grow: 1; display: flex; flex-direction: column"><span style="font-size: 14px; line-height: 20px; font-weight: 600">{{{{ s.name }}}}</span><span style="font-size: 12px; line-height: 16px; color: #BFBFBF">{{{{ s.cap }}}}</span></span><sc-if value="{{{{ s.on }}}}" hint-placeholder-val="{{{{ false }}}}"><span style="color: #BDA4F4; display: flex">{ic('check', 18)}</span></sc-if></button>
</sc-for>
</div>
</sc-if>"""
    tokchip = lambda sym: f'<a href="V7SwapPicker.dc.html" style="height: 44px; padding: 0 12px 0 6px; border-radius: 22px; background: {{{{ t.page }}}}; color: {{{{ t.text }}}}; display: flex; align-items: center; gap: 8px; font-size: 16px; font-weight: 600; text-decoration: none; flex-shrink: 0">{token(sym, 32)}{sym}{ic("caret-down", 14)}</a>'
    body = scroller(f"""{hero('swap', hero_inner)}
<div style="padding: 16px 16px 0 16px; display: flex; flex-direction: column; gap: 12px">
<div style="position: relative; display: flex; flex-direction: column; gap: 8px">
<div style="border-radius: 20px; background: {{{{ t.card }}}}; box-shadow: {{{{ t.shadow }}}}; padding: 16px">
<div style="display: flex; justify-content: space-between; font-size: 12px; line-height: 16px; color: {{{{ t.text2 }}}}"><span>You pay</span><span>{{{{ bal }}}}</span></div>
<div style="margin-top: 8px; display: flex; align-items: center; gap: 12px"><span style="flex-grow: 1; min-width: 0; font-size: 32px; line-height: 40px; font-weight: 600">{{{{ pay }}}}</span>{tokchip('USDC')}</div>
<div style="margin-top: 4px; display: flex; justify-content: space-between; align-items: center"><span style="font-size: 12px; color: {{{{ t.text2 }}}}">≈ {{{{ payUsd }}}}</span><span style="display: flex; gap: 6px"><sc-for list="{{{{ quick }}}}" as="q" hint-placeholder-count="3"><button type="button" onClick="{{{{ q.pick }}}}" style="height: 28px; padding: 0 10px; border-radius: 14px; border: 1px solid {{{{ t.bd }}}}; background: transparent; color: {{{{ t.text }}}}; font-size: 12px; font-weight: 600">{{{{ q.label }}}}</button></sc-for></span></div>
</div>
<button type="button" aria-label="Flip tokens" style="position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); width: 44px; height: 44px; border-radius: 22px; border: 4px solid {{{{ t.page }}}}; background: {{{{ t.chipOn }}}}; color: {{{{ t.chipOnFg }}}}; display: flex; align-items: center; justify-content: center">{ic('arrows-down-up', 18)}</button>
<div style="border-radius: 20px; background: {{{{ t.card }}}}; box-shadow: {{{{ t.shadow }}}}; padding: 16px">
<div style="display: flex; justify-content: space-between; font-size: 12px; line-height: 16px; color: {{{{ t.text2 }}}}"><span>You receive</span><span>Balance 1.25 TSLAx</span></div>
<div style="margin-top: 8px; display: flex; align-items: center; gap: 12px"><span style="flex-grow: 1; min-width: 0; font-size: 32px; line-height: 40px; font-weight: 600">{{{{ rec }}}}</span>{tokchip('TSLAx')}</div>
<div style="margin-top: 4px; font-size: 12px; color: {{{{ t.text2 }}}}">≈ {{{{ recUsd }}}}</div>
</div>
</div>
<div style="border-radius: 20px; background: {{{{ t.card }}}}; box-shadow: {{{{ t.shadow }}}}; padding: 4px 16px">
<div style="height: 44px; display: flex; align-items: center; justify-content: space-between; font-size: 14px; border-bottom: 1px solid {{{{ t.line }}}}"><span style="color: {{{{ t.text2 }}}}">Rate</span><span style="font-weight: 600">1 TSLAx = 353.59 USDC</span></div>
<div style="height: 44px; display: flex; align-items: center; justify-content: space-between; font-size: 14px; border-bottom: 1px solid {{{{ t.line }}}}"><span style="color: {{{{ t.text2 }}}}">Minimum received</span><span style="font-weight: 600">{{{{ min }}}} TSLAx</span></div>
<div style="height: 44px; display: flex; align-items: center; justify-content: space-between; font-size: 14px"><span style="color: {{{{ t.text2 }}}}">Network fee</span><span style="font-weight: 600">&lt; $0.01</span></div>
</div>
<button type="button" style="height: 56px; border-radius: 28px; border: 0; background: #703AE6; color: #FFFFFF; font-size: 16px; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 8px">Review swap</button>
</div>""") + '\n' + capsule('swap', 'Swap')
    js = """var amt = this.state.amt === undefined ? 250 : this.state.amt;
var sk = this.state.src || 'w';
var S = { w: { name: 'Wallet', cap: '$4,812.40 · 3,120.40 USDC', bal: 3120.40 }, m: { name: 'Margin account', cap: '$4,320.37 available collateral', bal: 4320.37 } };
var so = !!this.state.so;
var srcs = ['w','m'].map(function (k) { var on = k === sk; return { name: S[k].name, cap: S[k].cap, on: on, sel: on ? 'true' : 'false', bg: on ? 'rgba(255,255,255,0.08)' : 'transparent', pick: function () { self.setState({ src: k, so: false }); } }; });
var b = S[sk].bal;
var quick = [['50%', b / 2], ['Max', b]].map(function (q) { return { label: q[0], pick: function () { self.setState({ amt: Math.round(q[1] * 100) / 100 }); } }; });
var rec = amt / 353.59;
var f2 = function (n) { return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };
return { t: t, src: S[sk], srcs: srcs, srcOpen: so, srcAria: so ? 'true' : 'false', srcRot: so ? 'rotate(180deg)' : 'none', toggleSrc: function () { self.setState({ so: !so }); }, quick: quick, bal: 'Balance ' + f2(b) + ' USDC', pay: f2(amt), payUsd: money(amt * 0.9999), rec: rec.toFixed(4), recUsd: money(rec * 353.59 * 0.9999), min: (rec * 0.995).toFixed(4) };"""
    page('V7Swap', 'Swap', body, js)


def swap_picker():
    rows = ''
    for sym, name, bal, val in [('USDC', 'USD Coin', '3,120.40', '$3,120.33'), ('ANTHROPIC', 'Anthropic PreStock', '0.96', '$1,001.06'), ('TSLAx', 'Tesla xStock', '1.25', '$441.99'), ('SOL', 'Solana', '2.10', '$249.02')]:
        rows += f'<a href="V7Swap.dc.html" style="height: 64px; display: flex; align-items: center; gap: 12px; border-top: 1px solid {{{{ t.line }}}}; text-decoration: none; color: {{{{ t.text }}}}">{token(sym, 36)}<span style="flex-grow: 1; display: flex; flex-direction: column"><span style="font-size: 14px; line-height: 20px; font-weight: 600">{sym}</span><span style="font-size: 12px; line-height: 16px; color: {{{{ t.text2 }}}}">{name}</span></span><span style="display: flex; flex-direction: column; align-items: flex-end"><span style="font-size: 14px; line-height: 20px; font-weight: 600">{bal}</span><span style="font-size: 12px; line-height: 16px; color: {{{{ t.text2 }}}}">{val}</span></span></a>'
    others = ''
    for sym, name, px in [('GOOGLx', 'Alphabet xStock', '$339.93'), ('AAPLx', 'Apple xStock', '$332.37'), ('OPENAI', 'OpenAI PreStock', '$2,117.09')]:
        others += f'<a href="V7Swap.dc.html" style="height: 64px; display: flex; align-items: center; gap: 12px; border-top: 1px solid {{{{ t.line }}}}; text-decoration: none; color: {{{{ t.text }}}}">{token(sym, 36)}<span style="flex-grow: 1; display: flex; flex-direction: column"><span style="font-size: 14px; line-height: 20px; font-weight: 600">{sym}</span><span style="font-size: 12px; line-height: 16px; color: {{{{ t.text2 }}}}">{name}</span></span><span style="font-size: 14px; font-weight: 600">{px}</span></a>'
    pop = ''.join(f'<a href="V7Swap.dc.html" style="height: 40px; padding: 0 12px 0 4px; border-radius: 20px; border: 1px solid {{{{ t.bd }}}}; display: flex; align-items: center; gap: 6px; font-size: 14px; font-weight: 600; color: {{{{ t.text }}}}; text-decoration: none; flex-shrink: 0">{token(s, 30)}{s}</a>' for s in ['SOL', 'TSLAx', 'GOOGLx', 'ANTHROPIC'])
    body = f"""<div style="position: absolute; inset: 0; overflow-y: auto; padding-bottom: 24px">
{topbar('Select token', 'V7Swap')}
<div style="padding: 8px 16px 0 16px; display: flex; flex-direction: column; gap: 12px">
<label style="height: 48px; padding: 0 16px; border-radius: 24px; background: {{{{ t.card }}}}; border: 1px solid {{{{ t.bd }}}}; display: flex; align-items: center; gap: 10px; color: {{{{ t.text2 }}}}">{ic('magnifying-glass', 18)}<input type="text" placeholder="Search name or paste address" aria-label="Search tokens" style="flex-grow: 1; border: 0; outline: 0; background: transparent; font-size: 14px; color: {{{{ t.text }}}}"></label>
<div style="margin: 0 -16px; padding: 0 16px; display: flex; gap: 8px; overflow-x: auto">{pop}</div>
<div style="border-radius: 20px; background: {{{{ t.card }}}}; box-shadow: {{{{ t.shadow }}}}; padding: 0 16px"><div style="height: 40px; display: flex; align-items: center; font-size: 12px; font-weight: 600; color: {{{{ t.text2 }}}}">Your tokens</div>{rows}</div>
<div style="border-radius: 20px; background: {{{{ t.card }}}}; box-shadow: {{{{ t.shadow }}}}; padding: 0 16px"><div style="height: 40px; display: flex; align-items: center; font-size: 12px; font-weight: 600; color: {{{{ t.text2 }}}}">All tokens</div>{others}</div>
</div>
</div>"""
    page('V7SwapPicker', 'Token picker', body, 'return { t: t };')


def history(stem, space, label, big, cap, groups):
    hero_inner = hero_stats(label, big)
    out = ''
    for day, items in groups:
        rows = ''
        for a, b, title, sub, v1, v2 in items:
            icons = f'<span style="display: flex; flex-shrink: 0">{token(a, 30, True)}<img src="{TOK[b]}" alt="" style="width: 30px; height: 30px; border-radius: 999px; border: 2px solid {{{{ t.card }}}}; margin-left: -10px"></span>' if b else token(a, 36)
            rows += f'<div style="height: 68px; display: flex; align-items: center; gap: 12px; border-top: 1px solid {{{{ t.line }}}}">{icons}<span style="flex-grow: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px"><span style="font-size: 14px; line-height: 20px; font-weight: 600; white-space: nowrap">{title}</span><span style="font-size: 12px; line-height: 16px; color: {{{{ t.text2 }}}}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis">{sub}</span></span><span style="display: flex; flex-direction: column; align-items: flex-end; gap: 2px; flex-shrink: 0"><span style="font-size: 14px; line-height: 20px; font-weight: 600; white-space: nowrap">{v1}</span><span style="font-size: 12px; line-height: 16px; color: {{{{ t.text2 }}}}">{v2}</span></span></div>'
        out += f'<div style="border-radius: 20px; background: {{{{ t.card }}}}; box-shadow: {{{{ t.shadow }}}}; padding: 0 16px"><div style="height: 40px; display: flex; align-items: center; font-size: 12px; font-weight: 600; color: {{{{ t.text2 }}}}">{day}</div>{rows}</div>'
    body = scroller(f"""{hero(space, hero_inner)}
<div style="padding: 16px 16px 0 16px; display: flex; flex-direction: column; gap: 12px">
{out}
<div style="height: 40px; display: flex; align-items: center; justify-content: center; font-size: 12px; color: {{{{ t.text2 }}}}">Showing the last 30 days</div>
</div>""") + '\n' + capsule(space, 'History')
    page(stem, stem[2:], body, 'return { t: t };')


def build():
    perps_markets()
    perps_market()
    perps_order()
    history('V7SwapHistory', 'swap', 'Swapped in the last 30 days', '$1,741.88', '4 swaps · from your wallet', [
        ('Sep 26', [('USDC', 'TSLAx', 'USDC → TSLAx', 'From wallet', '+1.25 TSLAx', '441.99 USDC')]),
        ('Sep 24', [('USDC', 'ANTHROPIC', 'USDC → ANTHROPIC', 'From wallet', '+0.96 ANTHROPIC', '1,001.06 USDC')]),
        ('Sep 21', [('SOL', 'USDC', 'SOL → USDC', 'From wallet', '+142.30 USDC', '1.20 SOL')]),
        ('Sep 19', [('USDC', 'SOL', 'USDC → SOL', 'From wallet', '+1.32 SOL', '156.53 USDC')]),
    ])
    history('V7FarmHistory', 'farm', 'Earned from farms', '+$7.59', '1 active · 1 closed farm', [
        ('Today', [('GOOGLx', None, 'GOOGLx farm yield', 'Kamino USDC · 4x', '+$0.21', 'accrued')]),
        ('Sep 21', [('GOOGLx', None, 'Opened GOOGLx farm', 'Deposited 1.50 GOOGLx · borrowed 1,529.70 USDC', '$509.90', '4x')]),
        ('Sep 19', [('ANTHROPIC', None, 'Closed ANTHROPIC farm', 'Held 9 days · repaid 2,002.12 USDC', '+$6.12', '8.76% APR')]),
        ('Sep 10', [('ANTHROPIC', None, 'Opened ANTHROPIC farm', 'Deposited 0.96 ANTHROPIC · borrowed 2,002.12 USDC', '$1,001.06', '3x')]),
    ])


if __name__ == '__main__':
    build()
