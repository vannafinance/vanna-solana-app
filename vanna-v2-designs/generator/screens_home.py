from common import *
from notes7 import NOTES_JS, NOTE_ICON

# ---------------------------------------------------------------- positions data
POS_JS = """var perpsAll = [
{ pair: 'TSLAx-USDC', icon: '%(TSLAx)s', side: 'Long', sideBg: '#703AE6', lev: '3x', opened: 'Since Sep 22', pnl: '+$152.52', roe: '+10.89%%', size: '$4,352.69', sizeU: '12.31 TSLAx', coll: '$1,400.00', collU: 'USDC', liq: '$250.20', liqU: '29.2%% away', entry: '$341.20', mark: '$353.59' },
{ pair: 'OPENAI-USDC', icon: '%(OPENAI)s', side: 'Short', sideBg: '#B33C3E', lev: '2x', opened: 'Since Sep 25', pnl: '+$57.71', roe: '+5.77%%', size: '$1,942.22', sizeU: '0.9174 OPENAI', coll: '$1,000.00', collU: 'USDC', liq: '$2,972.80', liqU: '40.4%% away', entry: '$2,180.00', mark: '$2,117.09' }
];
var histAll = [
{ pair: 'AAPLx-USDC', icon: '%(AAPLx)s', kind: 'Perp', tag: 'Long 2x', tagC: t.link, when: 'Sep 24 · 3 days', pnl: '+$38.43', pct: '+3.84%%', up: true, rows: [['Entry → exit', '$318.10 → $324.20'], ['Size', '6.30 AAPLx'], ['Collateral', '$1,000.00'], ['Fees paid', '$1.26']] },
{ pair: 'ANTHROPIC farm', icon: '%(ANTHROPIC)s', kind: 'Farm', tag: 'Farm 3x', tagC: t.text2, when: 'Sep 19 · 9 days', pnl: '+$6.12', pct: '+0.61%%', up: true, rows: [['Deposited', '0.96 ANTHROPIC'], ['Borrowed', '2,002.12 USDC'], ['Deployed to', 'Kamino USDC'], ['Net APR', '8.76%%']] },
{ pair: 'GOOGLx-USDC', icon: '%(GOOGLx)s', kind: 'Perp', tag: 'Short 3x', tagC: t.neg, when: 'Sep 18 · 2 days', pnl: '-$21.04', pct: '-3.01%%', up: false, rows: [['Entry → exit', '$334.10 → $339.11'], ['Size', '4.20 GOOGLx'], ['Collateral', '$700.00'], ['Fees paid', '$0.84']] },
{ pair: 'OPENAI-USDC', icon: '%(OPENAI)s', kind: 'Perp', tag: 'Long 2x', tagC: t.link, when: 'Sep 8 · 5 days', pnl: '+$12.80', pct: '+2.56%%', up: true, rows: [['Entry → exit', '$2,090.00 → $2,118.00'], ['Size', '0.4571 OPENAI'], ['Collateral', '$500.00'], ['Fees paid', '$0.38']] }
];
""" % TOK

PERP_CARD = f"""<sc-for list="{{{{ perps }}}}" as="p" hint-placeholder-count="2">
<article style="border-radius: 20px; background: {{{{ t.card }}}}; box-shadow: {{{{ t.shadow }}}}; padding: 16px">
<div style="display: flex; align-items: center; gap: 12px">
<img src="{{{{ p.icon }}}}" alt="" style="width: 40px; height: 40px; border-radius: 999px; flex-shrink: 0">
<div style="flex-grow: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px">
<span style="font-size: 16px; line-height: 20px; font-weight: 600">{{{{ p.pair }}}}</span>
<span style="display: flex; align-items: center; gap: 8px"><span style="height: 20px; padding: 0 8px; border-radius: 6px; background: {{{{ p.sideBg }}}}; color: #FFFFFF; font-size: 12px; line-height: 20px; font-weight: 600; white-space: nowrap; flex-shrink: 0">{{{{ p.side }}}} {{{{ p.lev }}}}</span><span style="font-size: 12px; line-height: 16px; color: {{{{ t.text2 }}}}; white-space: nowrap">{{{{ p.opened }}}}</span></span>
</div>
<div style="display: flex; flex-direction: column; align-items: flex-end; gap: 4px">
<span style="font-size: 16px; line-height: 20px; font-weight: 600; color: {{{{ t.pos }}}}">{{{{ p.pnl }}}}</span>
<span style="font-size: 12px; line-height: 16px; color: {{{{ t.pos }}}}">{{{{ p.roe }}}}</span>
</div>
</div>
<div style="margin-top: 16px; padding: 12px; border-radius: 14px; background: {{{{ t.page }}}}; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px">
<div style="display: flex; flex-direction: column; gap: 2px"><span style="font-size: 12px; line-height: 16px; color: {{{{ t.text2 }}}}">Size</span><span style="font-size: 14px; line-height: 20px; font-weight: 600">{{{{ p.size }}}}</span><span style="font-size: 12px; line-height: 16px; color: {{{{ t.text2 }}}}">{{{{ p.sizeU }}}}</span></div>
<div style="display: flex; flex-direction: column; gap: 2px"><span style="font-size: 12px; line-height: 16px; color: {{{{ t.text2 }}}}">Collateral</span><span style="font-size: 14px; line-height: 20px; font-weight: 600">{{{{ p.coll }}}}</span><span style="font-size: 12px; line-height: 16px; color: {{{{ t.text2 }}}}">{{{{ p.collU }}}}</span></div>
<div style="display: flex; flex-direction: column; gap: 2px"><span style="font-size: 12px; line-height: 16px; color: {{{{ t.text2 }}}}">Liq. price</span><span style="font-size: 14px; line-height: 20px; font-weight: 600">{{{{ p.liq }}}}</span><span style="font-size: 12px; line-height: 16px; color: {{{{ t.text2 }}}}">{{{{ p.liqU }}}}</span></div>
</div>
<div style="margin-top: 12px; height: 20px; display: flex; align-items: center; justify-content: space-between; font-size: 14px"><span style="color: {{{{ t.text2 }}}}">Entry → mark</span><span style="font-weight: 600">{{{{ p.entry }}}} → {{{{ p.mark }}}}</span></div>
<div style="margin-top: 16px; display: flex; gap: 8px">
<button type="button" onClick="{{{{ p.add }}}}" style="flex: 1 1 0; height: 44px; border-radius: 22px; border: 1px solid {{{{ t.bd }}}}; background: transparent; color: {{{{ t.text }}}}; font-size: 14px; font-weight: 600">Add collateral</button>
<button type="button" onClick="{{{{ p.close }}}}" style="flex: 1 1 0; height: 44px; border-radius: 22px; border: 0; background: {{{{ t.chipOn }}}}; color: {{{{ t.chipOnFg }}}}; font-size: 14px; font-weight: 600">Close position</button>
</div>
</article>
</sc-for>"""

