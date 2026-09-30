from common import *
import json
import screens_earn

# ------------------------------------------------------------------ helpers

def rows(items, first_border=True):
    out = ''
    for i, it in enumerate(items):
        k, v = it[0], it[1]
        sub = it[2] if len(it) > 2 else ''
        col = it[3] if len(it) > 3 else '{{ t.text }}'
        bt = f'border-top: 1px solid {{{{ t.line }}}};' if (first_border or i) else ''
        subh = f'<span style="font-size: 12px; line-height: 16px; color: {{{{ t.text2 }}}}">{sub}</span>' if sub else ''
        out += f'<div style="min-height: 52px; padding: 8px 0; display: flex; align-items: center; justify-content: space-between; gap: 12px; font-size: 14px; {bt}"><span style="color: {{{{ t.text2 }}}}">{k}</span><span style="display: flex; flex-direction: column; align-items: flex-end; text-align: right"><span style="font-weight: 600; color: {col}">{v}</span>{subh}</span></div>'
    return out


def box(inner, pad='4px 16px'):
    return f'<div style="border-radius: 20px; background: {{{{ t.card }}}}; box-shadow: {{{{ t.shadow }}}}; padding: {pad}">{inner}</div>'


def sticky(inner):
    return f'<div style="position: absolute; left: 0; right: 0; bottom: 0; padding: 12px 16px 28px 16px; background: {{{{ t.page }}}}; display: flex; gap: 10px; z-index: 5">{inner}</div>'


def step_head(n, title, sub):
    return f'<div style="display: flex; align-items: center; gap: 12px"><span style="width: 32px; height: 32px; border-radius: 999px; background: linear-gradient(135deg, #FC5457, #703AE6); color: #FFFFFF; font-size: 14px; font-weight: 600; display: flex; align-items: center; justify-content: center; flex-shrink: 0">{n}</span><span style="display: flex; flex-direction: column"><span style="font-size: 16px; line-height: 22px; font-weight: 600">{title}</span><span style="font-size: 12px; line-height: 16px; color: {{{{ t.text2 }}}}">{sub}</span></span></div>'


# ------------------------------------------------------------------ Earn: vault detail with the web's tabs

