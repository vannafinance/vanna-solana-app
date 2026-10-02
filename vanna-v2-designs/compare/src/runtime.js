/* New-only runtime, injected into new.html by compare/tools/build.js.
   Material ripple: every tappable element gets a state layer that grows from the touch point
   while pressed and fades on release, like Android. */
(function () {
  'use strict';
  var screen = document.getElementById('screen');
  if (!screen) return;
  screen.addEventListener('pointerdown', function (e) {
    var el = e.target.closest('button, a[href], [data-h], [role="tab"], [role="option"], [role="radio"]');
    if (!el || !screen.contains(el) || el.disabled) return;
    var r = el.getBoundingClientRect();
    var k = r.width / (el.offsetWidth || r.width || 1);
    if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
    var box = document.createElement('span');
    box.className = 'vn-ripple';
    var d = Math.hypot(el.offsetWidth, el.offsetHeight) * 2;
    var x = (e.clientX - r.left) / k, y = (e.clientY - r.top) / k;
    var dot = document.createElement('span');
    dot.style.cssText = 'left:' + (x - d / 2) + 'px;top:' + (y - d / 2) + 'px;width:' + d + 'px;height:' + d + 'px';
    box.appendChild(dot);
    el.appendChild(box);
    function end() {
      window.removeEventListener('pointerup', end, true);
      window.removeEventListener('pointercancel', end, true);
      box.classList.add('out');
      setTimeout(function () { box.remove(); }, 320);
    }
    window.addEventListener('pointerup', end, true);
    window.addEventListener('pointercancel', end, true);
  }, true);
})();

/* Welcome and Connect fit any Android screen (phones, foldables, tablets, either navigation mode).
   The 412 x 915 composition is kept exactly where it fits; when the screen is shorter or narrower:
   the actions stay at the bottom (thumb zone), the headline moves up to sit just above them, and the
   logo art scales down and centres in the space that is left. Re-runs on every size change. */
(function () {
  'use strict';
  var screen = document.getElementById('screen');
  if (!screen) return;
  var STATUS = 28, GAP = 20;            // status bar, and the gap above the headline block's captions
  var ART_TOP = 120, ART_BOTTOM = 510;  // the art's real content (orbits, tokens, mark) inside its 412 x 560 box
  var ART_LEFT = 24, ART_RIGHT = 388;

  function fit() {
    var art = screen.querySelector('.vn-w-art'), copy = screen.querySelector('.vn-w-copy');
    if (!art || !copy) return;
    var head = copy.children[0], actions = copy.children[copy.children.length - 1];
    if (head.dataset.top0 === undefined) head.dataset.top0 = head.style.top;   // the design position, e.g. 540px
    head.style.top = head.dataset.top0; art.style.transform = '';
    if (getComputedStyle(copy).display === 'flex') return;          // landscape split: CSS lays it out
    var W = screen.clientWidth, H = copy.clientHeight || screen.clientHeight;

    // 1. headline: design position, unless it would run into the actions
    var actionsTop = H - 28 - actions.offsetHeight;
    var headTop = Math.min(540, actionsTop - GAP - head.offsetHeight);
    if (headTop < 540) head.style.top = headTop + 'px';

    // 2. art: keep it if its content fits between the status bar and the headline, else scale and centre
    var top = STATUS + 8 - art.offsetTop, bottom = headTop - 16 - art.offsetTop + copy.offsetTop;
    var cx = W / 2 - art.offsetLeft;                                  // screen centre in the art box's coordinates
    var fitsV = ART_TOP >= top && ART_BOTTOM <= bottom;
    var fitsH = art.offsetLeft + ART_LEFT >= 8 && art.offsetLeft + ART_RIGHT <= W - 8;
    if (fitsV && fitsH && Math.abs(cx - 206) < 1) return;
    var s = Math.min(1, (bottom - top) / (ART_BOTTOM - ART_TOP), (W - 16) / (ART_RIGHT - ART_LEFT));
    s = Math.max(0.5, s);
    var dy = fitsV && s === 1 ? 0 : (top + bottom) / 2 - (ART_TOP + ART_BOTTOM) / 2;
    art.style.transformOrigin = '206px ' + (ART_TOP + ART_BOTTOM) / 2 + 'px';
    art.style.transform = 'translate(' + (cx - 206) + 'px, ' + dy + 'px) scale(' + s + ')';
  }
  var queued = false;
  function soon() { if (!queued) { queued = true; setTimeout(function () { queued = false; fit(); }, 0); } }
  new ResizeObserver(soon).observe(screen);
  new MutationObserver(soon).observe(screen, { childList: true });
  soon();
})();

