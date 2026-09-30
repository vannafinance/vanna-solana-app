import json, sys, re, os, math
sys.path.insert(0, '.')
from common import *
import screens_home, screens_trade, screens_earn, home7, swap7, margin7, asset7, opening7, flows7
for m in (screens_home, screens_trade, screens_earn, home7, swap7, margin7, asset7, opening7, flows7):
    m.build()

w = lambda stem, of, title, attrs='dark="{{ true }}"', bg='#111111': wrapper(stem, of, title, attrs, bg)
w('V7HomeNotif', 'V7Home', 'Home notifications', 'notifications-open="{{ true }}"', '#F7F7F7')
w('V7TraderHistory', 'V7Trader', 'Trader history', 'history="{{ true }}"', '#F7F7F7')
w('V7EarnEarnings', 'V7Earn', 'Earn net earnings', 'earnings="{{ true }}"', '#F7F7F7')
w('V7HomeOffline', 'V7Home', 'Home offline', 'offline="{{ true }}"', '#F7F7F7')
DARK = ['Home', 'Perps', 'PerpsMarket', 'PerpsPositions', 'Swap', 'Earn', 'EarnVault', 'Farm', 'FarmPosition', 'Trader', 'Lender', 'Notifications', 'Profile', 'Connect']
for s in DARK:
    w(f'V7{s}Dark', f'V7{s}', f'{s} dark')

rows = [
 ('Start: the opening plays once, then Connect wallet walks through Backpack step by step', [
   ('V7Welcome', 'Welcome · opening motion'), ('V7Connect', 'Connect · pick Backpack'), ('V7ConnectApprove', 'Connect · approve in Backpack'),
   ('V7ConnectRpc', 'Connect · add Vanna RPC'), ('V7ConnectDone', 'Connect · connected')]),
 ('Home: wallet and margin at a glance, products as tiles, positions as a list', [
   ('V7Home', 'Home · Overview'), ('V7HomeNotif', 'Home · notifications'), ('V7Notifications', 'Notifications'), ('V7Lender', 'Home · Lender'),
   ('V7Trader', 'Home · Trader'), ('V7TraderHistory', 'Trader · history'), ('V7Profile', 'Profile')]),
 ('Perps: market → order → approve → confirmed, then manage the position (close or add collateral)', [
   ('V7Perps', 'Perps · Markets'), ('V7PerpsMarket', 'Perps · asset'), ('V7PerpsOrder', 'Order'), ('V7PerpsOrderSign', 'Order · approve'),
   ('V7PerpsOrderConfirm', 'Order · confirming'), ('V7PerpsOrderDone', 'Order · confirmed'), ('V7PerpsPositions', 'Perps · Positions'),
   ('V7PerpsClose', 'Close · all'), ('V7PerpsClose50', 'Close · 50%'), ('V7PerpsCloseDone', 'Close · done'), ('V7PerpsAdd', 'Add collateral'),
   ('V7PerpsAddSign', 'Add collateral · approve'), ('V7PerpsAddDone', 'Add collateral · done'), ('V7PerpsHistory', 'Perps · History')]),
 ('Margin account: created once, before the first Perps or Farm trade', [
   ('V7MarginCreate', 'Create margin account'), ('V7MarginAgree', 'Borrow agreement'), ('V7MarginSign', 'Approve in Backpack'), ('V7MarginDone', 'Margin account active')]),
 ('Swap from your wallet via Jupiter: pick, approve, confirming, swapped', [
   ('V7Swap', 'Swap'), ('V7SwapTokens', 'Token dropdown'), ('V7SwapRoute', 'Via picker'), ('V7SwapSettings', 'Settings'), ('V7SwapSign', 'Approve'),
   ('V7SwapConfirm', 'Confirming'), ('V7SwapDone', 'Swapped'), ('V7SwapHistory', 'Swap · History')]),
 ('Earn: overall deposit and net earnings graphs, pool tabs as on the web, supply and withdraw flows', [
   ('V7Earn', 'Earn · overall deposit'), ('V7EarnEarnings', 'Earn · net earnings'), ('V7EarnVault', 'Pool · Positions'), ('V7EarnVaultDetails', 'Pool · Details'),
   ('V7EarnVaultActivity', 'Pool · Activity'), ('V7EarnVaultCollateral', 'Pool · Collateral'), ('V7EarnVaultAnalytics', 'Pool · Analytics'), ('V7EarnVaultManagers', 'Pool · Managers'),
   ('V7EarnSupply', 'Supply'), ('V7EarnSupplySign', 'Supply · approve'), ('V7EarnSupplyDone', 'Supply · done'), ('V7EarnWithdraw', 'Withdraw'), ('V7EarnWithdrawDone', 'Withdraw · done'),
   ('V7EarnPositions', 'Earn · Positions'), ('V7EarnHistory', 'Earn · History')]),
 ('Farm: USDC or SOL Kamino pool, any stock as collateral, leverage, deploy; then Position, close in two approvals, and Position History', [
   ('V7Farm', 'Deploy'), ('V7FarmPools', 'Pool dropdown'), ('V7FarmTokens', 'Collateral dropdown'), ('V7FarmLev4', 'Leverage 4x'), ('V7FarmSign', 'Deploy · approve'),
   ('V7FarmDone', 'Deploy · done'), ('V7FarmPositionsNew', 'Position · after deploy'), ('V7FarmPositions', 'Position'), ('V7FarmPosition', 'Position detail'),
   ('V7FarmClose', 'Close · all'), ('V7FarmClose50', 'Close · 50%'), ('V7FarmCloseSign', 'Close · approve 1 of 2'), ('V7FarmCloseStep2', 'Close · approve 2 of 2'),
   ('V7FarmCloseDone', 'Close · done'), ('V7FarmHistory', 'Position History')]),
 ('When things go wrong: every action has a sad path. Not enough balance blocks the button with a clear reason; failed transactions say why (network, price moved, no SOL for fees, a step that did not finish) and offer a retry', [
   ('V7HomeOffline', 'Home · offline'), ('V7ConnectRpcFail', 'Connect · RPC not set'), ('V7ConnectDeclined', 'Connect · declined'), ('V7ConnectInstall', 'Connect · no Backpack'),
   ('V7MarginFee', 'Margin · no SOL for fees'), ('V7MarginRejected', 'Margin · cancelled'),
   ('V7PerpsOrderNoFunds', 'Order · not enough margin'), ('V7PerpsOrderRisky', 'Order · health too low'), ('V7PerpsOrderFailed', 'Order · network error'), ('V7PerpsOrderRejected', 'Order · cancelled'),
   ('V7PerpsCloseFailed', 'Close · network error'), ('V7PerpsAddFee', 'Add collateral · no SOL'),
   ('V7SwapNoFunds', 'Swap · not enough USDC'), ('V7SwapFailed', 'Swap · network error'), ('V7SwapSlippage', 'Swap · price moved'), ('V7SwapFee', 'Swap · no SOL for fees'), ('V7SwapRejected', 'Swap · cancelled'),
   ('V7EarnSupplyNoFunds', 'Supply · not enough USDC'), ('V7EarnSupplyFee', 'Supply · no SOL for fees'), ('V7EarnWithdrawOver', 'Withdraw · more than supplied'), ('V7EarnWithdrawFailed', 'Withdraw · network error'),
   ('V7FarmNoFunds', 'Farm · no GOOGLx'), ('V7FarmFailed', 'Deploy · network error'), ('V7FarmRejected', 'Deploy · cancelled'), ('V7FarmCloseFailed', 'Close · step 1 failed'), ('V7FarmCloseStep2Failed', 'Close · step 2 failed')]),
 ('Dark mode', [(f'V7{s}Dark', f'{s} · dark') for s in DARK]),
]