def earn_vault():
    tabs_html = f"""<div role="tablist" style="margin: 20px -20px 0 -20px; padding: 0 20px; display: flex; gap: 8px; overflow-x: auto">
<sc-for list="{{{{ tabs }}}}" as="b" hint-placeholder-count="6"><button type="button" role="tab" aria-selected="{{{{ b.on }}}}" onClick="{{{{ b.pick }}}}" style="margin-left: {{{{ b.ml }}}}px; transition: margin-left 260ms ease-out; height: 36px; padding: 0 14px; border-radius: 18px; border: 0; background: {{{{ b.bg }}}}; color: {{{{ b.fg }}}}; font-size: 14px; font-weight: 600; white-space: nowrap; flex-shrink: 0">{{{{ b.label }}}}</button></sc-for>
</div>"""
    positions = f"""<sc-if value="{{{{ isPos }}}}" hint-placeholder-val="{{{{ true }}}}">
<div style="margin-top: 16px; height: 40px; padding: 4px; border-radius: 20px; background: {{{{ t.seg }}}}; display: flex; gap: 4px">
<sc-for list="{{{{ ptabs }}}}" as="s" hint-placeholder-count="2"><button type="button" onClick="{{{{ s.pick }}}}" style="flex: 1 1 0; height: 32px; border-radius: 16px; border: 0; background: {{{{ s.bg }}}}; box-shadow: {{{{ s.sh }}}}; color: {{{{ s.fg }}}}; font-size: 12px; font-weight: 600">{{{{ s.label }}}}</button></sc-for>
</div>
<sc-if value="{{{{ posCur }}}}" hint-placeholder-val="{{{{ true }}}}">
<div style="margin-top: 12px">{box(f'''<div style="display: flex; align-items: center; gap: 12px; padding: 12px 0">{token('USDC', 36)}<span style="flex-grow: 1; display: flex; flex-direction: column"><span style="font-size: 16px; line-height: 22px; font-weight: 600">USDC vault</span><span style="font-size: 12px; line-height: 16px; color: {{{{ t.text2 }}}}">2,499.81 vUSDC shares</span></span><span style="display: flex; flex-direction: column; align-items: flex-end"><span style="font-size: 16px; font-weight: 600">$2,499.75</span><span style="font-size: 12px; color: {{{{ t.pos }}}}">+$0.81 earned</span></span></div>''' + rows([('Current supply APY', '0.03%'), ('Interest earned', '+0.81 USDC', '', '{{ t.pos }}')]))}</div>
</sc-if>
<sc-if value="{{{{ posHist }}}}" hint-placeholder-val="{{{{ false }}}}">
<div style="margin-top: 12px">{box(''.join(f'<div style="min-height: 64px; padding: 10px 0; display: flex; align-items: center; gap: 12px;{"" if i == 0 else " border-top: 1px solid {{ t.line }};"}"><span style="width: 36px; height: 36px; border-radius: 999px; background: {{{{ t.tv }}}}; color: {{{{ t.tvI }}}}; display: flex; align-items: center; justify-content: center; flex-shrink: 0">{ic(ico, 18, "bold")}</span><span style="flex-grow: 1; display: flex; flex-direction: column"><span style="font-size: 14px; line-height: 20px; font-weight: 600">{a}</span><span style="font-size: 12px; line-height: 16px; color: {{{{ t.text2 }}}}">{d} · Confirmed · <span style="color: {{{{ t.link }}}}">{h}</span></span></span></div>' for i, (ico, a, d, h) in enumerate([('arrow-down', 'Withdraw 500.00 USDC', 'Sep 25', '4hGk…9Qp2'), ('arrow-up', 'Supply 3,000.00 USDC', 'Sep 20', '2xLm…c81A')])))}</div>
</sc-if>
</sc-if>"""
    split = f"""<div style="padding: 14px 0"><div style="display: flex; justify-content: space-between; font-size: 12px; color: {{{{ t.text2 }}}}"><span>Supplied · $55.0K</span><span>Borrowed · $2.8K (5.2%)</span></div><div style="margin-top: 8px; height: 10px; border-radius: 5px; background: {{{{ t.tv }}}}; overflow: hidden"><div style="width: 5.2%; min-width: 8px; height: 10px; border-radius: 5px; background: #703AE6"></div></div></div>"""
    addrs = ''.join(f'<div style="height: 52px; display: flex; align-items: center; gap: 10px; border-top: 1px solid {{{{ t.line }}}}; font-size: 14px"><span style="flex-grow: 1; color: {{{{ t.text2 }}}}">{k}</span><span style="font-family: ui-monospace, monospace; font-size: 12px">{v}</span><span style="color: {{{{ t.link }}}}; display: flex">{ic("copy", 16)}</span></div>' for k, v in [('vUSDC share mint', 'vUSD…p2Qa'), ('USDC reserve', 'Rsv8…3kLm'), ('Liquidity vault', 'LqV1…9sPe'), ('Asset config', 'Cfg4…mT7x'), ('USDC mint', 'EPjF…Dt1v'), ('Vanna lending program', 'VnLd…Q8rZ')])
    details = f"""<sc-if value="{{{{ isDet }}}}" hint-placeholder-val="{{{{ false }}}}">
<div style="margin-top: 12px">{box(split + rows([('Available liquidity', '52,212 USDC', '$52.2K'), ('Supply APY', '0.03%', '55,012 USDC supplied'), ('Borrow APY', '0.65%'), ('Utilization rate', '5.2%'), ('Liquidation bonus', '5.00%', 'Liquidatable at HF ≤ 1.10'), ('Oracle price', '$0.9999', 'Pyth · max age 60s'), ('Share token exchange rate', '1.000024', 'USDC per vUSDC'), ('Reserve factor', '10.00%'), ('Supply cap', '1,000,000 USDC')]))}</div>
<h3 style="margin: 20px 0 6px 0; font-size: 14px; font-weight: 600">Contracts</h3>
{box(addrs.replace('border-top: 1px solid {{ t.line }}; ', '', 1))}
</sc-if>"""
    activity = f"""<sc-if value="{{{{ isAct }}}}" hint-placeholder-val="{{{{ false }}}}">
<h3 style="margin: 16px 0 6px 0; font-size: 14px; font-weight: 600">Supply distribution</h3>
{box(rows([('Top 10 suppliers', '39,169 USDC', '71.2% of supply'), ('Everyone else', '15,843 USDC', '28.8% of supply')], False))}
<h3 style="margin: 20px 0 6px 0; font-size: 14px; font-weight: 600">Recent activity</h3>
{box(rows([('Supply', '12,000 USDC', '2h ago · Confirmed'), ('Borrow', '3,400 USDC', '5h ago · Confirmed'), ('Repay', '1,100 USDC', 'Yesterday · Confirmed'), ('Withdraw', '4,000 USDC', 'Sep 27 · Confirmed')], False))}
</sc-if>"""
    cap = lambda k, used, total, pct: f'<div style="padding: 14px 0; border-top: 1px solid {{{{ t.line }}}}"><div style="display: flex; justify-content: space-between; font-size: 14px"><span style="color: {{{{ t.text2 }}}}">{k}</span><span style="font-weight: 600">{pct}</span></div><div style="margin-top: 8px; height: 8px; border-radius: 4px; background: {{{{ t.line }}}}; overflow: hidden"><div style="width: {pct}; min-width: 6px; height: 8px; border-radius: 4px; background: #703AE6"></div></div><div style="margin-top: 6px; font-size: 12px; color: {{{{ t.text2 }}}}">{used} of {total}</div></div>'
    assets = ''.join(f'<div style="height: 60px; display: flex; align-items: center; gap: 10px; border-top: 1px solid {{{{ t.line }}}}">{token(s, 28)}<span style="flex-grow: 1; font-size: 14px; font-weight: 600">{s}</span><span style="display: flex; gap: 6px; font-size: 12px; font-weight: 600"><span style="height: 22px; padding: 0 8px; border-radius: 11px; background: {{{{ t.tt }}}}; color: {{{{ t.ttI }}}}; display: flex; align-items: center">Collateral</span><span style="height: 22px; padding: 0 8px; border-radius: 11px; background: {{{{ t.tv }}}}; color: {{{{ t.tvI }}}}; display: flex; align-items: center">Borrow</span></span><span style="width: 52px; text-align: right; font-size: 12px; color: {{{{ t.text2 }}}}">{b} bonus</span></div>' for s, b in [('USDC', '5%'), ('SOL', '5%'), ('TSLAx', '7.5%'), ('GOOGLx', '7.5%'), ('ANTHROPIC', '10%')])
    collateral = f"""<sc-if value="{{{{ isCol }}}}" hint-placeholder-val="{{{{ false }}}}">
<div style="margin-top: 12px">{box((cap('Supply cap usage', '55,012 USDC', '1,000,000 USDC', '5.5%') + cap('Borrow cap usage', '2,800 USDC', '500,000 USDC', '0.6%')).replace('border-top: 1px solid {{ t.line }}', 'border-top: 0', 1))}</div>
<h3 style="margin: 20px 0 6px 0; font-size: 14px; font-weight: 600">Assets and limits</h3>
{box(f'<div style="height: 36px; display: flex; align-items: center; font-size: 12px; color: {{{{ t.text2 }}}}">Every asset below is uncapped per margin account</div>' + assets)}
</sc-if>"""
    curve = '''<svg width="100%" height="140" viewBox="0 0 340 140" preserveAspectRatio="none" role="img" aria-label="Interest rate curve, kink at 80% utilization" style="display: block"><line x1="0" y1="130" x2="340" y2="130" stroke="{{ t.line }}" stroke-width="1"></line><path d="M0 128 L272 104 L340 16" fill="none" stroke="#703AE6" stroke-width="2.5" stroke-linejoin="round"></path><line x1="18" y1="10" x2="18" y2="130" stroke="#FC5457" stroke-width="1.5" stroke-dasharray="4 4"></line><circle cx="18" cy="126.4" r="5" fill="#FC5457"></circle><text x="26" y="22" font-size="11" fill="{{ t.text2 }}">Now · 5.2%</text><text x="276" y="98" font-size="11" fill="{{ t.text2 }}">Kink 80%</text></svg>'''
    analytics = f"""<sc-if value="{{{{ isAna }}}}" hint-placeholder-val="{{{{ false }}}}">
<div style="margin-top: 12px; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px">
{box('<div style="padding: 12px 0"><div style="font-size: 12px; color: {{ t.text2 }}">Supply APY</div><div style="font-size: 24px; line-height: 32px; font-weight: 600; color: {{ t.pos }}">0.03%</div></div>')}
{box('<div style="padding: 12px 0"><div style="font-size: 12px; color: {{ t.text2 }}">Borrow APY</div><div style="font-size: 24px; line-height: 32px; font-weight: 600">0.65%</div></div>')}
</div>
<h3 style="margin: 20px 0 6px 0; font-size: 14px; font-weight: 600">Interest rate curve</h3>
{box('<div style="padding: 12px 0">' + curve + '<div style="margin-top: 8px; display: flex; justify-content: space-between; font-size: 12px; color: {{ t.text2 }}"><span>0% utilization</span><span>100%</span></div></div>')}
<p style="margin: 10px 0 0 0; font-size: 12px; line-height: 18px; color: {{{{ t.text2 }}}}">Rate history shows here once it is indexed on-chain. Today's rates are live.</p>
</sc-if>"""
    managers = f"""<sc-if value="{{{{ isMan }}}}" hint-placeholder-val="{{{{ false }}}}">
<div style="margin-top: 12px">{box(rows([('Vault manager', 'Vanna Labs'), ('Risk curator', 'Vanna risk council'), ('Interest model', 'Kinked, 80% target'), ('Oracle', 'Pyth, Scope fallback')], False))}</div>
</sc-if>"""
    stat = lambda k, v: f'<div style="display: flex; flex-direction: column; gap: 2px"><span style="font-size: 12px; line-height: 16px; color: {{{{ t.text2 }}}}">{k}</span><span style="font-size: 16px; line-height: 22px; font-weight: 600">{v}</span></div>'
    body = f"""<div style="position: absolute; inset: 0; bottom: 96px; overflow-y: auto; padding-bottom: 24px">
<header style="height: 56px; margin-top: 28px; padding: 0 8px 0 4px; display: flex; align-items: center"><a href="V7Earn.dc.html" aria-label="Back" style="width: 48px; height: 48px; border-radius: 24px; color: {{{{ t.text }}}}; display: flex; align-items: center; justify-content: center">{ic('arrow-left', 22)}</a></header>
<div style="padding: 0 20px">
<div style="display: flex; align-items: center; gap: 12px">{token('USDC', 36)}<span style="display: flex; flex-direction: column"><span style="font-size: 16px; line-height: 22px; font-weight: 600">USDC vault</span><span style="font-size: 12px; line-height: 16px; color: {{{{ t.text2 }}}}">USD Coin · Vanna lending pool</span></span></div>
<div style="margin-top: 16px; font-size: 12px; color: {{{{ t.text2 }}}}">Supply APY</div>
<div style="font-size: 32px; line-height: 40px; font-weight: 600; color: {{{{ t.pos }}}}">0.03%</div>
<div style="margin-top: 16px; padding-top: 14px; border-top: 1px solid {{{{ t.line }}}}; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px">{stat('Total supply', '$55.0K')}{stat('Available', '$52.2K')}{stat('Utilization', '5.2%')}</div>
{tabs_html}
{positions}{details}{activity}{collateral}{analytics}{managers}
</div>
</div>
{sticky(f'<a href="V7EarnWithdraw.dc.html" style="flex: 1 1 0; height: 56px; border-radius: 28px; background: {{{{ t.card }}}}; border: 1px solid {{{{ t.bd }}}}; color: {{{{ t.text }}}}; font-size: 16px; font-weight: 600; display: flex; align-items: center; justify-content: center; text-decoration: none">Withdraw</a><a href="V7EarnSupply.dc.html" style="flex: 1 1 0; height: 56px; border-radius: 28px; background: #703AE6; color: #FFFFFF; font-size: 16px; font-weight: 600; display: flex; align-items: center; justify-content: center; text-decoration: none">Supply</a>')}"""
    js = SEG_JS + """var tab = this.state.tab || 'Positions', pt = this.state.pt || 'Current';
var TL = ['Positions','Details','Activity','Collateral','Analytics','Managers'], ti = TL.indexOf(tab);
var tabs = TL.map(function (l, i) { var on = l === tab; return { label: l, ml: i === 0 && ti >= 4 ? -196 : 0, on: on ? 'true' : 'false', bg: on ? t.chipOn : t.card, fg: on ? t.chipOnFg : t.text2, pick: function () { self.setState({ tab: l }); } }; });
var ptabs = segList(['Current','History'], pt, 'pt');
return { t: t, tabs: tabs, ptabs: ptabs, isPos: tab === 'Positions', posCur: pt === 'Current', posHist: pt === 'History', isDet: tab === 'Details', isAct: tab === 'Activity', isCol: tab === 'Collateral', isAna: tab === 'Analytics', isMan: tab === 'Managers' };"""
    for stem, tab in [('V7EarnVault', 'Positions'), ('V7EarnVaultDetails', 'Details'), ('V7EarnVaultActivity', 'Activity'), ('V7EarnVaultCollateral', 'Collateral'), ('V7EarnVaultAnalytics', 'Analytics'), ('V7EarnVaultManagers', 'Managers')]:
        page(stem, 'USDC vault', body, js, state="{ tab: '%s' }" % tab)


