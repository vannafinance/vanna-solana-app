"""Approved motion (1 Oct 2026, compare/previews/motion.html) built into New.

    python compare/tools/tx_motion.py      (safe to re-run)

Transactions (9 screens share one state machine: sign -> confirm -> done / failed / rejected):
- No Vanna "Confirm in your wallet" sheet any more: the moment a transaction starts, the wallet opens (mocked by
  tools/wallet_sheet.js, auto-opened through a hidden data-wallet-auto button). Behind it, a compact status card
  sits at the bottom of the same screen: "Approve in Phantom" (breathing ring) -> "Sent to Solana" with real steps
  Sent -> Processed -> Confirmed -> the Vanna seal (brand-gradient scalloped shape + slanted tick) and the screen's
  own next action. Failed: coral "!" with a nudge and the reason. Cancelled in the wallet: neutral, nothing was sent.
- "Step N of M" only shows for real multi-step flows (closing a farm), never "Step 1 of 1".
Connect (design A, handshake sheet): the sheet grows from the Connect button; the Vanna mark and the wallet meet over
a dotted bridge; waiting = dots travel; connected = dots fill coral -> violet, the wallet becomes the seal, then it
continues by itself; cancelled = dots fall, neutral; no wallet = dashed slot and install links.
Colours come from the theme tokens, so everything follows Light / Dark; the brand gradient and the (mocked) wallet
sheet stay the same in both, like the logo.
"""
import math, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(os.path.dirname(HERE), 'src')
sys.path.insert(0, HERE)
import material_icons as mi   # noqa: E402

WALLET_NAME = 'Phantom'   # the prototype's example; the app shows the installed MWA wallet's own name and icon


def icon(name, size=22, weight='regular'):
    return ('<svg width="%d" height="%d" viewBox="0 -960 960 960" fill="currentColor" aria-hidden="true">%s</svg>'
            % (size, size, ''.join('<path d="%s"></path>' % d for d in mi.material(name, weight))))


def cookie(cx=28, cy=28, r=23, amp=1.8, lobes=9):
    pts = []
    for i in range(121):
        a = i / 120 * 2 * math.pi
        rr = r + amp * math.cos(lobes * a)
        pts.append('%s%.2f %.2f' % ('L' if i else 'M', cx + rr * math.cos(a), cy + rr * math.sin(a)))
    return ' '.join(pts) + ' Z'


_seal_n = [0]


def seal(size=52):
    _seal_n[0] += 1
    gid = 'vnSeal%d' % _seal_n[0]
    return ('<svg class="vn-seal" width="%d" height="%d" viewBox="0 0 56 56" aria-hidden="true"><defs><linearGradient id="%s" x1="0" y1="0" x2="1" y2="1">'
            '<stop offset="0" stop-color="#FC5457"></stop><stop offset="1" stop-color="#703AE6"></stop></linearGradient></defs>'
            '<circle class="vn-seal-pulse" cx="28" cy="28" r="25" fill="none" stroke="url(#%s)" stroke-width="2"></circle>'
            '<path class="vn-seal-shape" d="%s" fill="url(#%s)"></path>'
            '<path class="vn-seal-tick" d="M17.5 28.5 L25 35.5 L39.5 20" fill="none" stroke="#FFFFFF" stroke-width="4.6" stroke-linecap="square" stroke-linejoin="miter"></path></svg>'
            % (size, size, gid, gid, cookie(), gid))


WAL = icon('account_balance_wallet', 22)
RING_WAIT = '<span class="vn-ring vn-ring-wait"><span class="vn-ring-core">' + WAL + '</span></span>'
RING_ARC = ('<span class="vn-ring vn-ring-arc"><svg class="vn-arc" width="52" height="52" viewBox="0 0 52 52" aria-hidden="true"><circle cx="26" cy="26" r="23.5" fill="none" stroke="var(--vn-acc)" '
            'stroke-width="3.5" stroke-linecap="round" stroke-dasharray="40 120"></circle></svg><span class="vn-ring-core">' + WAL + '</span></span>')
RING_SEAL = '<span class="vn-ring vn-ring-seal">' + seal(52) + '</span>'
RING_FAIL = '<span class="vn-ring vn-ring-fail"><span class="vn-ring-core">!</span></span>'
RING_OFF = '<span class="vn-ring vn-ring-off"><span class="vn-ring-core">' + WAL + '</span></span>'
VARS = ('--vn-ink: {{ t.text }}; --vn-ink2: {{ t.text2 }}; --vn-bd: {{ t.bd }}; --vn-acc: {{ t.link }}; --vn-card: {{ t.card }}; '
        '--vn-tv: {{ t.tv }}; --vn-tvi: {{ t.tvI }}; --vn-page: {{ t.page }}')