# ---------------------------------------------------------------- flow boards
# The canvas keeps at most ~40 artboards live at once (10 when zoomed far out), so 108 separate screens on one page
# leave most of them unloaded. Each flow is therefore ONE artboard that mounts all of its screens side by side.
FLOW_NAMES = ['V7Flow1Start', 'V7Flow2Home', 'V7Flow3Perps', 'V7Flow4Margin', 'V7Flow5Swap', 'V7Flow6Earn', 'V7Flow7Farm', 'V7Flow8SadPaths', 'V7Flow9Dark']
GAP, PAD, LABEL = 56, 32, 56


def resolve(stem):
    src = open(f'{PROJ}/{stem}.dc.html').read()
    m = re.search(r'<dc-import name="(\w+)"((?: \w+="\{\{ \w+ \}\}")*) hint-size', src)
    return (m.group(1), m.group(2).strip()) if m else (stem, '')


def flow_board(name, title, items):
    n = len(items)
    cols = n if n <= 15 else math.ceil(n / 2)
    lines = math.ceil(n / cols)
    W = 2 * PAD + cols * 412 + (cols - 1) * GAP
    H = 2 * PAD + lines * (LABEL + 915) + (lines - 1) * GAP
    cells = ''
    for i, (stem, t) in enumerate(items):
        base, attrs = resolve(stem)
        cells += (f'<div style="display: flex; flex-direction: column; gap: 12px">'
                  f'<div style="height: 44px; display: flex; flex-direction: column; justify-content: flex-end"><span style="font-size: 16px; line-height: 22px; font-weight: 600; color: #FFFFFF">{i + 1}. {t}</span><span style="font-size: 12px; line-height: 16px; color: #949494; font-family: ui-monospace, monospace">{stem}</span></div>'
                  f'<div style="width: 412px; height: 915px; border-radius: 28px; overflow: hidden; box-shadow: 0 0 0 1px #2C2C2C"><dc-import name="{base}" {attrs} hint-size="412px,915px"></dc-import></div></div>\n')
    pj = json.dumps({'$preview': {'width': W, 'height': H}}, separators=(',', ':'))
    html = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Vanna v7 · {title}</title>