# ------------------------------------------------------------------ Farm: deploy, like devnet /one-click

FARM_TOK = [('TSLAx', 353.59, 1.25), ('GOOGLx', 339.93, 0), ('AAPLx', 332.37, 0), ('ANTHROPIC', 1042.77, 0.96), ('OPENAI', 2117.09, 0)]


def farm():
    pools = f"""<div style="position: relative; z-index: {{{{ zPool }}}}">{box(f'''<div style="height: 44px; display: flex; align-items: center; justify-content: space-between"><span style="font-size: 12px; font-weight: 600; letter-spacing: 0.04em; color: {{{{ t.text2 }}}}">YIELD POOL</span><span style="height: 22px; padding: 0 8px; border-radius: 11px; background: {{{{ t.page }}}}; font-size: 12px; font-weight: 600; letter-spacing: 0.04em; color: {{{{ t.text2 }}}}; display: flex; align-items: center">KAMINO</span></div>
<button type="button" onClick="{{{{ togglePool }}}}" aria-haspopup="listbox" aria-expanded="{{{{ poolAria }}}}" style="width: 100%; min-height: 64px; margin-bottom: 12px; padding: 10px 12px; border-radius: 16px; border: 1px solid {{{{ poolBd }}}}; background: {{{{ t.page }}}}; color: {{{{ t.text }}}}; display: flex; align-items: center; gap: 10px; text-align: left"><img src="{{{{ pool.icon }}}}" alt="" style="width: 36px; height: 36px; border-radius: 999px"><span style="flex-grow: 1; min-width: 0; display: flex; flex-direction: column"><span style="font-size: 16px; line-height: 22px; font-weight: 600">{{{{ pool.sym }}}}</span><span style="font-size: 12px; line-height: 16px; color: {{{{ t.text2 }}}}; white-space: nowrap">Kamino Main Market</span></span><span style="display: flex; flex-direction: column; align-items: flex-end"><span style="font-size: 16px; font-weight: 600; color: {{{{ t.pos }}}}">{{{{ pool.apy }}}}</span><span style="font-size: 12px; color: {{{{ t.text2 }}}}">{{{{ pool.avail }}}}</span></span><span style="display: flex; color: {{{{ t.text2 }}}}; transform: {{{{ poolRot }}}}; transition: transform 200ms ease">{ic('caret-down', 16)}</span></button>''')}
<sc-if value="{{{{ poolOpen }}}}" hint-placeholder-val="{{{{ false }}}}"><div role="listbox" aria-label="Yield pool" style="position: absolute; left: 12px; right: 12px; top: 116px; border-radius: 18px; background: {{{{ t.card }}}}; border: 1px solid {{{{ t.line }}}}; box-shadow: 0 16px 40px rgba(17,17,17,0.22); padding: 6px; animation: vnDrop 200ms ease-out">
<sc-for list="{{{{ poolOpts }}}}" as="o" hint-placeholder-count="2"><button type="button" role="option" aria-selected="{{{{ o.sel }}}}" onClick="{{{{ o.pick }}}}" style="width: 100%; height: 60px; padding: 0 10px; border: 0; border-radius: 12px; background: {{{{ o.bg }}}}; color: {{{{ t.text }}}}; display: flex; align-items: center; gap: 10px; text-align: left"><img src="{{{{ o.icon }}}}" alt="" style="width: 32px; height: 32px; border-radius: 999px"><span style="flex-grow: 1; font-size: 15px; font-weight: 600">{{{{ o.sym }}}}</span><span style="display: flex; flex-direction: column; align-items: flex-end"><span style="font-size: 14px; font-weight: 600; color: {{{{ t.pos }}}}">{{{{ o.apy }}}} APY</span><span style="font-size: 12px; color: {{{{ t.text2 }}}}">{{{{ o.avail2 }}}}</span></span></button></sc-for>
</div></sc-if></div>"""
    step1 = f"""<div style="position: relative; z-index: {{{{ zTok }}}}">{box(f'''<div style="padding: 14px 0 0 0">{step_head(1, 'Deposit collateral', 'Any stock or PreStock on Solana')}</div>
<div style="margin: 12px 0 14px 0; padding: 12px 14px; border-radius: 16px; background: {{{{ t.page }}}}">
<div style="display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: {{{{ t.text2 }}}}"><span style="font-weight: 600; letter-spacing: 0.04em">YOU DEPOSIT</span><span style="display: flex; align-items: center; gap: 6px">Wallet: {{{{ bal }}}}<button type="button" onClick="{{{{ setMax }}}}" style="height: 22px; padding: 0 8px; border-radius: 6px; border: 0; background: {{{{ t.tv }}}}; color: {{{{ t.link }}}}; font-size: 12px; font-weight: 600">MAX</button></span></div>
<div style="margin-top: 6px; display: flex; align-items: center; gap: 10px"><span style="flex-grow: 1; font-size: 28px; line-height: 36px; font-weight: 600; color: {{{{ amtC }}}}">{{{{ amtTxt }}}}</span><button type="button" onClick="{{{{ toggleTok }}}}" aria-haspopup="listbox" aria-expanded="{{{{ tokAria }}}}" style="height: 44px; padding: 0 12px 0 6px; border-radius: 22px; border: 1px solid {{{{ tokBd }}}}; background: {{{{ t.card }}}}; color: {{{{ t.text }}}}; display: flex; align-items: center; gap: 8px; font-size: 15px; font-weight: 600"><img src="{{{{ tok.icon }}}}" alt="" style="width: 30px; height: 30px; border-radius: 999px">{{{{ tok.sym }}}}<span style="display: flex; transform: {{{{ tokRot }}}}">{ic('caret-down', 14)}</span></button></div>
<div style="margin-top: 2px; font-size: 12px; color: {{{{ t.text2 }}}}">≈ {{{{ usd }}}}</div>
<sc-if value="{{{{ err }}}}" hint-placeholder-val="{{{{ false }}}}"><div style="margin-top: 6px; font-size: 12px; color: {{{{ t.neg }}}}">{{{{ err }}}}</div></sc-if>
</div>''', '0 16px')}
<sc-if value="{{{{ tokOpen }}}}" hint-placeholder-val="{{{{ false }}}}"><div role="listbox" aria-label="Collateral token" style="position: absolute; right: 12px; top: 150px; width: 220px; border-radius: 18px; background: {{{{ t.card }}}}; border: 1px solid {{{{ t.line }}}}; box-shadow: 0 16px 40px rgba(17,17,17,0.22); padding: 6px; animation: vnDrop 200ms ease-out">
<sc-for list="{{{{ tokOpts }}}}" as="o" hint-placeholder-count="5"><button type="button" role="option" aria-selected="{{{{ o.sel }}}}" onClick="{{{{ o.pick }}}}" style="width: 100%; height: 48px; padding: 0 10px; border: 0; border-radius: 12px; background: {{{{ o.bg }}}}; color: {{{{ o.fg }}}}; display: flex; align-items: center; gap: 10px; font-size: 15px; font-weight: 600"><img src="{{{{ o.icon }}}}" alt="" style="width: 26px; height: 26px; border-radius: 999px"><span style="flex-grow: 1; text-align: left">{{{{ o.sym }}}}</span><span style="font-size: 12px; font-weight: 400; color: {{{{ t.text2 }}}}">{{{{ o.bal }}}}</span></button></sc-for>
</div></sc-if></div>"""
    marks = f"""<sc-for list="{{{{ marks }}}}" as="m" hint-placeholder-count="5"><button type="button" onClick="{{{{ m.pick }}}}" aria-label="{{{{ m.label }}}} leverage" style="position: absolute; top: 0; left: {{{{ m.x }}}}; width: 44px; height: 60px; margin-left: -22px; padding: 0; border: 0; background: transparent; display: flex; flex-direction: column; align-items: center; gap: 12px"><span style="margin-top: 14px; width: 14px; height: 14px; border-radius: 999px; background: {{{{ m.dot }}}}; border: 2px solid {{{{ t.card }}}}"></span><span style="font-size: 12px; font-weight: 600; color: {{{{ m.fg }}}}">{{{{ m.label }}}}</span></button></sc-for>"""
    step2 = box(f"""<div style="padding: 14px 0 0 0">{step_head(2, 'Set leverage', '{{ borrowSub }}')}</div>
<div style="margin-top: 14px; display: flex; justify-content: space-between; font-size: 14px"><span style="color: {{{{ t.text2 }}}}">Leverage</span><span style="font-weight: 600; color: {{{{ t.link }}}}">{{{{ levTxt }}}}</span></div>
<div style="position: relative; height: 64px; margin: 6px 14px 4px 14px">
<div style="position: absolute; left: 0; right: 0; top: 19px; height: 4px; border-radius: 2px; background: {{{{ t.line }}}}"></div>
<div style="position: absolute; left: 0; top: 19px; width: {{{{ fillW }}}}; height: 4px; border-radius: 2px; background: linear-gradient(90deg, #FC5457, #703AE6); transition: width 260ms ease"></div>
{marks}
<span aria-hidden="true" style="position: absolute; top: 7px; left: {{{{ fillW }}}}; width: 28px; height: 28px; margin-left: -14px; border-radius: 999px; background: #703AE6; box-shadow: 0 4px 12px rgba(112,58,230,0.45); display: flex; align-items: center; justify-content: center; transition: left 260ms cubic-bezier(0.34, 1.56, 0.64, 1); pointer-events: none"><img src="{MARK}" alt="" style="width: 16px; height: 16px; filter: brightness(0) invert(1)"></span>
</div>
<sc-for list="{{{{ sum }}}}" as="r" hint-placeholder-count="7"><div style="min-height: 44px; display: flex; align-items: center; justify-content: space-between; font-size: 14px; border-top: 1px solid {{{{ t.line }}}}"><span style="color: {{{{ t.text2 }}}}">{{{{ r.k }}}}</span><span style="font-weight: 600; color: {{{{ r.c }}}}">{{{{ r.v }}}}</span></div></sc-for>
<div style="margin: 8px 0 14px 0; padding: 14px; border-radius: 16px; background: {{{{ t.tt }}}}; color: {{{{ t.ttI }}}}; display: flex; align-items: center; justify-content: space-between; gap: 12px"><span style="display: flex; flex-direction: column"><span style="font-size: 12px; font-weight: 600; letter-spacing: 0.04em">PROJECTED NET PROFIT AT {{{{ levUp }}}}</span><span style="font-size: 12px">{{{{ perMo }}}} · Kamino yield minus Vanna borrow cost</span></span><span style="font-size: 20px; font-weight: 600">{{{{ profit }}}}</span></div>
<div style="margin-bottom: 14px; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px">
<div style="padding: 12px; border-radius: 14px; background: {{{{ t.page }}}}"><div style="font-size: 12px; font-weight: 600; letter-spacing: 0.04em; color: {{{{ t.text2 }}}}">HEALTH FACTOR</div><div style="margin-top: 4px; display: flex; align-items: center; gap: 8px; font-size: 22px; font-weight: 600">{hdyn('hfD', 'hfC')}{{{{ hfTxt }}}}</div></div>
<div style="padding: 12px; border-radius: 14px; background: {{{{ t.page }}}}"><div style="font-size: 12px; font-weight: 600; letter-spacing: 0.04em; color: {{{{ t.text2 }}}}">EFFECTIVE LEVERAGE</div><div style="margin-top: 4px; font-size: 22px; font-weight: 600">{{{{ levTxt }}}}</div></div>
</div>
<details style="border-top: 1px solid {{{{ t.line }}}}"><summary style="height: 48px; display: flex; align-items: center; justify-content: space-between; font-size: 14px; font-weight: 600; list-style: none; cursor: pointer">How this works<span style="display: flex; color: {{{{ t.text2 }}}}">{ic('caret-down', 16)}</span></summary><ol style="margin: 0 0 14px 0; padding-left: 18px; font-size: 12px; line-height: 18px; color: {{{{ t.text2 }}}}"><li>Deposit {{{{ amtTxt }}}} {{{{ tok.sym }}}} as collateral and borrow {{{{ borrowTxt }}}} at {{{{ levTxt }}}}.</li><li style="margin-top: 4px">Supply it into Kamino's main market. Your {{{{ tok.sym }}}} stays as collateral and the debt is backed by the Kamino receipt. Liquidation happens at health 1.10.</li></ol></details>""", '0 16px')
    hero_inner = hero_stats('Projected net profit', '{{ profit }}', [('Health factor', '{{ hfTxt }}'), ('Leverage', '{{ levTxt }}')])
    catcher = f'<sc-if value="{{{{ anyOpen }}}}" hint-placeholder-val="{{{{ false }}}}"><div aria-hidden="true" onClick="{{{{ closeAll }}}}" style="position: absolute; inset: 0; z-index: 4"></div></sc-if>'
    body = scroller(f"""{hero('farm', hero_inner)}
{catcher}
<div style="padding: 16px 16px 0 16px; display: flex; flex-direction: column; gap: 12px">
{pools}
{step1}
{step2}
<button type="button" onClick="{{{{ deploy }}}}" aria-disabled="{{{{ dis }}}}" style="height: 56px; border-radius: 28px; border: 0; background: {{{{ ctaBg }}}}; color: {{{{ ctaFg }}}}; font-size: 16px; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 8px">{{{{ ctaLabel }}}}{ic('wallet', 18)}</button>
</div>""") + '\n' + capsule('farm', 'Deploy') + '\n' + tx_overlay('Strategy deployed', '{{ doneText }}', 'Backpack', 'your farm', 'View position', 'V7FarmPositionsNew')
    js = f"var FT = {json.dumps([dict(sym=s, px=p, bal=b, icon=TOK[s]) for s, p, b in FARM_TOK])};\n" + f"var FP = {json.dumps([dict(sym='USDC', apy='5.03%', k=0.0503, b=0.0065, px=1, avail='Supply APY', avail2='5,996,822 USDC available', total='121,554,426 USDC', util='95.06%', icon=TOK['USDC']), dict(sym='SOL', apy='4.36%', k=0.0436, b=0.0116, px=118.58, avail='Supply APY', avail2='255,061 SOL available', total='2,480,112 SOL', util='89.70%', icon=TOK['SOL'])])};\n" + """var s = this.state;
var ts = s.ts || 'TSLAx', ps = s.ps || 'USDC', lev = s.lev || 2, open = s.open || '';
var tok = FT.filter(function (x) { return x.sym === ts; })[0], pool = FP.filter(function (x) { return x.sym === ps; })[0];
var amt = s.amt === undefined ? tok.bal : s.amt;
var coll = amt * tok.px, debt = (lev - 1) * coll, net = debt * (pool.k - pool.b), hf = lev > 1 ? lev / (lev - 1) : 0;
var f2 = function (n) { return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };
var borrowAmt = ps === 'USDC' ? f2(debt) + ' USDC' : (debt / pool.px).toFixed(3) + ' SOL';
var over = amt > tok.bal, none = tok.bal <= 0;
var ok = !over && amt > 0 && lev > 1;
var marks = [1, 2, 3, 4, 5].map(function (v) { var on = v === lev; return { label: v + 'X', x: ((v - 1) * 25) + '%', dot: v <= lev ? '#703AE6' : t.bd, fg: on ? t.link : t.text2, pick: function () { self.setState({ lev: v }); } }; });
var sum = [
{ k: 'Deposit', v: f2(amt) + ' ' + ts, c: t.text },
{ k: 'Borrow', v: borrowAmt + (ps === 'USDC' ? ' (≈' + money(debt) + ')' : ''), c: t.text },
{ k: ps + ' borrow APY (Vanna)', v: (pool.b * 100).toFixed(2) + '%', c: t.neg },
{ k: 'Supplied to Kamino', v: money(debt), c: t.pos },
{ k: 'Kamino supply APY', v: pool.apy, c: t.pos },
{ k: ps + ' pool total supplied', v: pool.total, c: t.text },
{ k: ps + ' pool utilization', v: pool.util, c: t.text }
];
var hfC = hf >= 1.5 ? t.pos : (hf > 1.1 ? '#FF8AC2' : t.neg);
return { t: t, tok: tok, pool: pool, bal: f2(tok.bal), amtTxt: f2(amt), amtC: over ? t.neg : t.text, usd: money(coll), err: none ? 'No ' + ts + ' in your wallet. Pick another asset.' : (over ? 'That is more than your wallet balance.' : false),
setMax: function () { self.setState({ amt: tok.bal }); },
poolOpen: open === 'pool', poolAria: open === 'pool' ? 'true' : 'false', poolRot: open === 'pool' ? 'rotate(180deg)' : 'none', poolBd: open === 'pool' ? '#703AE6' : t.line, togglePool: function () { self.setState({ open: open === 'pool' ? '' : 'pool' }); },
poolOpts: FP.map(function (p) { var on = p.sym === ps; return { sym: p.sym, apy: p.apy, avail2: p.avail2, icon: p.icon, sel: on ? 'true' : 'false', bg: on ? t.tv : 'transparent', pick: function () { self.setState({ ps: p.sym, open: '' }); } }; }),
tokOpen: open === 'tok', tokAria: open === 'tok' ? 'true' : 'false', tokRot: open === 'tok' ? 'rotate(180deg)' : 'none', tokBd: open === 'tok' ? '#703AE6' : t.line, toggleTok: function () { self.setState({ open: open === 'tok' ? '' : 'tok' }); },
tokOpts: FT.map(function (x) { var on = x.sym === ts; return { sym: x.sym, icon: x.icon, bal: x.bal > 0 ? f2(x.bal) : '0', sel: on ? 'true' : 'false', bg: on ? t.tv : 'transparent', fg: on ? t.link : t.text, pick: function () { self.setState({ ts: x.sym, amt: undefined, open: '' }); } }; }),
zPool: open === 'pool' ? '6' : '2', zTok: open === 'tok' ? '6' : '1', anyOpen: open !== '', closeAll: function () { self.setState({ open: '' }); },
borrowSub: 'Borrow ' + ps + ' from Vanna, backed by your ' + ts, marks: marks, fillW: ((lev - 1) * 25) + '%', levTxt: lev.toFixed(1) + 'x', levUp: lev + 'X',
sum: sum, profit: '≈' + money(net).replace('.00', '') + '/yr', perMo: money(net / 12) + '/mo', hfTxt: lev > 1 ? hf.toFixed(2) : '∞', hfD: hArc(lev > 1 ? hf : 2.5), hfC: lev > 1 ? hfC : t.pos, borrowTxt: borrowAmt,
dis: ok ? 'false' : 'true', ctaBg: ok ? 'linear-gradient(90deg, #FC5457, #703AE6)' : t.off, ctaFg: ok ? '#FFFFFF' : t.offFg, ctaLabel: ok ? 'Deploy strategy · approve in wallet' : (none ? 'No ' + ts + ' to deposit' : (over ? 'Not enough ' + ts : (lev <= 1 ? 'Pick leverage above 1x' : 'Enter an amount'))),
deploy: function () { if (ok) self.setState({ __tx: 'sign', __st: 1, __why: '', open: '' }); }, doneText: f2(amt) + ' ' + ts + ' deposited · ' + borrowAmt + ' earning ' + pool.apy + ' on Kamino' };"""
    for stem, st, tx in [('V7Farm', '{}', ''), ('V7FarmPools', "{ open: 'pool' }", ''), ('V7FarmTokens', "{ open: 'tok' }", ''), ('V7FarmLev4', '{ lev: 4 }', ''), ('V7FarmSign', '{}', 'sign'), ('V7FarmDone', '{}', 'done'),
                         ('V7FarmNoFunds', "{ ts: 'GOOGLx' }", ''), ('V7FarmFailed', "{ __why: 'network' }", 'failed'), ('V7FarmRejected', '{}', 'rejected')]:
        page(stem, 'Farm deploy', body, js, state=st, tx_default=tx)