/* Top-level navigation (Android): Portfolio is the start destination. Top cards (Portfolio · Earn · Trade · Farm)
   and bottom-bar tabs are top-level: they never pile up history. Every top-level screen other than Portfolio
   sits directly on top of Portfolio, so Back from any space or tab returns to Portfolio, and Back on Portfolio
   exits the app. Detail screens (a vault, a market, an order) still push as usual. */
(function () {
  'use strict';
  var screen = document.getElementById('screen');
  if (!screen) return;
  screen.addEventListener('click', function (e) {
    var a = e.target.closest('.vn-space a[href], .vn-navbar a[href], .vn-histchips a[href]');
    if (!a || !window.__vn) return;
    var m = (a.getAttribute('href') || '').match(/^(V\d\w*)\.dc\.html/);
    if (!m) return;
    e.preventDefault(); e.stopPropagation();
    var stem = m[1];
    if (window.__vn.app().shown === stem) { var s = screen.querySelector('.vn-main'); if (s) s.scrollTo({ top: 0, behavior: 'smooth' }); return; }  // reselect = scroll to top
    if (!window.__vnSetStack) { window.__vn.go(stem, { push: false }); return; }
    window.__vnSetStack(stem === 'V7Home' ? [] : ['V7Home'], stem);
  }, true);
})();

/* Live charts (style B: value axis, like the web app). Screens hold an empty <div class="vn-live" data-kind="...">
   with their data and theme colours as attributes; this draws into it with charts.js and redraws when the
   attributes change (range, mode, light/dark) or the element is re-created by a re-render. Press and drag to read
   a value: the screen's number and date follow the finger. Data is the prototype's; the app would get it from the
   indexer (history) and the pool account (utilisation). */
