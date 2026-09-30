from common import *
import json
CP = {"dep1W": ["M0.0 36.5 L54.3 8.0 L108.6 8.0 L162.9 8.0 L217.1 88.0 L271.4 88.0 L325.7 88.0 L380.0 88.0", "M0.0 36.5 L54.3 8.0 L108.6 8.0 L162.9 8.0 L217.1 88.0 L271.4 88.0 L325.7 88.0 L380.0 88.0 L380 96 L0 96 Z"], "dep1M": ["M0.0 88.0 L34.5 88.0 L69.1 88.0 L103.6 88.0 L138.2 88.0 L172.7 88.0 L207.3 12.5 L241.8 8.0 L276.4 8.0 L310.9 20.6 L345.5 20.6 L380.0 20.6", "M0.0 88.0 L34.5 88.0 L69.1 88.0 L103.6 88.0 L138.2 88.0 L172.7 88.0 L207.3 12.5 L241.8 8.0 L276.4 8.0 L310.9 20.6 L345.5 20.6 L380.0 20.6 L380 96 L0 96 Z"], "dep3M": ["M0.0 88.0 L16.5 88.0 L33.0 88.0 L49.6 88.0 L66.1 88.0 L82.6 88.0 L99.1 88.0 L115.7 88.0 L132.2 88.0 L148.7 88.0 L165.2 88.0 L181.7 88.0 L198.3 88.0 L214.8 88.0 L231.3 88.0 L247.8 88.0 L264.3 88.0 L280.9 88.0 L297.4 88.0 L313.9 88.0 L330.4 12.5 L347.0 8.0 L363.5 20.6 L380.0 20.6", "M0.0 88.0 L16.5 88.0 L33.0 88.0 L49.6 88.0 L66.1 88.0 L82.6 88.0 L99.1 88.0 L115.7 88.0 L132.2 88.0 L148.7 88.0 L165.2 88.0 L181.7 88.0 L198.3 88.0 L214.8 88.0 L231.3 88.0 L247.8 88.0 L264.3 88.0 L280.9 88.0 L297.4 88.0 L313.9 88.0 L330.4 12.5 L347.0 8.0 L363.5 20.6 L380.0 20.6 L380 96 L0 96 Z"], "depAll": ["M0.0 88.0 L12.3 88.0 L24.5 88.0 L36.8 88.0 L49.0 88.0 L61.3 88.0 L73.5 88.0 L85.8 88.0 L98.1 88.0 L110.3 88.0 L122.6 88.0 L134.8 88.0 L147.1 88.0 L159.4 88.0 L171.6 88.0 L183.9 88.0 L196.1 88.0 L208.4 88.0 L220.6 88.0 L232.9 88.0 L245.2 88.0 L257.4 88.0 L269.7 88.0 L281.9 88.0 L294.2 88.0 L306.5 88.0 L318.7 88.0 L331.0 88.0 L343.2 12.5 L355.5 8.0 L367.7 20.6 L380.0 20.6", "M0.0 88.0 L12.3 88.0 L24.5 88.0 L36.8 88.0 L49.0 88.0 L61.3 88.0 L73.5 88.0 L85.8 88.0 L98.1 88.0 L110.3 88.0 L122.6 88.0 L134.8 88.0 L147.1 88.0 L159.4 88.0 L171.6 88.0 L183.9 88.0 L196.1 88.0 L208.4 88.0 L220.6 88.0 L232.9 88.0 L245.2 88.0 L257.4 88.0 L269.7 88.0 L281.9 88.0 L294.2 88.0 L306.5 88.0 L318.7 88.0 L331.0 88.0 L343.2 12.5 L355.5 8.0 L367.7 20.6 L380.0 20.6 L380 96 L0 96 Z"], "earn1W": ["M0.0 88.0 L54.3 77.0 L108.6 65.9 L162.9 54.0 L217.1 42.9 L271.4 31.0 L325.7 19.0 L380.0 8.0", "M0.0 88.0 L54.3 77.0 L108.6 65.9 L162.9 54.0 L217.1 42.9 L271.4 31.0 L325.7 19.0 L380.0 8.0 L380 96 L0 96 Z"], "earn1M": ["M0.0 88.0 L34.5 88.0 L69.1 88.0 L103.6 88.0 L138.2 88.0 L172.7 88.0 L207.3 85.1 L241.8 70.5 L276.4 53.0 L310.9 35.4 L345.5 20.8 L380.0 8.0", "M0.0 88.0 L34.5 88.0 L69.1 88.0 L103.6 88.0 L138.2 88.0 L172.7 88.0 L207.3 85.1 L241.8 70.5 L276.4 53.0 L310.9 35.4 L345.5 20.8 L380.0 8.0 L380 96 L0 96 Z"], "earn3M": ["M0.0 88.0 L16.5 88.0 L33.0 88.0 L49.6 88.0 L66.1 88.0 L82.6 88.0 L99.1 88.0 L115.7 88.0 L132.2 88.0 L148.7 88.0 L165.2 88.0 L181.7 88.0 L198.3 88.0 L214.8 88.0 L231.3 88.0 L247.8 88.0 L264.3 88.0 L280.9 88.0 L297.4 88.0 L313.9 88.0 L330.4 85.1 L347.0 53.0 L363.5 23.8 L380.0 8.0", "M0.0 88.0 L16.5 88.0 L33.0 88.0 L49.6 88.0 L66.1 88.0 L82.6 88.0 L99.1 88.0 L115.7 88.0 L132.2 88.0 L148.7 88.0 L165.2 88.0 L181.7 88.0 L198.3 88.0 L214.8 88.0 L231.3 88.0 L247.8 88.0 L264.3 88.0 L280.9 88.0 L297.4 88.0 L313.9 88.0 L330.4 85.1 L347.0 53.0 L363.5 23.8 L380.0 8.0 L380 96 L0 96 Z"], "earnAll": ["M0.0 88.0 L12.3 88.0 L24.5 88.0 L36.8 88.0 L49.0 88.0 L61.3 88.0 L73.5 88.0 L85.8 88.0 L98.1 88.0 L110.3 88.0 L122.6 88.0 L134.8 88.0 L147.1 88.0 L159.4 88.0 L171.6 88.0 L183.9 88.0 L196.1 88.0 L208.4 88.0 L220.6 88.0 L232.9 88.0 L245.2 88.0 L257.4 88.0 L269.7 88.0 L281.9 88.0 L294.2 88.0 L306.5 88.0 L318.7 88.0 L331.0 88.0 L343.2 85.1 L355.5 53.0 L367.7 23.8 L380.0 8.0", "M0.0 88.0 L12.3 88.0 L24.5 88.0 L36.8 88.0 L49.0 88.0 L61.3 88.0 L73.5 88.0 L85.8 88.0 L98.1 88.0 L110.3 88.0 L122.6 88.0 L134.8 88.0 L147.1 88.0 L159.4 88.0 L171.6 88.0 L183.9 88.0 L196.1 88.0 L208.4 88.0 L220.6 88.0 L232.9 88.0 L245.2 88.0 L257.4 88.0 L269.7 88.0 L281.9 88.0 L294.2 88.0 L306.5 88.0 L318.7 88.0 L331.0 88.0 L343.2 85.1 L355.5 53.0 L367.7 23.8 L380.0 8.0 L380 96 L0 96 Z"]}