def row(ring, title, sub, extra=''):
    return ('<div class="vn-tx-row">' + ring + '<div class="vn-tx-txt"><b>' + title + '</b><span>' + sub + '</span></div>' + extra + '</div>')


def steps(lit):
    names = ['Sent', 'Processed', 'Confirmed']
    out = []
    for i, n in enumerate(names):
        if lit == 'all':
            cls = 'on'
        else:   # 'confirm': Sent at once, Processed ~0.5s later, Confirmed when Solana confirms (the done state)
            cls = 'on' if i == 0 else ('later' if i == 1 else '')
        out.append('<span class="%s"><i></i>%s</span>' % (cls, n))
    return '<div class="vn-tx-steps">' + '<em></em>'.join(out) + '</div>'


def btn(label, on, kind='tonal'):
    return '<button type="button" onClick="{{ %s }}" class="vn-tx-btn vn-tx-%s">%s</button>' % (on, kind, label)


def link(href, label):
    return '<a href="%s" class="vn-tx-btn vn-tx-tonal">%s</a>' % (href, label)


def tx_block(title, text, primary):
    acts_done = (link(*primary) + btn('Done', 'closeTx', 'text')) if primary else btn('Done', 'closeTx', 'tonal')
    return ('<sc-if value="{{ txOpen }}" hint-placeholder-val="{{ false }}">\n'
            '<div aria-hidden="true" class="vn-tx-veil"></div>\n'
            '<div role="status" aria-live="polite" class="vn-tx" style="' + VARS + '">\n'
            '<sc-if value="{{ txSign }}" hint-placeholder-val="{{ true }}">' +
            row(RING_WAIT, 'Approve in ' + WALLET_NAME, 'On Seeker: double-tap the side button',
                '<span class="vn-tx-stepchip" style="display: {{ txStepShow }}">{{ txStepLabel }}</span>') +
            '<div class="vn-tx-acts">' + btn('Cancel', 'closeTx', 'text') + '</div>'
            '<button type="button" data-wallet-auto="1" onClick="{{ approveTx }}" tabindex="-1" aria-hidden="true" style="display: none">Approve in wallet</button></sc-if>\n'
            '<sc-if value="{{ txConfirm }}" hint-placeholder-val="{{ false }}">' + row(RING_ARC, 'Sent to Solana', 'Usually under 2 seconds') + steps('confirm') + '</sc-if>\n'
            '<sc-if value="{{ txDone }}" hint-placeholder-val="{{ false }}">' + row(RING_SEAL, title, text) + steps('all') +
            '<div class="vn-tx-acts">' + acts_done + '</div></sc-if>\n'
            '<sc-if value="{{ txFailed }}" hint-placeholder-val="{{ false }}">' + row(RING_FAIL, '{{ txFailTitle }}', '{{ txFailBody }}') +
            '<div class="vn-tx-acts">' + btn('{{ txRetryLabel }}', 'retryTx', 'tonal') + btn('Close', 'closeTx', 'text') + '</div></sc-if>\n'
            '<sc-if value="{{ txRejected }}" hint-placeholder-val="{{ false }}">' + row(RING_OFF, 'Cancelled in ' + WALLET_NAME, 'Nothing was sent.') +
            '<div class="vn-tx-acts">' + btn('Try again', 'retryTx', 'tonal') + btn('Close', 'closeTx', 'text') + '</div></sc-if>\n'
            '</div>\n</sc-if>')


def matching_end(h, start):
    """index just after the </sc-if> that closes the <sc-if> opened at start"""
    depth, i = 0, start
    for m in re.finditer(r'<sc-if\b|</sc-if>', h[start:]):
        depth += 1 if m.group(0) == '<sc-if' else -1
        if depth == 0:
            return start + m.end()
    raise ValueError('unbalanced sc-if')