FARM_CARD = f"""<article style="border-radius: 20px; background: {{{{ t.card }}}}; box-shadow: {{{{ t.shadow }}}}; padding: 16px">
<div style="display: flex; align-items: center; gap: 12px">
{token('GOOGLx')}
<div style="flex-grow: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px">
<span style="font-size: 16px; line-height: 20px; font-weight: 600">GOOGLx → USDC</span>
<span style="display: flex; align-items: center; gap: 8px"><span style="height: 20px; padding: 0 8px; border-radius: 6px; background: {{{{ t.tt }}}}; color: {{{{ t.ttI }}}}; font-size: 12px; line-height: 20px; font-weight: 600; white-space: nowrap; flex-shrink: 0">Farm 4x</span><span style="font-size: 12px; line-height: 16px; color: {{{{ t.text2 }}}}; white-space: nowrap">Kamino · since Sep 21</span></span>
</div>
<div style="display: flex; flex-direction: column; align-items: flex-end; gap: 4px">
<span style="font-size: 16px; line-height: 20px; font-weight: 600; color: {{{{ t.pos }}}}">+$1.47</span>
<span style="font-size: 12px; line-height: 16px; color: {{{{ t.text2 }}}}; white-space: nowrap">4.23% net APR</span>
</div>
</div>
<div style="margin-top: 16px; padding: 12px; border-radius: 14px; background: {{{{ t.page }}}}; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px">
<div style="display: flex; flex-direction: column; gap: 2px"><span style="font-size: 12px; line-height: 16px; color: {{{{ t.text2 }}}}">Collateral</span><span style="font-size: 14px; line-height: 20px; font-weight: 600">$509.90</span><span style="font-size: 12px; line-height: 16px; color: {{{{ t.text2 }}}}">1.50 GOOGLx</span></div>
<div style="display: flex; flex-direction: column; gap: 2px"><span style="font-size: 12px; line-height: 16px; color: {{{{ t.text2 }}}}">Borrowed</span><span style="font-size: 14px; line-height: 20px; font-weight: 600">$1,529.70</span><span style="font-size: 12px; line-height: 16px; color: {{{{ t.text2 }}}}">USDC</span></div>
<div style="display: flex; flex-direction: column; gap: 2px"><span style="font-size: 12px; line-height: 16px; color: {{{{ t.text2 }}}}">Liq. price</span><span style="font-size: 14px; line-height: 20px; font-weight: 600">$101.01</span><span style="font-size: 12px; line-height: 16px; color: {{{{ t.text2 }}}}">70% away</span></div>
</div>
<div style="margin-top: 12px; height: 20px; display: flex; align-items: center; gap: 6px; font-size: 14px">{hglyph(1.33, 16, '{{ t.line }}')}<span style="font-weight: 600">Health 1.33</span><span style="color: {{{{ t.text2 }}}}">· liquidation at 1.10</span></div>
<div style="margin-top: 16px; display: flex; gap: 8px">
<a href="V7FarmPosition.dc.html" style="flex: 1 1 0; height: 44px; border-radius: 22px; border: 1px solid {{{{ t.bd }}}}; color: {{{{ t.text }}}}; font-size: 14px; font-weight: 600; display: flex; align-items: center; justify-content: center; text-decoration: none">Details</a>
<a href="V7FarmClose.dc.html" style="flex: 1 1 0; height: 44px; border-radius: 22px; background: {{{{ t.chipOn }}}}; color: {{{{ t.chipOnFg }}}}; font-size: 14px; font-weight: 600; display: flex; align-items: center; justify-content: center; text-decoration: none">Close position</a>
</div>
</article>"""

HIST_LIST = f"""<div style="border-radius: 20px; background: {{{{ t.card }}}}; box-shadow: {{{{ t.shadow }}}}; padding: 4px 16px">
<div style="height: 72px; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); align-items: center; border-bottom: 1px solid {{{{ t.line }}}}">
<div style="display: flex; flex-direction: column; gap: 2px"><span style="font-size: 12px; line-height: 16px; color: {{{{ t.text2 }}}}">Realized PnL</span><span style="font-size: 16px; line-height: 24px; font-weight: 600; color: {{{{ t.pos }}}}">{{{{ realized }}}}</span></div>
<div style="display: flex; flex-direction: column; gap: 2px; padding-left: 16px; border-left: 1px solid {{{{ t.line }}}}"><span style="font-size: 12px; line-height: 16px; color: {{{{ t.text2 }}}}">Closed</span><span style="font-size: 16px; line-height: 24px; font-weight: 600">{{{{ closedN }}}}</span></div>
<div style="display: flex; flex-direction: column; gap: 2px; padding-left: 16px; border-left: 1px solid {{{{ t.line }}}}"><span style="font-size: 12px; line-height: 16px; color: {{{{ t.text2 }}}}">Win rate</span><span style="font-size: 16px; line-height: 24px; font-weight: 600">{{{{ winRate }}}}</span></div>
</div>
<sc-for list="{{{{ hist }}}}" as="h" hint-placeholder-count="4">
<div style="border-bottom: 1px solid {{{{ t.line }}}}">
<button type="button" onClick="{{{{ h.toggle }}}}" aria-expanded="{{{{ h.exp }}}}" style="width: 100%; min-height: 72px; padding: 12px 0; border: 0; background: transparent; color: {{{{ t.text }}}}; display: flex; align-items: center; gap: 12px; text-align: left">
<img src="{{{{ h.icon }}}}" alt="" style="width: 36px; height: 36px; border-radius: 999px; flex-shrink: 0">
<span style="flex-grow: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px"><span style="font-size: 14px; line-height: 20px; font-weight: 600">{{{{ h.pair }}}}</span><span style="font-size: 12px; line-height: 16px; color: {{{{ t.text2 }}}}; white-space: nowrap"><span style="font-weight: 600; color: {{{{ h.tagC }}}}">{{{{ h.tag }}}}</span> · {{{{ h.when }}}}</span></span>
<span style="display: flex; flex-direction: column; align-items: flex-end; gap: 2px"><span style="font-size: 14px; line-height: 20px; font-weight: 600; color: {{{{ h.c }}}}">{{{{ h.pnl }}}}</span><span style="font-size: 12px; line-height: 16px; color: {{{{ h.c }}}}">{{{{ h.pct }}}}</span></span>
<span style="color: {{{{ t.text2 }}}}; display: flex; transform: {{{{ h.rot }}}}">{ic('caret-down', 16)}</span>
</button>
<sc-if value="{{{{ h.open }}}}" hint-placeholder-val="{{{{ false }}}}">
<div style="margin: 0 0 12px 48px; padding: 8px 12px; border-radius: 14px; background: {{{{ t.page }}}}">
<sc-for list="{{{{ h.rows }}}}" as="r" hint-placeholder-count="4">
<div style="height: 32px; display: flex; align-items: center; justify-content: space-between; font-size: 12px"><span style="color: {{{{ t.text2 }}}}">{{{{ r.k }}}}</span><span style="font-weight: 600">{{{{ r.v }}}}</span></div>
</sc-for>
<a href="#" style="height: 32px; display: flex; align-items: center; gap: 4px; font-size: 12px; font-weight: 600; color: {{{{ t.link }}}}; text-decoration: none">View on Solana Explorer {ic('arrow-up-right', 12)}</a>
</div>
</sc-if>
</div>
</sc-for>
<div style="height: 48px; display: flex; align-items: center; justify-content: center; font-size: 12px; color: {{{{ t.text2 }}}}">Showing the last 30 days</div>
</div>"""