<script src="./support.js"></script>
</head>
<body>
<x-dc>
{HELMET}
<div style="width: {W}px; height: {H}px; box-sizing: border-box; padding: {PAD}px; background: #0B0B0B; display: grid; grid-template-columns: repeat({cols}, 412px); column-gap: {GAP}px; row-gap: {GAP}px; align-content: start; font-family: 'Plus Jakarta Sans', system-ui, sans-serif">
{cells}</div>
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{pj}'>
class Component extends DCLogic {{
renderVals() {{
return {{}};
}}
}}
</script>
</body>
</html>
"""
    open(f'{PROJ}/{name}.dc.html', 'w').write(html)
    return W, H


c = json.load(open(PROJ + '/canvas.json'))
REMOVE = ['v7', 'v7b', 'v7c', 'v7d', 'v7e', 'v7f', 'v7s']
PAGES = [('v7', 'v7 · Clean, full flows'), ('v7s', 'v7 · Screens one by one (Play)')]
c['boards'] = {k: v for k, v in c['boards'].items() if not k.startswith('V7')}
c['notes'] = {k: v for k, v in c['notes'].items() if not k.startswith('v7row') and not k.startswith('v7s')}
c['order'] = [o for o in c['order'] if not o.startswith('V7')]
# page v7: one artboard per flow, every screen visible at once
y = 0
for ri, (title, items) in enumerate(rows):
    W, H = flow_board(FLOW_NAMES[ri], title, items)
    fn = FLOW_NAMES[ri] + '.dc.html'
    c['notes'][f'v7row{ri}'] = {'kind': 'title1', 'maxW': 7000, 'text': f'{ri + 1}. {title}', 'w': 240, 'x': 0, 'y': y - 300, 'page': 'v7'}
    c['boards'][fn] = {'x': 0, 'y': y, 'w': W, 'h': H, 'title': f'Flow {ri + 1}', 'is_interactive': True, 'page': 'v7'}
    c['order'].append(fn)
    y += H + 460
# page v7s: the same screens as single artboards (Play and links between screens)
PER_LINE = 13
y = 0
for ri, (title, items) in enumerate(rows):
    c['notes'][f'v7srow{ri}'] = {'kind': 'title1', 'maxW': 7000, 'text': f'{ri + 1}. {title}', 'w': 240, 'x': 0, 'y': y - 300, 'page': 'v7s'}
    for i, (stem, t) in enumerate(items):
        fn = stem + '.dc.html'
        assert os.path.exists(f'{PROJ}/{fn}'), fn
        c['boards'][fn] = {'x': (i % PER_LINE) * 492, 'y': y + (i // PER_LINE) * 1120, 'w': 412, 'h': 915, 'title': t, 'is_interactive': True, 'page': 'v7s'}
        c['order'].append(fn)
    y += (1 + (len(items) - 1) // PER_LINE) * 1120 + 215
pages = [pp for pp in c.get('pages', []) if pp['id'] not in REMOVE]
at = next((i for i, pp in enumerate(pages) if pp['id'] == 'v8'), len(pages))
pages[at:at] = [{'id': pid, 'name': pname} for pid, pname in PAGES]
c['pages'] = pages
c['launch'] = {'view': 'canvas', 'page': 'v7'}
json.dump(c, open(PROJ + '/canvas.json', 'w'), indent=1, ensure_ascii=False)
open(ROOT + '/canvas/v7_flowboards.json', 'w').write(json.dumps(FLOW_NAMES))
used = [s for _, items in rows for s, _ in items]
print(len(used), 'v7 boards')
open(os.path.join(PROJ, 'boards.json'), 'w').write(json.dumps(used))
open(os.path.join(PROJ, 'flows.json'), 'w').write(json.dumps(rows, ensure_ascii=False))

# every link inside v7 must land on a board that exists
bad = set()
for f in os.listdir(PROJ):
    if f.startswith('V7') and f.endswith('.dc.html'):
        for h in re.findall(r'href="(V\d\w+)\.dc\.html"', open(f'{PROJ}/{f}').read()):
            if not os.path.exists(f'{PROJ}/{h}.dc.html') or h not in used:
                bad.add((f, h))
print('links to non-board screens:', sorted(bad))