# ------------------------------------------------------------------ Farm: positions list (web "Position" tab)

def farm_card(sym, pool, coll, collU, borrowed, levTxt, apr, earn, hf, href):
    cell = lambda k, v, sub: f'<div style="display: flex; flex-direction: column; gap: 2px"><span style="font-size: 12px; font-weight: 600; letter-spacing: 0.04em; color: {{{{ t.text2 }}}}">{k}</span><span style="font-size: 16px; line-height: 22px; font-weight: 600">{v}</span><span style="font-size: 12px; line-height: 16px; color: {{{{ t.text2 }}}}">{sub}</span></div>'
    return f"""<a href="{href}.dc.html" style="border-radius: 20px; background: {{{{ t.card }}}}; box-shadow: {{{{ t.shadow }}}}; padding: 16px; display: block; text-decoration: none; color: {{{{ t.text }}}}">
<div style="display: flex; align-items: center; gap: 12px">{token(sym, 40)}<span style="flex-grow: 1; display: flex; flex-direction: column"><span style="font-size: 16px; line-height: 22px; font-weight: 600">{sym} → {pool}</span><span style="font-size: 12px; line-height: 16px; color: {{{{ t.text2 }}}}">Kamino</span></span><span style="display: flex; align-items: center; gap: 6px; font-size: 14px; font-weight: 600">{hglyph(hf, 18, '{{ t.line }}')}{hf:.2f}</span></div>
<div style="margin-top: 14px; padding: 12px; border-radius: 14px; background: {{{{ t.page }}}}; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px">
{cell('COLLATERAL', coll, collU)}{cell('BORROWED', borrowed, levTxt)}{cell('NET APR', apr, 'Kamino yield minus Vanna borrow')}{cell('EARNINGS', earn, 'to date')}
</div>
</a>"""