HIST_JS = """var openIdx = this.state.open === undefined ? 0 : this.state.open;
var histSrc = histAll.filter(function (h) { return kindFilter === 'All' || h.kind === kindFilter; });
var hist = histSrc.map(function (h, i) { var o = i === openIdx; return { pair: h.pair, icon: h.icon, tag: h.tag, tagC: h.tagC, when: h.when, pnl: h.pnl, pct: h.pct, c: h.up ? t.pos : t.neg, rows: h.rows.map(function (r) { return { k: r[0], v: r[1] }; }), open: o, exp: o ? 'true' : 'false', rot: o ? 'rotate(180deg)' : 'none', toggle: function () { self.setState({ open: o ? -1 : i }); } }; });
var nums = { 'AAPLx-USDC': 38.43, 'ANTHROPIC farm': 6.12, 'GOOGLx-USDC': -21.04, 'OPENAI-USDC': 12.80 };
var sum = 0, wins = 0; histSrc.forEach(function (h) { sum += nums[h.pair]; if (h.up) wins++; });
"""

PERP_SHEET = f"""<sc-if value="{{{{ sheetOn }}}}" hint-placeholder-val="{{{{ false }}}}">
<div aria-hidden="true" onClick="{{{{ closeSheet }}}}" style="position: absolute; inset: 0; z-index: 40; background: rgba(17,17,17,0.5); animation: vnFade 180ms ease-out"></div>
<div role="dialog" aria-label="{{{{ sp.title }}}}" style="position: absolute; z-index: 41; left: 0; right: 0; bottom: 0; border-radius: 28px 28px 0 0; background: {{{{ t.card }}}}; color: {{{{ t.text }}}}; padding: 10px 20px 28px 20px; animation: vnSheet 340ms cubic-bezier(0.2, 0.9, 0.3, 1)">
<div style="width: 40px; height: 4px; border-radius: 2px; background: {{{{ t.bd }}}}; margin: 0 auto"></div>
<div style="margin-top: 14px; display: flex; align-items: center; gap: 12px"><img src="{{{{ sp.icon }}}}" alt="" style="width: 36px; height: 36px; border-radius: 999px"><span style="flex-grow: 1; display: flex; flex-direction: column"><span style="font-size: 20px; line-height: 28px; font-weight: 600">{{{{ sp.title }}}}</span><span style="font-size: 12px; line-height: 16px; color: {{{{ t.text2 }}}}">{{{{ sp.sub }}}}</span></span><button type="button" onClick="{{{{ closeSheet }}}}" aria-label="Close" style="width: 44px; height: 44px; border-radius: 22px; border: 0; background: {{{{ t.page }}}}; color: {{{{ t.text }}}}; display: flex; align-items: center; justify-content: center">{ic('x', 18)}</button></div>
<div style="margin-top: 18px; font-size: 12px; font-weight: 600; letter-spacing: 0.04em; color: {{{{ t.text2 }}}}">{{{{ sp.pickLabel }}}}</div>
<sc-if value="{{{{ isAdd }}}}" hint-placeholder-val="{{{{ false }}}}"><div style="margin-top: 6px; display: flex; align-items: baseline; gap: 8px"><span style="font-size: 36px; line-height: 44px; font-weight: 600; font-variant-numeric: tabular-nums">{{{{ addAmt }}}}</span><span style="font-size: 16px; font-weight: 600; color: {{{{ t.text2 }}}}">USDC</span></div><div style="font-size: 12px; line-height: 16px; color: {{{{ t.text2 }}}}">From your margin account · $4,320.37 available</div></sc-if>
<div style="margin-top: 10px; display: flex; gap: 8px"><sc-for list="{{{{ picks }}}}" as="k" hint-placeholder-count="4"><button type="button" onClick="{{{{ k.pick }}}}" aria-pressed="{{{{ k.on }}}}" style="flex: 1 1 0; height: 48px; border-radius: 16px; border: 0; background: {{{{ k.bg }}}}; color: {{{{ k.fg }}}}; font-size: 16px; font-weight: 600; transition: background 200ms ease">{{{{ k.label }}}}</button></sc-for></div>
<div style="margin-top: 12px">
<sc-for list="{{{{ srows }}}}" as="r" hint-placeholder-count="4"><div style="min-height: 48px; display: flex; align-items: center; justify-content: space-between; gap: 10px; border-top: 1px solid {{{{ t.line }}}}; font-size: 14px"><span style="color: {{{{ t.text2 }}}}">{{{{ r.k }}}}</span><span style="font-weight: 600; color: {{{{ r.c }}}}">{{{{ r.v }}}}</span></div></sc-for>
</div>
<button type="button" onClick="{{{{ goSheet }}}}" style="margin-top: 16px; width: 100%; height: 56px; border-radius: 28px; border: 0; background: {{{{ sp.ctaBg }}}}; color: #FFFFFF; font-size: 16px; font-weight: 600">{{{{ sp.cta }}}}</button>
</div>
</sc-if>"""

