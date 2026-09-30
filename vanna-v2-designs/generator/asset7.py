from common import *
import screens_trade

# Clean asset screens: no boxed cards, one big number, a chart, plain rows, sticky actions.


def plain_rows(rows):
    return ''.join(f'<div style="height: 52px; display: flex; align-items: center; justify-content: space-between; font-size: 14px; border-top: 1px solid {{{{ t.line }}}}"><span style="color: {{{{ t.text2 }}}}">{k}</span><span style="font-weight: 600">{v}</span></div>' for k, v in rows)


def section(title):
    return f'<h2 style="margin: 28px 0 4px 0; font-size: 16px; line-height: 24px; font-weight: 600">{title}</h2>'


def perps_market():
    top = f"""<header style="height: 56px; margin-top: 28px; padding: 0 8px 0 4px; display: flex; align-items: center; gap: 4px">
<a href="V7Perps.dc.html" aria-label="Back" style="width: 48px; height: 48px; border-radius: 24px; color: {{{{ t.text }}}}; display: flex; align-items: center; justify-content: center">{ic('arrow-left', 22)}</a>
<span style="flex-grow: 1"></span>
<button type="button" aria-label="Add to watchlist" aria-pressed="true" style="width: 48px; height: 48px; border-radius: 24px; border: 0; background: transparent; color: #9F7BEE; display: flex; align-items: center; justify-content: center">{ic('star', 22, 'fill')}</button>
</header>"""
    dd = f"""<sc-if value="{{{{ dd }}}}" hint-placeholder-val="{{{{ false }}}}">
<div aria-hidden="true" onClick="{{{{ toggleDd }}}}" style="position: absolute; inset: 0; z-index: 20; background: {{{{ t.scrim }}}}; animation: vnFade 160ms ease-out"></div>
<div role="listbox" aria-label="Markets" style="position: absolute; z-index: 21; top: 150px; left: 16px; right: 16px; border-radius: 22px; background: {{{{ t.card }}}}; box-shadow: 0 16px 40px rgba(17,17,17,0.24); padding: 8px; color: {{{{ t.text }}}}; animation: vnDrop 200ms cubic-bezier(0.2, 0.9, 0.3, 1)">
<sc-for list="{{{{ opts }}}}" as="o" hint-placeholder-count="5">
<button type="button" role="option" aria-selected="{{{{ o.sel }}}}" onClick="{{{{ o.pick }}}}" style="width: 100%; height: 56px; padding: 0 12px; border: 0; border-radius: 14px; background: {{{{ o.bg }}}}; color: {{{{ t.text }}}}; display: flex; align-items: center; gap: 12px; text-align: left"><img src="{{{{ o.icon }}}}" alt="" style="width: 32px; height: 32px; border-radius: 999px"><span style="flex-grow: 1; display: flex; flex-direction: column"><span style="font-size: 14px; line-height: 20px; font-weight: 600">{{{{ o.pair }}}}</span><span style="font-size: 12px; line-height: 16px; color: {{{{ t.text2 }}}}">{{{{ o.name }}}}</span></span><span style="font-size: 14px; font-weight: 600">{{{{ o.price }}}}</span></button>
</sc-for>
</div>
</sc-if>"""
    body = f"""<div style="position: absolute; inset: 0; bottom: 96px; overflow-y: auto; padding-bottom: 24px">
{top}
<div style="padding: 0 20px">
<button type="button" onClick="{{{{ toggleDd }}}}" aria-haspopup="listbox" aria-expanded="{{{{ ddAria }}}}" style="padding: 0; border: 0; background: transparent; color: {{{{ t.text }}}}; display: flex; align-items: center; gap: 12px; text-align: left"><img src="{{{{ cur.icon }}}}" alt="" style="width: 36px; height: 36px; border-radius: 999px"><span style="display: flex; flex-direction: column"><span style="font-size: 16px; line-height: 22px; font-weight: 600; display: flex; align-items: center; gap: 6px">{{{{ cur.pair }}}}<span style="display: flex; color: {{{{ t.text2 }}}}; transition: transform 200ms ease; transform: {{{{ ddRot }}}}">{ic('caret-down', 16)}</span></span><span style="font-size: 12px; line-height: 16px; color: {{{{ t.text2 }}}}">{{{{ cur.name }}}}</span></span></button>
<div style="margin-top: 16px; font-size: 32px; line-height: 40px; font-weight: 600; letter-spacing: -0.01em">{{{{ cur.price }}}}</div>
<div style="margin-top: 16px; margin-left: -4px">{screens_trade.candles()}</div>
<div role="tablist" aria-label="Chart range" style="margin-top: 8px; display: flex; justify-content: space-between">
<sc-for list="{{{{ ranges }}}}" as="r" hint-placeholder-count="5">
<button type="button" role="tab" aria-selected="{{{{ r.on }}}}" onClick="{{{{ r.pick }}}}" style="width: 56px; height: 36px; border-radius: 18px; border: 0; background: {{{{ r.bg }}}}; color: {{{{ r.fg }}}}; font-size: 14px; font-weight: 600">{{{{ r.label }}}}</button>
</sc-for>
</div>
{section('Your position')}
<a href="V7PerpsPositions.dc.html" style="height: 64px; display: flex; align-items: center; gap: 12px; border-top: 1px solid {{{{ t.line }}}}; text-decoration: none; color: {{{{ t.text }}}}"><span style="display: flex; flex-direction: column; flex-grow: 1"><span style="font-size: 16px; line-height: 22px; font-weight: 600">Long 3x · 12.31 TSLAx</span><span style="font-size: 12px; line-height: 16px; color: {{{{ t.text2 }}}}">Entry $341.20 · liq. $250.20</span></span><span style="font-size: 16px; font-weight: 600; color: {{{{ t.pos }}}}">+$152.52</span><span style="display: flex; color: {{{{ t.text2 }}}}">{CHEV}</span></a>
{section('Market')}
{plain_rows([('Borrow APY', '4.77%'), ('USDC borrow APY', '0.65%'), ('Liquidity', '$24,044 · 68 TSLAx'), ('Max leverage', '5x')])}
<details style="border-top: 1px solid {{{{ t.line }}}}"><summary style="height: 52px; display: flex; align-items: center; justify-content: space-between; font-size: 14px; font-weight: 600; list-style: none; cursor: pointer">How borrowing and liquidation work<span style="color: {{{{ t.text2 }}}}; display: flex">{ic('caret-down', 16)}</span></summary><p style="margin: 0 0 16px 0; font-size: 12px; line-height: 18px; color: {{{{ t.text2 }}}}">You borrow from Vanna vaults to open leverage and pay the borrow APY while the position is open. If your account health reaches 1.10, the position is liquidated with a dynamic penalty of 0–15%.</p></details>
</div>
</div>
<div style="position: absolute; left: 0; right: 0; bottom: 0; padding: 12px 16px 28px 16px; background: {{{{ t.page }}}}; display: flex; gap: 10px">
<a href="V7PerpsOrder.dc.html" style="flex: 1 1 0; height: 56px; border-radius: 28px; background: #703AE6; color: #FFFFFF; font-size: 16px; font-weight: 600; display: flex; align-items: center; justify-content: center; text-decoration: none">Long</a>
<a href="V7PerpsOrder.dc.html" style="flex: 1 1 0; height: 56px; border-radius: 28px; background: #B33C3E; color: #FFFFFF; font-size: 16px; font-weight: 600; display: flex; align-items: center; justify-content: center; text-decoration: none">Short</a>
</div>
{dd}"""
    js = screens_trade.PAIRS_JS + """var r = this.state.r || '1D';
var ranges = ['1H','4H','1D','1W','1M'].map(function (l) { var on = l === r; return { label: l, on: on ? 'true' : 'false', bg: on ? t.tv : 'transparent', fg: on ? t.link : t.text2, pick: function () { self.setState({ r: l }); } }; });
var sel = this.state.sel || 'TSLAx-USDC';
var cur = pairsAll.filter(function (p) { return p.pair === sel; })[0];
var dd = !!this.state.dd;
var opts = pairsAll.map(function (p) { var on = p.pair === sel; return { pair: p.pair, name: p.name, price: p.price, icon: p.icon, sel: on ? 'true' : 'false', bg: on ? t.page : 'transparent', pick: function () { self.setState({ sel: p.pair, dd: false }); } }; });
return { t: t, ranges: ranges, cur: cur, dd: dd, ddAria: dd ? 'true' : 'false', ddRot: dd ? 'rotate(180deg)' : 'none', opts: opts, toggleDd: function () { self.setState({ dd: !dd }); } };"""
    page('V7PerpsMarket', 'TSLAx market', body, js)