def farm_positions(stem, new=False):
    cards = ''
    if new:
        cards += farm_card('TSLAx', 'USDC', '$441.99', '1.25 TSLAx', '$441.99', '2.00x leverage', '4.23%', '$0.00', 2.00, 'V7FarmPosition')
    cards += farm_card('GOOGLx', 'USDC', '$509.90', '1.50 GOOGLx', '$1,529.70', '4.00x leverage', '4.23%', '+$1.47', 1.33, 'V7FarmPosition')
    hero_inner = hero_stats('Farm net value', '$953.35' if new else '$511.36', [('Open positions', '2' if new else '1'), ('Earnings', '+$1.47'), ('Net APR', '4.23%')])
    body = scroller(f"""{hero('farm', hero_inner)}
<div style="padding: 16px 16px 0 16px; display: flex; flex-direction: column; gap: 12px">
{cards}
<a href="V7Farm.dc.html" style="height: 52px; border-radius: 20px; border: 1px dashed {{{{ t.bd }}}}; color: {{{{ t.text }}}}; display: flex; align-items: center; justify-content: center; gap: 8px; font-size: 14px; font-weight: 600; text-decoration: none">{ic('plus', 18)}Deploy another strategy</a>
</div>""") + '\n' + capsule('farm', 'Position')
    page(stem, 'Farm positions', body, 'return { t: t };')


# ------------------------------------------------------------------ Farm: position detail and close (web detail page)

