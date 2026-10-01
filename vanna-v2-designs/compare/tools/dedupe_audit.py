"""Each fact once: duplicate cleanup (1 Oct 2026, compare/AUDIT-DUPLICATES.md "Clear fixes").

    python compare/tools/dedupe_audit.py      (safe to re-run: a second run changes nothing)

Removes information that a screen already shows somewhere else. New only; Farm, Swap, Connect, the
transaction status cards, the folder tabs, Welcome and the live charts are not touched.

 1. History summary card (Trade > History, Portfolio > Trader > History): keeps only Win rate
    (Realized PnL repeats the hero, Closed N repeats the tab count).
 2. Vault cards (Earn > Positions, Portfolio > Lender): "Active" without the APY (the Supply APY stat
    has it), no token line under the USD value (the Supplied stat has it); Lender hero loses
    "Supplied 2 assets" (= "Current 2").
 3. Vault screen: Details, Positions and Collateral drop what the hero shows; the Managers tab's
    vault manager and risk curator rows move into Details and the tab goes.
 4. Error states (order no funds, supply no funds, withdraw over): no inline sentence.
 5. Order form: no "3x · $1,500.00 position" label, no price in the market row.
 6. Margin account gate: band headline is "One-time setup"; benefit "Up to 5x leverage.";
    agreement sheet without "Please review the terms ...".
 7. Shortcuts that repeat tabs: Open a new position, Supply to another vault, Lender Spot Swap,
    Markets hero "2 open positions".
 8. Profile: no "Liquidation at 1.10" header, no second footnote sentence, no Margin account balance row.
 9. Earn list: no per-row "APY", no "Sorted by supply APY".
10. Vault Activity rows: no "Confirmed".
11. Portfolio hero: "Net available" becomes Health "1.69 · Safe".
"""
import os, re

SRC = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'src')
TPL = os.path.join(SRC, 'tpl')
CLS = os.path.join(SRC, 'cls')


def patch(path, fn):
    with open(path, encoding='utf8', newline='') as f:
        s = f.read()
    n = fn(s)
    if n != s:
        with open(path, 'w', encoding='utf8', newline='') as f:
            f.write(n)
        print('patched', os.path.relpath(path, SRC))


def tpl(name):
    return os.path.join(TPL, name)


def sub(pattern, repl, flags=0):
    """Regex replacement with a fixed replacement string (no backreferences)."""
    rx = re.compile(pattern, flags)
    return lambda s: rx.sub(lambda m: repl, s)


def rep(old, new):
    return lambda s: s.replace(old, new)


def chain(*fns):
    def run(s):
        for fn in fns:
            s = fn(s)
        return s
    return run


# ---------------------------------------------------------------- 1. history summary card
WIN_ONLY = ('<div style="height: 56px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid {{ t.line }}">'
            '<span style="font-size: 14px; line-height: 20px; color: {{ t.text2 }}">Win rate</span>'
            '<span style="font-size: 16px; line-height: 24px; font-weight: 600">{{ winRate }}</span></div>')
HIST_GRID = (r'<div style="height: 72px; display: grid; grid-template-columns: repeat\(3, minmax\(0, 1fr\)\); align-items: center; border-bottom: 1px solid \{\{ t\.line \}\}">\r?\n'
             r'<div[^\n]*>Realized PnL</span>[^\n]*\r?\n'
             r'<div[^\n]*>Closed</span>[^\n]*\r?\n'
             r'<div[^\n]*>Win rate</span>[^\n]*\r?\n'
             r'</div>')
for f in ('05-V7Trader.html', '10-V7PerpsPositions.html', '11-V7PerpsHistory.html'):
    patch(tpl(f), sub(HIST_GRID, WIN_ONLY))

# ---------------------------------------------------------------- 2 + 7. vault cards, shortcuts
T2 = '<span style="font-size: 12px; line-height: 16px; color: {{ t.text2 }}">'
SUPPLY_ANOTHER = r'<a href="V7Earn\.dc\.html" style="height: 52px; border-radius: 16px; border: 1px dashed[^"]*">(?:(?!</a>).)*?Supply to another vault</a>\r?\n'
vault_cards = chain(
    rep('Active · earning 0.03% APY</span>', 'Active</span>'),
    rep('Active · earning 0.11% APY</span>', 'Active</span>'),
    rep('$2,499.75</span>' + T2 + '2,500 USDC</span>', '$2,499.75</span>'),
    rep('$177.87</span>' + T2 + '1.50 SOL</span>', '$177.87</span>'),
    sub(SUPPLY_ANOTHER, ''),
)
for f in ('18-V7EarnPositions.html', '19-V7EarnHistory.html'):
    patch(tpl(f), vault_cards)

HERO_GRID3 = ('display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px"><div style="display: flex; flex-direction: column; gap: 2px;">'
              '<span style="font-size: 12px; line-height: 16px; color: rgba(255,255,255,0.72)">Total holdings</span>')