PERP_SHEET_JS = """var sh = this.state.sh || '', lk = this.state.lk || sh || 'close', pi = this.state.pi || 0, cp = this.state.cp || 100, aa = this.state.aa || 500;
var PN = [{ pnl: 152.52, coll: 1400, size: 4352.69, units: 12.31, dp: 2, sym: 'TSLAx', liq0: 250.20, liq: { 100: 241.28, 250: 227.88, 500: 205.54 } },
{ pnl: 57.71, coll: 1000, size: 1942.22, units: 0.9174, dp: 4, sym: 'OPENAI', liq0: 2972.80, liq: { 100: 3071.90, 250: 3220.50, 500: 3468.20 } }];
var N = PN[pi], P0 = perpsAll[pi], f = cp / 100, fee = N.size * 0.0006 * f, back = (N.coll + N.pnl) * f - fee;
var perps = perpsAll.map(function (p, i) { return Object.assign({}, p, { close: function () { self.setState({ sh: 'close', pi: i, cp: 100 }); }, add: function () { self.setState({ sh: 'add', pi: i, aa: 500 }); } }); });
var isAdd = sh === 'add';
var picks = isAdd ? [100, 250, 500, 1000].map(function (v) { var on = v === aa; return { label: '$' + v.toLocaleString('en-US'), on: on ? 'true' : 'false', bg: on ? '#703AE6' : t.page, fg: on ? '#FFFFFF' : t.text, pick: function () { self.setState({ aa: v }); } }; })
: [25, 50, 75, 100].map(function (v) { var on = v === cp; return { label: v + '%', on: on ? 'true' : 'false', bg: on ? t.chipOn : t.page, fg: on ? t.chipOnFg : t.text, pick: function () { self.setState({ cp: v }); } }; });
var liqA = N.liq[aa] || N.liq[500];
var srows = isAdd ? [{ k: 'Position collateral', v: money(N.coll) + ' → ' + money(N.coll + aa), c: t.text }, { k: 'Liquidation price', v: money(N.liq0) + ' → ' + money(liqA), c: t.pos }, { k: 'Margin available', v: '$4,320.37 → ' + money(4320.37 - aa), c: t.text }]
: [{ k: 'Closing', v: (N.units * f).toFixed(N.dp) + ' ' + N.sym + ' · ' + money(N.size * f), c: t.text }, { k: 'Realized PnL', v: '+' + money(N.pnl * f), c: t.pos }, { k: 'Trading fee', v: '-' + money(fee), c: t.text }, { k: 'Back to margin account', v: money(back), c: t.text }].concat(cp < 100 ? [{ k: 'Liquidation price', v: 'Unchanged · ' + P0.liq, c: t.text }] : []);
var sp = { icon: P0.icon, title: isAdd ? 'Add collateral' : 'Close position', sub: P0.pair + ' · ' + P0.side + ' ' + P0.lev, pickLabel: isAdd ? 'AMOUNT' : 'CLOSE AMOUNT', cta: isAdd ? 'Add ' + money(aa) + ' · approve in wallet' : 'Close ' + (cp === 100 ? 'all' : cp + '%') + ' · approve in wallet', ctaBg: isAdd ? '#703AE6' : 'linear-gradient(90deg, #FC5457, #703AE6)' };
var txTitle = lk === 'add' ? 'Collateral added' : (cp === 100 ? 'Position closed' : 'Closed ' + cp + '%');
var txBody = lk === 'add' ? P0.pair + ' now liquidates at ' + money(liqA) + ', further from the mark.' : '+' + money(N.pnl * f) + ' realized · ' + money(back) + ' is back in your margin account.';
var sheetVals = { sheetOn: !!sh, isAdd: isAdd, addAmt: aa.toLocaleString('en-US'), picks: picks, srows: srows, sp: sp, txTitle: txTitle, txBody: txBody, closeSheet: function () { self.setState({ sh: '' }); }, goSheet: function () { self.setState({ sh: '', lk: sh, __tx: 'sign', __st: 1, __why: '' }); } };
"""


def trader(stem, space, nav_active, title_label, filters, hd=False, variants=None):
    """filters: list of kinds, or None for perps-only."""
    chips_html = chips('kinds', 'k', 3) if filters else ''
    perps_count = "'2'" if not filters else "(kindFilter === 'Farm' ? '1' : (kindFilter === 'Perps' ? '2' : '3'))"
    hero_inner = hero_stats(title_label, '{{ heroNum }}', [('Margin', '$10,592.29'), ('Available', '$4,320.37'), ('Borrowed', '$6,271.92')], health_inline(1.69), '#32EEE2')
    new_btn = ''
    if not filters:
        new_btn = f'<a href="V7Perps.dc.html" style="height: 52px; border-radius: 20px; border: 1px dashed {{{{ t.bd }}}}; color: {{{{ t.text }}}}; display: flex; align-items: center; justify-content: center; gap: 8px; font-size: 14px; font-weight: 600; text-decoration: none">{ic("plus", 18)}Open a new position</a>'
    body = scroller(f"""{hero(space, hero_inner)}
<div style="padding: 16px 16px 0 16px; display: flex; flex-direction: column; gap: 12px">
{seg('tabs')}
<sc-if value="{{{{ isCurrent }}}}" hint-placeholder-val="{{{{ true }}}}">
{chips_html}
<sc-if value="{{{{ showPerps }}}}" hint-placeholder-val="{{{{ true }}}}">
{PERP_CARD}
</sc-if>
<sc-if value="{{{{ showFarm }}}}" hint-placeholder-val="{{{{ true }}}}">
{FARM_CARD}
</sc-if>
{new_btn}
</sc-if>
<sc-if value="{{{{ isHistory }}}}" hint-placeholder-val="{{{{ false }}}}">
{HIST_LIST}
</sc-if>
</div>""") + '\n' + capsule(space, nav_active) + '\n' + PERP_SHEET + '\n' + tx_overlay('{{ txTitle }}', '{{ txBody }}')
    kinds_js = ''
    if filters:
        kinds_js = "var kf = this.state.kf || 'All'; var kinds = chipList(['All','Perps','Farm'], kf, 'kf'); var kindFilter = kf === 'Perps' ? 'Perp' : kf; var showPerps = kf !== 'Farm'; var showFarm = kf !== 'Perps';"
    else:
        kinds_js = "var kinds = []; var kindFilter = 'Perp'; var showPerps = true; var showFarm = false;"
    js = SEG_JS + ("var HD = %s;\n" % ("true" if hd else "false")) + POS_JS + PERP_SHEET_JS + f"""var tab = this.state.tab || (this.props.history || HD ? 'History' : 'Current');
{kinds_js}
{HIST_JS}
var nOpen = {perps_count};
var tabs = segList(['Current','History'], tab, 'tab', [nOpen, String(histSrc.length)]);
var isH = tab === 'History';
var heroNum = isH ? (sum >= 0 ? '+' : '-') + money(Math.abs(sum)) : ({'showFarm && !showPerps' if filters else 'false'} ? '+$1.47' : '+$210.23');
var heroCap = isH ? 'Realized over ' + histSrc.length + ' closed positions' : (showFarm && showPerps ? 'Unrealized on 2 perps · farm earned +$1.47' : (showFarm ? 'Farm earnings · 1 open' : 'Unrealized PnL · 2 open positions'));
return Object.assign({{}}, sheetVals, {{ t: t, tabs: tabs, kinds: kinds, perps: perps, hist: hist, isCurrent: !isH, isHistory: isH, showPerps: showPerps, showFarm: showFarm, heroNum: heroNum, heroCap: heroCap, realized: (sum >= 0 ? '+' : '-') + money(Math.abs(sum)), closedN: String(histSrc.length), winRate: Math.round(wins / Math.max(histSrc.length, 1) * 100) + '%' }});"""
    page(stem, stem[2:], body, js, props={'history': {'editor': 'boolean', 'default': False, 'section': 'State'}}, tx_default='')
    for vs, vst, vtx in (variants or []):
        page(vs, vs[2:], body, js, state=vst, props={'history': {'editor': 'boolean', 'default': False, 'section': 'State'}}, tx_default=vtx or '')


