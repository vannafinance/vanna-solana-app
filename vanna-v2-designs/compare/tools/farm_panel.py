"""Farm as one panel, keeping the current slider (idea 2 in compare/previews/ideas.html, chosen 1 Oct 2026).

    python compare/tools/farm_panel.py      (safe to re-run)

No numbered steps and nothing shown twice:
- Header = the result: net APY, money a year, health (dot + label), liquidation price. Only place these appear.
- Pool card keeps Kamino's rate (the only place it appears); the "KAMINO" pill repeated "Kamino Main Market".
- Deposit card loses its "1 Deposit collateral" title; the leverage card loses "2 Set leverage" and the
  "Leverage 2.0x" row (the slider shows it). The borrow amount and rate appear once, under the slider.
- The 7-row table, the profit box and the health / leverage tiles are gone (they repeated each other and the header);
  pool size and utilisation move into the collapsed "Pool details and how it works".
- The button still opens the wallet directly: a review sheet would only repeat what the panel shows.
Health and liquidation are computed by the backend in the real app; here: health = L / (L - 1), liquidation when
the stock falls to 10% x (L - 1) of today's price (health 1.10).
"""
import os, re

SRC = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'src')
FARM_CLS = ['48-V7Farm.js', '49-V7FarmPools.js', '50-V7FarmTokens.js', '51-V7FarmLev4.js', '52-V7FarmSign.js', '53-V7FarmDone.js',
            '80-V7FarmNoFunds.js', '81-V7FarmFailed.js', '82-V7FarmRejected.js']
W78 = 'rgba(255,255,255,0.78)'

PANEL = ('<div style="font-size: 14px; line-height: 20px; color: ' + W78 + '">You earn</div>\n'
         '<div style="margin-top: 2px; display: flex; align-items: baseline; gap: 6px"><span style="font-size: 40px; line-height: 48px; font-weight: 600; letter-spacing: -0.02em; color: #FFFFFF">{{ apyTxt }}</span>'
         '<span style="font-size: 18px; line-height: 24px; font-weight: 600; color: ' + W78 + '">APY</span></div>\n'
         '<div style="font-size: 14px; line-height: 20px; color: rgba(255,255,255,0.85)">{{ yrTxt }}</div>\n'
         '<div style="margin-top: 16px; padding-top: 14px; border-top: 1px solid rgba(255,255,255,0.16); display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px">'
         '<div style="display: flex; flex-direction: column; gap: 2px"><span style="font-size: 12px; line-height: 16px; color: rgba(255,255,255,0.72)">Health</span>'
         '<span style="font-size: 16px; line-height: 22px; font-weight: 600; display: flex; align-items: center; gap: 6px"><span style="width: 8px; height: 8px; border-radius: 999px; background: {{ heroHfC }}"></span>{{ hfShow }}</span></div>'
         '<div style="display: flex; flex-direction: column; gap: 2px; padding-left: 12px; border-left: 1px solid rgba(255,255,255,0.18)"><span style="font-size: 12px; line-height: 16px; color: rgba(255,255,255,0.72)">Liquidation</span>'
         '<span style="font-size: 16px; line-height: 22px; font-weight: 600">{{ liqTxt }}</span></div></div>\n')

LABEL = 'font-size: 12px; font-weight: 600; letter-spacing: 0.04em; color: {{ t.text2 }}'
DETAILS_BODY = ('<div style="margin: 0 0 14px 0">'
                '<div style="min-height: 40px; display: flex; align-items: center; justify-content: space-between; font-size: 14px"><span style="color: {{ t.text2 }}">{{ pool.sym }} supplied on Kamino</span><span style="font-weight: 600">{{ poolTotal }}</span></div>'
                '<div style="min-height: 40px; display: flex; align-items: center; justify-content: space-between; font-size: 14px; border-top: 1px solid {{ t.line }}"><span style="color: {{ t.text2 }}">Pool usage</span><span style="font-weight: 600">{{ poolUtil }}</span></div>'
                '<p style="margin: 8px 0 0 0; font-size: 12px; line-height: 18px; color: {{ t.text2 }}">Your {{ tok.sym }} stays as collateral. Vanna lends you {{ pool.sym }}, which goes into Kamino and earns its rate while you pay the borrow rate. '
                'If the health factor falls to 1.10 the position is liquidated. Rates change, so the APY above can move.</p></div>')


def deposit_spacing(h):   # spacing as card padding (an inner top margin collapses out of the card)
    return h.replace('padding: 0 16px"><div style="margin: 14px 0; padding: 12px 14px;', 'padding: 14px 16px"><div style="padding: 12px 14px;', 1)