HERO_SUPPLIED = ('<div style="display: flex; flex-direction: column; gap: 2px; padding-left: 12px; border-left: 1px solid rgba(255,255,255,0.18);">'
                 '<span style="font-size: 12px; line-height: 16px; color: rgba(255,255,255,0.72)">Supplied</span>'
                 '<span style="font-size: 16px; line-height: 22px; font-weight: 600">2 assets</span></div>')
SPOT_SWAP = r'<a href="V7Swap\.dc\.html" style="height: 32px; padding: 0 14px;[^"]*">(?:(?!</a>).)*?</svg>Swap</a>'
patch(tpl('04-V7Lender.html'), chain(
    vault_cards,
    rep(HERO_SUPPLIED, ''),
    rep(HERO_GRID3, HERO_GRID3.replace('repeat(3,', 'repeat(2,')),
    sub(SPOT_SWAP, ''),
))

OPEN_NEW = r'<a href="V7Perps\.dc\.html" style="height: 52px; border-radius: 16px; border: 1px dashed[^"]*">(?:(?!</a>).)*?Open a new position</a>\r?\n'
for f in ('10-V7PerpsPositions.html', '11-V7PerpsHistory.html'):
    patch(tpl(f), sub(OPEN_NEW, ''))

MARKETS_ROW = r'<a href="V7PerpsPositions\.dc\.html" style="margin-top: 16px; padding-top: 14px;[^"]*">.*?</a>\r?\n'
patch(tpl('07-V7Perps.html'), sub(MARKETS_ROW, '', re.S))

# ---------------------------------------------------------------- 3. vault screen
ROW_START = '<div style="min-height: 52px; padding: 8px 0; display: flex; align-items: center; justify-content: space-between; gap: 12px; font-size: 14px;'
ROW_VAL = '<span style="display: flex; flex-direction: column; align-items: flex-end; text-align: right">'


def row_rx(label):
    return (re.escape(ROW_START) + r'[^"]*"><span style="color: \{\{ t\.text2 \}\}">' + re.escape(label) + '</span>'
            + re.escape(ROW_VAL) + r'(?:<span[^>]*>[^<]*</span>)+</span></div>')


def row(label, value):
    return (ROW_START + ' border-top: 1px solid {{ t.line }};"><span style="color: {{ t.text2 }}">' + label + '</span>'
            + ROW_VAL + '<span style="font-weight: 600; color: {{ t.text }}">' + value + '</span></span></div>')


DET_BAR = (r'<div style="padding: 14px 0"><div style="display: flex; justify-content: space-between; font-size: 12px; color: \{\{ t\.text2 \}\}">'
           r'<span>Supplied · \$55\.0K</span>.*?background: #703AE6"></div></div></div>')
FIRST_BORROW = ROW_START + ' border-top: 1px solid {{ t.line }};"><span style="color: {{ t.text2 }}">Borrow APY</span>'
SUPPLY_CAP_END = ('<span style="color: {{ t.text2 }}">Supply cap</span>' + ROW_VAL
                  + '<span style="font-weight: 600; color: {{ t.text }}">1,000,000 USDC</span></span></div>')
MANAGER_ROWS = row('Vault manager', 'Vanna Labs') + row('Risk curator', 'Vanna risk council')
POS_HEAD_OLD = ('<span style="font-size: 16px; line-height: 22px; font-weight: 600">USDC vault</span>'
                + T2 + '2,499.81 vUSDC shares</span></span>'
                '<span style="display: flex; flex-direction: column; align-items: flex-end"><span style="font-size: 16px; font-weight: 600">$2,499.75</span>'
                '<span style="font-size: 12px; color: {{ t.pos }}">+$0.81 earned</span></span>')
POS_HEAD_NEW = ('<span style="font-size: 16px; line-height: 22px; font-weight: 600">$2,499.75</span>'
                + T2 + '2,499.81 vUSDC shares</span></span>')
COL_CHIPS = r'<span style="display: flex; gap: 6px; font-size: 12px; font-weight: 600"><span[^>]*>Collateral</span><span[^>]*>Borrow</span></span>'
COL_NOTE_OLD = '<div style="height: 36px; display: flex; align-items: center; font-size: 12px; color: {{ t.text2 }}">Every asset below is uncapped per margin account</div>'
COL_NOTE_NEW = ('<div style="min-height: 36px; padding: 8px 0; display: flex; align-items: center; font-size: 12px; line-height: 16px; color: {{ t.text2 }}">'
                'Every asset below works as collateral and can be borrowed, uncapped per margin account</div>')
MAN_BLOCK = r'<sc-if value="\{\{ isMan \}\}" hint-placeholder-val="\{\{ false \}\}">\r?\n[^\n]*\r?\n</sc-if>'