def farm_position():
    stat = lambda k, v, sub: f'<div style="display: flex; flex-direction: column; gap: 2px"><span style="font-size: 12px; font-weight: 600; letter-spacing: 0.04em; color: {{{{ t.text2 }}}}">{k}</span><span style="font-size: 16px; line-height: 24px; font-weight: 600">{v}</span><span style="font-size: 12px; line-height: 16px; color: {{{{ t.text2 }}}}">{sub}</span></div>'
    head = box(f"""<div style="padding: 16px 0">
<div style="display: flex; align-items: center; gap: 12px">{token('GOOGLx', 44)}<span style="flex-grow: 1; min-width: 0; display: flex; flex-direction: column"><span style="font-size: 16px; line-height: 22px; font-weight: 600; white-space: nowrap">GOOGLx → USDC</span><span style="font-size: 12px; line-height: 16px; color: {{{{ t.text2 }}}}; white-space: nowrap">Kamino · On-chain position</span></span><span style="height: 28px; padding: 0 12px; border-radius: 14px; background: {{{{ t.tv }}}}; color: {{{{ t.tvI }}}}; font-size: 12px; font-weight: 600; display: flex; align-items: center; white-space: nowrap; flex-shrink: 0">4.00x</span></div>
<div style="margin-top: 16px; padding: 12px; border-radius: 14px; background: {{{{ t.page }}}}; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px">
{stat('COLLATERAL', '$509.90', '1.50 GOOGLx')}{stat('DEBT WITH INTEREST', '$1,529.71', '1,529.70 USDC + 0.01')}{stat('NET VALUE', '$511.36', '+1.47 USDC yield')}{stat('SUPPLIED TO KAMINO', '$1,531.17', '1,531.17 USDC')}
</div></div>""")
    apr = box(f"""<div style="height: 44px; display: flex; align-items: center; font-size: 12px; font-weight: 600; letter-spacing: 0.04em; color: {{{{ t.text2 }}}}">APR BREAKDOWN</div>
<div style="padding: 12px 0; border-top: 1px solid {{{{ t.line }}}}; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px">{stat('SUPPLY', '5.03%', 'Kamino USDC')}{stat('BORROW', '0.80%', 'Vanna loan')}{stat('NET APR', '4.23%', 'on the loan')}</div>""")
    details = box('<div style="height: 44px; display: flex; align-items: center; font-size: 12px; font-weight: 600; letter-spacing: 0.04em; color: {{ t.text2 }}">POSITION DETAILS</div>' + rows([('Collateral', '1.50 GOOGLx'), ('Kamino supply', '1,531.17 USDC'), ('Debt (with interest)', '1,529.71 USDC'), ('Interest accrued', '+0.01 USDC'), ('Kamino yield earned', '+1.47 USDC', '', '{{ t.pos }}'), ('Leverage', '4.00x'), ('Position health factor', '1.33', 'Liquidation at 1.10')]))
    sheet = f"""<sc-if value="{{{{ cl }}}}" hint-placeholder-val="{{{{ false }}}}">
<div aria-hidden="true" onClick="{{{{ closeSheet }}}}" style="position: absolute; inset: 0; z-index: 40; background: rgba(17,17,17,0.5); animation: vnFade 180ms ease-out"></div>
<div role="dialog" aria-label="Close position" style="position: absolute; z-index: 41; left: 0; right: 0; bottom: 0; max-height: 86%; overflow-y: auto; border-radius: 28px 28px 0 0; background: {{{{ t.card }}}}; color: {{{{ t.text }}}}; padding: 10px 20px 28px 20px; animation: vnSheet 340ms cubic-bezier(0.2, 0.9, 0.3, 1)">
<div style="width: 40px; height: 4px; border-radius: 2px; background: {{{{ t.bd }}}}; margin: 0 auto"></div>
<div style="margin-top: 14px; display: flex; align-items: center; gap: 12px">{token('GOOGLx', 36)}<span style="flex-grow: 1; display: flex; flex-direction: column"><span style="font-size: 20px; line-height: 28px; font-weight: 600">Close position</span><span style="font-size: 12px; line-height: 16px; color: {{{{ t.text2 }}}}">GOOGLx → USDC · 4.00x</span></span><button type="button" onClick="{{{{ closeSheet }}}}" aria-label="Close" style="width: 44px; height: 44px; border-radius: 22px; border: 0; background: {{{{ t.page }}}}; color: {{{{ t.text }}}}; display: flex; align-items: center; justify-content: center">{ic('x', 18)}</button></div>
<div style="margin-top: 18px; font-size: 12px; font-weight: 600; letter-spacing: 0.04em; color: {{{{ t.text2 }}}}">EXIT AMOUNT</div>
<div style="margin-top: 8px; display: flex; gap: 8px"><sc-for list="{{{{ pcts }}}}" as="p" hint-placeholder-count="4"><button type="button" onClick="{{{{ p.pick }}}}" aria-pressed="{{{{ p.on }}}}" style="flex: 1 1 0; height: 48px; border-radius: 16px; border: 0; background: {{{{ p.bg }}}}; color: {{{{ p.fg }}}}; font-size: 16px; font-weight: 600; transition: background 200ms ease">{{{{ p.label }}}}</button></sc-for></div>
<div style="margin-top: 12px">
<sc-for list="{{{{ rev }}}}" as="r" hint-placeholder-count="3"><div style="min-height: 52px; display: flex; align-items: center; justify-content: space-between; gap: 10px; border-top: 1px solid {{{{ t.line }}}}"><span style="font-size: 14px; color: {{{{ t.text2 }}}}">{{{{ r.k }}}}</span><span style="display: flex; flex-direction: column; align-items: flex-end"><span style="font-size: 14px; font-weight: 600">{{{{ r.v }}}}</span><span style="font-size: 12px; color: {{{{ t.text2 }}}}">{{{{ r.u }}}}</span></span></div></sc-for>
<div style="min-height: 48px; display: flex; align-items: center; justify-content: space-between; font-size: 14px; border-top: 1px solid {{{{ t.line }}}}"><span style="color: {{{{ t.text2 }}}}">Remaining USDC debt</span><span style="font-weight: 600">{{{{ remain }}}}</span></div>
<div style="min-height: 48px; display: flex; align-items: center; justify-content: space-between; font-size: 14px; border-top: 1px solid {{{{ t.line }}}}"><span style="color: {{{{ t.text2 }}}}">Position health</span><span style="font-weight: 600">{{{{ hfAfter }}}}</span></div>
</div>
<div style="margin-top: 8px; padding: 14px; border-radius: 16px; background: {{{{ t.tv }}}}"><div style="display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; letter-spacing: 0.04em; color: {{{{ t.tvI }}}}">{ic('arrow-down', 14, 'bold')}YOU RECEIVE</div><div style="margin-top: 6px; display: flex; justify-content: space-between; gap: 8px; font-size: 16px; font-weight: 600"><span>{{{{ recv }}}}</span><span style="font-weight: 400; color: {{{{ t.text2 }}}}">{{{{ recvUsd }}}}</span></div><div style="font-size: 12px; color: {{{{ t.text2 }}}}">Back to your wallet · 2 approvals</div></div>
<button type="button" onClick="{{{{ go }}}}" style="margin-top: 16px; width: 100%; height: 56px; border-radius: 28px; border: 0; background: linear-gradient(90deg, #FC5457, #703AE6); color: #FFFFFF; font-size: 16px; font-weight: 600">{{{{ closeLabel }}}}</button>
</div>
</sc-if>"""
    body = f"""<div style="position: absolute; inset: 0; bottom: 96px; overflow-y: auto; padding-bottom: 24px">
<header style="height: 56px; margin-top: 28px; padding: 0 16px 0 4px; display: flex; align-items: center; gap: 4px"><a href="V7FarmPositions.dc.html" aria-label="All positions" style="height: 48px; padding: 0 10px; border-radius: 24px; color: {{{{ t.text }}}}; display: flex; align-items: center; gap: 6px; font-size: 14px; text-decoration: none">{ic('arrow-left', 20)}Positions</a><span style="flex-grow: 1"></span><span style="height: 32px; padding: 0 12px; border-radius: 16px; background: {{{{ t.card }}}}; display: flex; align-items: center; gap: 6px; font-size: 14px; font-weight: 600">{hglyph(1.33, 16, '{{ t.line }}')}HF 1.33</span></header>
<div style="padding: 4px 16px 0 16px; display: flex; flex-direction: column; gap: 12px">
{head}{apr}{details}
<p style="margin: 0 4px; font-size: 12px; line-height: 18px; color: {{{{ t.text2 }}}}">Closing redeems your Kamino supply, repays the USDC loan with interest, then returns your GOOGLx. It takes two approvals in Backpack.</p>
</div>
</div>
{sticky('<button type="button" onClick="{{ openSheet }}" style="flex: 1 1 0; height: 56px; border-radius: 28px; border: 0; background: {{ t.text }}; color: {{ t.page }}; font-size: 16px; font-weight: 600">Close position</button>')}
{sheet}
{tx_overlay('Position closed', '{{ doneText }}', 'Backpack', 'the {{ stepWhat }}', 'View history', 'V7FarmHistory')}"""
    js = """var p = this.state.p || 100, cl = !!this.state.cl;
var f = p / 100, f2 = function (n) { return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };
var pcts = [25, 50, 75, 100].map(function (v) { var on = v === p; return { label: v + '%', on: on ? 'true' : 'false', bg: on ? 'linear-gradient(90deg, #FC5457, #703AE6)' : t.page, fg: on ? '#FFFFFF' : t.text, pick: function () { self.setState({ p: v }); } }; });
var rev = [
{ k: 'Redeem from Kamino', v: f2(1531.17 * f) + ' USDC', u: money(1531.02 * f) },
{ k: 'Repay debt + interest', v: f2(1529.71 * f) + ' USDC', u: money(1529.56 * f) },
{ k: 'Return collateral', v: (1.5 * f).toFixed(2) + ' GOOGLx', u: money(509.90 * f) }
];
var st = this.state.__st || 1;
return { t: t, cl: cl, pcts: pcts, rev: rev, recv: (1.5 * f).toFixed(2) + ' GOOGLx + ' + f2(1.46 * f) + ' USDC', recvUsd: money(509.90 * f + 1.46 * f), remain: money(1529.71 * (1 - f)), hfAfter: p === 100 ? 'Position closed' : '1.33 (unchanged)',
openSheet: function () { self.setState({ cl: true }); }, closeSheet: function () { self.setState({ cl: false }); },
closeLabel: 'Close ' + (p === 100 ? 'all' : p + '%') + ' · approve in wallet', stepWhat: st === 1 ? 'redeem and repay step' : 'collateral return step',
go: function () { self.setState({ cl: false, __tx: 'sign', __st: 1, __why: '' }); }, partialBody: 'Your loan is repaid and the leftover USDC is in your wallet. Your ' + (1.5 * f).toFixed(2) + ' GOOGLx is still in the position. Try again to get it back.', doneText: (1.5 * f).toFixed(2) + ' GOOGLx and ' + f2(1.46 * f) + ' USDC are back in your wallet' };"""
    for stem, st, tx, step in [('V7FarmPosition', '{}', '', 1), ('V7FarmClose', '{ cl: true }', '', 1), ('V7FarmClose50', '{ cl: true, p: 50 }', '', 1), ('V7FarmCloseSign', '{}', 'sign', 1), ('V7FarmCloseStep2', '{}', 'sign', 2), ('V7FarmCloseDone', '{}', 'done', 2),
                                ('V7FarmCloseFailed', "{ __why: 'network' }", 'failed', 1), ('V7FarmCloseStep2Failed', "{ __why: 'network' }", 'failed', 2)]:
        page(stem, 'Farm position', body, js, state=st, tx_default=tx, tx_steps=2, tx_step=step)


# ------------------------------------------------------------------ Farm: history (web "Position History")