# ---------------------------------------------------------------- lender
LEND_HIST = [
    ('Today', [('coins', 'tt', 'Interest paid', 'USDC vault · 9h ago', '+$0.12', 'pos')]),
    ('Sep 25', [('arrow-down', 'tv', 'Withdrew 500 USDC', 'USDC vault · to wallet', '$499.95', 'text')]),
    ('Sep 22', [('arrow-up', 'tv', 'Supplied 1.50 SOL', 'SOL vault · from wallet', '$177.87', 'text')]),
    ('Sep 20', [('arrow-up', 'tv', 'Supplied 3,000 USDC', 'USDC vault · from wallet', '$2,999.70', 'text'),
                ('coins', 'tt', 'Received vUSDC', 'Vault shares minted', '3,000 vUSDC', 'text')]),
]


def lender(stem, space, nav_active, label, show_spot, hd=False):
    hero_inner = hero_stats(label, '{{ heroInt }}<span style="color: rgba(255,255,255,0.56)">{{ heroDec }}</span>', [('Total holdings', '$7,490.27'), ('Supplied', '2 assets'), ('Avg supply APY', '0.04%')])
    pool = lambda sym, apy, val, units, earned: f"""<article style="border-radius: 20px; background: {{{{ t.card }}}}; box-shadow: {{{{ t.shadow }}}}; padding: 16px">
<div style="display: flex; align-items: center; gap: 12px">
{token(sym)}
<div style="flex-grow: 1; display: flex; flex-direction: column; gap: 2px"><span style="font-size: 16px; line-height: 20px; font-weight: 600">{sym} vault</span><span style="font-size: 12px; line-height: 16px; color: {{{{ t.text2 }}}}; display: flex; align-items: center; gap: 6px"><span style="width: 6px; height: 6px; border-radius: 999px; background: {{{{ t.pos }}}}"></span>Active · earning {apy} APY</span></div>
<div style="display: flex; flex-direction: column; align-items: flex-end; gap: 2px"><span style="font-size: 16px; line-height: 20px; font-weight: 600">{val}</span><span style="font-size: 12px; line-height: 16px; color: {{{{ t.text2 }}}}">{units}</span></div>
</div>
<div style="margin-top: 16px; padding: 12px; border-radius: 14px; background: {{{{ t.page }}}}; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px">
<div style="display: flex; flex-direction: column; gap: 2px"><span style="font-size: 12px; line-height: 16px; color: {{{{ t.text2 }}}}">Supplied</span><span style="font-size: 14px; line-height: 20px; font-weight: 600">{units}</span></div>
<div style="display: flex; flex-direction: column; gap: 2px"><span style="font-size: 12px; line-height: 16px; color: {{{{ t.text2 }}}}">Supply APY</span><span style="font-size: 14px; line-height: 20px; font-weight: 600">{apy}</span></div>
<div style="display: flex; flex-direction: column; gap: 2px"><span style="font-size: 12px; line-height: 16px; color: {{{{ t.text2 }}}}">Earned</span><span style="font-size: 14px; line-height: 20px; font-weight: 600; color: {{{{ t.pos }}}}">{earned}</span></div>
</div>
<div style="margin-top: 16px; display: flex; gap: 8px">
<a href="V7EarnWithdraw.dc.html" style="flex: 1 1 0; height: 44px; border-radius: 22px; border: 1px solid {{{{ t.bd }}}}; color: {{{{ t.text }}}}; font-size: 14px; font-weight: 600; display: flex; align-items: center; justify-content: center; text-decoration: none">Withdraw</a>
<a href="V7EarnSupply.dc.html" style="flex: 1 1 0; height: 44px; border-radius: 22px; background: {{{{ t.chipOn }}}}; color: {{{{ t.chipOnFg }}}}; font-size: 14px; font-weight: 600; display: flex; align-items: center; justify-content: center; text-decoration: none">Supply more</a>
</div>
</article>"""
    spot_rows = ''
    for sym, amt, val in [('USDC', '3,120.40', '$3,120.33'), ('ANTHROPIC', '0.96', '$1,001.06'), ('TSLAx', '1.25', '$441.99'), ('SOL', '2.10', '$249.02')]:
        spot_rows += f"""<div style="height: 64px; display: flex; align-items: center; gap: 12px; border-top: 1px solid {{{{ t.line }}}}">{token(sym, 36)}<span style="flex-grow: 1; display: flex; flex-direction: column; gap: 2px"><span style="font-size: 14px; line-height: 20px; font-weight: 600">{sym}</span><span style="font-size: 12px; line-height: 16px; color: {{{{ t.text2 }}}}">Wallet</span></span><span style="display: flex; flex-direction: column; align-items: flex-end; gap: 2px"><span style="font-size: 14px; line-height: 20px; font-weight: 600">{val}</span><span style="font-size: 12px; line-height: 16px; color: {{{{ t.text2 }}}}">{amt} {sym}</span></span></div>"""
    spot = f"""<div style="border-radius: 20px; background: {{{{ t.card }}}}; box-shadow: {{{{ t.shadow }}}}; padding: 4px 16px">
<div style="height: 56px; display: flex; align-items: center; justify-content: space-between"><span style="display: flex; flex-direction: column"><span style="font-size: 12px; line-height: 16px; color: {{{{ t.text2 }}}}">Wallet balance</span><span style="font-size: 16px; line-height: 24px; font-weight: 600">$4,812.40</span></span><a href="V7Swap.dc.html" style="height: 36px; padding: 0 14px; border-radius: 18px; background: {{{{ t.page }}}}; color: {{{{ t.text }}}}; font-size: 14px; font-weight: 600; display: flex; align-items: center; gap: 6px; text-decoration: none">{ic('arrows-down-up', 16)}Swap</a></div>
{spot_rows}
</div>"""
    hist = ''
    for day, items in LEND_HIST:
        rows = ''
        for icon, tint, title, cap, val, col in items:
            rows += f"""<div style="height: 64px; display: flex; align-items: center; gap: 12px; border-top: 1px solid {{{{ t.line }}}}"><span style="width: 36px; height: 36px; border-radius: 12px; background: {{{{ t.{tint} }}}}; color: {{{{ t.{tint}I }}}}; display: flex; align-items: center; justify-content: center; flex-shrink: 0">{ic(icon, 18)}</span><span style="flex-grow: 1; display: flex; flex-direction: column; gap: 2px"><span style="font-size: 14px; line-height: 20px; font-weight: 600">{title}</span><span style="font-size: 12px; line-height: 16px; color: {{{{ t.text2 }}}}">{cap}</span></span><span style="font-size: 14px; font-weight: 600; color: {{{{ t.{col} }}}}">{val}</span></div>"""
        hist += f"""<div style="border-radius: 20px; background: {{{{ t.card }}}}; box-shadow: {{{{ t.shadow }}}}; padding: 0 16px"><div style="height: 40px; display: flex; align-items: center; font-size: 12px; font-weight: 600; color: {{{{ t.text2 }}}}">{day}</div>{rows}</div>"""
    spot_chips = chips('views', 'v', 2) if show_spot else ''
    body = scroller(f"""{hero(space, hero_inner)}
<div style="padding: 16px 16px 0 16px; display: flex; flex-direction: column; gap: 12px">
{seg('tabs')}
<sc-if value="{{{{ isCurrent }}}}" hint-placeholder-val="{{{{ true }}}}">
{spot_chips}
<sc-if value="{{{{ isLend }}}}" hint-placeholder-val="{{{{ true }}}}">
{pool('USDC', '0.03%', '$2,499.75', '2,500 USDC', '+$0.81')}
{pool('SOL', '0.11%', '$177.87', '1.50 SOL', '+$0.56')}
<a href="V7Earn.dc.html" style="height: 52px; border-radius: 20px; border: 1px dashed {{{{ t.bd }}}}; color: {{{{ t.text }}}}; display: flex; align-items: center; justify-content: center; gap: 8px; font-size: 14px; font-weight: 600; text-decoration: none">{ic('plus', 18)}Supply to another vault</a>
</sc-if>
<sc-if value="{{{{ isSpot }}}}" hint-placeholder-val="{{{{ false }}}}">
{spot}
</sc-if>
</sc-if>
<sc-if value="{{{{ isHistory }}}}" hint-placeholder-val="{{{{ false }}}}">
{hist}
</sc-if>
</div>""") + '\n' + capsule(space, nav_active)
    js = SEG_JS + ("var HD = %s;\n" % ("true" if hd else "false")) + f"""var tab = this.state.tab || (this.props.history || HD ? 'History' : 'Current');
var view = this.state.view || 'Lending';
var views = chipList(['Lending','Spot'], view, 'view');
var tabs = segList(['Current','History'], tab, 'tab', ['2', '5']);
var isH = tab === 'History', isSpot = !isH && view === 'Spot';
return {{ t: t, tabs: tabs, views: views, isCurrent: !isH, isHistory: isH, isLend: view === 'Lending', isSpot: view === 'Spot', heroInt: isSpot ? '$4,812' : '$2,677', heroDec: isSpot ? '.40' : '.87', heroCap: isSpot ? '4 assets in your wallet' : 'Supplied across 2 vaults · +$1.37 earned' }};"""
    page(stem, stem[2:], body, js, props={'history': {'editor': 'boolean', 'default': False, 'section': 'State'}})