def transactions():
    for f in sorted(os.listdir(os.path.join(SRC, 'tpl'))):
        p = os.path.join(SRC, 'tpl', f)
        h = open(p, encoding='utf8').read()
        if '{{ txDone }}' not in h or 'class="vn-tx"' in h:
            continue
        a = h.index('<sc-if value="{{ txOpen }}"')
        b = matching_end(h, a)
        blk = h[a:b]
        d = blk[blk.index('<sc-if value="{{ txDone }}"'):]
        d = d[:d.index('</sc-if>')]
        title = re.search(r'<h2[^>]*>(.*?)</h2>', d, flags=re.S).group(1).strip()
        text = re.search(r'<p(?:\s[^>]*)?>(.*?)</p>', d, flags=re.S).group(1).strip()   # <p ...>, not <path ...>
        prim = [(href, re.sub(r'<.*', '', lab).strip()) for href, lab in re.findall(r'<a href="([^"#][^"]*)"[^>]*>(.*?)</a>', d, flags=re.S)]
        new = tx_block(title, text, prim[0] if prim else None)
        open(p, 'w', encoding='utf8').write(h[:a] + new + h[b:])
        print('tx card:', f, '|', title, '|', prim[0] if prim else 'Done')
    # repair cards built before the <path> fix: the old heading and icon tail leaked into the text line
    for f in sorted(os.listdir(os.path.join(SRC, 'tpl'))):
        p = os.path.join(SRC, 'tpl', f)
        h = open(p, encoding='utf8').read()
        n = re.sub(r'<div class="vn-tx-txt"><b>([^<]*)</b><span></path></svg></span>\s*<h2[^>]*>.*?</h2>\s*<p(?:\s[^>]*)?>(.*?)</span></div>',
                   lambda m: '<div class="vn-tx-txt"><b>' + m.group(1) + '</b><span>' + m.group(2) + '</span></div>', h, flags=re.S)
        if n != h:
            open(p, 'w', encoding='utf8').write(n)
            print('tx card repaired:', f)
    # "Step N of M" only for real multi-step flows
    for f in sorted(os.listdir(os.path.join(SRC, 'cls'))):
        p = os.path.join(SRC, 'cls', f)
        s = open(p, encoding='utf8').read()
        if "__v.txStepLabel = 'Step ' + __st + ' of ' + __n;" in s and 'txStepShow' not in s:
            s = s.replace("__v.txStepLabel = 'Step ' + __st + ' of ' + __n;",
                          "__v.txStepLabel = 'Step ' + __st + ' of ' + __n; __v.txStepShow = __n > 1 ? 'inline-flex' : 'none';", 1)
            open(p, 'w', encoding='utf8').write(s)


# ------------------------------------------------------------------ connect (design A)
MARK_TILE = ('<span class="vn-hs-tile vn-hs-v"><svg width="30" height="30" viewBox="11 12 232 232" aria-hidden="true"><defs><linearGradient id="vnHsG" gradientUnits="userSpaceOnUse" x1="31.7" y1="73" x2="222.3" y2="183">'
             '<stop offset="0" stop-color="#FC5457"></stop><stop offset="1" stop-color="#703AE6"></stop></linearGradient></defs><path fill="url(#vnHsG)" fill-rule="evenodd" d="__MARK__"></path></svg></span>')
BRIDGE = '<span class="vn-hs-bridge"><i></i><i></i><i></i><i></i><i></i></span>'


def hand(state, wallet_inner=None):
    w = wallet_inner if wallet_inner is not None else WAL
    return ('<div class="vn-hs vn-hs-%s">' % state) + MARK_TILE + BRIDGE + '<span class="vn-hs-tile vn-hs-w">' + w + '</span></div>'


def ctitle(t, s):
    return ('<div class="vn-hs-copy"><h2 style="margin: 0; font-size: 22px; line-height: 28px; font-weight: 600">%s</h2>'
            '<p style="margin: 4px 0 0 0; font-size: 14px; line-height: 20px; color: {{ t.text2 }}">%s</p></div>' % (t, s))


PRIMARY = 'width: 100%; height: 52px; border-radius: 26px; border: 0; background: #703AE6; color: #FFFFFF; font-size: 16px; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 8px; text-decoration: none'
TONAL = 'height: 52px; border-radius: 26px; border: 0; background: {{ t.tv }}; color: {{ t.tvI }}; font-size: 16px; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 8px; text-decoration: none'
TEXT = 'width: 100%; height: 44px; border: 0; background: transparent; color: {{ t.text }}; font-size: 14px; font-weight: 600; display: flex; align-items: center; justify-content: center; text-decoration: none'


