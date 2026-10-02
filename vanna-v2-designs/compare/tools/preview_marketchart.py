"""Preview (not implemented): native-looking market charts for xStocks and PreStocks, drawn with TradingView
Lightweight Charts (Apache-2.0) in Vanna's font and colours instead of the TradingView / DexScreener embeds.
Research 2 Oct 2026: both embeds keep their own font, logo and footer; Binance-style apps draw their own chart and
keep TradingView as a separate "Pro" view. Candles: GeckoTerminal pool OHLCV (via Vanna's backend) for both types.

    python compare/tools/preview_marketchart.py   -> compare/previews/marketchart.html (+ renders/marketchart-*.png)
"""
import base64, json, os

HERE = os.path.dirname(os.path.abspath(__file__))
CMP = os.path.dirname(HERE)

PAGE = r'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Vanna market charts</title>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
<script src="https://unpkg.com/lightweight-charts@4.2.1/dist/lightweight-charts.standalone.production.js"></script>
<style>
:root { --bg:#EDEBF3; }
* { box-sizing:border-box; }
body { margin:0; background:var(--bg); font-family:'Plus Jakarta Sans',system-ui,sans-serif; font-variant-numeric:tabular-nums; color:#1F1F1F; }
.top { padding:22px 28px 0; max-width:1320px; } .top h1 { margin:0; font-size:24px; font-weight:600; } .top p { margin:6px 0 0; font-size:14px; line-height:20px; color:#595959; max-width:1150px; }
section { padding:6px 28px 26px; } section h2 { margin:18px 0 12px; font-size:18px; font-weight:600; }
.row { display:flex; gap:28px; flex-wrap:wrap; align-items:flex-start; }
figure { margin:0; width:392px; display:flex; flex-direction:column; gap:10px; } figcaption { font-size:13px; line-height:19px; color:#595959; } figcaption b { color:#1F1F1F; }
.ph { position:relative; width:392px; height:840px; border-radius:36px; overflow:hidden; color:#fff; background:#111111; box-shadow:0 0 0 9px #0B0B0D,0 30px 60px -20px rgba(47,27,97,.4); }
.ph.light { background:#F7F7F7; color:#1F1F1F; }
.sb { height:28px; display:flex; justify-content:space-between; align-items:center; padding:0 22px; font-size:12px; font-weight:600; }
.head { padding:8px 18px 0; } .back { display:flex; height:36px; align-items:center; }
.pair { display:flex; align-items:center; gap:10px; margin-top:4px; } .pair img { width:40px; height:40px; border-radius:50%; }
.pair b { font-size:18px; font-weight:600; display:block; } .pair span { font-size:12.5px; color:var(--t2); }
.price { margin-top:12px; font-size:34px; line-height:40px; font-weight:600; letter-spacing:-.02em; }
.chg { font-size:13.5px; font-weight:600; margin-top:2px; } .when { font-size:12.5px; color:var(--t2); font-weight:500; margin-left:6px; }
.ph { --t2:#A6A5B0; --line:#232229; --card:#1A1A1F; --chip:#232229; --chipOn:#2F2A4A; --chipOnFg:#D3C2F7; --pos:#32EEE2; --neg:#FC5457; --acc:#BDA4F4; }
.ph.light { --t2:#5F5F68; --line:#EFEDF4; --card:#FFFFFF; --chip:#F0EFF4; --chipOn:#ECE6FD; --chipOnFg:#5029A3; --pos:#1C7C83; --neg:#B33C3E; --acc:#703AE6; }
.chart { position:relative; height:250px; margin-top:6px; }
.chips { display:flex; gap:4px; padding:0 14px; margin-top:6px; align-items:center; }
.chips span { height:32px; padding:0 11px; border-radius:16px; display:flex; align-items:center; font-size:12.5px; font-weight:600; color:var(--t2); }
.chips span.on { background:var(--chipOn); color:var(--chipOnFg); }
.chips .sp { flex:1; } .chips .ico { width:34px; height:32px; padding:0; justify-content:center; background:var(--chip); }
.chips .pro { background:var(--chip); color:inherit; gap:5px; }
.ohlc { display:flex; gap:10px; padding:0 18px; font-size:11.5px; color:var(--t2); min-height:16px; } .ohlc b { color:inherit; font-weight:600; }
.src { padding:6px 18px 0; font-size:10.5px; color:var(--t2); display:flex; align-items:center; gap:6px; } .src i { width:6px; height:6px; border-radius:50%; background:var(--pos); display:inline-block; }
.card { margin:10px 14px 0; border-radius:20px; background:var(--card); padding:10px 0 10px; }
.seg { display:flex; padding:3px; border-radius:12px; background:var(--chip); } .seg span { height:28px; padding:0 8px; border-radius:9px; display:flex; align-items:center; font-size:12px; font-weight:600; color:var(--t2); } .seg span.on { background:var(--card); color:inherit; box-shadow:0 1px 3px rgba(0,0,0,.3); }
.pos { margin:12px 18px 0; padding:12px 0; border-top:1px solid var(--line); display:flex; justify-content:space-between; align-items:center; }
.pos b { font-size:15px; font-weight:600; } .pos span { display:block; font-size:12px; color:var(--t2); }
.legend { display:flex; gap:12px; padding:4px 18px 0; font-size:11.5px; color:var(--t2); } .legend i { display:inline-block; width:14px; border-top:1.5px dashed; vertical-align:middle; margin-right:5px; }
.mkt { margin:6px 18px 0; } .mkt div { display:flex; justify-content:space-between; padding:11px 0; border-top:1px solid var(--line); font-size:14px; } .mkt span { color:var(--t2); }
.cta { position:absolute; left:14px; right:14px; bottom:22px; display:flex; gap:10px; } .cta span { flex:1; height:54px; border-radius:27px; display:flex; align-items:center; justify-content:center; font-size:16px; font-weight:600; color:#fff; }
.long { background:linear-gradient(90deg,#6C63FF,#4B44E0); } .short { background:#B33C3E; }
</style></head><body>
<div class="top"><h1>Market charts that belong to the app</h1>
<p>Previews only, with the real Lightweight Charts library (drag on any chart: the price and time above it follow your finger). Same component for an xStock (TSLAx) and a PreStock (ANTHROPIC), so both look identical: Vanna's font and colours, our own range chips, no foreign toolbars, logos or footers. Candles here are sample data; in the app they come from GeckoTerminal's pool candles through Vanna's backend, which also covers PreStocks that TradingView doesn't have. The full TradingView / DexScreener chart stays one tap away behind "Pro".</p></div>
<section id="s1"><h2>xStock · TSLAx (dark)</h2><div class="row">__ROW1__</div></section>
<section id="s2"><h2>PreStock · ANTHROPIC (dark), and light mode</h2><div class="row">__ROW2__</div></section>
<script>
var IMG = __IMG__;
function rnd(seed) { return function () { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; }
function candles(kind) {
  var r = rnd(kind === 'tsla' ? 7 : 11), out = [], t, step, n, p;
  if (kind === 'tsla') { t = Date.UTC(2026, 6, 20) / 1000; step = 86400; n = 74; p = 296; }
  else { t = Date.UTC(2026, 9, 1, 14) / 1000; step = 900; n = 96; p = 1218; }
  for (var i = 0; i < n; i++) {
    var drift = kind === 'tsla' ? (i < 58 ? 1.25 : (i < 66 ? -2.2 : 1.4)) : Math.sin(i / 9) * 1.6 - (i > 70 ? 1.2 : 0);
    var o = p, c = o + drift + (r() - .5) * (kind === 'tsla' ? 9 : 14);
    var h = Math.max(o, c) + r() * (kind === 'tsla' ? 5 : 8), l = Math.min(o, c) - r() * (kind === 'tsla' ? 5 : 8);
    out.push({ time: t + i * step, open: +o.toFixed(2), high: +h.toFixed(2), low: +l.toFixed(2), close: +c.toFixed(2), value: Math.round(40 + r() * 120) });
    p = c;
  }
  var k = (kind === 'tsla' ? 372.40 : 1189.08) / out[out.length - 1].close;   // end on the real screen's price
  out.forEach(function (x) { ['open', 'high', 'low', 'close'].forEach(function (f) { x[f] = +(x[f] * k).toFixed(2); }); });
  return out;
}
function fmt(v) { return '$' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function mount(fig) {
  var d = fig.dataset, ph = fig.querySelector('.ph'), el = fig.querySelector('.chart'), light = ph.classList.contains('light');
  var css = getComputedStyle(ph), pos = css.getPropertyValue('--pos').trim(), neg = css.getPropertyValue('--neg').trim(), acc = css.getPropertyValue('--acc').trim(), t2 = css.getPropertyValue('--t2').trim();
  var data = candles(d.asset), last = data[data.length - 1], first = data[0];
  var chart = LightweightCharts.createChart(el, { width: el.clientWidth, height: el.clientHeight,
    layout: { background: { type: 'solid', color: 'transparent' }, textColor: t2, fontFamily: 'Plus Jakarta Sans', fontSize: 11, attributionLogo: false },
    grid: { vertLines: { visible: false }, horzLines: { color: d.grid === '1' ? (light ? 'rgba(17,17,17,.06)' : 'rgba(255,255,255,.05)') : 'transparent' } },
    rightPriceScale: { borderVisible: false, visible: d.axis === '1', scaleMargins: { top: .1, bottom: d.vol === '1' ? .22 : .08 } },
    timeScale: { borderVisible: false, visible: d.axis === '1', timeVisible: d.asset !== 'tsla', fixLeftEdge: true, fixRightEdge: true },
    crosshair: { mode: 1, vertLine: { color: acc, width: 1, style: 2, labelBackgroundColor: '#703AE6' }, horzLine: { color: acc, width: 1, style: 2, labelBackgroundColor: '#703AE6', visible: d.axis === '1' } },
    handleScroll: false, handleScale: false });
  var up = last.close >= first.open, s;
  if (d.type === 'area') {
    var c = up ? pos : neg;
    s = chart.addAreaSeries({ lineColor: c, lineWidth: 2, topColor: c + '44', bottomColor: c + '00', priceLineVisible: false, lastValueVisible: false, crosshairMarkerBackgroundColor: c });
    s.setData(data.map(function (x) { return { time: x.time, value: x.close }; }));
  } else {
    s = chart.addCandlestickSeries({ upColor: pos, downColor: neg, borderVisible: false, wickUpColor: pos, wickDownColor: neg, priceLineColor: acc, priceLineStyle: 2 });
    s.setData(data);
  }
  if (d.vol === '1') {
    var v = chart.addHistogramSeries({ priceFormat: { type: 'volume' }, priceScaleId: '', lastValueVisible: false, priceLineVisible: false });
    chart.priceScale('').applyOptions({ scaleMargins: { top: .84, bottom: 0 } });
    v.setData(data.map(function (x) { return { time: x.time, value: x.value, color: (x.close >= x.open ? pos : neg) + '55' }; }));
  }
  if (d.lines === '1') {
    s.createPriceLine({ price: 356.67, color: acc, lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: 'Entry' });
    s.createPriceLine({ price: 258.90, color: neg, lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: 'Liq.' });
    s.applyOptions({ autoscaleInfoProvider: function (orig) { var r = orig(); if (r) r.priceRange.minValue = Math.min(r.priceRange.minValue, 250); return r; } });
  }
  chart.timeScale().fitContent();
  var priceEl = fig.querySelector('.price'), chgEl = fig.querySelector('.chg'), ohlc = fig.querySelector('.ohlc');
  function show(x) {
    var ch = x.close - first.open, pc = ch / first.open * 100;
    priceEl.textContent = fmt(x.close);
    chgEl.innerHTML = '<span style="color:' + (ch >= 0 ? pos : neg) + '">' + (ch >= 0 ? '+' : '−') + fmt(Math.abs(ch)).slice(1).replace(/^/, '$') + ' (' + (ch >= 0 ? '+' : '−') + Math.abs(pc).toFixed(2) + '%)</span><span class="when">' + (x === last ? (d.asset === 'tsla' ? 'past 3 months' : 'past 24 hours') : new Date(x.time * 1000).toUTCString().slice(5, d.asset === 'tsla' ? 16 : 22)) + '</span>';
    if (ohlc) ohlc.innerHTML = 'O <b>' + x.open.toFixed(2) + '</b> H <b>' + x.high.toFixed(2) + '</b> L <b>' + x.low.toFixed(2) + '</b> C <b>' + x.close.toFixed(2) + '</b>';
  }
  show(last);
  chart.subscribeCrosshairMove(function (p) { var x = p && p.time ? data.find(function (k) { return k.time === p.time; }) : null; show(x || last); });
}
window.addEventListener('load', function () { document.querySelectorAll('figure[data-asset]').forEach(mount); });
</script></body></html>'''

ICON = {'back': '<svg width="24" height="24" viewBox="0 -960 960 960" fill="currentColor"><path d="m313-440 196 196q12 12 11.5 28T508-188q-12 11-28 11.5T452-188L188-452q-6-6-8.5-13t-2.5-15q0-8 2.5-15t8.5-13l264-264q11-11 27.5-11t28.5 11q12 12 12 28.5T508-715L313-520h447q17 0 28.5 11.5T800-480q0 17-11.5 28.5T760-440H313Z"/></svg>',
        'candle': '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="7" width="4" height="9" rx="1"/><rect x="6.5" y="4" width="1" height="15"/><rect x="15" y="9" width="4" height="7" rx="1"/><rect x="16.5" y="6" width="1" height="13"/></svg>',
        'line': '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17l5-6 4 3 7-8"/></svg>',
        'open': '<svg width="14" height="14" viewBox="0 -960 960 960" fill="currentColor"><path d="M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h240q17 0 28.5 11.5T480-800q0 17-11.5 28.5T440-760H200v560h560v-240q0-17 11.5-28.5T800-480q17 0 28.5 11.5T840-440v240q0 33-23.5 56.5T760-120H200Zm560-584L416-360q-11 11-28 11t-28-11q-11-11-11-28t11-28l344-344H600q-17 0-28.5-11.5T560-800q0-17 11.5-28.5T600-840h200q17 0 28.5 11.5T840-800v200q0 17-11.5 28.5T800-560q-17 0-28.5-11.5T760-600v-104Z"/></svg>'}


def phone(asset, style, light=False):
    tsla = asset == 'tsla'
    icon = 'tsla' if tsla else 'anth'
    name, sub = ('TSLAx-USDC', 'Tesla xStock') if tsla else ('ANTHROPIC-USDC', 'Anthropic PreStock')
    src = 'Raydium TSLAx/USDC pool' if tsla else 'Meteora ANTHRP/SOL pool'
    ranges = ['1D', '1W', '1M', '3M', '1Y'] if tsla else ['15m', '1H', '4H', '1D', '1W']
    on = '3M' if tsla else '15m'
    chips = ''.join('<span class="%s">%s</span>' % ('on' if r == on else '', r) for r in ranges)
    attrs = dict(type='area', axis='0', grid='0', vol='0', lines='0')
    top_extra, chips_html, under = '', '', ''
    if style == 'clean':
        chips_html = '<div class="chips">' + chips + '<span class="sp"></span><span class="ico">' + ICON['candle'] + '</span></div>'
    elif style == 'pro':
        attrs.update(type='candle', axis='1', grid='1', vol='1')
        top_extra = '<div class="ohlc"></div>'
        chips_html = ('<div class="chips">' + chips + '<span class="sp"></span><span class="ico">' + ICON['line'] + '</span><span class="pro">Pro ' + ICON['open'] + '</span></div>')
    elif style == 'position':
        attrs.update(type='candle', axis='1', grid='1', lines='1' if tsla else '0')
        chips_html = ''
        under = ('<div class="legend"><span><i style="border-color:var(--acc)"></i>Your entry $356.67</span><span><i style="border-color:var(--neg)"></i>Liquidation $258.90</span></div>') if tsla else ''
    data_attrs = ' '.join('data-%s="%s"' % kv for kv in attrs.items())
    chart = '<div class="chart"></div>'
    if style == 'position':
        chart = ('<div class="card"><div class="chips" style="padding:0 10px;margin:0 0 4px">' + chips.replace('class="on"', 'class="on"') +
                 '<span class="sp"></span><span class="seg"><span>' + ICON['line'] + '</span><span class="on">' + ICON['candle'] + '</span></span></div>' + chart + under + '</div>')
    body = ('<div class="sb"><span>12:30</span><span>&#9679;&#9679;&#9679; &#9650; &#9646;</span></div>'
            '<div class="head"><div class="back">' + ICON['back'] + '</div>'
            '<div class="pair"><img src="__%s__"><div><b>%s</b><span>%s</span></div></div>' % (icon, name, sub) +
            '<div class="price"></div><div class="chg"></div></div>' + top_extra + chart + chips_html +
            '<div class="src"><i></i>Live · %s · On-chain data provided by GeckoTerminal</div>' % src)
    if tsla:
        body += '<div class="pos"><div><b>Long 2.8x · 34.49 TSLAx</b><span>Entry $356.67 · liq. $258.90</span></div><b style="color:var(--pos)">+$542.76</b></div>'
    body += '<div class="mkt"><div><span>Borrow APY</span><b>%s</b></div><div><span>Max leverage</span><b>5x</b></div></div>' % ('0.23%' if tsla else '0.40%')
    body += '<div class="cta"><span class="long">Long</span><span class="short">Short</span></div>'
    return '<div class="ph%s">%s</div>' % (' light' if light else '', body), data_attrs


CAPS = {
    'clean': '<b>1 · Clean line</b> (Robinhood-style default): one smooth line coloured by the period\'s direction, no axes or grid. Drag to read any point; the price above follows. A small candle icon switches to candles.',
    'pro': '<b>2 · Candles + volume</b> (Binance "original" chart): candles in Vanna teal and red, a faint grid, prices on the right, volume underneath, an O H L C line that follows your finger. "Pro" opens the full TradingView (xStocks) or DexScreener (PreStocks) chart full screen.',
    'position': '<b>3 · Your position on the chart</b>: the chart in a card with Line | Candles and the ranges inside it, and dashed lines for your entry and liquidation price, so you see how far you are from danger. Only shows lines when you hold a position.',
}


def fig(asset, style, light=False):
    inner, attrs = phone(asset, style, light)
    return '<figure data-asset="%s" %s>%s<figcaption>%s</figcaption></figure>' % (asset, attrs, inner, CAPS[style] if asset == 'tsla' else ('<b>%s</b> on a PreStock%s.' % (CAPS[style].split('</b>')[0].replace('<b>', ''), ', light mode' if light else '')))


def main():
    img = json.load(open(os.path.join(CMP, 'src', 'img.json'), encoding='utf8'))
    row1 = fig('tsla', 'clean') + fig('tsla', 'pro') + fig('tsla', 'position')
    row2 = fig('anth', 'clean') + fig('anth', 'pro') + fig('anth', 'pro', light=True)
    html = (PAGE.replace('__ROW1__', row1).replace('__ROW2__', row2).replace('__IMG__', '{}')
            .replace('__tsla__', img['a9a1db51309a512ccf9302f8acc244d2']).replace('__anth__', img['c0af4af206fcfbcf3cce92e51a5837cf']))
    out = os.path.join(CMP, 'previews', 'marketchart.html')
    open(out, 'w', encoding='utf8').write(html)
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
        b = p.chromium.launch(); pg = b.new_page(viewport={'width': 1320, 'height': 1000})
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto('file:///' + out.replace('\\', '/'), wait_until='networkidle'); pg.wait_for_timeout(1500)
        print('charts drawn:', pg.evaluate("document.querySelectorAll('.chart canvas').length"), 'errors:', errs[:3])
        for sid in ('s1', 's2'):
            pg.locator('#' + sid + ' .row').screenshot(path=os.path.join(CMP, 'renders', 'marketchart-%s.png' % sid))
        # one frame with a finger on the candles chart to show the scrub
        box = pg.locator('#s1 figure').nth(1).locator('.chart').bounding_box()
        pg.mouse.move(box['x'] + box['width'] * .55, box['y'] + box['height'] * .45); pg.wait_for_timeout(300)
        pg.locator('#s1 figure').nth(1).locator('.ph').screenshot(path=os.path.join(CMP, 'renders', 'marketchart-scrub.png'))
        b.close()
    print(out)


if __name__ == '__main__':
    main()