def earn_vault():
    chart = '''<svg width="380" height="140" viewBox="0 0 380 140" role="img" aria-label="Supply APY, 30 days, illustrative" style="display: block"><defs><linearGradient id="ev7" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#703AE6" stop-opacity="0.24"></stop><stop offset="1" stop-color="#703AE6" stop-opacity="0"></stop></linearGradient></defs><path d="M0 110 C 30 106, 50 112, 80 100 S 130 84, 160 88 S 210 72, 240 62 S 290 68, 320 46 S 360 34, 380 28 L 380 140 L 0 140 Z" fill="url(#ev7)"></path><path d="M0 110 C 30 106, 50 112, 80 100 S 130 84, 160 88 S 210 72, 240 62 S 290 68, 320 46 S 360 34, 380 28" fill="none" stroke="#703AE6" stroke-width="2.5" stroke-linecap="round"></path><circle cx="380" cy="28" r="5" fill="#703AE6"></circle></svg>'''
    top = f"""<header style="height: 56px; margin-top: 28px; padding: 0 8px 0 4px; display: flex; align-items: center">
<a href="V7Earn.dc.html" aria-label="Back" style="width: 48px; height: 48px; border-radius: 24px; color: {{{{ t.text }}}}; display: flex; align-items: center; justify-content: center">{ic('arrow-left', 22)}</a>
</header>"""
    tabs = f"""<div role="tablist" style="margin-top: 24px; display: flex; gap: 8px; overflow-x: auto">
<sc-for list="{{{{ tabs }}}}" as="b" hint-placeholder-count="4">
<button type="button" role="tab" aria-selected="{{{{ b.on }}}}" onClick="{{{{ b.pick }}}}" style="height: 36px; padding: 0 14px; border-radius: 18px; border: 0; background: {{{{ b.bg }}}}; color: {{{{ b.fg }}}}; font-size: 14px; font-weight: 600; white-space: nowrap">{{{{ b.label }}}}</button>
</sc-for>
</div>"""
    body = f"""<div style="position: absolute; inset: 0; bottom: 96px; overflow-y: auto; padding-bottom: 24px">
{top}
<div style="padding: 0 20px">
<div style="display: flex; align-items: center; gap: 12px">{token('TSLAx', 36)}<span style="display: flex; flex-direction: column"><span style="font-size: 16px; line-height: 22px; font-weight: 600">TSLAx vault</span><span style="font-size: 12px; line-height: 16px; color: {{{{ t.text2 }}}}">Tesla xStock</span></span></div>
<div style="margin-top: 20px; font-size: 14px; line-height: 20px; color: {{{{ t.text2 }}}}">Supply APY</div>
<div style="font-size: 32px; line-height: 40px; font-weight: 600; letter-spacing: -0.01em; color: {{{{ t.pos }}}}">1.82%</div>
<div style="margin-top: 12px; margin-left: -4px">{chart}</div>
{section('Vault')}
{plain_rows([('Total supplied', '$38.9K'), ('Total borrowed', '$14.9K'), ('Utilization', '38.2%'), ('Borrow APY', '4.77%')])}
{tabs}
<div style="margin-top: 8px">
<sc-for list="{{{{ rows }}}}" as="r" hint-placeholder-count="5">
<div style="min-height: 52px; display: flex; align-items: center; justify-content: space-between; gap: 12px; font-size: 14px; border-top: 1px solid {{{{ t.line }}}}"><span style="color: {{{{ t.text2 }}}}">{{{{ r.k }}}}</span><span style="font-weight: 600; text-align: right">{{{{ r.v }}}}</span></div>
</sc-for>
</div>
</div>
</div>
<div style="position: absolute; left: 0; right: 0; bottom: 0; padding: 12px 16px 28px 16px; background: {{{{ t.page }}}}; display: flex; gap: 10px">
<a href="V7EarnSupply.dc.html" style="flex: 1 1 0; height: 56px; border-radius: 28px; background: {{{{ t.card }}}}; border: 1px solid {{{{ t.bd }}}}; color: {{{{ t.text }}}}; font-size: 16px; font-weight: 600; display: flex; align-items: center; justify-content: center; text-decoration: none">Withdraw</a>
<a href="V7EarnSupply.dc.html" style="flex: 1 1 0; height: 56px; border-radius: 28px; background: #703AE6; color: #FFFFFF; font-size: 16px; font-weight: 600; display: flex; align-items: center; justify-content: center; text-decoration: none">Supply</a>
</div>"""
    js = """var tab = this.state.tab || 'Details';
var tabs = ['Details','Activity','Collateral','Managers'].map(function (l) { var on = l === tab; return { label: l, on: on ? 'true' : 'false', bg: on ? t.chipOn : 'transparent', fg: on ? t.chipOnFg : t.text2, pick: function () { self.setState({ tab: l }); } }; });
var R = {
Details: [['Oracle price', '$353.59'], ['Liquidation penalty', 'Dynamic, 0–15%'], ['Vault share token', 'vTSLAx']],
Activity: [['Supply · 12.00 TSLAx', '2h ago'], ['Borrow · 3.40 TSLAx', '5h ago'], ['Repay · 1.10 TSLAx', 'Yesterday'], ['Withdraw · 4.00 TSLAx', 'Sep 27']],
Collateral: [['Usable as collateral', 'Yes'], ['Borrowable', 'Yes'], ['Liquidation threshold', 'Health 1.10']],
Managers: [['Vault manager', 'Vanna Labs'], ['Interest model', 'Kinked, 80% target'], ['Contract', 'vTSLx…8kQe']]
};
return { t: t, tabs: tabs, rows: R[tab].map(function (r) { return { k: r[0], v: r[1] }; }) };"""
    page('V7EarnVault', 'TSLAx vault', body, js)


def build():
    perps_market()
    earn_vault()


if __name__ == '__main__':
    build()