# ---------------------------------------------------------------- notifications
def notifications():
    notes_js = """var shield = '%s', trendU = '%s', coins = '%s', arrowD = '%s', check = '%s', flag = '%s';
var all = [
{ g: 'Today', kind: 'Health', title: 'GOOGLx farm health is 1.33', body: 'It liquidates at 1.10, if GOOGLx falls below $101.01. Nothing to do yet.', time: '2h', unread: true, d: shield, bg: t.tr, fg: t.trI, cta: 'View position', href: 'V7FarmPosition.dc.html' },
{ g: 'Today', kind: 'Trades', title: 'TSLAx long is up 10.89%%', body: 'Unrealized +$152.52 on your 3x long.', time: '5h', unread: true, d: trendU, bg: t.tv, fg: t.tvI, cta: 'View position', href: 'V7PerpsPositions.dc.html' },
{ g: 'Today', kind: 'Earn', title: 'Interest paid', body: '+$0.12 from the USDC vault.', time: '9h', unread: true, d: coins, bg: t.tt, fg: t.ttI, cta: '', href: '' },
{ g: 'Earlier', kind: 'Trades', title: 'OPENAI short opened', body: '0.9174 OPENAI at $2,180.00 · 2x · $1,000 collateral.', time: 'Sep 25', unread: false, d: flag, bg: t.tv, fg: t.tvI, cta: '', href: '' },
{ g: 'Earlier', kind: 'Earn', title: 'Withdrew 500 USDC', body: 'Sent from the USDC vault to your wallet.', time: 'Sep 25', unread: false, d: arrowD, bg: t.tt, fg: t.ttI, cta: '', href: '' },
{ g: 'Earlier', kind: 'Trades', title: 'AAPLx long closed', body: 'Realized +$38.43 (+3.84%%) after 3 days.', time: 'Sep 24', unread: false, d: check, bg: t.tv, fg: t.tvI, cta: '', href: '' },
{ g: 'Earlier', kind: 'Health', title: 'Account back to Safe', body: 'Margin account health is 1.69 after your deposit.', time: 'Sep 23', unread: false, d: shield, bg: t.tt, fg: t.ttI, cta: '', href: '' }
];
""" % (path('shield-check', 'fill'), path('trend-up'), path('coins', 'fill'), path('arrow-down'), path('check-circle', 'fill'), path('flag', 'fill'))
    item = f"""<div style="padding: 14px 0; display: flex; gap: 12px; border-top: 1px solid {{{{ t.line }}}}">
{NOTE_ICON}
<span style="flex-grow: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px">
<span style="display: flex; justify-content: space-between; gap: 8px; font-size: 14px; line-height: 20px; font-weight: 600"><span>{{{{ n.title }}}}</span><span style="font-size: 12px; font-weight: 400; color: {{{{ t.text2 }}}}; flex-shrink: 0; display: flex; align-items: center; gap: 6px">{{{{ n.time }}}}<sc-if value="{{{{ n.unread }}}}" hint-placeholder-val="{{{{ true }}}}"><span style="width: 8px; height: 8px; border-radius: 999px; background: #FF007A"></span></sc-if></span></span>
<span style="font-size: 12px; line-height: 16px; color: {{{{ t.text2 }}}}">{{{{ n.body }}}}</span>
<sc-if value="{{{{ n.cta }}}}" hint-placeholder-val="{{{{ false }}}}"><a href="{{{{ n.href }}}}" style="margin-top: 8px; align-self: flex-start; height: 32px; padding: 0 14px; border-radius: 16px; background: {{{{ t.page }}}}; color: {{{{ t.text }}}}; font-size: 12px; font-weight: 600; display: flex; align-items: center; text-decoration: none">{{{{ n.cta }}}}</a></sc-if>
</span>
</div>"""
    group = lambda name: f"""<sc-if value="{{{{ has{name} }}}}" hint-placeholder-val="{{{{ true }}}}">
<div style="border-radius: 20px; background: {{{{ t.card }}}}; box-shadow: {{{{ t.shadow }}}}; padding: 0 16px">
<div style="height: 44px; display: flex; align-items: center; font-size: 12px; font-weight: 600; color: {{{{ t.text2 }}}}">{name}</div>
<sc-for list="{{{{ {name.lower()} }}}}" as="n" hint-placeholder-count="3">
{item}
</sc-for>
</div>
</sc-if>"""
    right = f'<button type="button" onClick="{{{{ markAll }}}}" style="height: 40px; padding: 0 12px; border: 0; background: transparent; color: {{{{ t.link }}}}; font-size: 14px; font-weight: 600">Mark all read</button>'
    body = f"""<div style="position: absolute; inset: 0; overflow-y: auto; padding-bottom: 24px">
{topbar('Notifications', 'V7Home', right)}
<div style="padding: 8px 16px 0 16px; display: flex; flex-direction: column; gap: 12px">
{chips('filters', 'c', 4)}
{group('Today')}
{group('Earlier')}
</div>
</div>"""
    js = SEG_JS + NOTES_JS + """var f = this.state.f || 'All';
var read = !!this.state.read;
var filters = chipList(['All','Health','Trades','Earn'], f, 'f');
var list = notesAll.filter(function (n) { return f === 'All' || n.kind === f; }).map(function (n) { var c = {}; for (var k in n) c[k] = n[k]; c.unread = n.unread && !read; c.cta = n.cta ? n.cta : false; c.img = n.img ? n.img : false; return c; });
var today = list.filter(function (n) { return n.g === 'Today'; }), earlier = list.filter(function (n) { return n.g === 'Earlier'; });
return { t: t, filters: filters, today: today, earlier: earlier, hasToday: today.length > 0, hasEarlier: earlier.length > 0, markAll: function () { self.setState({ read: true }); } };"""
    page('V7Notifications', 'Notifications', body, js)