(function () {
  'use strict';
  var screen = document.getElementById('screen');
  if (!screen || !window.vnLine) return;
  var DAY = 864e5, HOUR = 36e5, NOW = Date.UTC(2026, 9, 1, 15, 0);
  var DEP1 = Date.UTC(2026, 8, 3, 10), DEP2 = Date.UTC(2026, 8, 20, 14);
  var K = { base: 0, slope1: 0.10, slope2: 0.60, kink: 0.80 };   // Vanna kink model, fitted to devnet pools; slope2 not published yet
  var M = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function wobble(i, s) { var x = Math.sin(i * 12.9898 + s * 78.233) * 43758.5453; return x - Math.floor(x) - 0.5; }
  function dfmt(ms, kind, step) {
    var d = new Date(ms), day = d.getUTCDate() + ' ' + M[d.getUTCMonth()];
    if (kind === 'axis') return day;
    if (ms >= NOW) return 'Today, ' + day;
    return step < DAY ? day + ', ' + String(d.getUTCHours()).padStart(2, '0') + ':00' : day + ' ' + d.getUTCFullYear();
  }
  function axisDec(step) { return Math.max(0, Math.min(3, -Math.floor(Math.log10(step) + 1e-9))); }
  var usd = function (v) { return '$' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };
  var usdAxis = function (v) { return v >= 1000 ? '$' + (v / 1000).toFixed(v % 1000 ? 1 : 0) + 'K' : '$' + v.toFixed(v % 1 ? 2 : 0); };

  // the user's lending account: 2,500 USDC on 3 Sep, 1.50 SOL on 20 Sep, +$1.37 earned by today
  function earned(t) {
    return (t > DEP1 ? (Math.min(t, NOW) - DEP1) / (NOW - DEP1) * 0.81 : 0) + (t > DEP2 ? (Math.min(t, NOW) - DEP2) / (NOW - DEP2) * 0.56 : 0);
  }
  function deposit(t, i) { return (t >= DEP1 ? 2500 : 0) + earned(t) + (t >= DEP2 ? 176.5 + (t >= NOW - HOUR ? 0 : wobble(i, 3) * 6) : 0); }
  var ER = { '1W': [7 * DAY, 3 * HOUR], '1M': [30 * DAY, 12 * HOUR], '3M': [91 * DAY, DAY], 'All': [NOW - DEP1 + 2 * DAY, 12 * HOUR] };
  function earnSeries(mode, rg) {
    var r = ER[rg] || ER['3M'], pts = [], i = 0;
    for (var t = NOW - r[0]; t < NOW; t += r[1], i++) pts.push([t, mode === 'earn' ? earned(t) : deposit(t, i)]);
    pts.push([NOW, mode === 'earn' ? earned(NOW) : deposit(NOW, i)]);
    return pts;
  }
  var AR = { '7D': [7 * DAY, 3 * HOUR], '30D': [30 * DAY, 12 * HOUR], '90D': [90 * DAY, DAY] };
  function apySeries(u0, rg) {   // utilisation drifts smoothly; lenders earn borrow rate x utilisation
    var r = AR[rg], pts = [];
    for (var t = NOW - r[0]; t < NOW; t += r[1]) {
      var age = (NOW - t) / DAY;
      var u = Math.max(0.005, u0 * (1 - age * 0.004) + u0 * (Math.sin(age / 2.3) * 0.06 + Math.sin(age / 0.9 + 1) * 0.02) * Math.min(1, age / 2));
      pts.push([t, vnRate(K, u) * u * 100]);
    }
    pts.push([NOW, vnRate(K, u0) * u0 * 100]);
    return pts;
  }
  function pct(v) { return v.toFixed(2) + '%'; }   // 2 decimals, like every other rate in the app
  function el(tag, css, text) { var e = document.createElement(tag); if (css) e.style.cssText = css; if (text != null) e.textContent = text; return e; }

  var mount = {
    // Earn hero: deposit / net earnings, white on the teal panel; the value above the chart follows the finger
    earn: function (box, d) {
      var panel = box.closest('.vn-panel') || box.parentNode;
      var val = panel.querySelector('.vn-live-val'), when = panel.querySelector('.vn-live-when');
      var fmt = d.mode === 'earn' ? function (v) { return '+' + usd(v); } : usd;
      var pts = earnSeries(d.mode, d.range), step = (ER[d.range] || ER['3M'])[1];
      if (when) when.textContent = dfmt(NOW, 'head', step);
      return vnLine(box, { points: pts, color: '#FFFFFF', ink: '#FFFFFF', ink2: 'rgba(255,255,255,0.72)', grid: 'rgba(255,255,255,0.16)', dotRing: '#0F5F66',
        axis: 'axis', zero: true, height: 150, fmt: fmt, fmtAxis: usdAxis, dateFmt: dfmt,
        label: (d.mode === 'earn' ? 'Net earnings' : 'Overall deposit') + ' over ' + d.range,
        onScrub: function (p) {
          if (val) val.textContent = fmt((p || pts[pts.length - 1])[1]);
          if (when) when.textContent = dfmt(p ? p[0] : NOW, 'head', step);
        } });
    },
    // Vault > Analytics: supply APY history with its own ranges
    apy: function (box, d) {
      var u0 = +d.u, rg = box.__rg || '30D';
      box.innerHTML = '';
      var head = el('div'), v = el('div', 'font-size: 24px; line-height: 32px; font-weight: 600; color: ' + d.pos), w = el('div', 'font-size: 12px; line-height: 16px; color: ' + d.ink2);
      head.appendChild(v); head.appendChild(w); box.appendChild(head);
      var area = el('div', 'margin-top: 12px'); box.appendChild(area);
      var chips = el('div', 'margin-top: 10px; display: flex; gap: 4px'); chips.setAttribute('role', 'tablist'); chips.setAttribute('aria-label', 'Range'); box.appendChild(chips);
      var pts = apySeries(u0, rg), step = AR[rg][1];
      // at rest: the period's average (today's APY is already in the vault header); while dragging: that day's APY
      var avg = pts.reduce(function (a, p) { return a + p[1]; }, 0) / pts.length, span = { '7D': '7 days', '30D': '30 days', '90D': '90 days' }[rg];
      function show(p) {
        v.textContent = pct(p ? p[1] : avg);
        w.textContent = p ? dfmt(p[0], 'head', step) : 'Average, last ' + span;
      }
      Object.keys(AR).forEach(function (k) {
        var on = k === rg;
        var b = el('button', 'height: 32px; padding: 0 12px; border-radius: 8px; border: 0; font-size: 12px; font-weight: 600; background: ' + (on ? d.tv : 'transparent') + '; color: ' + (on ? d.tvi : d.ink2), k);
        b.type = 'button'; b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', on ? 'true' : 'false');
        b.addEventListener('click', function () { box.__rg = k; draw(box); });
        chips.appendChild(b);
      });
      show(null);
      return vnLine(area, { points: pts, color: d.pos, ink: d.ink, ink2: d.ink2, grid: d.grid, dotRing: d.card, axis: 'axis', height: 150,
        fmt: pct, fmtAxis: function (x, s) { return x.toFixed(axisDec(s)) + '%'; }, dateFmt: dfmt, onScrub: show, label: 'Supply APY over ' + rg });
    },
    // Vault > Analytics: the kinked interest rate curve; drag to read any utilisation
    rate: function (box, d) {
      var u0 = +d.u;
      box.innerHTML = '';
      var lab = el('div', 'font-size: 12px; line-height: 16px; color: ' + d.ink2);
      var nums = el('div', 'margin-top: 2px; display: flex; gap: 20px');
      function stat(c, k) { var s = el('div'), n = el('div', 'font-size: 24px; line-height: 32px; font-weight: 600; color: ' + c); s.appendChild(n); s.appendChild(el('div', 'font-size: 12px; color: ' + d.ink2, k)); nums.appendChild(s); return n; }
      var nb = stat(d.ink, 'Borrowers pay'), ns = stat(d.pos, 'Lenders earn');
      var area = el('div', 'margin-top: 14px');
      var legend = el('div', 'margin-top: 6px; display: flex; gap: 16px; font-size: 12px; color: ' + d.ink2);
      legend.innerHTML = '<span><i style="display: inline-block; width: 16px; border-top: 2.5px solid ' + d.link + '; vertical-align: middle; margin-right: 6px"></i>Borrow rate</span>'
        + '<span><i style="display: inline-block; width: 16px; border-top: 2px dashed ' + d.pos + '; vertical-align: middle; margin-right: 6px"></i>Lender rate</span>';
      [lab, nums, area, legend].forEach(function (x) { box.appendChild(x); });
      function show(p) {
        var u = p ? p.u : u0;
        lab.textContent = p ? 'If ' + Math.round(u * 100) + '% of the pool is borrowed' : 'At today’s usage (drag to try others)';
        nb.textContent = pct(vnRate(K, u) * 100); ns.textContent = pct(vnRate(K, u) * u * 100);
      }
      show(null);
      return vnRateCurve(area, { now: u0, kink: K.kink, base: K.base, slope1: K.slope1, slope2: K.slope2, color: d.link, supplyColor: d.pos,
        ink: d.ink, ink2: d.ink2, grid: d.grid, dotRing: d.card, onScrub: show });
    }
  };

  function key(box) {
    var a = [];
    for (var i = 0; i < box.attributes.length; i++) if (box.attributes[i].name.indexOf('data-') === 0) a.push(box.attributes[i].name + '=' + box.attributes[i].value);
    return a.join('&') + '|' + (box.__rg || '');
  }
  function draw(box) {
    var d = box.dataset, fn = mount[d.kind];
    if (!fn) return;
    if (box.__chart && box.__chart.destroy) box.__chart.destroy();
    box.__chart = fn(box, d); box.__key = key(box);
  }
  function scan() {
    var boxes = screen.querySelectorAll('.vn-live[data-kind]');
    for (var i = 0; i < boxes.length; i++) if (boxes[i].__key !== key(boxes[i]) || !boxes[i].querySelector('svg')) draw(boxes[i]);
  }
  var queued = false;
  function soon() { if (!queued) { queued = true; requestAnimationFrame(function () { queued = false; scan(); }); } }
  new MutationObserver(function (list) {
    for (var i = 0; i < list.length; i++) {
      var t = list[i].target, host = t.closest ? t.closest('.vn-live') : null;
      if (host && (host !== t || list[i].type === 'childList')) continue;   // our own drawing, not a data change
      soon(); return;
    }
  }).observe(screen, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-mode', 'data-range', 'data-u', 'data-ink', 'data-kind'] });
  setInterval(scan, 1000);   // safety net: the pane can pause animation frames
  soon();
})();

/* Menus close smoothly. Screens remove a closed menu at once, so just before a tap that may close one
   (pointerdown), a copy of every open .vn-menu is taken; when the real one disappears, the copy fades out
   in its place for 140ms (styles.css .vn-menu-ghost). */
(function () {
  'use strict';
  var screen = document.getElementById('screen');
  if (!screen) return;
  var snaps = [];
  function scale() { var r = screen.getBoundingClientRect(); return r.width / (screen.offsetWidth || r.width || 1); }
  screen.addEventListener('pointerdown', function () {
    var k = scale(), sr = screen.getBoundingClientRect();
    snaps = Array.prototype.map.call(screen.querySelectorAll('.vn-menu'), function (m) {
      var r = m.getBoundingClientRect();
      return { node: m, html: m.outerHTML, left: (r.left - sr.left) / k, top: (r.top - sr.top) / k, width: r.width / k };
    });
    setTimeout(function () { snaps = []; }, 600);
  }, true);
  new MutationObserver(function (list) {
    if (!snaps.length) return;
    list.forEach(function (mu) {
      Array.prototype.forEach.call(mu.removedNodes, function (n) {
        snaps.forEach(function (s) {
          if (s.node !== n && !(n.contains && n.contains(s.node))) return;
          if (getComputedStyle(screen).position === 'static') screen.style.position = 'relative';
          var holder = document.createElement('div');
          holder.innerHTML = s.html;
          var g = holder.firstChild;
          g.classList.remove('vn-menu'); g.classList.add('vn-menu-ghost');
          g.removeAttribute('role'); g.setAttribute('aria-hidden', 'true');
          g.style.left = s.left + 'px'; g.style.top = s.top + 'px'; g.style.width = s.width + 'px'; g.style.right = 'auto';
          screen.appendChild(g);
          setTimeout(function () { g.remove(); }, 160);
        });
      });
    });
  }).observe(screen, { childList: true, subtree: true });
})();

/* Swipe to switch (like switching accounts on an avatar): drag an element marked data-swipe-host="x" sideways
   and it follows the finger; let go past 32px and it slides out, the screen's hidden data-swipe="x-next" (or
   x-prev) button is pressed, and the new value slides in from the other side. A plain tap still works as before. */
(function () {
  'use strict';
  var screen = document.getElementById('screen');
  if (!screen || !Element.prototype.animate) return;
  var EASE_IN = 'cubic-bezier(0.3, 0, 1, 1)', EASE_OUT = 'cubic-bezier(0.2, 0, 0, 1)';
  var g = null, swallow = false;
  screen.addEventListener('pointerdown', function (e) {
    var host = e.target.closest('[data-swipe-host]');
    if (!host || !screen.contains(host)) return;
    host.style.touchAction = 'pan-y';
    g = { host: host, key: host.getAttribute('data-swipe-host'), x: e.clientX, y: e.clientY, dx: 0, horiz: false, k: host.getBoundingClientRect().width / (host.offsetWidth || 1) };
  }, true);
  window.addEventListener('pointermove', function (e) {
    if (!g) return;
    g.dx = (e.clientX - g.x) / g.k;
    var dy = (e.clientY - g.y) / g.k;
    if (!g.horiz && Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(dy) * 1.5) g.horiz = true;
    if (g.horiz) { g.host.style.transform = 'translateX(' + (g.dx * 0.45) + 'px)'; g.host.style.opacity = String(1 - Math.min(0.5, Math.abs(g.dx) / 160)); }
  }, true);
  window.addEventListener('pointerup', function () {
    if (!g) return;
    var s = g; g = null;
    if (!s.horiz) return;
    swallow = true; setTimeout(function () { swallow = false; }, 400);   // this gesture is not a tap
    var from = s.dx * 0.45;
    s.host.style.transform = ''; s.host.style.opacity = '';
    if (Math.abs(s.dx) < 32) { s.host.animate([{ transform: 'translateX(' + from + 'px)' }, { transform: 'none' }], { duration: 180, easing: EASE_OUT }); return; }
    var dir = s.dx < 0 ? 1 : -1;   // swipe left = next
    var btn = screen.querySelector('[data-swipe="' + s.key + (dir > 0 ? '-next' : '-prev') + '"]');
    if (!btn) return;
    var out = s.host.animate([{ transform: 'translateX(' + from + 'px)', opacity: 0.7 }, { transform: 'translateX(' + (-dir * 28) + 'px)', opacity: 0 }], { duration: 110, easing: EASE_IN, fill: 'forwards' });
    out.onfinish = function () {
      btn.click();
      requestAnimationFrame(function () {
        out.cancel();
        var host = screen.querySelector('[data-swipe-host="' + s.key + '"]') || s.host;
        host.animate([{ transform: 'translateX(' + (dir * 28) + 'px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 200, easing: EASE_OUT });
      });
    };
  }, true);
  window.addEventListener('pointercancel', function () { if (g) { g.host.style.transform = ''; g.host.style.opacity = ''; g = null; } }, true);
  screen.addEventListener('click', function (e) {
    if (swallow && e.target.closest('[data-swipe-host]')) { e.stopPropagation(); e.preventDefault(); swallow = false; }
  }, true);
})();

/* Continue by itself: a link marked data-auto-go="ms" is followed after that delay (e.g. "Connected" -> the app),
   unless the person already moved on. */
(function () {
  'use strict';
  var screen = document.getElementById('screen');
  if (!screen) return;
  var seen = typeof WeakSet === 'function' ? new WeakSet() : null;
  new MutationObserver(function () {
    var a = screen.querySelector('[data-auto-go]');
    if (!a || (seen && seen.has(a))) return;
    if (seen) seen.add(a);
    setTimeout(function () { if (document.contains(a)) a.click(); }, +a.getAttribute('data-auto-go') || 1200);
  }).observe(screen, { childList: true, subtree: true });
})();

/* ===== faucet-tabs (tools/faucet_tabs.py) =====
   Scrolling tab rows (.vn-tabscroll): the arrow scrolls on, the fade and arrow go at the end, and the selected tab
   is always in view. An arrow and its fade show only while there is more on that side. */
(function () {
  'use strict';
  var screen = document.getElementById('screen');
  if (!screen) return;
  function sync(row) {
    var w = row.parentNode; if (!w) return;
    w.classList.toggle('vn-tab-start', row.scrollLeft <= 8);
    w.classList.toggle('vn-tab-end', row.scrollLeft + row.clientWidth >= row.scrollWidth - 8);
  }
  screen.addEventListener('click', function (e) {
    var b = e.target.closest('[data-vn-step]'); if (!b) return;
    var row = b.parentNode.querySelector('.vn-tabscroll'); if (row) row.scrollBy({ left: 160 * +b.getAttribute('data-vn-step'), behavior: 'smooth' });
  });
  screen.addEventListener('scroll', function (e) { if (e.target.classList && e.target.classList.contains('vn-tabscroll')) sync(e.target); }, true);
  function scan() {
    screen.querySelectorAll('.vn-tabscroll').forEach(function (row) {
      var on = row.querySelector('[aria-selected="true"]');
      if (on && row.__vnOn !== on.textContent) {
        row.__vnOn = on.textContent;
        var tabs = row.querySelectorAll('[role="tab"]'), first = on === tabs[0], last = on === tabs[tabs.length - 1];
        var l = on.offsetLeft - 60, r = on.offsetLeft + on.offsetWidth - row.clientWidth + 60;   /* clear of the arrows */
        var x = first ? 0 : last ? row.scrollWidth : (row.scrollLeft > l ? l : (row.scrollLeft < r ? r : row.scrollLeft));
        row.scrollTo({ left: x, behavior: 'instant' });
        setTimeout(function () { sync(row); }, 60);
      }
      sync(row);
    });
  }
  new MutationObserver(scan).observe(screen, { childList: true, subtree: true, attributes: true, attributeFilter: ['aria-selected', 'class'] });   /* a re-render (e.g. theme switch) resets the row's classes */
  scan(); setTimeout(scan, 120);   /* the first screen may already be on the page */
})();
/* ===== end faucet-tabs ===== */