def connect_blocks():
    wn = WALLET_NAME
    priv = ('<div style="margin-top: 12px; display: flex; align-items: center; justify-content: center; gap: 6px; font-size: 12px; color: {{ t.text2 }}">'
            + icon('lock', 14) + 'Only your address is shared</div>')
    return {
        'isPick': hand('in') + ctitle('Connect ' + wn, 'You approve in %s. Vanna never holds your keys.' % wn) +
                  '<button type="button" onClick="{{ pickBackpack }}" class="vn-hs-go" style="margin-top: 20px; ' + PRIMARY + '">' + icon('account_balance_wallet', 20) + 'Open ' + wn + '</button>' + priv,
        'isApprove': hand('wait') + ctitle('Waiting for ' + wn, 'Approve the request in %s to continue.' % wn) +
                     '<div style="margin-top: 20px; display: flex; justify-content: center"><span class="vn-hs-pill" style="width: 240px; ' + TONAL + '"><span class="vn-loader"></span>Waiting for ' + wn + '</span></div>'
                     '<button type="button" onClick="{{ decline }}" style="margin-top: 4px; ' + TEXT + '">Cancel</button>'
                     '<button type="button" data-wallet-auto="1" onClick="{{ approved }}" tabindex="-1" aria-hidden="true" style="display: none">Approve in wallet</button>',
        'isDone': hand('linked', seal(56)) + ctitle('Connected', '') +
                  '<div style="margin-top: 10px; display: flex; justify-content: center"><span style="height: 30px; padding: 0 12px 0 6px; border-radius: 15px; background: {{ t.tv }}; color: {{ t.tvI }}; font-size: 13px; font-weight: 600; display: inline-flex; align-items: center; gap: 6px">'
                  '<span style="width: 20px; height: 20px; border-radius: 999px; background: linear-gradient(135deg, #FC5457, #703AE6)"></span>7xKX…9fQa</span></div>'
                  '<a href="V7Spaces.dc.html" data-auto-go="1400" style="margin-top: 18px; ' + TEXT + '; color: {{ t.text2 }}">Continue</a>',
        'isDeclined': hand('fell') + ctitle('Cancelled in ' + wn, 'Nothing was connected.') +
                      '<button type="button" onClick="{{ retry }}" style="margin-top: 20px; ' + PRIMARY + '">Try again</button>'
                      '<a href="V7Welcome.dc.html" style="margin-top: 4px; ' + TEXT + '">Not now</a>',
        'isInstall': hand('none', '') + ctitle('Get a Solana wallet', 'Vanna trades from a wallet app on your phone. Install one, then come back.') +
                     '<div style="margin-top: 20px; display: flex; gap: 10px"><a href="#" style="flex: 1 1 0; ' + TONAL + '">Get Phantom</a><a href="#" style="flex: 1 1 0; ' + TONAL + '">Get Solflare</a></div>'
                     '<button type="button" onClick="{{ retry }}" style="margin-top: 4px; ' + TEXT + '">I have installed one</button>',
    }