def add_managers(s):
    if 'Vault manager' in s and not re.search(MAN_BLOCK, s):
        return s  # already folded into Details
    s = re.sub(MAN_BLOCK, lambda m: '', s)
    if s.count(SUPPLY_CAP_END) != 1:
        raise SystemExit('dedupe_audit: Details "Supply cap" row not found once in 16-V7EarnVault.html')
    return s.replace(SUPPLY_CAP_END, SUPPLY_CAP_END + MANAGER_ROWS)


patch(tpl('16-V7EarnVault.html'), chain(
    # Details: the hero already shows total supply, available, utilization and supply APY
    sub(DET_BAR, '', re.S),
    sub(row_rx('Available liquidity'), ''),
    sub(row_rx('Supply APY'), ''),
    sub(row_rx('Utilization rate'), ''),
    rep(FIRST_BORROW, FIRST_BORROW.replace(' border-top: 1px solid {{ t.line }};', ' ')),
    add_managers,
    # Positions tab card: no title (screen title), one "earned", no supply APY row
    rep(POS_HEAD_OLD, POS_HEAD_NEW),
    sub(row_rx('Current supply APY'), ''),
    # Activity: status only when it is not the normal "Confirmed"
    rep(' · Confirmed', ''),
    # Collateral: the same two chips on every row say one thing, now said once
    sub(COL_CHIPS, ''),
    rep(COL_NOTE_OLD, COL_NOTE_NEW),
    # without the chips the bonus column no longer needs a fixed 52px (it wrapped "5% bonus")
    rep('<span style="width: 52px; text-align: right; font-size: 12px; color: {{ t.text2 }}">',
        '<span style="text-align: right; font-size: 12px; color: {{ t.text2 }}; white-space: nowrap">'),
))

TL_OLD = "var TL = ['Positions','Details','Activity','Collateral','Analytics','Managers']"
TL_NEW = "var TL = ['Positions','Details','Activity','Collateral','Analytics']"
# the first tab slides left so Analytics (last tab) is in view; 5 tabs need less shift than 6
ML_OLD = "ml: i === 0 && ti >= 4 ? -196 : 0"
ML_NEW = "ml: i === 0 && ti >= 4 ? -48 : 0"
for f in sorted(os.listdir(CLS)):
    if f.startswith(('36-', '37-', '38-', '39-', '40-', '41-')) and 'V7EarnVault' in f:
        patch(os.path.join(CLS, f), chain(rep(TL_OLD, TL_NEW), rep(ML_OLD, ML_NEW)))
# the old Managers screen now opens on Details, where its rows live
patch(os.path.join(CLS, '41-V7EarnVaultManagers.js'), rep("this.state = { tab: 'Managers' };", "this.state = { tab: 'Details' };"))

# ---------------------------------------------------------------- 4. error states: red amount + button say it
ERR_ORDER = "err: over ? 'Only $4,320.37 is available in your margin account. Lower the amount.' : false"
ERR_EARN = ("err: over ? (isS ? 'You have 3,120.40 USDC in your wallet. Lower the amount.' : "
            "'You have 2,500.00 USDC supplied. Lower the amount.') : false")
for f in sorted(os.listdir(CLS)):
    patch(os.path.join(CLS, f), chain(rep(ERR_ORDER, 'err: false'), rep(ERR_EARN, 'err: false')))

# ---------------------------------------------------------------- 5. order form
patch(tpl('09-V7PerpsOrder.html'), chain(
    rep('<span>Leverage</span><span style="font-weight: 600; color: {{ t.text }}">{{ levLabel }}</span>', '<span>Leverage</span>'),
    rep('TSLAx-USDC</span><span style="font-size: 14px; font-weight: 600">$353.59</span>', 'TSLAx-USDC</span>'),
))

# ---------------------------------------------------------------- 6. margin account gate
BAND_LABEL = (r'<div style="display: flex; align-items: center; justify-content: space-between; gap: 8px">'
              r'<span style="font-size: 14px; line-height: 20px; color: rgba\(255,255,255,0\.78\)">One-time setup</span></div>\r?\n')
AGREE_P = (r'(<h2 style="margin: 16px 0 )0( 0; font-size: 20px; line-height: 28px; font-weight: 600">Review and sign agreement</h2>)\r?\n'
           r'<p [^>]*>Please review the terms of borrowing on Vanna before you continue\.</p>')
patch(tpl('12-V7MarginCreate.html'), chain(
    sub(BAND_LABEL, ''),
    rep('<span style="font-size: 28px; line-height: 36px">Margin account needed</span>', '<span style="font-size: 28px; line-height: 36px">One-time setup</span>'),
    rep('Use one account for Perps and Farm, up to 5x.', 'Up to 5x leverage.'),
    lambda s: re.sub(AGREE_P, lambda m: m.group(1) + '12px' + m.group(2), s),
))