VAULTS_JS = """var vaultsAll = [
{ sym: 'TSLAx', name: 'Tesla xStock', apy: '1.82%%', cap: 'Supplied $38.9K · Borrowed $14.9K', icon: '%(TSLAx)s', kind: 'xStocks', mine: '' },
{ sym: 'GOOGLx', name: 'Alphabet xStock', apy: '0.13%%', cap: 'Supplied $68.0K · Borrowed $6.8K', icon: '%(GOOGLx)s', kind: 'xStocks', mine: '' },
{ sym: 'SOL', name: 'Solana', apy: '0.11%%', cap: 'Supplied $36.8K · Borrowed $3.4K', icon: '%(SOL)s', kind: 'Crypto', mine: 'You 1.50' },
{ sym: 'USDC', name: 'USD Coin', apy: '0.03%%', cap: 'Supplied $55.0K · Borrowed $2.8K', icon: '%(USDC)s', kind: 'Stablecoins', mine: 'You 2,500' },
{ sym: 'OPENAI', name: 'OpenAI PreStock', apy: '0.03%%', cap: 'Supplied $267.0K · Borrowed $12.7K', icon: '%(OPENAI)s', kind: 'PreStocks', mine: '' },
{ sym: 'ANTHROPIC', name: 'Anthropic PreStock', apy: '0.01%%', cap: 'Supplied $131.4K · Borrowed $4.2K', icon: '%(ANTHROPIC)s', kind: 'PreStocks', mine: '' },
{ sym: 'AAPLx', name: 'Apple xStock', apy: '0.01%%', cap: 'Supplied $46.5K · Borrowed $1.3K', icon: '%(AAPLx)s', kind: 'xStocks', mine: '' }
];
""" % TOK


def earn():
    hero_inner = f"""<div style="margin-top: 20px; height: 36px; padding: 3px; border-radius: 18px; background: rgba(255,255,255,0.12); display: flex; gap: 2px">
<sc-for list="{{{{ modes }}}}" as="m" hint-placeholder-count="2"><button type="button" onClick="{{{{ m.pick }}}}" aria-pressed="{{{{ m.on }}}}" style="flex: 1 1 0; height: 30px; border-radius: 15px; border: 0; background: {{{{ m.bg }}}}; color: {{{{ m.fg }}}}; font-size: 13px; font-weight: 600">{{{{ m.label }}}}</button></sc-for>
</div>
<div style="margin-top: 14px; font-size: 40px; line-height: 48px; font-weight: 600; letter-spacing: -0.02em; color: {{{{ valC }}}}">{{{{ chartVal }}}}</div>
<svg width="380" height="96" viewBox="0 0 380 96" preserveAspectRatio="none" role="img" aria-label="{{{{ chartLabel }}}}" style="margin-top: 8px; display: block; width: 100%"><defs><linearGradient id="erF" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF" stop-opacity="0.3"></stop><stop offset="1" stop-color="#FFFFFF" stop-opacity="0"></stop></linearGradient></defs><path d="{{{{ chartArea }}}}" fill="url(#erF)"></path><path d="{{{{ chartLine }}}}" fill="none" stroke="#FFFFFF" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"></path></svg>
<div role="tablist" aria-label="Range" style="margin-top: 10px; display: flex; gap: 4px">
<sc-for list="{{{{ ranges }}}}" as="r" hint-placeholder-count="4"><button type="button" role="tab" aria-selected="{{{{ r.on }}}}" onClick="{{{{ r.pick }}}}" style="height: 28px; padding: 0 12px; border-radius: 14px; border: 0; background: {{{{ r.bg }}}}; color: {{{{ r.fg }}}}; font-size: 12px; font-weight: 600">{{{{ r.label }}}}</button></sc-for>
</div>"""
    dd = f"""<div style="position: relative; height: 40px; display: flex; align-items: center; justify-content: space-between">
<button type="button" onClick="{{{{ toggleDd }}}}" aria-haspopup="listbox" aria-expanded="{{{{ ddAria }}}}" style="height: 40px; padding: 0 12px 0 16px; border-radius: 20px; border: 1px solid {{{{ t.bd }}}}; background: {{{{ t.card }}}}; color: {{{{ t.text }}}}; display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 600">{{{{ pool }}}}<span style="display: flex; transform: {{{{ ddRot }}}}">{ic('caret-down', 14)}</span></button>
<span style="font-size: 12px; color: {{{{ t.text2 }}}}">Sorted by supply APY</span>
<sc-if value="{{{{ dd }}}}" hint-placeholder-val="{{{{ false }}}}">
<div role="listbox" aria-label="Pools" style="position: absolute; z-index: 2; top: 48px; left: 0; width: 220px; border-radius: 20px; background: {{{{ t.card }}}}; box-shadow: 0 16px 40px rgba(17,17,17,0.24); padding: 8px">
<sc-for list="{{{{ opts }}}}" as="o" hint-placeholder-count="5">
<button type="button" role="option" aria-selected="{{{{ o.sel }}}}" onClick="{{{{ o.pick }}}}" style="width: 100%; height: 44px; padding: 0 12px; border: 0; border-radius: 12px; background: {{{{ o.bg }}}}; color: {{{{ t.text }}}}; display: flex; align-items: center; justify-content: space-between; font-size: 14px; font-weight: 600; text-align: left">{{{{ o.label }}}}<span style="font-size: 12px; font-weight: 400; color: {{{{ t.text2 }}}}">{{{{ o.n }}}}</span></button>
</sc-for>
</div>
</sc-if>
</div>"""
    rows = f"""<sc-for list="{{{{ vaults }}}}" as="v" hint-placeholder-count="7">
<a href="V7EarnVault.dc.html" style="height: 72px; display: flex; align-items: center; gap: 12px; border-top: 1px solid {{{{ t.line }}}}; text-decoration: none; color: {{{{ t.text }}}}">
<img src="{{{{ v.icon }}}}" alt="" style="width: 40px; height: 40px; border-radius: 999px; flex-shrink: 0">
<span style="flex-grow: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px"><span style="font-size: 14px; line-height: 20px; font-weight: 600; display: flex; align-items: center; gap: 8px">{{{{ v.sym }}}}<sc-if value="{{{{ v.mine }}}}" hint-placeholder-val="{{{{ false }}}}"><span style="height: 20px; padding: 0 8px; border-radius: 6px; background: {{{{ t.tv }}}}; color: {{{{ t.tvI }}}}; font-size: 12px; line-height: 20px; font-weight: 600">{{{{ v.mine }}}}</span></sc-if></span><span style="font-size: 12px; line-height: 16px; color: {{{{ t.text2 }}}}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis">{{{{ v.cap }}}}</span></span>
<span style="display: flex; flex-direction: column; align-items: flex-end; gap: 2px"><span style="font-size: 16px; line-height: 20px; font-weight: 600; color: {{{{ t.pos }}}}">{{{{ v.apy }}}}</span><span style="font-size: 12px; line-height: 16px; color: {{{{ t.text2 }}}}">APY</span></span>
</a>
</sc-for>"""
    body = scroller(f"""{hero('earn', hero_inner)}
<div style="padding: 16px 16px 0 16px; display: flex; flex-direction: column; gap: 12px">
{dd}
<div style="border-radius: 20px; background: {{{{ t.card }}}}; box-shadow: {{{{ t.shadow }}}}; padding: 0 16px">
<div style="height: 40px; display: flex; align-items: center; justify-content: space-between; font-size: 12px; color: {{{{ t.text2 }}}}"><span>Vault</span><span>Supply APY</span></div>
{rows}
</div>
</div>""") + '\n' + capsule('earn', 'Vaults')
    js = VAULTS_JS + 'var CP = ' + json.dumps(CP) + ';\n' + """var cm = this.state.cm || (this.props.earnings ? 'earn' : 'dep'), rg = this.state.rg || '3M';
var modes = [['dep', 'Overall deposit'], ['earn', 'Net earnings']].map(function (m) { var on = m[0] === cm; return { label: m[1], on: on ? 'true' : 'false', bg: on ? '#FFFFFF' : 'transparent', fg: on ? '#2F1B61' : '#FFFFFF', pick: function () { self.setState({ cm: m[0] }); } }; });
var ranges = [['1W', '1 Week'], ['1M', '1 Month'], ['3M', '3 Months'], ['All', 'All Time']].map(function (r) { var on = r[0] === rg; return { label: r[1], on: on ? 'true' : 'false', bg: on ? 'rgba(255,255,255,0.22)' : 'transparent', fg: on ? '#FFFFFF' : 'rgba(255,255,255,0.72)', pick: function () { self.setState({ rg: r[0] }); } }; });
var cp = CP[cm + rg];
var pool = this.state.pool || 'All pools';
var dd = !!this.state.dd;
var kinds = ['All pools','xStocks','PreStocks','Crypto','Stablecoins'];
var opts = kinds.map(function (k) { var on = k === pool; var n = vaultsAll.filter(function (v) { return k === 'All pools' || v.kind === k; }).length; return { label: k, n: String(n), sel: on ? 'true' : 'false', bg: on ? t.page : 'transparent', pick: function () { self.setState({ pool: k, dd: false }); } }; });
var vaults = vaultsAll.filter(function (v) { return pool === 'All pools' || v.kind === pool; }).map(function (v) { var c = {}; for (var k in v) c[k] = v[k]; c.mine = v.mine ? v.mine : false; return c; });
return { t: t, modes: modes, ranges: ranges, chartLine: cp[0], chartArea: cp[1], chartVal: cm === 'dep' ? '$2,677.87' : '+$1.37', valC: cm === 'dep' ? '#FFFFFF' : '#32EEE2', chartLabel: (cm === 'dep' ? 'Overall deposit' : 'Net earnings') + ' over ' + rg, pool: pool, dd: dd, ddAria: dd ? 'true' : 'false', ddRot: dd ? 'rotate(180deg)' : 'none', opts: opts, vaults: vaults, toggleDd: function () { self.setState({ dd: !dd }); } };"""
    page('V7Earn', 'Earn vaults', body, js, props={'earnings': {'editor': 'boolean', 'default': False, 'section': 'State'}})