# ---------------------------------------------------------------- profile
def profile():
    row = lambda k, v, extra='': f'<div style="height: 56px; display: flex; align-items: center; justify-content: space-between; border-top: 1px solid {{{{ t.line }}}}; font-size: 14px"><span style="color: {{{{ t.text2 }}}}">{k}</span><span style="font-weight: 600; display: flex; align-items: center; gap: 8px">{extra}{v}</span></div>'
    stat = lambda k, v, bl: f'<div style="display: flex; flex-direction: column; gap: 2px;{" padding-left: 12px; border-left: 1px solid {{ t.line }};" if bl else ""}"><span style="font-size: 12px; line-height: 16px; color: {{{{ t.text2 }}}}">{k}</span><span style="font-size: 14px; line-height: 20px; font-weight: 600">{v}</span></div>'
    health = f"""<div style="border-radius: 20px; background: {{{{ t.card }}}}; box-shadow: {{{{ t.shadow }}}}; padding: 0 16px 16px 16px">
<div style="height: 44px; display: flex; align-items: center; justify-content: space-between"><span style="font-size: 12px; font-weight: 600; color: {{{{ t.text2 }}}}">Account health</span><span style="font-size: 12px; color: {{{{ t.text2 }}}}">Liquidation at 1.10</span></div>
<div style="padding: 4px 0 8px 0">{gauge(1.69, 'Safe', 240)}</div>
<div style="display: flex; justify-content: center; gap: 16px; font-size: 12px; color: {{{{ t.text2 }}}}"><span style="display: flex; align-items: center; gap: 6px"><span style="width: 10px; height: 4px; border-radius: 2px; background: #FC5457"></span>Below 1.10</span><span style="display: flex; align-items: center; gap: 6px"><span style="width: 10px; height: 4px; border-radius: 2px; background: #FF8AC2"></span>1.10 to 1.50</span><span style="display: flex; align-items: center; gap: 6px"><span style="width: 10px; height: 4px; border-radius: 2px; background: {{{{ gaugeSafe }}}}"></span>Above 1.50</span></div>
<div style="margin-top: 16px; padding: 12px; border-radius: 14px; background: {{{{ t.page }}}}; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0">
{stat('Room before liquidation', '$3,693.18', False)}{stat('Net available collateral', '$4,320.37', True)}{stat('Leverage taken', '2.45x', True)}
</div>
<p style="margin: 12px 0 0 0; font-size: 12px; line-height: 18px; color: {{{{ t.text2 }}}}">Health = collateral $10,592.29 ÷ debt $6,271.92. If it reaches 1.10, the risk engine liquidates.</p>
</div>"""
    body = f"""<div style="position: absolute; inset: 0; overflow-y: auto; padding-bottom: 24px">
{topbar('Profile', 'V7Home')}
<div style="padding: 8px 16px 0 16px; display: flex; flex-direction: column; gap: 12px">
<div style="border-radius: 20px; background: {SP['home']['grad']}; color: #FFFFFF; padding: 20px 16px; display: flex; align-items: center; gap: 16px">
<span style="width: 56px; height: 56px; border-radius: 999px; overflow: hidden; display: block; box-shadow: 0 0 0 2px rgba(255,255,255,0.7)">{AVATAR.replace('width: 36px; height: 36px', 'width: 56px; height: 56px')}</span>
<span style="flex-grow: 1; display: flex; flex-direction: column; gap: 4px"><span style="font-family: ui-monospace, monospace; font-size: 16px; line-height: 24px">7xKX…9fQa</span><span style="font-size: 12px; line-height: 16px; color: rgba(255,255,255,0.78)">Solana wallet · Mobile Wallet Adapter</span></span>
<button type="button" aria-label="Copy address" style="width: 44px; height: 44px; border-radius: 22px; border: 0; background: rgba(255,255,255,0.14); color: #FFFFFF; display: flex; align-items: center; justify-content: center">{ic('copy', 18)}</button>
</div>
{health}
<div style="border-radius: 20px; background: {{{{ t.card }}}}; box-shadow: {{{{ t.shadow }}}}; padding: 0 16px">
<div style="height: 44px; display: flex; align-items: center; font-size: 12px; font-weight: 600; color: {{{{ t.text2 }}}}">Account</div>
{row('Wallet balance', '$4,812.40')}
{row('Margin account balance', '$10,592.29')}
{row('Margin account', '<span style="font-family: ui-monospace, monospace; font-weight: 400">3pLm…Uw2c</span>', '<span style="height: 22px; padding: 0 8px; border-radius: 11px; background: {{ t.tt }}; color: {{ t.ttI }}; font-size: 12px; font-weight: 600; display: flex; align-items: center">Active</span>')}
</div>
<div style="border-radius: 20px; background: {{{{ t.card }}}}; box-shadow: {{{{ t.shadow }}}}; padding: 0 16px 16px 16px">
<div style="height: 44px; display: flex; align-items: center; font-size: 12px; font-weight: 600; color: {{{{ t.text2 }}}}">Appearance</div>
{seg('themes')}
</div>
<div style="border-radius: 20px; background: {{{{ t.card }}}}; box-shadow: {{{{ t.shadow }}}}; padding: 0 16px">
{row('Network', 'Solana Devnet', f'<img src="{TOK["SOL"]}" alt="" style="width: 20px; height: 20px; border-radius: 999px">').replace('border-top: 1px solid {{ t.line }}; ', '', 1)}
{row('Docs and guides', f'<span style="color: {{{{ t.text2 }}}}; display: flex">{CHEV}</span>')}
{row('Support', f'<span style="color: {{{{ t.text2 }}}}; display: flex">{CHEV}</span>')}
</div>
<a href="V7Welcome.dc.html" style="height: 52px; border-radius: 26px; border: 1px solid {{{{ t.bd }}}}; color: {{{{ t.neg }}}}; display: flex; align-items: center; justify-content: center; gap: 8px; font-size: 14px; font-weight: 600; text-decoration: none">{ic('sign-out', 18)}Disconnect wallet</a>
<p style="margin: 0; display: flex; align-items: center; justify-content: center; gap: 6px; font-size: 12px; line-height: 16px; color: {{{{ t.text2 }}}}">{wordmark(10)}<span>1.0.0 · Your keys stay in your wallet app</span></p>
</div>
</div>"""
    js = SEG_JS + """var theme = this.state.theme || this.props.appearance || 'System';
var dk = theme === 'Dark' ? true : (theme === 'Light' ? false : !!this.props.dark);
t = dk ? D : L;
var themes = segList(['System','Light','Dark'], theme, 'theme').map(function (x) { var p0 = x.pick; x.pick = function () { p0(); try { if (typeof window !== 'undefined' && window.__vnSetTheme) window.__vnSetTheme(x.label); } catch (e) {} }; return x; });
return { t: t, themes: themes, gaugeSafe: t.pos, gaugeLabelC: t.pos };"""
    page('V7Profile', 'Profile', body, js)