def connect():
    import json
    # no wallet installed: go straight to "Get a Solana wallet" instead of offering "Open Phantom" first
    for f in sorted(os.listdir(os.path.join(SRC, 'cls'))):
        cp = os.path.join(SRC, 'cls', f)
        s = open(cp, encoding='utf8').read()
        if "isPick: cs === 'pick'," in s:
            s = s.replace("isPick: cs === 'pick',", "isPick: cs === 'pick' && !noBp,", 1).replace(
                "isInstall: cs === 'install',", "isInstall: cs === 'install' || (cs === 'pick' && noBp),", 1)
            open(cp, 'w', encoding='utf8').write(s)
    p = os.path.join(SRC, 'tpl', '01-V7Connect.html')
    h = open(p, encoding='utf8').read()
    if 'class="vn-hs ' in h:
        print('connect: already done')
        return
    mark = json.load(open(os.path.join(HERE, 'mark.json')))['d']
    # Welcome is always dark, so the connect sheet over it is always dark too (Vanna's dark tokens), whatever the theme
    dark = {'{{ t.text2 }}': '#BFBFBF', '{{ t.text }}': '#FFFFFF', '{{ t.tv }}': '#2F1B61', '{{ t.tvI }}': '#D3C2F7',
            '{{ t.bd }}': '#2C2C2C', '{{ t.card }}': '#1E1E1E', '{{ t.page }}': '#111111', '{{ t.link }}': '#BDA4F4'}

    def darken(s):
        for k, v in dark.items():
            s = s.replace(k, v)
        return s
    for key, body in connect_blocks().items():
        a = h.index('<sc-if value="{{ %s }}"' % key)
        b = matching_end(h, a)
        head = h[a:h.index('>', a) + 1]
        h = h[:a] + head + '\n<div class="vn-hs-wrap">' + darken(body.replace('__MARK__', mark)) + '</div>\n</sc-if>' + h[b:]
    # the sheet grows out of the Connect button (container transform) instead of sliding up
    h = h.replace('class="vn-sheet" style="position: absolute; z-index: 21; left: 0; right: 0; bottom: 0; border-radius: 28px 28px 0 0; background: {{ t.card }}; color: {{ t.text }}; padding: 10px 20px 28px 20px; animation: vnSheet 340ms cubic-bezier(0.2, 0.9, 0.3, 1)"',
                  'class="vn-sheet vn-hs-sheet" style="position: absolute; z-index: 21; left: 0; right: 0; bottom: 0; border-radius: 28px 28px 0 0; background: #1E1E1E; color: #FFFFFF; padding: 10px 22px 28px 22px; ' + darken(VARS) + '"', 1)
    h = h.replace('<div style="width: 36px; height: 4px; margin: 0 auto; border-radius: 2px; background: {{ t.bd }}"></div>',
                  '<div style="width: 36px; height: 4px; margin: 0 auto; border-radius: 2px; background: #3A3A42"></div>', 1)
    open(p, 'w', encoding='utf8').write(h)
    print('connect: design A')