def earn_vault():
    chart = '''<svg width="380" height="120" viewBox="0 0 380 120" role="img" aria-label="Supply APY, 30 days, illustrative" style="display: block"><defs><linearGradient id="evF" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#703AE6" stop-opacity="0.28"></stop><stop offset="1" stop-color="#703AE6" stop-opacity="0"></stop></linearGradient></defs><path d="M0 92 C 30 88, 50 94, 80 84 S 130 70, 160 74 S 210 60, 240 52 S 290 58, 320 40 S 360 30, 380 26 L 380 120 L 0 120 Z" fill="url(#evF)"></path><path d="M0 92 C 30 88, 50 94, 80 84 S 130 70, 160 74 S 210 60, 240 52 S 290 58, 320 40 S 360 30, 380 26" fill="none" stroke="#703AE6" stroke-width="2.5" stroke-linecap="round"></path><circle cx="380" cy="26" r="4" fill="#703AE6"></circle></svg>'''
    tabs = f"""<div role="tablist" style="height: 44px; display: flex; gap: 20px; border-bottom: 1px solid {{{{ t.line }}}}; overflow-x: auto">
<sc-for list="{{{{ tabs }}}}" as="b" hint-placeholder-count="4">
<button type="button" role="tab" aria-selected="{{{{ b.on }}}}" onClick="{{{{ b.pick }}}}" style="position: relative; height: 44px; padding: 0; border: 0; background: transparent; color: {{{{ b.fg }}}}; font-size: 14px; font-weight: 600; white-space: nowrap">{{{{ b.label }}}}<span style="position: absolute; left: 0; right: 0; bottom: -1px; height: 3px; border-radius: 2px; background: {{{{ b.line }}}}"></span></button>
</sc-for>
</div>"""
    body = f"""<div style="position: absolute; inset: 0; overflow-y: auto; padding-bottom: 112px">
{topbar('TSLAx vault', 'V7Earn')}
<div style="padding: 8px 16px 0 16px">
<div style="display: flex; align-items: center; gap: 12px">{token('TSLAx', 48)}<span style="display: flex; flex-direction: column"><span style="font-size: 14px; line-height: 20px; color: {{{{ t.text2 }}}}">Supply APY</span><span style="font-size: 36px; line-height: 44px; font-weight: 600; color: {{{{ t.pos }}}}">1.82%</span></span></div>
<div style="margin-top: 16px">{chart}</div>
<div style="margin-top: 8px; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px">
<div style="padding: 10px 12px; border-radius: 14px; background: {{{{ t.card }}}}; box-shadow: {{{{ t.shadow }}}}; display: flex; flex-direction: column; gap: 2px"><span style="font-size: 12px; line-height: 16px; color: {{{{ t.text2 }}}}">Supplied</span><span style="font-size: 14px; line-height: 20px; font-weight: 600">$38.9K</span></div>
<div style="padding: 10px 12px; border-radius: 14px; background: {{{{ t.card }}}}; box-shadow: {{{{ t.shadow }}}}; display: flex; flex-direction: column; gap: 2px"><span style="font-size: 12px; line-height: 16px; color: {{{{ t.text2 }}}}">Borrowed</span><span style="font-size: 14px; line-height: 20px; font-weight: 600">$14.9K</span></div>
<div style="padding: 10px 12px; border-radius: 14px; background: {{{{ t.card }}}}; box-shadow: {{{{ t.shadow }}}}; display: flex; flex-direction: column; gap: 2px"><span style="font-size: 12px; line-height: 16px; color: {{{{ t.text2 }}}}">Utilization</span><span style="font-size: 14px; line-height: 20px; font-weight: 600">38.2%</span></div>
</div>
<div style="margin-top: 16px">{tabs}</div>
<div style="margin-top: 8px; border-radius: 20px; background: {{{{ t.card }}}}; box-shadow: {{{{ t.shadow }}}}; padding: 0 16px">
<sc-for list="{{{{ rows }}}}" as="r" hint-placeholder-count="5">
<div style="min-height: 52px; display: flex; align-items: center; justify-content: space-between; gap: 12px; font-size: 14px; border-bottom: 1px solid {{{{ t.line }}}}"><span style="color: {{{{ t.text2 }}}}">{{{{ r.k }}}}</span><span style="font-weight: 600; text-align: right">{{{{ r.v }}}}</span></div>
</sc-for>
<div style="height: 44px; display: flex; align-items: center; font-size: 12px; color: {{{{ t.text2 }}}}">{{{{ note }}}}</div>
</div>
</div>
</div>
<div style="position: absolute; left: 0; right: 0; bottom: 0; padding: 12px 16px 24px 16px; background: {{{{ t.page }}}}; border-top: 1px solid {{{{ t.line }}}}; display: flex; gap: 8px">
<a href="V7EarnSupply.dc.html" style="flex: 1 1 0; height: 52px; border-radius: 26px; border: 1px solid {{{{ t.bd }}}}; color: {{{{ t.text }}}}; font-size: 16px; font-weight: 600; display: flex; align-items: center; justify-content: center; text-decoration: none">Withdraw</a>
<a href="V7EarnSupply.dc.html" style="flex: 1 1 0; height: 52px; border-radius: 26px; background: #703AE6; color: #FFFFFF; font-size: 16px; font-weight: 600; display: flex; align-items: center; justify-content: center; text-decoration: none">Supply</a>
</div>"""
    js = """var tab = this.state.tab || 'Details';
var tabs = ['Details','Activity','Collateral','Managers'].map(function (l) { var on = l === tab; return { label: l, on: on ? 'true' : 'false', fg: on ? t.text : t.text2, line: on ? '#703AE6' : 'transparent', pick: function () { self.setState({ tab: l }); } }; });
var R = {
Details: [['Borrow APY', '4.77%'], ['Total borrowed', '$14.85K · 42.00 TSLAx'], ['Oracle price', '$353.59'], ['Liquidation penalty', 'Dynamic, 0–15%'], ['Vault share token', 'vTSLAx']],
Activity: [['Supply · 12.00 TSLAx', '2h ago'], ['Borrow · 3.40 TSLAx', '5h ago'], ['Repay · 1.10 TSLAx', 'Yesterday'], ['Withdraw · 4.00 TSLAx', 'Sep 27'], ['Supply · 20.00 TSLAx', 'Sep 26']],
Collateral: [['Usable as collateral', 'Yes'], ['Borrowable', 'Yes'], ['Max per margin account', 'Uncapped'], ['Liquidation threshold', 'Health 1.10']],
Managers: [['Vault manager', 'Vanna Labs'], ['Risk curator', 'Vanna risk council'], ['Interest model', 'Kinked, 80% target'], ['Contract', 'vTSLx…8kQe']]
};
var N = { Details: 'Prices from on-chain oracles, refreshed every block.', Activity: 'Latest 5 of 1,284 vault events.', Collateral: 'Applies to every margin account.', Managers: 'Contracts are open source and audited.' };
return { t: t, tabs: tabs, rows: R[tab].map(function (r) { return { k: r[0], v: r[1] }; }), note: N[tab] };"""
    page('V7EarnVault', 'TSLAx vault', body, js)