def farm_history():
    chip = lambda k, v, tint: f'<span style="height: 26px; padding: 0 10px; border-radius: 13px; background: {{{{ t.{tint} }}}}; color: {{{{ t.{tint}I }}}}; font-size: 12px; font-weight: 600; display: flex; align-items: center; gap: 6px; white-space: nowrap"><span style="letter-spacing: 0.04em">{k}</span><span style="color: {{{{ t.text }}}}">{v}</span></span>'
    ev = [('GOOGLx-USDC Farm', 'Sep 21, 2026 · 10:42 AM', '5tRq…Ga81', [('DEPOSIT', '1.50 GOOGLx', 'tt'), ('DEPOSIT', '1,529.70 USDC', 'tt'), ('BORROW', '1,529.70 USDC', 'tr')]),
          ('ANTHROPIC-USDC Farm', 'Sep 19, 2026 · 4:10 PM', '9aKe…2mPw', [('REDEEM', '2,008.24 USDC', 'tv'), ('REPAY', '2,002.30 USDC', 'tv'), ('WITHDRAW', '0.96 ANTHROPIC', 'tt')]),
          ('ANTHROPIC-USDC Farm', 'Sep 10, 2026 · 9:05 AM', '3cVb…7hNs', [('DEPOSIT', '0.96 ANTHROPIC', 'tt'), ('DEPOSIT', '2,002.12 USDC', 'tt'), ('BORROW', '2,002.12 USDC', 'tr')])]
    cards = ''.join(f"""<div style="border-radius: 20px; background: {{{{ t.card }}}}; box-shadow: {{{{ t.shadow }}}}; padding: 14px 16px">
<div style="display: flex; align-items: center; justify-content: space-between; gap: 8px"><span style="display: flex; flex-direction: column"><span style="font-size: 15px; line-height: 20px; font-weight: 600">{n}</span><span style="font-size: 12px; line-height: 16px; color: {{{{ t.text2 }}}}">{d}</span></span><a href="#" style="font-size: 12px; font-weight: 600; color: {{{{ t.link }}}}; text-decoration: none; display: flex; align-items: center; gap: 4px">{h}{ic('arrow-up-right', 12)}</a></div>
<div style="margin-top: 10px; display: flex; flex-wrap: wrap; gap: 6px">{''.join(chip(*c) for c in cs)}</div></div>""" for n, d, h, cs in ev)
    hero_inner = hero_stats('Earned from farms', '+$7.59', [('Closed', '1'), ('Open', '1')])
    body = scroller(f"""{hero('farm', hero_inner)}
<div style="padding: 16px 16px 0 16px; display: flex; flex-direction: column; gap: 12px">{cards}</div>""") + '\n' + capsule('farm', 'History')
    page('V7FarmHistory', 'Farm history', body, 'return { t: t };')


# ------------------------------------------------------------------ Connect wallet flow (Backpack via Mobile Wallet Adapter)