def build():
    trader('V7Trader', 'home', 'Trader', 'Trader portfolio', True)
    trader('V7PerpsPositions', 'perps', 'Positions', 'Open PnL', None, variants=[('V7PerpsClose', '{ sh: \'close\', pi: 0, cp: 100 }', None), ('V7PerpsClose50', '{ sh: \'close\', pi: 0, cp: 50 }', None), ('V7PerpsCloseDone', '{ lk: \'close\', pi: 0, cp: 100 }', 'done'), ('V7PerpsAdd', '{ sh: \'add\', pi: 0, aa: 500 }', None), ('V7PerpsAddSign', '{ lk: \'add\', pi: 0, aa: 500 }', 'sign'), ('V7PerpsAddDone', '{ lk: \'add\', pi: 0, aa: 500 }', 'done'), ('V7PerpsCloseFailed', '{ lk: \'close\', pi: 0, cp: 100, __why: \'network\' }', 'failed'), ('V7PerpsAddFee', '{ lk: \'add\', pi: 0, aa: 500, __why: \'fee\' }', 'failed')])
    lender('V7Lender', 'home', 'Lender', 'Lender portfolio', True)
    lender('V7EarnPositions', 'earn', 'Positions', 'Your supplied assets', False)
    trader('V7PerpsHistory', 'perps', 'History', 'Closed PnL', None, True)
    lender('V7EarnHistory', 'earn', 'History', 'Your supplied assets', False, True)
    notifications()
    profile()


if __name__ == '__main__':
    build()