def earn_supply():
    body = f"""<div style="position: absolute; inset: 0; overflow-y: auto; padding-bottom: 112px">
{topbar('USDC vault', 'V7EarnVault')}
<div style="padding: 8px 16px 0 16px; display: flex; flex-direction: column; gap: 12px">
{seg('modes')}
<div style="border-radius: 20px; background: {{{{ t.card }}}}; box-shadow: {{{{ t.shadow }}}}; padding: 16px">
<div style="display: flex; justify-content: space-between; font-size: 12px; line-height: 16px; color: {{{{ t.text2 }}}}"><span>{{{{ amtLabel }}}}</span><span>{{{{ balLabel }}}}</span></div>
<div style="margin-top: 8px; display: flex; align-items: center; gap: 12px"><span style="flex-grow: 1; font-size: 32px; line-height: 40px; font-weight: 600; color: {{{{ amtC }}}}">{{{{ amt }}}}</span><span style="height: 40px; padding: 0 12px 0 6px; border-radius: 20px; background: {{{{ t.page }}}}; display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 600">{token('USDC', 28)}USDC</span></div>
<div style="margin-top: 12px; display: flex; gap: 8px">
<sc-for list="{{{{ quick }}}}" as="q" hint-placeholder-count="4">
<button type="button" onClick="{{{{ q.pick }}}}" aria-pressed="{{{{ q.on }}}}" style="flex: 1 1 0; height: 36px; border-radius: 18px; border: 1px solid {{{{ q.bd }}}}; background: {{{{ q.bg }}}}; color: {{{{ q.fg }}}}; font-size: 12px; font-weight: 600">{{{{ q.label }}}}</button>
</sc-for>
</div>
<sc-if value="{{{{ err }}}}" hint-placeholder-val="{{{{ false }}}}"><div style="margin-top: 12px; font-size: 12px; line-height: 16px; color: {{{{ t.neg }}}}">{{{{ err }}}}</div></sc-if>
</div>
<div style="border-radius: 20px; background: {{{{ t.card }}}}; box-shadow: {{{{ t.shadow }}}}; padding: 4px 16px">
<sc-for list="{{{{ sum }}}}" as="s" hint-placeholder-count="4">
<div style="height: 48px; display: flex; align-items: center; justify-content: space-between; font-size: 14px; border-bottom: 1px solid {{{{ t.line }}}}"><span style="color: {{{{ t.text2 }}}}">{{{{ s.k }}}}</span><span style="font-weight: 600">{{{{ s.v }}}}</span></div>
</sc-for>
<div style="padding: 12px 0; display: flex; gap: 8px; font-size: 12px; line-height: 16px; color: {{{{ t.text2 }}}}">{ic('info', 16)}<span>Supplied USDC is lent to Vanna traders and farmers. You can withdraw any time the vault has free liquidity.</span></div>
</div>
</div>
</div>
<div style="position: absolute; left: 0; right: 0; bottom: 0; padding: 12px 16px 24px 16px; background: {{{{ t.page }}}}; border-top: 1px solid {{{{ t.line }}}}">
<button type="button" onClick="{{{{ go }}}}" aria-disabled="{{{{ dis }}}}" style="width: 100%; height: 56px; border-radius: 28px; border: 0; background: {{{{ ctaBg }}}}; color: {{{{ ctaFg }}}}; font-size: 16px; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 8px">{{{{ cta }}}}{ic('wallet', 18)}</button>
</div>"""
    js = SEG_JS + """var mode = this.state.mode || 'Supply';
var modes = segList(['Supply','Withdraw'], mode, 'mode');
var isS = mode === 'Supply', bal = isS ? 3120.40 : 2500;
var amt = this.state.amt === undefined ? 1000 : this.state.amt;
if (amt > bal && this.state.amt === undefined) amt = bal;
var Q = isS ? [['25%', 780.10], ['50%', 1560.20], ['Max', 3120.40], ['Over', 3500]] : [['25%', 625], ['50%', 1250], ['Max', 2500], ['Over', 3000]];
var quick = Q.slice(0, 3).map(function (q) { var on = Math.abs(q[1] - amt) < 0.01; return { label: q[0], on: on ? 'true' : 'false', bg: on ? t.tv : 'transparent', fg: on ? t.tvI : t.text, bd: on ? t.tv : t.bd, pick: function () { self.setState({ amt: q[1] }); } }; });
var over = amt > bal;
var f2 = function (n) { return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };
var after = isS ? 2500 + amt : 2500 - amt;
var sum = [
{ k: 'Supply APY', v: '0.03%' },
{ k: isS ? 'You receive' : 'You burn', v: f2(amt) + ' vUSDC' },
{ k: 'Supplied after', v: f2(Math.max(after, 0)) + ' USDC' },
{ k: 'Projected yearly', v: '+' + money(Math.max(after, 0) * 0.0003) }
];
return { t: t, go: function () { if (!over) self.setState({ __tx: 'sign', __st: 1, __why: '' }); }, txTitle: isS ? 'Supplied' : 'Withdrawn', txBody: f2(amt) + ' USDC ' + (isS ? 'is now earning in the USDC vault' : 'is back in your wallet'), modes: modes, quick: quick, sum: sum, amt: f2(amt), amtC: over ? t.neg : t.text, amtLabel: isS ? 'Supply amount' : 'Withdraw amount', balLabel: isS ? 'Wallet 3,120.40 USDC' : 'Supplied 2,500.00 USDC', err: over ? (isS ? 'You have 3,120.40 USDC in your wallet. Lower the amount.' : 'You have 2,500.00 USDC supplied. Lower the amount.') : false, dis: over ? 'true' : 'false', ctaBg: over ? t.off : '#703AE6', ctaFg: over ? t.offFg : '#FFFFFF', cta: over ? (isS ? 'Not enough USDC' : 'More than you supplied') : mode + ' · approve in wallet' };"""
    body += tx_overlay('{{ txTitle }}', '{{ txBody }}', 'Backpack', 'this request', 'View my positions', 'V7EarnPositions')
    for stem, st, tx in [('V7EarnSupply', '{}', ''), ('V7EarnSupplySign', '{}', 'sign'), ('V7EarnSupplyDone', '{}', 'done'), ('V7EarnWithdraw', "{ mode: 'Withdraw', amt: 500 }", ''), ('V7EarnWithdrawDone', "{ mode: 'Withdraw', amt: 500 }", 'done'),
                          ('V7EarnSupplyNoFunds', '{ amt: 3500 }', ''), ('V7EarnSupplyFee', "{ __why: 'fee' }", 'failed'), ('V7EarnWithdrawOver', "{ mode: 'Withdraw', amt: 3000 }", ''), ('V7EarnWithdrawFailed', "{ mode: 'Withdraw', amt: 500, __why: 'network' }", 'failed')]:
        page(stem, 'Supply', body, js, state=st, tx_default=tx)