def connect(base):
    rpc = 'https://rpc-devnet.solana.vanna.finance'
    sheet = f"""<div aria-hidden="true" style="position: absolute; inset: 0; z-index: 20; background: rgba(0,0,0,0.56); animation: vnFade 200ms ease-out"></div>
<div role="dialog" aria-label="Connect a wallet" style="position: absolute; z-index: 21; left: 0; right: 0; bottom: 0; border-radius: 28px 28px 0 0; background: {{{{ t.card }}}}; color: {{{{ t.text }}}}; padding: 10px 20px 28px 20px; animation: vnSheet 340ms cubic-bezier(0.2, 0.9, 0.3, 1)">
<div style="width: 36px; height: 4px; margin: 0 auto; border-radius: 2px; background: {{{{ t.bd }}}}"></div>
<sc-if value="{{{{ isPick }}}}" hint-placeholder-val="{{{{ true }}}}">
<h2 style="margin: 20px 0 0 0; font-size: 20px; line-height: 28px; font-weight: 600">Connect a wallet</h2>
<p style="margin: 4px 0 16px 0; font-size: 14px; line-height: 20px; color: {{{{ t.text2 }}}}">Vanna connects through Solana Mobile Wallet Adapter. You approve everything in your wallet.</p>
<button type="button" onClick="{{{{ pickBackpack }}}}" style="width: 100%; height: 72px; padding: 0 14px; border-radius: 18px; border: 1px solid {{{{ t.bd }}}}; background: {{{{ t.page }}}}; color: {{{{ t.text }}}}; display: flex; align-items: center; gap: 12px; text-align: left"><span style="width: 44px; height: 44px; border-radius: 12px; background: #B33C3E; color: #FFFFFF; display: flex; align-items: center; justify-content: center">{ic('backpack', 24, 'fill')}</span><span style="flex-grow: 1; display: flex; flex-direction: column"><span style="font-size: 16px; line-height: 22px; font-weight: 600">Backpack</span><span style="font-size: 12px; line-height: 16px; color: {{{{ t.text2 }}}}">{{{{ bpCap }}}}</span></span><span style="height: 26px; padding: 0 10px; border-radius: 13px; background: {{{{ bpTagBg }}}}; color: {{{{ bpTagFg }}}}; font-size: 12px; font-weight: 600; display: flex; align-items: center">{{{{ bpTag }}}}</span></button>
<p style="margin: 12px 0 0 0; font-size: 12px; line-height: 18px; color: {{{{ t.text2 }}}}">Vanna supports Backpack today. More wallets are coming.</p>
<div style="margin-top: 12px; padding: 12px; border-radius: 14px; background: {{{{ t.page }}}}; display: flex; gap: 10px; font-size: 12px; line-height: 16px; color: {{{{ t.text2 }}}}">{ic('lock-key', 16)}<span>Vanna only asks to see your address and to request signatures. Your keys never leave Backpack.</span></div>
</sc-if>
<sc-if value="{{{{ isApprove }}}}" hint-placeholder-val="{{{{ false }}}}">
<div style="padding: 28px 0 0 0; display: flex; flex-direction: column; align-items: center; text-align: center">
<span style="position: relative; width: 96px; height: 96px; display: flex; align-items: center; justify-content: center"><span style="position: absolute; inset: 8px; border-radius: 999px; border: 2px solid #703AE6; animation: vnRing 1.8s ease-out infinite"></span><span style="position: absolute; inset: 8px; border-radius: 999px; border: 2px solid #703AE6; animation: vnRing 1.8s ease-out 0.9s infinite"></span><span style="width: 80px; height: 80px; border-radius: 999px; background: #B33C3E; color: #FFFFFF; display: flex; align-items: center; justify-content: center; animation: vnBreath 2.4s ease-in-out infinite">{ic('backpack', 36, 'fill')}</span></span>
<h2 style="margin: 20px 0 0 0; font-size: 20px; line-height: 28px; font-weight: 600">Approve in Backpack</h2>
<p style="margin: 4px 0 0 0; font-size: 14px; line-height: 20px; color: {{{{ t.text2 }}}}">Backpack opened. Approve the connection there, then come back to Vanna.</p>
<button type="button" onClick="{{{{ approved }}}}" style="margin-top: 24px; width: 100%; height: 52px; border-radius: 26px; border: 0; background: #703AE6; color: #FFFFFF; font-size: 16px; font-weight: 600">Open Backpack</button>
<button type="button" onClick="{{{{ decline }}}}" style="margin-top: 8px; width: 100%; height: 48px; border: 0; background: transparent; color: {{{{ t.text }}}}; font-size: 14px; font-weight: 600">Cancel</button>
</div>
</sc-if>
<sc-if value="{{{{ isRpc }}}}" hint-placeholder-val="{{{{ false }}}}">
<div style="padding: 20px 0 0 0">
<span style="height: 24px; padding: 0 10px; border-radius: 12px; background: {{{{ t.tv }}}}; color: {{{{ t.tvI }}}}; font-size: 12px; font-weight: 600; display: inline-flex; align-items: center">One-time setup</span>
<h2 style="margin: 10px 0 0 0; font-size: 20px; line-height: 28px; font-weight: 600">Point Backpack to Vanna's network</h2>
<p style="margin: 4px 0 0 0; font-size: 14px; line-height: 20px; color: {{{{ t.text2 }}}}">Vanna runs on a Solana mainnet fork. In Backpack, open Settings → Solana → RPC → Custom and paste this address.</p>
<div style="margin-top: 16px; height: 56px; padding: 0 8px 0 14px; border-radius: 16px; background: {{{{ t.page }}}}; border: 1px solid {{{{ t.bd }}}}; display: flex; align-items: center; gap: 8px"><span style="flex-grow: 1; min-width: 0; font-family: ui-monospace, monospace; font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis">{rpc}</span><button type="button" onClick="{{{{ copy }}}}" style="height: 40px; padding: 0 12px; border-radius: 20px; border: 0; background: {{{{ copyBg }}}}; color: {{{{ copyFg }}}}; font-size: 12px; font-weight: 600; display: flex; align-items: center; gap: 6px">{{{{ copyLabel }}}}</button></div>
<a href="#" style="margin-top: 10px; display: inline-flex; align-items: center; gap: 4px; font-size: 14px; font-weight: 600; color: {{{{ t.link }}}}; text-decoration: none">Setup guide{ic('arrow-up-right', 14)}</a>
<button type="button" onClick="{{{{ rpcDone }}}}" style="margin-top: 20px; width: 100%; height: 52px; border-radius: 26px; border: 0; background: #703AE6; color: #FFFFFF; font-size: 16px; font-weight: 600">I've added it</button>
</div>
</sc-if>
<sc-if value="{{{{ isDone }}}}" hint-placeholder-val="{{{{ false }}}}">
<div style="padding: 28px 0 0 0; display: flex; flex-direction: column; align-items: center; text-align: center">
<span style="position: relative; width: 80px; height: 80px"><img src="{TOK['SOL']}" alt="" style="width: 80px; height: 80px; border-radius: 999px; animation: vnPop 520ms cubic-bezier(0.34, 1.56, 0.64, 1) both"><span style="position: absolute; right: -2px; bottom: -2px; width: 30px; height: 30px; border-radius: 999px; background: #1C7C83; border: 3px solid {{{{ t.card }}}}; color: #FFFFFF; display: flex; align-items: center; justify-content: center; animation: vnPop 520ms cubic-bezier(0.34, 1.56, 0.64, 1) 200ms both">{ic('check', 16, 'bold')}</span></span>
<h2 style="margin: 20px 0 0 0; font-size: 20px; line-height: 28px; font-weight: 600">You're connected</h2>
<p style="margin: 4px 0 0 0; font-size: 14px; line-height: 20px; color: {{{{ t.text2 }}}}"><span style="font-family: ui-monospace, monospace">7xKX…9fQa</span> · Backpack</p>
<a href="V7Home.dc.html" style="margin-top: 24px; width: 100%; height: 52px; border-radius: 26px; background: #703AE6; color: #FFFFFF; font-size: 16px; font-weight: 600; display: flex; align-items: center; justify-content: center; text-decoration: none">Continue to Vanna</a>
</div>
</sc-if>
<sc-if value="{{{{ isDeclined }}}}" hint-placeholder-val="{{{{ false }}}}">
<div style="padding: 28px 0 0 0; display: flex; flex-direction: column; align-items: center; text-align: center">
<span style="width: 80px; height: 80px; border-radius: 999px; background: #595959; color: #FFFFFF; display: flex; align-items: center; justify-content: center; animation: vnPop 480ms cubic-bezier(0.34, 1.56, 0.64, 1) both">{ic('prohibit', 36, 'bold')}</span>
<h2 style="margin: 20px 0 0 0; font-size: 20px; line-height: 28px; font-weight: 600">Connection declined</h2>
<p style="margin: 4px 0 0 0; font-size: 14px; line-height: 20px; color: {{{{ t.text2 }}}}">Backpack didn't share your address. Nothing was connected.</p>
<button type="button" onClick="{{{{ retry }}}}" style="margin-top: 24px; width: 100%; height: 52px; border-radius: 26px; border: 0; background: #703AE6; color: #FFFFFF; font-size: 16px; font-weight: 600">Try again</button>
</div>
</sc-if>
<sc-if value="{{{{ isRpcFail }}}}" hint-placeholder-val="{{{{ false }}}}">
<div style="padding: 28px 0 0 0; display: flex; flex-direction: column; align-items: center; text-align: center">
<span style="width: 80px; height: 80px; border-radius: 999px; background: #B33C3E; color: #FFFFFF; display: flex; align-items: center; justify-content: center; animation: vnPop 480ms cubic-bezier(0.34, 1.56, 0.64, 1) both">{ic('wifi-slash', 36, 'bold')}</span>
<h2 style="margin: 20px 0 0 0; font-size: 20px; line-height: 28px; font-weight: 600">Can't reach Vanna's network</h2>
<p style="margin: 4px 0 0 0; font-size: 14px; line-height: 20px; color: {{{{ t.text2 }}}}">Backpack is still on another RPC, so Vanna can't see your account. Check the custom RPC is exactly <span style="font-family: ui-monospace, monospace; color: {{{{ t.text }}}}">rpc-devnet.solana.vanna.finance</span></p>
<button type="button" onClick="{{{{ rpcDone }}}}" style="margin-top: 24px; width: 100%; height: 52px; border-radius: 26px; border: 0; background: #703AE6; color: #FFFFFF; font-size: 16px; font-weight: 600">Check again</button>
<button type="button" onClick="{{{{ backRpc }}}}" style="margin-top: 8px; width: 100%; height: 48px; border: 0; background: transparent; color: {{{{ t.text }}}}; font-size: 14px; font-weight: 600">Show setup steps</button>
</div>
</sc-if>
<sc-if value="{{{{ isInstall }}}}" hint-placeholder-val="{{{{ false }}}}">
<div style="padding: 28px 0 0 0; display: flex; flex-direction: column; align-items: center; text-align: center">
<span style="width: 80px; height: 80px; border-radius: 24px; background: #B33C3E; color: #FFFFFF; display: flex; align-items: center; justify-content: center">{ic('backpack', 38, 'fill')}</span>
<h2 style="margin: 20px 0 0 0; font-size: 20px; line-height: 28px; font-weight: 600">Get Backpack first</h2>
<p style="margin: 4px 0 0 0; font-size: 14px; line-height: 20px; color: {{{{ t.text2 }}}}">Backpack isn't on this phone yet. Install it, create or import a wallet, then come back.</p>
<a href="#" style="margin-top: 24px; width: 100%; height: 52px; border-radius: 26px; background: #703AE6; color: #FFFFFF; font-size: 16px; font-weight: 600; display: flex; align-items: center; justify-content: center; text-decoration: none">Install Backpack</a>
<button type="button" onClick="{{{{ retry }}}}" style="margin-top: 8px; width: 100%; height: 48px; border: 0; background: transparent; color: {{{{ t.text }}}}; font-size: 14px; font-weight: 600">I've installed it</button>
</div>
</sc-if>
</div>"""
    js = """var __o = function () { try { return (typeof window !== 'undefined' && window.__vnOutcome) || 'ok'; } catch (e) { return 'ok'; } };
var cs = this.state.cs || this.props.phase || 'pick', copied = !!this.state.copied;
var noBp = this.state.noBp === undefined ? false : this.state.noBp;
return { t: t, isPick: cs === 'pick', isApprove: cs === 'approve', isRpc: cs === 'rpc', isDone: cs === 'done', isDeclined: cs === 'declined', isInstall: cs === 'install', isRpcFail: cs === 'rpcfail',
bpCap: noBp ? 'Not installed on this phone' : 'Detected on this phone', bpTag: noBp ? 'Install' : 'Detected', bpTagBg: noBp ? t.tr : t.tt, bpTagFg: noBp ? t.trI : t.ttI,
pickBackpack: function () { self.setState({ cs: noBp ? 'install' : 'approve' }); }, approved: function () { self.setState({ cs: __o() === 'reject' ? 'declined' : 'rpc' }); }, decline: function () { self.setState({ cs: 'declined' }); },
retry: function () { self.setState({ cs: 'pick', noBp: false }); }, rpcDone: function () { var o = __o(); self.setState({ cs: o !== 'ok' && o !== 'reject' ? 'rpcfail' : 'done' }); }, backRpc: function () { self.setState({ cs: 'rpc' }); },
copy: function () { self.setState({ copied: true }); }, copyLabel: copied ? 'Copied' : 'Copy', copyBg: copied ? t.tt : t.tv, copyFg: copied ? t.ttI : t.tvI };"""
    for stem, st in [('V7Connect', '{}'), ('V7ConnectApprove', "{ cs: 'approve' }"), ('V7ConnectRpc', "{ cs: 'rpc' }"), ('V7ConnectDone', "{ cs: 'done' }"), ('V7ConnectDeclined', "{ cs: 'declined' }"), ('V7ConnectInstall', "{ cs: 'pick', noBp: true }"), ('V7ConnectRpcFail', "{ cs: 'rpcfail' }")]:
        page(stem, 'Connect', base + '\n' + sheet, js, state=st)


def build():
    import opening7
    earn_vault()
    farm()
    farm_positions('V7FarmPositions')
    farm_positions('V7FarmPositionsNew', True)
    farm_position()
    farm_history()
    connect(opening7.base(False))
    for s in ['V7Connect', 'V7ConnectApprove', 'V7ConnectRpc', 'V7ConnectDone', 'V7ConnectDeclined', 'V7ConnectInstall']:
        opening7.inject(s, {})


if __name__ == '__main__':
    build()