def template(h):
    if '{{ apyTxt }}' in h:
        return deposit_spacing(h.replace('{{ hfTxt }} · {{ hfLabel }}', '{{ hfShow }}'))
    # header = the result
    h = re.sub(r'(<div class="vn-panel" style="[^"]*">\n?).*?(</div>\n?</section>)', lambda m: m.group(1) + PANEL + m.group(2), h, count=1, flags=re.S)
    # pool card: drop the KAMINO pill (repeats "Kamino Main Market")
    h = re.sub(r'<span style="height: 22px; padding: 0 8px; border-radius: 11px; background: \{\{ t\.page \}\};[^"]*">KAMINO</span>', '', h, count=1)
    # deposit card: drop the "1 Deposit collateral" title
    h = re.sub(r'<div style="padding: 14px 0 0 0"><div style="display: flex; align-items: center; gap: 12px"><span[^>]*>1</span>.*?</span></span></div></div>\s*'
               r'<div style="margin: 12px 0 14px 0;', '<div style="margin: 14px 0;', h, count=1, flags=re.S)
    # leverage card: a plain label instead of "2 Set leverage" + the "Leverage 2.0x" row
    h = re.sub(r'<div style="padding: 14px 0 0 0"><div style="display: flex; align-items: center; gap: 12px"><span[^>]*>2</span>.*?'
               r'(<div style="position: relative; height: 64px; margin: 6px 14px 4px 14px">)',
               lambda m: '<div style="height: 44px; display: flex; align-items: center"><span style="' + LABEL + '">LEVERAGE</span></div>\n' + m.group(1), h, count=1, flags=re.S)
    # under the slider: the borrow line once; the table, profit box and tiles go
    h = re.sub(r'<sc-for list="\{\{ sum \}\}".*?(<details)',
               lambda m: '<div style="margin: 0 0 14px 0; font-size: 12px; line-height: 16px; color: {{ t.text2 }}">{{ levSub }}</div>\n' + m.group(1), h, count=1, flags=re.S)
    h = h.replace('>How this works<', '>Pool details and how it works<', 1)
    h = re.sub(r'<ol style="margin: 0 0 14px 0;[^"]*">.*?</ol>', lambda m: DETAILS_BODY, h, count=1, flags=re.S)
    return h


# with no amount there is no position yet: show the rate only, no money, health or liquidation
ADD = ("apyTxt: lev > 1 ? ((lev - 1) * (pool.k - pool.b) * 100).toFixed(2) + '%' : '0.00%', "
       "yrTxt: !(amt > 0) ? 'Enter an amount to see it in dollars' : (lev > 1 ? '≈ ' + money(net) + ' a year, paid in ' + ps : 'Pick 2x or more to start earning'), "
       "heroHfC: !(amt > 0) ? 'rgba(255,255,255,0.5)' : (lev <= 1 || hf >= 1.5 ? '#32EEE2' : (hf > 1.1 ? '#FF8AC2' : '#FFB4B5')), "
       "hfShow: amt > 0 && lev > 1 ? hf.toFixed(2) + ' · ' + (hf >= 1.5 ? 'Safe' : (hf > 1.1 ? 'Moderate' : 'At risk')) : (amt > 0 ? 'No debt' : '—'), "
       "liqTxt: !(amt > 0) ? '—' : (lev > 1 ? ts + ' below ' + money(tok.px * 0.1 * (lev - 1)) : 'None at 1x'), "
       "levSub: lev > 1 ? 'Borrows ' + borrowAmt + ' from Vanna at ' + (pool.b * 100).toFixed(2) + '%' : 'At 1x nothing is borrowed, so nothing is farmed.', "
       "poolTotal: pool.total, poolUtil: pool.util,\n")


def logic(s):
    s = re.sub(r"apyTxt: .*?poolUtil: pool\.util,\n", "", s, count=1, flags=re.S)   # re-runs replace the block
    anchor = "borrowSub: 'Borrow ' + ps + ' from Vanna, backed by your ' + ts,"
    assert anchor in s
    return s.replace(anchor, ADD + anchor, 1)


def patch(path, fn):
    s = open(path, encoding='utf8').read()
    new = fn(s)
    if new != s:
        open(path, 'w', encoding='utf8').write(new)
        print('patched', os.path.basename(path))
    else:
        print('unchanged', os.path.basename(path))


patch(os.path.join(SRC, 'tpl', '20-V7Farm.html'), template)
for f in FARM_CLS:
    patch(os.path.join(SRC, 'cls', f), logic)