FARM_JS = """var s = { pool: this.state.pool || 'USDC', lev: this.state.lev || 3 };
var C = 1001.06, units = 0.96;
var P = { USDC: { k: 0.0503, b: 0.0065, px: 1 }, SOL: { k: 0.0436, b: 0.0116, px: 118.58 } }[s.pool];
var debt = (s.lev - 1) * C, net = debt * (P.k - P.b), hf = 1 + C / debt;
var hfC = hf >= 1.5 ? t.pos : (hf > 1.1 ? '#FF8AC2' : t.neg);
var hfL = hf.toFixed(2) + (hf >= 1.5 ? ' · Safe' : (hf >= 1.3 ? ' · Moderate' : ' · Risky'));
var borrowed = s.pool === 'USDC' ? debt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' USDC' : (debt / P.px).toFixed(2) + ' SOL';
var liq = money(0.1 * debt / units);
var apr = ((net / C) * 100).toFixed(2) + '%';
"""


def farm():
    hero_inner = hero_stats('Estimated net APR', '{{ apr }}', [('Per year', '{{ yearly }}'), ('Deposit', '0.96 ANTHROPIC')])
    body = scroller(f"""{hero('farm', hero_inner)}
<div style="padding: 16px 16px 0 16px; display: flex; flex-direction: column; gap: 12px">
<div style="border-radius: 20px; background: {{{{ t.card }}}}; box-shadow: {{{{ t.shadow }}}}; padding: 16px">
<div style="display: flex; justify-content: space-between; font-size: 12px; line-height: 16px; color: {{{{ t.text2 }}}}"><span>Deposit</span><span>Wallet 0.96 ANTHROPIC</span></div>
<div style="margin-top: 8px; display: flex; align-items: center; gap: 12px"><span style="flex-grow: 1; display: flex; flex-direction: column"><span style="font-size: 32px; line-height: 40px; font-weight: 600">0.96</span><span style="font-size: 12px; color: {{{{ t.text2 }}}}">≈ $1,001.06</span></span><button type="button" style="height: 44px; padding: 0 12px 0 6px; border-radius: 22px; border: 0; background: {{{{ t.page }}}}; color: {{{{ t.text }}}}; display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 600">{token('ANTHROPIC', 32)}ANTHROPIC{ic('caret-down', 14)}</button></div>
</div>
<div style="border-radius: 20px; background: {{{{ t.card }}}}; box-shadow: {{{{ t.shadow }}}}; padding: 16px">
<div style="display: flex; justify-content: space-between; font-size: 12px; line-height: 16px; color: {{{{ t.text2 }}}}"><span>Leverage</span><span>Borrow <span style="font-weight: 600; color: {{{{ t.text }}}}">{{{{ borrowed }}}}</span></span></div>
<div role="radiogroup" aria-label="Leverage" style="margin-top: 12px; display: flex; gap: 8px">
<sc-for list="{{{{ levs }}}}" as="l" hint-placeholder-count="4">
<button type="button" role="radio" aria-checked="{{{{ l.on }}}}" onClick="{{{{ l.pick }}}}" style="flex: 1 1 0; height: 44px; border-radius: 22px; border: 1px solid {{{{ l.bd }}}}; background: {{{{ l.bg }}}}; color: {{{{ l.fg }}}}; font-size: 14px; font-weight: 600">{{{{ l.label }}}}</button>
</sc-for>
</div>
<div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid {{{{ t.line }}}}; display: flex; justify-content: space-between; font-size: 12px; line-height: 16px"><span style="display: flex; align-items: center; gap: 6px; color: {{{{ t.text2 }}}}">Health after {hdyn("hfD", "hfC")}<span style="font-weight: 600; color: {{{{ t.text }}}}">{{{{ hf }}}}</span></span><span style="color: {{{{ t.text2 }}}}">Liq. price <span style="font-weight: 600; color: {{{{ t.text }}}}">{{{{ liq }}}}</span></span></div>
</div>
<div style="border-radius: 20px; background: {{{{ t.card }}}}; box-shadow: {{{{ t.shadow }}}}; padding: 4px 16px">
<div style="height: 40px; display: flex; align-items: center; font-size: 12px; color: {{{{ t.text2 }}}}">Deploy borrowed funds to</div>
<sc-for list="{{{{ pools }}}}" as="p" hint-placeholder-count="2">
<button type="button" role="radio" aria-checked="{{{{ p.on }}}}" onClick="{{{{ p.pick }}}}" style="width: 100%; height: 64px; padding: 0; border: 0; border-top: 1px solid {{{{ t.line }}}}; background: transparent; color: {{{{ t.text }}}}; display: flex; align-items: center; gap: 12px; text-align: left"><img src="{{{{ p.icon }}}}" alt="" style="width: 36px; height: 36px; border-radius: 999px"><span style="flex-grow: 1; display: flex; flex-direction: column"><span style="font-size: 14px; line-height: 20px; font-weight: 600">{{{{ p.name }}}}</span><span style="font-size: 12px; line-height: 16px; color: {{{{ t.text2 }}}}">{{{{ p.avail }}}}</span></span><span style="font-size: 14px; font-weight: 600; color: {{{{ t.pos }}}}">{{{{ p.apy }}}}</span><span style="width: 22px; height: 22px; border-radius: 999px; border: 2px solid {{{{ p.ring }}}}; display: flex; align-items: center; justify-content: center"><span style="width: 10px; height: 10px; border-radius: 999px; background: {{{{ p.dot }}}}"></span></span></button>
</sc-for>
</div>
<a href="V7FarmReview.dc.html" style="height: 56px; border-radius: 28px; background: #703AE6; color: #FFFFFF; font-size: 16px; font-weight: 600; display: flex; align-items: center; justify-content: center; text-decoration: none">Review farm</a>
</div>""") + '\n' + capsule('farm', 'Deploy')
    js = FARM_JS + """var pools = [
{ id: 'USDC', name: 'Kamino USDC', avail: '5,996,822 USDC available', apy: '5.03%%', icon: '%(USDC)s' },
{ id: 'SOL', name: 'Kamino SOL', avail: '255,061 SOL available', apy: '4.36%%', icon: '%(SOL)s' }
].map(function (p) { var on = p.id === s.pool; p.on = on ? 'true' : 'false'; p.ring = on ? '#703AE6' : t.text2; p.dot = on ? '#703AE6' : 'transparent'; p.pick = function () { self.setState({ pool: p.id }); }; return p; });
var levs = [2, 3, 4, 5].map(function (v) { var on = v === s.lev; return { label: v + 'x', on: on ? 'true' : 'false', bg: on ? t.chipOn : 'transparent', fg: on ? t.chipOnFg : t.text, bd: on ? t.chipOn : t.bd, pick: function () { self.setState({ lev: v }); } }; });
return { t: t, hfD: hArc(hf), pools: pools, levs: levs, apr: apr, yearly: '+' + money(net), borrowed: borrowed, hf: hfL, hfC: hfC, liq: liq };""" % TOK
    page('V7Farm', 'Farm deploy', body, js)


