/* Android system back for both sides of the comparison (injected by build.js after the bridge).
   Gesture navigation: drag in from the left or right edge. The predictive-back arrow follows the finger and the
   screen shrinks slightly; release past the threshold to go back, or let go early to cancel.
   Keyboard: Esc is the back key. In 3-button mode the ◁ key does the same. */
(function () {
  'use strict';
  var phone = document.getElementById('phone'), screenEl = document.getElementById('screen');
  if (!phone || !screenEl) return;
  var css = document.createElement('style');
  css.textContent =
    '.vn-back{position:absolute;top:0;width:36px;height:56px;margin-top:-28px;display:flex;align-items:center;justify-content:center;' +
    'border-radius:28px;background:rgba(17,17,17,.82);color:#FFFFFF;opacity:0;pointer-events:none;z-index:160}' +
    '.vn-back svg{width:20px;height:20px;fill:currentColor}.vn-back.l{left:6px}.vn-back.r{right:6px}' +
    '#screen.vn-peek{border-radius:24px;overflow:hidden}' +
    '#screen.vn-settle{transition:transform .22s cubic-bezier(.2,0,0,1),border-radius .22s}';
  document.head.appendChild(css);

  var arrow = document.createElement('div');
  arrow.className = 'vn-back';
  arrow.setAttribute('aria-hidden', 'true');
  arrow.innerHTML = '<svg viewBox="0 -960 960 960"><path d="m313-440 196 196q12 12 11.5 28T508-188q-12 11-28 11.5T452-188L188-452q-6-6-8.5-13t-2.5-15q0-8 2.5-15t8.5-13l264-264q11-11 27.5-11t28.5 11q12 12 12 28.5T508-715L313-520h447q17 0 28.5 11.5T800-480q0 17-11.5 28.5T760-440H313Z"/></svg>';

  var EDGE = 20, COMMIT = 72, drag = null;
  function embedded() { return document.documentElement.classList.contains('vn-embed'); }
  function dp(e) {
    var r = phone.getBoundingClientRect(), w = window.__vnW || 412, k = r.width / w;
    return { x: (e.clientX - r.left) / k, y: (e.clientY - r.top) / k, w: w };
  }
  function gestures() { return embedded() && !phone.classList.contains('vn-3btn'); }   // 3-button phones use the ◁ key

  phone.addEventListener('pointerdown', function (e) {
    if (!gestures() || e.button > 0) return;
    var p = dp(e), side = p.x < EDGE ? 'l' : (p.x > p.w - EDGE ? 'r' : null);
    if (!side) return;
    drag = { side: side, x0: p.x, moved: 0 };
    if (!arrow.parentNode) phone.appendChild(arrow);
    arrow.className = 'vn-back ' + side;
    arrow.style.top = p.y + 'px';
    try { phone.setPointerCapture(e.pointerId); } catch (err) {}
    e.preventDefault(); e.stopPropagation();
  }, true);

  phone.addEventListener('pointermove', function (e) {
    if (!drag) return;
    var p = dp(e), d = drag.side === 'l' ? p.x - drag.x0 : drag.x0 - p.x, dir = drag.side === 'l' ? 1 : -1;
    drag.moved = Math.max(0, d);
    var t = Math.min(1, drag.moved / COMMIT);
    arrow.style.opacity = String(Math.min(1, t * 1.4));
    arrow.style.top = p.y + 'px';
    arrow.style.transform = 'translateX(' + (dir * Math.min(40, drag.moved * 0.4)) + 'px) scale(' + (0.8 + 0.2 * t) + ')';
    screenEl.classList.add('vn-peek'); screenEl.classList.remove('vn-settle');
    screenEl.style.transform = 'translateX(' + (dir * 12 * t) + 'px) scale(' + (1 - 0.08 * t) + ')';
  }, true);

  function end(commit) {
    screenEl.classList.remove('vn-peek'); screenEl.classList.add('vn-settle');
    screenEl.style.transform = ''; arrow.style.opacity = '0';
    drag = null;
    if (commit && window.__vn) window.__vn.back();
  }
  phone.addEventListener('pointerup', function (e) { if (drag) { e.stopPropagation(); end(drag.moved >= COMMIT); } }, true);
  phone.addEventListener('pointercancel', function () { if (drag) end(false); }, true);
  phone.addEventListener('click', function (e) { if (screenEl.classList.contains('vn-peek')) e.stopPropagation(); }, true);

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && window.__vn) { e.preventDefault(); window.__vn.back(); }
  });
})();
