"""Trade history, Swap wording and doubled tabs (1 Oct 2026, user feedback + compare/AUDIT-DUPLICATES.md).

    python compare/tools/history_swap.py      (safe to re-run; run spaces.py first)

1. Swap history was unreachable: when Swap joined Trade's bottom bar, History only opened perps history. Now
   Trade > History has filter chips "Perps | Swaps"; the swap history screen highlights History, not Swap.
2. Swap: "You pay · Wallet" / "You receive · Wallet" lose the repeated "· Wallet"; with too little balance the
   red amount + the "Not enough USDC" button say it, without a second sentence. (The 1.0% setting stays.)
3. Earn and Trade: the inner "Current | History" tabs repeated the bottom bar's "Positions | History"; hidden there.
   Portfolio keeps them (its bar is Overview / Lender / Trader, as on the web app).
"""
import os, re

SRC = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'src')
CHIP = ('height: 32px; padding: 0 14px; border-radius: 8px; font-size: 14px; font-weight: 600; display: inline-flex; align-items: center; gap: 6px; text-decoration: none; ')
CHECK = ('<svg width="16" height="16" viewBox="0 -960 960 960" fill="currentColor" aria-hidden="true"><path d="m382-354 339-339q12-12 28-12t28 12q12 12 12 28.5T777-636L410-268q-12 12-28 12t-28-12L182-440q-12-12-11.5-28.5T183-497q12-12 28.5-12t28.5 12l142 143Z"></path></svg>')


def chips(active):
    out = []
    for label, stem in (('Perps', 'V7PerpsHistory'), ('Swaps', 'V7SwapHistory')):
        on = label == active
        style = CHIP + ('background: {{ t.tv }}; color: {{ t.tvI }}; border: 1px solid transparent' if on else 'background: transparent; color: {{ t.text }}; border: 1px solid {{ t.bd }}')
        out.append('<a href="%s.dc.html"%s style="%s">%s%s</a>' % (stem, ' aria-current="page"' if on else '', style, CHECK if on else '', label))
    return '<div class="vn-histchips" role="navigation" aria-label="History" style="display: flex; gap: 8px">' + ''.join(out) + '</div>'


def patch(rel, fn):
    p = os.path.join(SRC, rel)
    s = open(p, encoding='utf8').read()
    n = fn(s)
    if n != s:
        open(p, 'w', encoding='utf8').write(n)
        print('patched', rel)


BODY = '<div style="padding: 16px 16px 0 16px; display: flex; flex-direction: column; gap: 12px">'


def add_chips(active):
    def fn(s):
        if 'vn-histchips' in s:
            return s
        i = s.index(BODY, s.index('</section>')) + len(BODY)
        return s[:i] + '\n' + chips(active) + s[i:]
    return fn


patch(os.path.join('tpl', '11-V7PerpsHistory.html'), add_chips('Perps'))
patch(os.path.join('tpl', '14-V7SwapHistory.html'), add_chips('Swaps'))

# 2. Swap wording
patch(os.path.join('tpl', '13-V7Swap.html'), lambda s: s.replace('You pay · Wallet', 'You pay').replace('You receive · Wallet', 'You receive'))
for f in sorted(os.listdir(os.path.join(SRC, 'cls'))):
    if 'V7Swap' in f:
        patch(os.path.join('cls', f), lambda s: s.replace("err: over ? 'Not enough ' + A.sym + ' in your wallet.' : false", 'err: false'))

# after a swap, the success card opens the Swaps history directly (run after tx_motion.py)
SWAP_DONE = '<div class="vn-tx-acts"><button type="button" onClick="{{ closeTx }}" class="vn-tx-btn vn-tx-tonal">Done</button></div></sc-if>'
patch(os.path.join('tpl', '13-V7Swap.html'), lambda s: s.replace(SWAP_DONE,
      '<div class="vn-tx-acts"><a href="V7SwapHistory.dc.html" class="vn-tx-btn vn-tx-tonal">View in swap history</a>'
      '<button type="button" onClick="{{ closeTx }}" class="vn-tx-btn vn-tx-text">Done</button></div></sc-if>', 1))

# 3. inner tabs that repeat the bottom bar (Trade and Earn only)
TAB = '<div role="tablist" style="height: 48px; display: flex; border-bottom: 1px solid {{ t.bd }}">'
for f in ('10-V7PerpsPositions.html', '11-V7PerpsHistory.html', '18-V7EarnPositions.html', '19-V7EarnHistory.html'):
    patch(os.path.join('tpl', f), lambda s: s.replace(TAB, TAB.replace('display: flex;', 'display: none;'), 1))