def farm_review():
    steps = [('Deposit 0.96 ANTHROPIC', 'Moves from your wallet into your margin account'),
             ('Borrow 2,002.12 USDC', 'From the Vanna USDC vault at 0.65% APY'),
             ('Deploy to Kamino USDC', 'Earns 5.03% APY while the farm is open')]
    st = ''
    for i, (a, b) in enumerate(steps):
        line = '' if i == len(steps) - 1 else f'<span style="position: absolute; left: 11px; top: 28px; bottom: -4px; width: 2px; background: {{{{ t.line }}}}"></span>'
        st += f'<div style="position: relative; padding: 4px 0 16px 40px">{line}<span style="position: absolute; left: 0; top: 4px; width: 24px; height: 24px; border-radius: 999px; background: {{{{ t.tv }}}}; color: {{{{ t.tvI }}}}; font-size: 12px; font-weight: 600; display: flex; align-items: center; justify-content: center">{i + 1}</span><div style="font-size: 14px; line-height: 20px; font-weight: 600">{a}</div><div style="font-size: 12px; line-height: 16px; color: {{{{ t.text2 }}}}">{b}</div></div>'
    row = lambda k, v, c='': f'<div style="height: 48px; display: flex; align-items: center; justify-content: space-between; font-size: 14px; border-bottom: 1px solid {{{{ t.line }}}}"><span style="color: {{{{ t.text2 }}}}">{k}</span><span style="font-weight: 600{c}">{v}</span></div>'
    body = f"""<div style="position: absolute; inset: 0; overflow-y: auto; padding-bottom: 112px">
{topbar('Review farm', 'V7Farm')}
<div style="padding: 8px 16px 0 16px; display: flex; flex-direction: column; gap: 12px">
<div style="border-radius: 20px; background: linear-gradient(160deg, #FF007A -40%, #8C0043 40%, #6B0033 100%); color: #FFFFFF; padding: 20px 16px; display: flex; align-items: center; gap: 12px">{token('ANTHROPIC', 48)}<span style="flex-grow: 1; display: flex; flex-direction: column"><span style="font-size: 14px; line-height: 20px; color: rgba(255,255,255,0.78)">ANTHROPIC farm · 3x</span><span style="font-size: 32px; line-height: 40px; font-weight: 600; color: #32EEE2">8.76%</span><span style="font-size: 12px; line-height: 16px; color: rgba(255,255,255,0.78)">Net APR · about +$87.69 a year</span></span></div>
<div style="border-radius: 20px; background: {{{{ t.card }}}}; box-shadow: {{{{ t.shadow }}}}; padding: 16px 16px 0 16px">{st}</div>
<div style="border-radius: 20px; background: {{{{ t.card }}}}; box-shadow: {{{{ t.shadow }}}}; padding: 0 16px">
{row('Health after', hglyph(1.50, 18, '{{ t.line }}', '{{ t.pos }}').replace('flex-shrink: 0', 'flex-shrink: 0; margin-right: 6px; vertical-align: 1px') + '1.50 · Safe')}
{row('ANTHROPIC liquidation price', '$208.55')}
{row('Current price', '$1,042.77')}
<details style="padding: 0"><summary style="height: 48px; display: flex; align-items: center; justify-content: space-between; font-size: 14px; font-weight: 600; list-style: none; cursor: pointer">Risks and fees<span style="color: {{{{ t.text2 }}}}; display: flex">{ic('caret-down', 16)}</span></summary><p style="margin: 0 0 16px 0; font-size: 12px; line-height: 18px; color: {{{{ t.text2 }}}}">If ANTHROPIC falls to $208.55 your health reaches 1.10 and the farm is unwound with a 0–15% penalty. Kamino APY floats. No Vanna fee to open or close.</p></details>
</div>
</div>
</div>
<div style="position: absolute; left: 0; right: 0; bottom: 0; padding: 12px 16px 24px 16px; background: {{{{ t.page }}}}; border-top: 1px solid {{{{ t.line }}}}">
<button type="button" onClick="{{{{ startTx }}}}" style="width: 100%; height: 56px; border-radius: 28px; border: 0; background: #703AE6; color: #FFFFFF; font-size: 16px; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 8px">Confirm · approve in wallet{ic('wallet', 18)}</button>
</div>"""
    body += tx_overlay('Your farm is live', '0.96 ANTHROPIC deposited · 2,002.12 USDC earning 5.03% on Kamino', 'Backpack', 'all 3 steps in one transaction')
    page('V7FarmReview', 'Farm review', body, 'return { t: t };', tx_default='')


