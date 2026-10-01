/* Vanna live charts. Drawn at the element's real width (never stretched), redrawn on resize.
   Press and drag (or hover) to read any point: the header value and date follow the finger.
   Injected into New by compare/tools/build.js (mounted by runtime.js); also used by compare/previews/charts.html.

   vnLine(el, { points: [[ms, value], ...], color, fill, fmt(v), dateFmt(ms), axis: 'clean' | 'axis',
                onScrub(point|null), height, grid, label, ink, ink2 })
   vnRateCurve(el, { now, kink, slope1, slope2, base, color, ink, ink2, grid, onScrub }) */
(function (root) {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';

  function svgEl(name, attrs, parent) {
    var e = document.createElementNS(NS, name);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function niceTicks(lo, hi, n) {
    if (hi === lo) { hi = lo + 1; }
    var span = hi - lo, step = Math.pow(10, Math.floor(Math.log10(span / n))), err = span / n / step;
    step *= err >= 7.5 ? 10 : err >= 3.5 ? 5 : err >= 1.5 ? 2 : 1;
    var t = [], v = Math.floor(lo / step) * step;
    for (; v <= hi + step * 0.5; v += step) t.push(+v.toFixed(10));
    return t;
  }
  function observe(el, draw) {
    var w = -1;
    var ro = new ResizeObserver(function () { if (el.clientWidth !== w) { w = el.clientWidth; draw(); } });
    ro.observe(el);
    return ro;
  }

  /* A time series. 'clean' = value + date header, start/mid/end dates, no y axis.
     'axis' = adds 3 value labels on the right with hairline grid lines. */
  function vnLine(el, o) {
    var H = o.height || 160, padR = o.axis === 'axis' ? 52 : 0, padT = 12, padB = 26;
    var ink2 = o.ink2 || '#595959', grid = o.grid || 'rgba(127,127,127,0.18)';
    el.style.position = 'relative'; el.style.touchAction = 'pan-y'; el.style.userSelect = 'none';
    var cursor = null;

    function draw() {
      el.innerHTML = '';
      var W = el.clientWidth, pts = o.points, n = pts.length;
      if (!W || !n) return;
      var t0 = pts[0][0], t1 = pts[n - 1][0];
      var vs = pts.map(function (p) { return p[1]; });
      var lo = Math.min.apply(null, vs), hi = Math.max.apply(null, vs);
      var ticks = niceTicks(Math.min(lo, o.zero ? 0 : lo), hi, 3);
      var y0 = ticks[0], y1 = ticks[ticks.length - 1];
      if (o.axis !== 'axis') { y0 = Math.min(lo, o.zero ? 0 : lo); y1 = hi === y0 ? y0 + 1 : hi; }
      var cw = W - padR, ch = H - padT - padB;
      var X = function (t) { return t1 === t0 ? 0 : (t - t0) / (t1 - t0) * cw; };
      var Y = function (v) { return padT + (1 - (v - y0) / (y1 - y0 || 1)) * ch; };
      var svg = svgEl('svg', { width: W, height: H, viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': o.label || 'Chart' }, el);
      svg.style.display = 'block'; svg.style.overflow = 'visible';
      if (o.axis === 'axis') {
        ticks.forEach(function (v) {
          svgEl('line', { x1: 0, x2: cw, y1: Y(v), y2: Y(v), stroke: grid, 'stroke-width': 1 }, svg);
          var tx = svgEl('text', { x: W, y: Y(v) + 4, 'text-anchor': 'end', 'font-size': 11, fill: ink2 }, svg);
          tx.textContent = o.fmtAxis ? o.fmtAxis(v, ticks[1] - ticks[0]) : o.fmt(v);
        });
      } else {
        svgEl('line', { x1: 0, x2: cw, y1: padT + ch, y2: padT + ch, stroke: grid, 'stroke-width': 1 }, svg);
      }
      var d = pts.map(function (p, i) { return (i ? 'L' : 'M') + X(p[0]).toFixed(1) + ' ' + Y(p[1]).toFixed(1); }).join(' ');
      var gid = 'g' + Math.random().toString(36).slice(2, 8);
      var defs = svgEl('defs', {}, svg), lg = svgEl('linearGradient', { id: gid, x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
      svgEl('stop', { offset: 0, 'stop-color': o.fill || o.color, 'stop-opacity': 0.28 }, lg);
      svgEl('stop', { offset: 1, 'stop-color': o.fill || o.color, 'stop-opacity': 0 }, lg);
      svgEl('path', { d: d + ' L' + cw + ' ' + (padT + ch) + ' L0 ' + (padT + ch) + ' Z', fill: 'url(#' + gid + ')' }, svg);
      svgEl('path', { d: d, fill: 'none', stroke: o.color, 'stroke-width': 2.5, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, svg);
      // dates under the chart: start, middle, end
      [[0, 'start'], [0.5, 'middle'], [1, 'end']].forEach(function (a) {
        var tx = svgEl('text', { x: a[0] * cw, y: H - 6, 'text-anchor': a[1], 'font-size': 11, fill: ink2 }, svg);
        tx.textContent = o.dateFmt(t0 + (t1 - t0) * a[0], 'axis');
      });
      // scrub layer
      var vline = svgEl('line', { y1: padT - 4, y2: padT + ch, stroke: o.ink || '#1F1F1F', 'stroke-width': 1, 'stroke-dasharray': '3 3', opacity: 0 }, svg);
      var dot = svgEl('circle', { r: 5, fill: o.color, stroke: o.dotRing || '#FFFFFF', 'stroke-width': 2, opacity: 0 }, svg);
      var last = pts[n - 1];
      svgEl('circle', { cx: X(last[0]), cy: Y(last[1]), r: 3.5, fill: o.color }, svg);
      function at(clientX) {
        var r = svg.getBoundingClientRect(), x = Math.max(0, Math.min(cw, (clientX - r.left) * (W / r.width)));
        var t = t0 + (t1 - t0) * (x / cw), best = 0;
        for (var i = 1; i < n; i++) if (Math.abs(pts[i][0] - t) < Math.abs(pts[best][0] - t)) best = i;
        return pts[best];
      }
      function show(p) {
        cursor = p;
        if (!p) { vline.setAttribute('opacity', 0); dot.setAttribute('opacity', 0); if (o.onScrub) o.onScrub(null); return; }
        var x = X(p[0]), y = Y(p[1]);
        vline.setAttribute('x1', x); vline.setAttribute('x2', x); vline.setAttribute('opacity', 0.5);
        dot.setAttribute('cx', x); dot.setAttribute('cy', y); dot.setAttribute('opacity', 1);
        if (o.onScrub) o.onScrub(p);
      }
      var down = false;
      svg.addEventListener('pointerdown', function (e) { down = true; svg.setPointerCapture(e.pointerId); show(at(e.clientX)); });
      svg.addEventListener('pointermove', function (e) { if (down || e.pointerType === 'mouse') show(at(e.clientX)); });
      svg.addEventListener('pointerup', function () { down = false; show(null); });
      svg.addEventListener('pointercancel', function () { down = false; show(null); });
      svg.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') show(null); });
      if (cursor) show(cursor);
    }
    var ro = observe(el, draw);
    return { set: function (p) { for (var k in p) o[k] = p[k]; cursor = null; draw(); }, destroy: function () { ro.disconnect(); } };
  }

  /* Kinked interest rate model (docs.solana.vanna.finance/learn/interest-rate-model):
     borrow = base + slope1 * u / kink below the kink, base + slope1 + slope2 * (u - kink) / (1 - kink) above it.
     Lenders earn borrow * u (no reserve cut shown on devnet). Drag along the curve to read any utilization. */
  function rate(o, u) {
    return u <= o.kink ? o.base + o.slope1 * u / o.kink : o.base + o.slope1 + o.slope2 * (u - o.kink) / (1 - o.kink);
  }
  function vnRateCurve(el, o) {
    var H = o.height || 168, padT = 28, padB = 26, padR = 44;
    var ink = o.ink || '#1F1F1F', ink2 = o.ink2 || '#595959', grid = o.grid || 'rgba(127,127,127,0.18)';
    el.style.position = 'relative'; el.style.touchAction = 'pan-y'; el.style.userSelect = 'none';
    function draw() {
      el.innerHTML = '';
      var W = el.clientWidth; if (!W) return;
      var cw = W - padR, ch = H - padT - padB, top = rate(o, 1);
      var ticks = niceTicks(0, top, 3), ymax = ticks[ticks.length - 1];
      var X = function (u) { return u * cw; }, Y = function (r) { return padT + (1 - r / ymax) * ch; };
      var svg = svgEl('svg', { width: W, height: H, viewBox: '0 0 ' + W + ' ' + H, role: 'img',
        'aria-label': 'Interest rate curve. Borrow rate ' + (rate(o, o.now) * 100).toFixed(2) + '% at ' + Math.round(o.now * 100) + '% utilization; kink at ' + Math.round(o.kink * 100) + '%.' }, el);
      svg.style.display = 'block'; svg.style.overflow = 'visible';
      ticks.forEach(function (v) {
        svgEl('line', { x1: 0, x2: cw, y1: Y(v), y2: Y(v), stroke: grid, 'stroke-width': 1 }, svg);
        var tx = svgEl('text', { x: W, y: Y(v) + 4, 'text-anchor': 'end', 'font-size': 11, fill: ink2 }, svg); tx.textContent = Math.round(v * 100) + '%';
      });
      var steps = 80, dB = '', dS = '';
      for (var i = 0; i <= steps; i++) {
        var u = i / steps, r = rate(o, u);
        dB += (i ? 'L' : 'M') + X(u).toFixed(1) + ' ' + Y(r).toFixed(1) + ' ';
        dS += (i ? 'L' : 'M') + X(u).toFixed(1) + ' ' + Y(r * u).toFixed(1) + ' ';
      }
      svgEl('path', { d: dS, fill: 'none', stroke: o.supplyColor || '#1C7C83', 'stroke-width': 2, 'stroke-dasharray': '5 4' }, svg);
      svgEl('path', { d: dB, fill: 'none', stroke: o.color || '#703AE6', 'stroke-width': 2.5, 'stroke-linejoin': 'round' }, svg);
      // kink
      svgEl('line', { x1: X(o.kink), x2: X(o.kink), y1: padT, y2: padT + ch, stroke: grid, 'stroke-width': 1, 'stroke-dasharray': '2 3' }, svg);
      var kt = svgEl('text', { x: X(o.kink) - 8, y: Y(rate(o, o.kink)) - 10, 'text-anchor': 'end', 'font-size': 11, fill: ink2 }, svg); kt.textContent = 'Kink ' + Math.round(o.kink * 100) + '%';
      [[0, 'start', '0%'], [0.5, 'middle', '50%'], [1, 'end', '100% used']].forEach(function (a) {
        var tx = svgEl('text', { x: X(a[0]), y: H - 6, 'text-anchor': a[1], 'font-size': 11, fill: ink2 }, svg); tx.textContent = a[2];
      });
      // now marker + scrub marker
      var nowX = X(o.now);
      svgEl('line', { x1: nowX, x2: nowX, y1: padT - 10, y2: padT + ch, stroke: o.nowColor || '#FC5457', 'stroke-width': 1.5, 'stroke-dasharray': '4 4' }, svg);
      svgEl('circle', { cx: nowX, cy: Y(rate(o, o.now)), r: 5, fill: o.nowColor || '#FC5457', stroke: o.dotRing || '#FFFFFF', 'stroke-width': 2 }, svg);
      var nt = svgEl('text', { x: nowX + 6, y: padT - 12, 'font-size': 11, 'font-weight': 600, fill: ink }, svg); nt.textContent = 'Now';
      var vline = svgEl('line', { y1: padT, y2: padT + ch, stroke: ink, 'stroke-width': 1, 'stroke-dasharray': '3 3', opacity: 0 }, svg);
      var dot = svgEl('circle', { r: 5, fill: o.color || '#703AE6', stroke: o.dotRing || '#FFFFFF', 'stroke-width': 2, opacity: 0 }, svg);
      function show(u) {
        if (u === null) { vline.setAttribute('opacity', 0); dot.setAttribute('opacity', 0); if (o.onScrub) o.onScrub(null); return; }
        var x = X(u), y = Y(rate(o, u));
        vline.setAttribute('x1', x); vline.setAttribute('x2', x); vline.setAttribute('opacity', 0.5);
        dot.setAttribute('cx', x); dot.setAttribute('cy', y); dot.setAttribute('opacity', 1);
        if (o.onScrub) o.onScrub({ u: u, borrow: rate(o, u), supply: rate(o, u) * u });
      }
      function uAt(e) { var r = svg.getBoundingClientRect(); return Math.round(Math.max(0, Math.min(1, (e.clientX - r.left) * (W / r.width) / cw)) * 100) / 100; }
      var down = false;
      svg.addEventListener('pointerdown', function (e) { down = true; svg.setPointerCapture(e.pointerId); show(uAt(e)); });
      svg.addEventListener('pointermove', function (e) { if (down || e.pointerType === 'mouse') show(uAt(e)); });
      svg.addEventListener('pointerup', function () { down = false; show(null); });
      svg.addEventListener('pointercancel', function () { down = false; show(null); });
      svg.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') show(null); });
    }
    var ro = observe(el, draw);
    return { rate: function (u) { return rate(o, u); }, destroy: function () { ro.disconnect(); } };
  }

  root.vnLine = vnLine; root.vnRateCurve = vnRateCurve; root.vnRate = rate;
})(window);
