"""Portfolio: "Explore vanna" tiles -> "Your assets" (idea 3 in compare/previews/ideas.html, chosen 1 Oct 2026).

    python compare/tools/home_assets.py      (safe to re-run)

The four tiles repeated the top tabs. "Your assets" lists what is in the wallet, using only data the app already
has (balances and prices). The rows add up to the header's wallet balance ($4,812.40), so they break it down rather
than repeat it: USDC 3,120.40 (Swap's balance), TSLAx 1.25 (Swap / Farm), ANTHROPIC 0.96 (Farm's token list), SOL 2.10.
"""
import os, re

SRC = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'src')
ASSETS = [  # icon, symbol, amount, price, value, 24h change, tone
    ('022fc945e265208f7997f02a7fbdd97f', 'USDC', None, 'Stablecoin', '$3,120.40', '0.0% today', 'text2'),   # amount = value, so not shown twice
    ('c0af4af206fcfbcf3cce92e51a5837cf', 'ANTHROPIC', '0.96', '$1,042.77', '$1,001.06', '+2.4% today', 'pos'),
    ('a9a1db51309a512ccf9302f8acc244d2', 'TSLAx', '1.25', '$353.59', '$441.99', '+1.2% today', 'pos'),
    ('6fe33337309fb2af41d7bb3a0961ebff', 'SOL', '2.10', '$118.58', '$248.95', '−0.8% today', 'neg'),
]


def assets():
    rows = []
    for i, (img, sym, amt, px, val, chg, tone) in enumerate(ASSETS):
        rows.append(
            '<div style="min-height: 64px; display: flex; align-items: center; gap: 12px;%s">' % ('' if i == 0 else ' border-top: 1px solid {{ t.line }};') +
            '<img src="@IMG:%s@" alt="" style="width: 36px; height: 36px; border-radius: 999px; flex-shrink: 0">' % img +
            '<span style="flex-grow: 1; min-width: 0; display: flex; flex-direction: column"><span style="font-size: 16px; line-height: 22px; font-weight: 600">%s</span>'
            '<span style="font-size: 12px; line-height: 16px; color: {{ t.text2 }}">%s</span></span>' % (sym, px if amt is None else amt + ' · ' + px) +
            '<span style="display: flex; flex-direction: column; align-items: flex-end"><span style="font-size: 16px; line-height: 22px; font-weight: 600">%s</span>'
            '<span style="font-size: 12px; line-height: 16px; color: {{ t.%s }}">%s</span></span></div>' % (val, tone, chg))
    return ('<h2 class="vn-assets" style="margin: 4px 0 0 0; font-size: 20px; line-height: 28px; font-weight: 600">Your assets</h2>\n'
            '<div role="list" aria-label="Assets in your wallet" style="border-radius: 16px; background: {{ t.card }}; box-shadow: {{ t.shadow }}; padding: 4px 16px">'
            + ''.join(rows) + '</div>\n')


POS_HEAD = ('<div style="margin-top: 8px; display: flex; align-items: baseline; justify-content: space-between"><h2 style="margin: 0; font-size: 20px; line-height: 28px; font-weight: 600">Your positions</h2>')


def positions_first(h):
    """Positions carry risk (value and health move with the market), so they come before idle assets.
    (In the app: when there are no open positions, assets come first so the screen never opens on an empty section.)"""
    a = h.find('<h2 class="vn-assets"')
    p = h.find(POS_HEAD)
    if a < 0 or p < 0:
        return h
    if p < a:   # already ordered; keep the spacing right when the assets block is regenerated
        return h.replace('<h2 class="vn-assets" style="margin: 4px 0 0 0;', '<h2 class="vn-assets" style="margin: 8px 0 0 0;', 1)
    card = h.index('<div', p + len(POS_HEAD))
    depth, i = 0, card
    for m in __import__('re').finditer(r'<div\b|</div>', h[card:]):
        depth += 1 if m.group(0) == '<div' else -1
        if depth == 0:
            i = card + m.end()
            break
    block = h[p:i]
    h = h[:p] + h[i:]
    block = block.replace('<div style="margin-top: 8px; display: flex; align-items: baseline', '<div style="margin-top: 4px; display: flex; align-items: baseline', 1)
    h = h.replace('<h2 class="vn-assets" style="margin: 4px 0 0 0;', '<h2 class="vn-assets" style="margin: 8px 0 0 0;', 1)
    return h.replace('<h2 class="vn-assets"', block + '\n<h2 class="vn-assets"', 1)


def main():
    p = os.path.join(SRC, 'tpl', '02-V7Home.html')
    h = open(p, encoding='utf8').read()
    if 'class="vn-assets"' in h:
        h2 = re.sub(r'<h2 class="vn-assets".*?</div>\n', lambda m: assets(), h, count=1, flags=re.S)
    else:
        h2 = re.sub(r'<h2 style="margin: 4px 0 0 0; font-size: 20px; line-height: 28px; font-weight: 600; display: flex; align-items: center; gap: 7px">Explore .*?'
                    r'<div class="vn-tiles".*?</a>\n</div>\n', lambda m: assets(), h, count=1, flags=re.S)
    h2 = positions_first(h2)
    if h2 != h:
        open(p, 'w', encoding='utf8').write(h2)
        print('patched 02-V7Home.html')
    else:
        print('unchanged 02-V7Home.html')


if __name__ == '__main__':
    main()