def farm_position():
    hero_inner = hero_stats('GOOGLx farm · 4x', '+$1.47', [('Net APR', '13.14%'), ('Opened', 'Sep 21, 2026')], f'<span style="display: flex; align-items: center; gap: 6px; font-size: 12px; color: rgba(255,255,255,0.86)">{hdyn("hfD", "hfDot", "rgba(255,255,255,0.3)")}Health {{{{ hfShort }}}}</span>')
    def row(k, v, sub=''):
        subh = f'<span style="font-size: 12px; line-height: 16px; color: {{{{ t.text2 }}}}">{sub}</span>' if sub else ''
        return f'<div style="min-height: 56px; display: flex; align-items: center; justify-content: space-between; gap: 12px; font-size: 14px; border-bottom: 1px solid {{{{ t.line }}}}"><span style="color: {{{{ t.text2 }}}}">{k}</span><span style="display: flex; flex-direction: column; align-items: flex-end"><span style="font-weight: 600">{v}</span>{subh}</span></div>'
    body = scroller(f"""{hero('farm', hero_inner)}
<div style="padding: 16px 16px 0 16px; display: flex; flex-direction: column; gap: 12px">
<div style="border-radius: 20px; background: {{{{ warnBg }}}}; color: {{{{ warnFg }}}}; padding: 16px">
<div style="display: flex; gap: 12px; align-items: flex-start">{ic('warning-circle', 20)}<span style="flex-grow: 1; display: flex; flex-direction: column; gap: 2px"><span style="font-size: 14px; line-height: 20px; font-weight: 600">{{{{ warnTitle }}}}</span><span style="font-size: 12px; line-height: 16px">{{{{ warnBody }}}}</span></span></div>
<button type="button" onClick="{{{{ toggleAdd }}}}" aria-pressed="{{{{ addAria }}}}" style="margin-top: 12px; width: 100%; height: 44px; border-radius: 22px; border: 0; background: {{{{ warnBtnBg }}}}; color: {{{{ warnBtnFg }}}}; font-size: 14px; font-weight: 600">{{{{ warnBtn }}}}</button>
</div>
<div style="border-radius: 20px; background: {{{{ t.card }}}}; box-shadow: {{{{ t.shadow }}}}; padding: 0 16px">
{row('Deposited', '{{ dep }}', '{{ depUsd }}')}
{row('Borrowed', '1,529.70 USDC', 'at 0.65% APY')}
{row('Deployed to', 'Kamino USDC', '5.03% APY')}
{row('GOOGLx liquidation price', '{{ liq }}', 'GOOGLx now $339.93')}
<div style="height: 56px; display: flex; align-items: center; justify-content: space-between; font-size: 14px"><span style="color: {{{{ t.text2 }}}}">Health</span><span style="font-weight: 600; display: flex; align-items: center; gap: 6px">{hdyn("hfD", "hfDot")}{{{{ hfLong }}}}</span></div>
</div>
<button type="button" style="height: 52px; border-radius: 26px; border: 1px solid {{{{ t.bd }}}}; background: transparent; color: {{{{ t.text }}}}; font-size: 14px; font-weight: 600">Unwind farm · repay and withdraw</button>
</div>""") + '\n' + capsule('farm', 'Position')
    js = """var add = !!this.state.add;
return { t: t, addAria: add ? 'true' : 'false', toggleAdd: function () { self.setState({ add: !add }); },
hfD: hArc(add ? 1.5 : 1.33), hfShort: add ? '1.50' : '1.33', hfLong: add ? '1.50 · Safe' : '1.33 · Moderate', hfDot: add ? t.pos : '#FF8AC2',
dep: add ? '2.25 GOOGLx' : '1.50 GOOGLx', depUsd: add ? '$764.84' : '$509.90', liq: add ? '$67.99' : '$101.98',
warnBg: add ? t.tt : t.tr, warnFg: add ? t.ttI : t.trI,
warnTitle: add ? 'Preview: health back to 1.50' : 'Health is 1.33 · Moderate',
warnBody: add ? 'Adding 0.75 GOOGLx ($254.95) moves your liquidation price to $67.99.' : 'Below the 1.50 comfort line. Add 0.75 GOOGLx to get back to Safe.',
warnBtn: add ? 'Add 0.75 GOOGLx · approve in wallet' : 'Preview adding 0.75 GOOGLx',
warnBtnBg: add ? '#703AE6' : t.card, warnBtnFg: add ? '#FFFFFF' : t.text };"""
    page('V7FarmPosition', 'Farm position', body, js)


