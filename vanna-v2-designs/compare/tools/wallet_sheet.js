/* The wallet's own approval screen (Mobile Wallet Adapter), injected into new.html by build.js.
   In the real app Vanna doesn't draw this: the installed wallet (Seed Vault on Seeker, Phantom, Solflare,
   Backpack...) shows it over Vanna after the user taps "Approve in wallet". It is mocked here so the whole
   flow can be tested. Approve / Reject drive the real outcome of the screen underneath.
   The icon paths and the Vanna mark below are filled in by build.js. */
(function () {
  'use strict';
  var screen = document.getElementById('screen'), phone = document.getElementById('phone');
  if (!screen || !phone) return;
  var IC = __IC__, MARK = __MARK__;
  function svg(d, s) { return '<svg width="' + s + '" height="' + s + '" viewBox="0 -960 960 960" fill="currentColor" aria-hidden="true"><path d="' + d + '"></path></svg>'; }
  var css = document.createElement('style');
  css.textContent = [
    '.vn-wal-scrim{position:absolute;inset:0;z-index:140;background:rgba(0,0,0,.5);animation:vnFade .2s ease-out}',
    '.vn-wal{position:absolute;left:0;right:0;bottom:0;z-index:141;background:#161618;color:#F2F2F3;border-radius:28px 28px 0 0;padding:10px 20px 28px;font:400 14px/20px "Plus Jakarta Sans",system-ui,sans-serif;animation:vnSheet .32s cubic-bezier(.2,.9,.3,1)}',
    '.vn-3btn .vn-wal{bottom:48px}',
    '.vn-wide .vn-wal{left:50%;right:auto;width:min(560px,calc(100% - 48px));transform:translateX(-50%);animation:none}',
    '.vn-wal .grab{width:32px;height:4px;border-radius:2px;background:#4A4A50;margin:0 auto 16px}',
    '.vn-wal .who{display:flex;align-items:center;gap:10px;color:#A1A1A8;font-size:12px;line-height:16px}',
    '.vn-wal .who b{display:block;color:#F2F2F3;font-size:14px;line-height:20px;font-weight:600}',
    '.vn-wal .wapp{width:36px;height:36px;border-radius:10px;background:#2A2A2E;display:flex;align-items:center;justify-content:center;flex-shrink:0}',
    '.vn-wal .dapp{margin-top:16px;padding:12px;border-radius:16px;background:#202024;display:flex;align-items:center;gap:12px}',
    '.vn-wal .dapp .ic{width:40px;height:40px;border-radius:12px;background:#FFFFFF;display:flex;align-items:center;justify-content:center;flex-shrink:0}',
    '.vn-wal .dapp b{display:block;font-weight:600;font-size:16px;line-height:22px}.vn-wal .dapp .u{color:#A1A1A8;font-size:12px;line-height:16px}',
    '.vn-wal .net{margin-left:auto;height:24px;padding:0 8px;border-radius:8px;background:#2B2540;color:#C9B8F5;font-size:12px;font-weight:600;display:flex;align-items:center}',
    '.vn-wal h3{margin:20px 0 4px;font-size:20px;line-height:28px;font-weight:600}',
    '.vn-wal .sub{color:#A1A1A8}',
    '.vn-wal .row{display:flex;align-items:center;gap:10px;padding:10px 0;border-top:1px solid #2A2A2E;color:#D6D6DA}',
    '.vn-wal .row .v{margin-left:auto;color:#F2F2F3;font-weight:600}',
    '.vn-wal .seek{margin-top:12px;padding:10px 12px;border-radius:12px;background:#202024;display:flex;align-items:center;gap:10px;color:#A1A1A8;font-size:12px;line-height:16px}',
    '.vn-wal .btns{margin-top:16px;display:flex;gap:10px}',
    '.vn-wal button{flex:1;height:52px;border-radius:26px;font:600 16px "Plus Jakarta Sans",system-ui,sans-serif;cursor:pointer}',
    '.vn-wal .rej{background:transparent;color:#F2F2F3;border:1px solid #4A4A50}.vn-wal .ok{background:#F2F2F3;color:#161618;border:0}',
    '.vn-wal .own{margin-top:10px;text-align:center;color:#6E6E76;font-size:11px;line-height:14px}'
  ].join('');
  document.head.appendChild(css);

  var bypass = false;
  function open(target) {
    var stem = window.__vn ? window.__vn.app().shown : '', connect = /^V7Connect/.test(stem);
    var scrim = document.createElement('div'); scrim.className = 'vn-wal-scrim';
    var sheet = document.createElement('div'); sheet.className = 'vn-wal';
    sheet.setAttribute('role', 'dialog'); sheet.setAttribute('aria-label', 'Your wallet');
    var rows = connect
      ? '<div class="row">' + svg(IC.verified_user, 18) + '<span>Share your wallet address</span><span class="v">Yes</span></div>' +
        '<div class="row">' + svg(IC.check_circle, 18) + '<span>Sign in with Solana</span><span class="v">Yes</span></div>'
      : '<div class="row">' + svg(IC.swap_vert, 18) + '<span>Balance changes</span><span class="v">Shown after simulation</span></div>' +
        '<div class="row">' + svg(IC.local_gas_station, 18) + '<span>Network fee</span><span class="v">≈ 0.000005 SOL</span></div>';
    sheet.innerHTML = '<div class="grab"></div>' +
      '<div class="who"><span class="wapp">' + svg(IC.account_balance_wallet, 20) + '</span><span><b>Phantom</b>Your wallet app, opened by Vanna</span></div>' +
      '<div class="dapp"><span class="ic"><svg width="26" height="26" viewBox="11 12 232 232"><defs><linearGradient id="vnWalG" gradientUnits="userSpaceOnUse" x1="31.7" y1="73" x2="222.3" y2="183"><stop offset="0" stop-color="#FC5457"/><stop offset="1" stop-color="#703AE6"/></linearGradient></defs><path fill="url(#vnWalG)" fill-rule="evenodd" d="' + MARK + '"/></svg></span>' +
      '<span><b>Vanna</b><span class="u">vanna.finance</span></span><span class="net">Devnet</span></div>' +
      '<h3>' + (connect ? 'Connect to Vanna and sign in?' : 'Sign 1 transaction') + '</h3>' +
      '<div class="sub">' + (connect ? 'Vanna will see your address. It can ask you to sign, never sign for you.' : 'Requested by vanna.finance. Check the details before you approve.') + '</div>' +
      '<div style="margin-top:12px">' + rows + '</div>' +
      '<div class="seek">' + svg(IC.fingerprint, 18) + '<span><b style="color:#F2F2F3">On Seeker:</b> double-tap the side button, then touch the sensor</span></div>' +
      '<div class="btns"><button type="button" class="rej">Reject</button><button type="button" class="ok">Approve</button></div>' +
      '<div class="own">This screen belongs to your wallet app, not Vanna.</div>';
    phone.appendChild(scrim); phone.appendChild(sheet);
    function finish(approved) {
      scrim.remove(); sheet.remove();
      var saved = window.__vnOutcome;
      if (!approved) window.__vnOutcome = 'reject';
      bypass = true;
      try { target.click(); } finally { bypass = false; }
      if (!approved) setTimeout(function () { window.__vnOutcome = saved; }, 0);
    }
    sheet.querySelector('.ok').addEventListener('click', function () { finish(true); });
    sheet.querySelector('.rej').addEventListener('click', function () { finish(false); });
    scrim.addEventListener('click', function () { finish(false); });
  }
  screen.addEventListener('click', function (e) {
    if (bypass) return;
    var b = e.target.closest('button');
    if (!b || !screen.contains(b) || !/Approve in wallet/.test(b.textContent)) return;
    e.preventDefault(); e.stopPropagation();
    open(b);
  }, true);
  // Approved motion (tools/tx_motion.py): the wallet opens the moment a connection or transaction starts.
  // Screens mark that moment with a hidden data-wallet-auto button; its click carries the wallet's answer back.
  var opened = typeof WeakSet === 'function' ? new WeakSet() : null;
  function autoOpen() {
    var b = screen.querySelector('[data-wallet-auto]');
    if (!b || (opened && opened.has(b)) || phone.querySelector('.vn-wal')) return;
    if (opened) opened.add(b);
    setTimeout(function () { if (document.contains(b)) open(b); }, 260);   // after the hand-off motion starts
  }
  new MutationObserver(autoOpen).observe(screen, { childList: true, subtree: true });
})();