# ---------------------------------------------------------------- 8. profile
patch(tpl('06-V7Profile.html'), chain(
    rep('<span style="font-size: 12px; color: {{ t.text2 }}">Liquidation at 1.10</span>', ''),
    rep('debt $6,271.92. If it reaches 1.10, the risk engine liquidates.</p>', 'debt $6,271.92.</p>'),
    sub(r'<div style="height: 56px; display: flex; align-items: center; justify-content: space-between; border-top: 1px solid \{\{ t\.line \}\}; font-size: 14px">'
        r'<span style="color: \{\{ t\.text2 \}\}">Margin account balance</span>[^\n]*?</div>\r?\n', ''),
))

# ---------------------------------------------------------------- 9. earn list
patch(tpl('15-V7Earn.html'), chain(
    rep('{{ v.apy }}</span><span style="font-size: 12px; line-height: 16px; color: {{ t.text2 }}">APY</span>', '{{ v.apy }}</span>'),
    sub(r'<span style="font-size: 12px; color: \{\{ t\.text2 \}\}">Sorted by supply APY</span>\r?\n', ''),
))

# ---------------------------------------------------------------- 11. portfolio hero
NET_AVAIL = ('<span style="font-size: 12px; line-height: 16px; color: rgba(255,255,255,0.72)">Net available</span>'
             '<span style="font-size: 16px; line-height: 22px; font-weight: 600; color: #FFFFFF">$4,320.37</span>')
HEALTH = ('<span style="font-size: 12px; line-height: 16px; color: rgba(255,255,255,0.72)">Health</span>'
          '<span style="font-size: 16px; line-height: 22px; font-weight: 600; color: #FFFFFF; display: flex; align-items: center; gap: 6px; white-space: nowrap">'
          '<span aria-hidden="true" style="width: 8px; height: 8px; border-radius: 999px; background: #32EEE2; flex-shrink: 0"></span>1.69 · Safe</span>')
patch(tpl('02-V7Home.html'), rep(NET_AVAIL, HEALTH))

# ---------------------------------------------------------------- change log (once)
import json
CHANGES = os.path.join(SRC, 'changes.json')
TITLE = 'Each fact once: duplicate cleanup'
with open(CHANGES, encoding='utf8') as f:
    log = json.load(f)
if not any(c.get('title') == TITLE for c in log):
    log.append({
        'title': TITLE,
        'date': '1 Oct 2026',
        'detail': ("Numbers and labels that a screen already showed somewhere else are now shown once. "
                   "History cards keep only Win rate, because the hero already has the closed PnL and the tab already counts the trades. "
                   "Vault cards say just 'Active' (the APY is in the Supply APY stat) and no longer repeat the token amount under the dollar value; "
                   "Portfolio > Lender drops 'Supplied 2 assets', which equals 'Current 2'. "
                   "On a vault, the hero keeps supply APY, total supply, available and utilization, so Details, the Positions card and the Collateral rows stop repeating them; "
                   "the same 'Collateral / Borrow' chips on every asset become one line, and the Managers tab's vault manager and risk curator now sit in Details (the tab is gone). "
                   "Error states (not enough margin, not enough USDC, more than you supplied) let the red amount and the disabled button say it, without a third sentence. "
                   "The order form drops '3x · $1,500.00 position' and the market price that Entry price already shows. "
                   "The margin account gate says 'needed' once (in the card), the benefit reads 'Up to 5x leverage.', and the agreement sheet loses 'Please review the terms'. "
                   "Shortcuts that repeat a tab are gone: Open a new position, Supply to another vault, Lender Spot Swap and the Markets hero '2 open positions'. "
                   "Profile writes 1.10 only in the gauge legend and drops the Margin account balance row (the health formula shows it). "
                   "The Earn list drops the per-row 'APY' and 'Sorted by supply APY'; vault activity rows drop 'Confirmed'. "
                   "Portfolio's hero shows Health '1.69 · Safe' instead of Net available, which was just margin account minus total borrowed."),
        'screens': ['V7PerpsHistory', 'V7TraderHistory', 'V7EarnPositions', 'V7Lender', 'V7EarnVault', 'V7EarnVaultDetails',
                    'V7EarnVaultActivity', 'V7EarnVaultCollateral', 'V7EarnVaultManagers', 'V7PerpsOrderNoFunds', 'V7EarnSupplyNoFunds',
                    'V7EarnWithdrawOver', 'V7PerpsOrder', 'V7MarginCreate', 'V7MarginAgree', 'V7PerpsPositions', 'V7Perps',
                    'V7Profile', 'V7Earn', 'V7Home'],
    })
    with open(CHANGES, 'w', encoding='utf8') as f:
        json.dump(log, f, ensure_ascii=False, indent=1)
    print('patched changes.json')