def welcome(stem, sheet, base_override=None):
    feats = [('chart-line-up', 'Perps', 'Long or short xStocks and PreStocks up to 5x'),
             ('vault', 'Earn', 'Supply to vaults. No lockups, withdraw anytime'),
             ('plant', 'Farm', 'Borrow up to 5x and deploy to Kamino in one click'),
             ('arrows-left-right', 'Swap', 'Any token from your wallet, via Jupiter')]
    fr = ''.join(f'<div style="display: flex; gap: 12px; align-items: center; animation: vnRise 420ms ease-out {0.9 + k * 0.12:.2f}s both"><span style="width: 40px; height: 40px; border-radius: 999px; background: #FFFFFF; color: #703AE6; display: flex; align-items: center; justify-content: center; flex-shrink: 0">{ic(i, 20, "fill" if i == "plant" else "bold")}</span><span style="display: flex; flex-direction: column"><span style="font-size: 16px; line-height: 22px; font-weight: 600">{a}</span><span style="font-size: 12px; line-height: 16px; color: rgba(255,255,255,0.8)">{b}</span></span></div>' for k, (i, a, b) in enumerate(feats))
    pos = [('TSLAx', 0, 30, 52), ('OPENAI', 64, 0, 44), ('GOOGLx', 122, 34, 48), ('ANTHROPIC', 184, 4, 42), ('AAPLx', 240, 36, 46), ('SOL', 300, 8, 40)]
    toks = ''.join(f'<span style="position: absolute; left: {x}px; top: {y}px; animation: vnRise 500ms cubic-bezier(0.2, 0.9, 0.3, 1) {0.15 + k * 0.08:.2f}s both"><img src="{TOK[s]}" alt="" style="width: {sz}px; height: {sz}px; border-radius: 999px; border: 3px solid rgba(255,255,255,0.85); display: block; animation: vnFloat {3.2 + k * 0.35:.2f}s ease-in-out {k * 0.3:.1f}s infinite"></span>' for k, (s, x, y, sz) in enumerate(pos))
    phrases = ['trade stocks up to 5x', 'earn on idle assets', 'farm with one click', 'swap any token']
    cyc = ''.join(f'<span style="position: absolute; left: 0; top: 0; white-space: nowrap; opacity: 0; animation: vnCycle 10s ease-in-out {k * 2.5:.1f}s infinite">{p}<span style="display: inline-block; width: 3px; height: 34px; margin-left: 4px; vertical-align: -4px; background: #FFFFFF; animation: vnBlink 1s steps(1) infinite"></span></span>' for k, p in enumerate(phrases))
    base = f"""<div style="position: absolute; inset: 0; background: {SP['home']['grad']}; color: #FFFFFF; padding: 60px 24px 28px 24px; display: flex; flex-direction: column; overflow: hidden">
<div style="display: flex; align-items: center; gap: 10px"><span style="width: 44px; height: 44px; border-radius: 999px; background: #FFFFFF; display: flex; align-items: center; justify-content: center; animation: vnPop 600ms cubic-bezier(0.34, 1.56, 0.64, 1) both"><img src="{MARK}" alt="Vanna" style="width: 26px; height: 26px"></span><span style="font-size: 20px; font-weight: 600; animation: vnRise 400ms ease-out 0.2s both">Vanna</span></div>
<div aria-hidden="true" style="position: relative; height: 96px; margin-top: 36px">{toks}</div>
<p style="margin: 28px 0 0 0; font-size: 16px; line-height: 24px; color: rgba(255,255,255,0.85); animation: vnRise 400ms ease-out 0.5s both">One app to</p>
<div role="text" aria-label="Trade stocks up to 5x, earn on idle assets, farm with one click, swap any token" style="position: relative; overflow: hidden; height: 48px; margin-top: 2px; font-size: 29px; line-height: 44px; font-weight: 600; letter-spacing: -0.02em">{cyc}</div>
<p style="margin: 4px 0 0 0; font-size: 16px; line-height: 24px; color: rgba(255,255,255,0.85); animation: vnRise 400ms ease-out 0.6s both">All on Solana, with tokenized stocks.</p>
<div style="margin-top: 28px; display: flex; flex-direction: column; gap: 14px">{fr}</div>
<span style="flex-grow: 1"></span>
<a href="V7Connect.dc.html" style="position: relative; overflow: hidden; height: 56px; border-radius: 28px; background: #FFFFFF; color: #2F1B61; font-size: 16px; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 8px; text-decoration: none; animation: vnRise 420ms ease-out 1.4s both">{ic('wallet', 20)}Connect wallet<span aria-hidden="true" style="position: absolute; top: 0; bottom: 0; width: 80px; background: linear-gradient(90deg, rgba(112,58,230,0), rgba(112,58,230,0.18), rgba(112,58,230,0)); animation: vnShine 2.8s ease-in-out 2s infinite"></span></a>
<a href="V7Perps.dc.html" style="margin-top: 6px; height: 48px; border-radius: 24px; color: #FFFFFF; font-size: 14px; font-weight: 600; display: flex; align-items: center; justify-content: center; text-decoration: none; animation: vnFade 400ms ease-out 1.5s both">Explore first</a>
<p style="margin: 4px 0 0 0; text-align: center; font-size: 12px; line-height: 16px; color: rgba(255,255,255,0.75)">Solana Devnet · Your keys never leave your wallet app</p>
</div>"""
    if base_override:
        base = base_override
    if not sheet:
        page(stem, 'Welcome', base, 'return { t: t };')
        return
    wallets = f"""<sc-for list="{{{{ wallets }}}}" as="w" hint-placeholder-count="3">
<button type="button" onClick="{{{{ w.pick }}}}" style="width: 100%; height: 64px; padding: 0 4px; border: 0; border-top: 1px solid {{{{ t.line }}}}; background: transparent; color: {{{{ t.text }}}}; display: flex; align-items: center; gap: 12px; text-align: left"><span style="width: 40px; height: 40px; border-radius: 12px; background: {{{{ w.bg }}}}; color: {{{{ w.fg }}}}; display: flex; align-items: center; justify-content: center">{ic('wallet', 20)}</span><span style="flex-grow: 1; display: flex; flex-direction: column"><span style="font-size: 16px; line-height: 24px; font-weight: 600">{{{{ w.name }}}}</span><span style="font-size: 12px; line-height: 16px; color: {{{{ t.text2 }}}}">{{{{ w.cap }}}}</span></span><span style="color: {{{{ t.text2 }}}}; display: flex">{CHEV}</span></button>
</sc-for>"""
    sheet_html = f"""<div aria-hidden="true" style="position: absolute; inset: 0; background: rgba(0,0,0,0.56)"></div>
<div role="dialog" aria-label="Connect a wallet" style="position: absolute; left: 0; right: 0; bottom: 0; border-radius: 28px 28px 0 0; background: {{{{ t.card }}}}; color: {{{{ t.text }}}}; padding: 12px 20px 32px 20px">
<div style="width: 36px; height: 4px; margin: 0 auto; border-radius: 2px; background: {{{{ t.bd }}}}"></div>
<sc-if value="{{{{ picking }}}}" hint-placeholder-val="{{{{ true }}}}">
<h2 style="margin: 20px 0 0 0; font-size: 20px; line-height: 28px; font-weight: 600">Connect a wallet</h2>
<p style="margin: 4px 0 16px 0; font-size: 14px; line-height: 20px; color: {{{{ t.text2 }}}}">Vanna uses Solana Mobile Wallet Adapter. Pick a wallet on this phone and approve there.</p>
{wallets}
<div style="margin-top: 8px; padding: 12px; border-radius: 14px; background: {{{{ t.page }}}}; display: flex; gap: 10px; font-size: 12px; line-height: 16px; color: {{{{ t.text2 }}}}">{ic('lock-key', 16)}<span>Vanna only asks to view your address and to request signatures. Every transaction is approved in your wallet.</span></div>
</sc-if>
<sc-if value="{{{{ waiting }}}}" hint-placeholder-val="{{{{ false }}}}">
<div style="padding: 32px 0 8px 0; display: flex; flex-direction: column; align-items: center; text-align: center">
<span style="width: 72px; height: 72px; border-radius: 24px; background: {{{{ t.tv }}}}; color: {{{{ t.tvI }}}}; display: flex; align-items: center; justify-content: center">{ic('device-mobile', 32)}</span>
<h2 style="margin: 20px 0 0 0; font-size: 20px; line-height: 28px; font-weight: 600">Approve in {{{{ chosen }}}}</h2>
<p style="margin: 4px 0 0 0; font-size: 14px; line-height: 20px; color: {{{{ t.text2 }}}}">We opened {{{{ chosen }}}}. Approve the connection there, then come back to Vanna.</p>
<a href="V7Home.dc.html" style="margin-top: 24px; width: 100%; height: 52px; border-radius: 26px; background: #703AE6; color: #FFFFFF; font-size: 16px; font-weight: 600; display: flex; align-items: center; justify-content: center; text-decoration: none">Continue to Vanna</a>
<button type="button" onClick="{{{{ reset }}}}" style="margin-top: 8px; width: 100%; height: 48px; border: 0; background: transparent; color: {{{{ t.text }}}}; font-size: 14px; font-weight: 600">Use another wallet</button>
</div>
</sc-if>
</div>"""
    js = """var ch = this.state.ch || '';
var W = [['Backpack', 'Installed'], ['Solflare', 'Installed'], ['Seed Vault', 'Built into Seeker']];
var wallets = W.map(function (w, i) { return { name: w[0], cap: w[1], bg: [t.tv, t.tt, t.tr][i], fg: [t.tvI, t.ttI, t.trI][i], pick: function () { self.setState({ ch: w[0] }); } }; });
return { t: t, wallets: wallets, picking: !ch, waiting: !!ch, chosen: ch, reset: function () { self.setState({ ch: '' }); } };"""
    page(stem, 'Connect', base + '\n' + sheet_html, js)


def build():
    earn()
    earn_vault()
    earn_supply()
    farm()
    farm_review()
    farm_position()
    welcome('V7Welcome', False)
    welcome('V7Connect', True)


if __name__ == '__main__':
    build()
