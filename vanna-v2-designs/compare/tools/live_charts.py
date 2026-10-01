"""Live charts in New (style B, value axis, like the web app; chosen 1 Oct 2026).

    python compare/tools/live_charts.py      (safe to re-run)

- Earn hero: the pre-drawn SVG becomes <div class="vn-live" data-kind="earn">, drawn by charts.js via runtime.js.
  The value above it follows the finger, with a date line under it.
- Vault > Analytics: the static interest rate curve (fixed numbers, stretched on tablets) becomes a live
  "Supply APY history" (7D / 30D / 90D) and a live rate curve computed from Vanna's kink model.
"""
import os, re

SRC = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'src')
THEME = ('data-ink="{{ t.text }}" data-ink2="{{ t.text2 }}" data-grid="{{ t.line }}" data-card="{{ t.card }}" data-pos="{{ t.pos }}" '
         'data-link="{{ t.link }}" data-tv="{{ t.tv }}" data-tvi="{{ t.tvI }}"')
U_USDC = '0.052'   # the USDC vault's utilisation in the prototype: borrow 0.65%, supply 0.03% under the kink model


def patch(rel, fn):
    p = os.path.join(SRC, rel)
    s = open(p, encoding='utf8').read()
    new = fn(s)
    if new != s:
        open(p, 'w', encoding='utf8').write(new)
        print('patched', rel)
    else:
        print('unchanged', rel)


def earn_tpl(s):
    s = re.sub(r'<svg class="vn-chart"[^>]*aria-label="\{\{ chartLabel \}\}".*?</svg>',
               lambda m: '<div class="vn-live" data-kind="earn" data-mode="{{ cmKey }}" data-range="{{ rgKey }}" role="img" aria-label="{{ chartLabel }}" style="margin-top: 12px; min-height: 150px"></div>',
               s, count=1, flags=re.S)
    s = s.replace('<div style="margin-top: 14px; font-size: 40px; line-height: 48px; font-weight: 600; letter-spacing: -0.02em; color: {{ valC }}">{{ chartVal }}</div>',
                  '<div class="vn-live-val" style="margin-top: 14px; font-size: 40px; line-height: 48px; font-weight: 600; letter-spacing: -0.02em; color: {{ valC }}">{{ chartVal }}</div>'
                  '<div class="vn-live-when" style="font-size: 14px; line-height: 20px; color: rgba(255,255,255,0.78)">Today, 1 Oct</div>', 1)
    return s


def earn_cls(s):
    if 'cmKey:' in s:
        return s
    return s.replace("return { t: t, modes: modes, ranges: ranges, chartLine: cp[0],", "return { t: t, modes: modes, ranges: ranges, cmKey: cm, rgKey: rg, chartLine: cp[0],", 1)


def card(inner):
    return '<div style="border-radius: 16px; background: {{ t.card }}; box-shadow: {{ t.shadow }}; padding: 16px">' + inner + '</div>'


def vault_tpl(s):
    # the Supply / Borrow APY tiles repeat the vault header and the rate curve's numbers: removed (no duplicates)
    s = re.sub(r'(<sc-if value="\{\{ isAna \}\}"[^>]*>)\s*<div style="margin-top: 12px; display: grid; grid-template-columns: repeat\(2, minmax\(0, 1fr\)\); gap: 10px">'
               r'.*?Supply APY</div>.*?Borrow APY</div>.*?</div></div></div>\s*</div>', lambda m: m.group(1) + '\n', s, count=1, flags=re.S)
    s = s.replace('<h3 style="margin: 20px 0 8px 0; font-size: 14px; font-weight: 600">Supply APY history</h3>',
                  '<h3 style="margin: 16px 0 8px 0; font-size: 14px; font-weight: 600">Supply APY history</h3>', 1)
    if 'data-kind="rate"' in s:
        return s
    start = s.index('<h3 style="margin: 20px 0 6px 0; font-size: 14px; font-weight: 600">Interest rate curve</h3>')
    end_marker = "Rate history shows here once it is indexed on-chain. Today's rates are live.</p>"
    end = s.index(end_marker, start) + len(end_marker)
    live = ('<h3 style="margin: 20px 0 8px 0; font-size: 14px; font-weight: 600">Supply APY history</h3>'
            + card('<div class="vn-live" data-kind="apy" data-u="' + U_USDC + '" ' + THEME + '></div>') +
            '<h3 style="margin: 20px 0 8px 0; font-size: 14px; font-weight: 600">Interest rate curve</h3>'
            + card('<div class="vn-live" data-kind="rate" data-u="' + U_USDC + '" ' + THEME + '></div>'))
    return s[:start] + live + s[end:]


patch(os.path.join('tpl', '15-V7Earn.html'), earn_tpl)
patch(os.path.join('cls', '35-V7Earn.js'), earn_cls)
patch(os.path.join('tpl', '16-V7EarnVault.html'), vault_tpl)