# ------------------------------------------------------------------ styles
CSS = r'''
/* ===== tx-motion (tools/tx_motion.py) ===== */
@keyframes vnTxGrow { from { clip-path: inset(calc(100% - 56px) 18% 0 18% round 28px); } to { clip-path: inset(0 0 0 0 round 24px); } }
@keyframes vnTxIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
@keyframes vnVeil { from { opacity: 0; } to { opacity: 1; } }
.vn-tx-veil { position: absolute; inset: 0; z-index: 50; background: rgba(10, 8, 18, 0.18); animation: vnVeil 200ms cubic-bezier(0.2, 0, 0, 1); }
.vn-tx { position: absolute; z-index: 51; left: 12px; right: 12px; bottom: 12px; padding: 16px; border-radius: 24px; background: var(--vn-card); color: var(--vn-ink);
  box-shadow: 0 0 0 1px var(--vn-bd), 0 18px 44px rgba(17, 11, 46, 0.22); animation: vnTxGrow 320ms cubic-bezier(0.05, 0.7, 0.1, 1); }
.vn-3btn .vn-tx { bottom: 60px; }
/* the status card already says it: no snackbar repeating "Strategy deployed" / "Swapped" on top */
#screen:has(.vn-tx) .toast { display: none !important; }
.vn-wide .vn-tx { left: 50%; right: auto; width: min(560px, calc(100% - 48px)); transform: translateX(-50%); }
.vn-tx-row { display: flex; align-items: center; gap: 14px; animation: vnTxIn 240ms cubic-bezier(0.2, 0, 0, 1) both; }
.vn-tx-txt { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.vn-tx-txt b { font-size: 16px; line-height: 22px; font-weight: 600; } .vn-tx-txt span { font-size: 13px; line-height: 18px; color: var(--vn-ink2); }
.vn-tx-stepchip { height: 24px; padding: 0 8px; border-radius: 12px; background: var(--vn-page); color: var(--vn-ink2); font-size: 12px; font-weight: 600; align-items: center; flex-shrink: 0; }
.vn-tx-steps { margin-top: 14px; display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--vn-ink2); animation: vnTxIn 240ms cubic-bezier(0.2, 0, 0, 1) 40ms both; }
.vn-tx-steps span { display: inline-flex; align-items: center; gap: 5px; } .vn-tx-steps em { width: 14px; height: 1px; background: var(--vn-bd); }
.vn-tx-steps i { width: 8px; height: 8px; border-radius: 50%; background: var(--vn-bd); }
.vn-tx-steps .on { color: var(--vn-ink); } .vn-tx-steps .on i { background: var(--vn-acc); }
@keyframes vnLit { to { background: var(--vn-acc); } } @keyframes vnLitTxt { to { color: var(--vn-ink); } }
.vn-tx-steps .later { animation: vnLitTxt 1ms linear 500ms both; } .vn-tx-steps .later i { animation: vnLit 1ms linear 500ms both; }
.vn-tx-acts { margin-top: 14px; display: flex; flex-direction: column; gap: 2px; animation: vnTxIn 240ms cubic-bezier(0.2, 0, 0, 1) 80ms both; }
.vn-tx-btn { height: 48px; border-radius: 24px; border: 0; display: flex; align-items: center; justify-content: center; font: 600 15px 'Plus Jakarta Sans', system-ui, sans-serif; text-decoration: none; cursor: pointer; }
.vn-tx-tonal { background: var(--vn-tv); color: var(--vn-tvi); } .vn-tx-text { background: transparent; color: var(--vn-ink); height: 40px; }
.vn-ring { position: relative; width: 52px; height: 52px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
.vn-ring-core { width: 44px; height: 44px; border-radius: 50%; background: var(--vn-tv); color: var(--vn-tvi); display: flex; align-items: center; justify-content: center; font-size: 22px; font-weight: 700; }
@keyframes vnBreathe { 0%, 100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--vn-acc) 35%, transparent); } 50% { box-shadow: 0 0 0 5px color-mix(in srgb, var(--vn-acc) 18%, transparent); } }
.vn-ring-wait .vn-ring-core { animation: vnBreathe 1600ms ease-in-out infinite; }
.vn-arc { position: absolute; inset: 0; animation: vnSpin 900ms linear infinite; } @keyframes vnSpin { to { transform: rotate(360deg); } }
.vn-ring-fail .vn-ring-core { background: #FC5457; color: #FFFFFF; animation: vnNudge 280ms cubic-bezier(0.2, 0, 0, 1) 2; }
@keyframes vnNudge { 0%, 100% { transform: none; } 25% { transform: translateX(-6px); } 75% { transform: translateX(6px); } }
.vn-ring-off .vn-ring-core { background: var(--vn-page); color: var(--vn-ink2); }
/* the Vanna seal: settles with a spring, pulses once, then the tick draws */
.vn-seal { overflow: visible; }
.vn-seal-shape, .vn-seal-pulse { transform-box: fill-box; transform-origin: center; }
@keyframes vnSealIn { from { transform: scale(0.35) rotate(-50deg); opacity: 0; } to { transform: none; opacity: 1; } }
@keyframes vnSealPulse { 0% { opacity: 0.6; transform: scale(0.85); } 100% { opacity: 0; transform: scale(1.35); } }
@keyframes vnTick { from { stroke-dashoffset: 34; } to { stroke-dashoffset: 0; } }
.vn-seal-shape { animation: vnSealIn 480ms cubic-bezier(0.34, 1.4, 0.64, 1) both; }
.vn-seal-pulse { opacity: 0; animation: vnSealPulse 700ms cubic-bezier(0.05, 0.7, 0.1, 1) 140ms 1 both; }
.vn-seal-tick { stroke-dasharray: 34; animation: vnTick 280ms cubic-bezier(0.05, 0.7, 0.1, 1) 220ms both; }
/* connect: handshake sheet */
@keyframes vnHsGrow { from { clip-path: inset(calc(100% - 150px) 20px 92px 20px round 28px); } to { clip-path: inset(0 0 0 0 round 28px 28px 0 0); } }
.vn-hs-sheet { animation: vnHsGrow 340ms cubic-bezier(0.05, 0.7, 0.1, 1) !important; }
.vn-hs-wrap { padding-top: 20px; text-align: center; animation: vnTxIn 240ms cubic-bezier(0.2, 0, 0, 1) 120ms both; }
.vn-hs { display: flex; align-items: center; justify-content: center; margin-bottom: 18px; }
.vn-hs-tile { width: 52px; height: 52px; border-radius: 16px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.vn-hs-v { background: #FFFFFF; box-shadow: 0 2px 10px rgba(47, 27, 97, 0.16); }
.vn-hs-w { background: #34343D; color: #FFFFFF; box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.08); }
@keyframes vnHsL { from { transform: translateX(-46px); opacity: 0; } to { transform: none; opacity: 1; } }
@keyframes vnHsR { from { transform: translateX(46px); opacity: 0; } to { transform: none; opacity: 1; } }
.vn-hs-in .vn-hs-v { animation: vnHsL 360ms cubic-bezier(0.34, 1.4, 0.64, 1) 160ms both; } .vn-hs-in .vn-hs-w { animation: vnHsR 360ms cubic-bezier(0.34, 1.4, 0.64, 1) 160ms both; }
.vn-hs-bridge { display: flex; gap: 7px; margin: 0 10px; }
.vn-hs-bridge i { width: 7px; height: 7px; border-radius: 50%; background: var(--vn-bd); }
@keyframes vnDotIn { from { opacity: 0; transform: scale(0.4); } to { opacity: 1; transform: none; } }
.vn-hs-in .vn-hs-bridge i { animation: vnDotIn 200ms cubic-bezier(0.2, 0, 0, 1) both; }
.vn-hs-in .vn-hs-bridge i:nth-child(1) { animation-delay: 320ms; } .vn-hs-in .vn-hs-bridge i:nth-child(2) { animation-delay: 350ms; } .vn-hs-in .vn-hs-bridge i:nth-child(3) { animation-delay: 380ms; }
.vn-hs-in .vn-hs-bridge i:nth-child(4) { animation-delay: 410ms; } .vn-hs-in .vn-hs-bridge i:nth-child(5) { animation-delay: 440ms; }
@keyframes vnTravel { 0%, 60%, 100% { background: var(--vn-bd); transform: none; } 20% { background: var(--vn-acc); transform: scale(1.35); } }
.vn-hs-wait .vn-hs-bridge i { animation: vnTravel 1200ms linear infinite; }
.vn-hs-wait .vn-hs-bridge i:nth-child(2) { animation-delay: 120ms; } .vn-hs-wait .vn-hs-bridge i:nth-child(3) { animation-delay: 240ms; }
.vn-hs-wait .vn-hs-bridge i:nth-child(4) { animation-delay: 360ms; } .vn-hs-wait .vn-hs-bridge i:nth-child(5) { animation-delay: 480ms; }
@keyframes vnFill { from { background: var(--vn-bd); } }
.vn-hs-linked .vn-hs-bridge i { animation: vnFill 250ms cubic-bezier(0.2, 0, 0, 1) both; }
.vn-hs-linked .vn-hs-bridge i:nth-child(1) { background: #FC5457; } .vn-hs-linked .vn-hs-bridge i:nth-child(2) { background: #E24D74; animation-delay: 50ms; }
.vn-hs-linked .vn-hs-bridge i:nth-child(3) { background: #C04595; animation-delay: 100ms; } .vn-hs-linked .vn-hs-bridge i:nth-child(4) { background: #9A3FBE; animation-delay: 150ms; }
.vn-hs-linked .vn-hs-bridge i:nth-child(5) { background: #703AE6; animation-delay: 200ms; }
.vn-hs-linked .vn-hs-w { background: transparent; }
@keyframes vnFall { to { opacity: 0; transform: translateY(10px) scale(0.6); } }
.vn-hs-fell .vn-hs-bridge i { animation: vnFall 220ms cubic-bezier(0.3, 0, 0.8, 0.15) both; }
.vn-hs-fell .vn-hs-w { animation: vnNudge 280ms cubic-bezier(0.2, 0, 0, 1) 2; }
.vn-hs-none .vn-hs-w { background: transparent; border: 2px dashed var(--vn-bd); }
.vn-hs-none .vn-hs-bridge i { opacity: 0.5; }
.vn-loader { width: 18px; height: 18px; background: currentColor; display: inline-block; animation: vnShapes 1100ms cubic-bezier(0.2, 0, 0, 1) infinite; }
@keyframes vnShapes { 0% { border-radius: 50%; transform: rotate(0) scale(0.9); } 33% { border-radius: 30% 70% 50% 50%; transform: rotate(120deg); } 66% { border-radius: 6px; transform: rotate(240deg) scale(0.85); } 100% { border-radius: 50%; transform: rotate(360deg) scale(0.9); } }
@media (prefers-reduced-motion: reduce) { .vn-tx, .vn-tx *, .vn-hs-sheet, .vn-hs-wrap, .vn-hs * { animation-duration: 1ms !important; animation-iteration-count: 1 !important; } }
/* ===== end tx-motion ===== */
'''


def styles():
    p = os.path.join(SRC, 'styles.css')
    s = open(p, encoding='utf8').read()
    s = re.sub(r'\n/\* ===== tx-motion.*?/\* ===== end tx-motion ===== \*/\n', '\n', s, flags=re.S)
    open(p, 'w', encoding='utf8').write(s.rstrip('\n') + '\n' + CSS)


if __name__ == '__main__':
    styles()
    transactions()
    connect()
