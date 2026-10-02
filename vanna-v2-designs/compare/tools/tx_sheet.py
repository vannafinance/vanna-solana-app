"""Transaction status, style A "Balanced sheet" (chosen 2 Oct 2026 from compare/previews/txcards.html).

    python compare/tools/tx_sheet.py      (safe to re-run; run after tx_motion.py and history_swap.py)

Replaces the compact card of tx_motion.py on every transaction screen with a bottom sheet where everything sits on one
centred axis: the status glyph (64dp), a title, one line, then two equal buttons side by side
(Close / Done on the left, Try again / the screen's next step on the right, in the space's gradient).
Waiting shows a single Cancel. Each screen keeps its own success title, line and next-step link.
"""
import os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(os.path.dirname(HERE), 'src')
sys.path.insert(0, HERE)
from tx_motion import (RING_WAIT, RING_ARC, RING_FAIL, RING_OFF, seal, steps, VARS, WALLET_NAME, matching_end)   # noqa: E402
from buttons_gradient import SPACE, CTA                                                                          # noqa: E402


def btn(label, on, kind):
    return '<button type="button" onClick="{{ %s }}" class="vn-tx-btn vn-tx-%s">%s</button>' % (on, kind, label)


def inner(ring, title, text, extra=''):
    return '<div class="vn-txA-in">' + ring + '<h3>' + title + '</h3><p>' + text + '</p>' + extra + '</div>'


def acts(*buttons):
    return '<div class="vn-txA-acts">' + ''.join(buttons) + '</div>'


def sheet(space, title, text, primary):
    ring_seal = '<span class="vn-ring vn-ring-seal">' + seal(64) + '</span>'
    done_acts = acts(btn('Done', 'closeTx', 'out'), '<a href="%s" class="vn-tx-btn vn-tx-fill">%s</a>' % primary) if primary else acts(btn('Done', 'closeTx', 'fill'))
    return ('<sc-if value="{{ txOpen }}" hint-placeholder-val="{{ false }}">\n'
            '<div aria-hidden="true" class="vn-tx-veil"></div>\n'
            '<div role="status" aria-live="polite" class="vn-tx vn-txA" style="' + VARS + '; --vn-grad: ' + CTA[space] + '">\n'
            '<div class="vn-txA-grab"></div>\n'
            '<sc-if value="{{ txSign }}" hint-placeholder-val="{{ true }}">' +
            inner(RING_WAIT, 'Approve in ' + WALLET_NAME, 'Your wallet is open. Nothing moves until you approve there.',
                  '<span class="vn-tx-stepchip" style="display: {{ txStepShow }}">{{ txStepLabel }}</span>') +
            acts(btn('Cancel', 'closeTx', 'text')) +
            '<button type="button" data-wallet-auto="1" onClick="{{ approveTx }}" tabindex="-1" aria-hidden="true" style="display: none">Approve in wallet</button></sc-if>\n'
            '<sc-if value="{{ txConfirm }}" hint-placeholder-val="{{ false }}">' + inner(RING_ARC, 'Sent to Solana', 'Usually under 2 seconds.', steps('confirm')) + '</sc-if>\n'
            '<sc-if value="{{ txDone }}" hint-placeholder-val="{{ false }}">' + inner(ring_seal, title, text, steps('all')) + done_acts + '</sc-if>\n'
            '<sc-if value="{{ txFailed }}" hint-placeholder-val="{{ false }}">' + inner(RING_FAIL, '{{ txFailTitle }}', '{{ txFailBody }}') +
            acts(btn('Close', 'closeTx', 'out'), btn('{{ txRetryLabel }}', 'retryTx', 'fill')) + '</sc-if>\n'
            '<sc-if value="{{ txRejected }}" hint-placeholder-val="{{ false }}">' + inner(RING_OFF, 'Cancelled in ' + WALLET_NAME, 'Nothing was sent. Your amounts are still here.') +
            acts(btn('Close', 'closeTx', 'out'), btn('Try again', 'retryTx', 'fill')) + '</sc-if>\n'
            '</div>\n</sc-if>')


def convert():
    for f in sorted(os.listdir(os.path.join(SRC, 'tpl'))):
        p = os.path.join(SRC, 'tpl', f)
        h = open(p, encoding='utf8').read()
        if 'class="vn-tx"' not in h and 'class="vn-tx vn-txA"' not in h:
            continue
        a = h.index('<sc-if value="{{ txOpen }}"')
        b = matching_end(h, a)
        blk = h[a:b]
        d = blk[blk.index('<sc-if value="{{ txDone }}"'):]
        d = d[:matching_end(d, 0)]
        if 'vn-txA' in blk:   # already a sheet: read it back so re-runs pick up colour changes
            title = re.search(r'<h3>(.*?)</h3>', d, flags=re.S).group(1)
            text = re.search(r'<h3>.*?</h3><p>(.*?)</p>', d, flags=re.S).group(1)
        else:
            m = re.search(r'<div class="vn-tx-txt"><b>(.*?)</b><span>(.*?)</span></div>', d, flags=re.S)
            title, text = m.group(1), m.group(2)
        pm = re.search(r'<a href="([^"]+)" class="vn-tx-btn[^"]*">(.*?)</a>', d, flags=re.S)
        new = sheet(SPACE[f[:2]], title, text, (pm.group(1), pm.group(2)) if pm else None)
        if new != blk:
            open(p, 'w', encoding='utf8').write(h[:a] + new + h[b:])
            print('sheet:', f, '|', title, '|', pm.group(2) if pm else 'Done')


CSS = r'''
/* ===== tx-sheet A (tools/tx_sheet.py) ===== */
@keyframes vnTxSheet { from { transform: translateY(100%); } to { transform: none; } }
.vn-tx.vn-txA { left: 0; right: 0; bottom: 0; border-radius: 28px 28px 0 0; padding: 12px 20px 24px; text-align: center;
  animation: vnTxSheet 340ms cubic-bezier(0.05, 0.7, 0.1, 1); box-shadow: 0 -10px 30px -12px rgba(17, 11, 46, 0.28); }
.vn-3btn .vn-tx.vn-txA { bottom: 0; }   /* #screen already stops above the 3-button bar */
.vn-wide .vn-tx.vn-txA { left: 50%; right: auto; width: min(560px, calc(100% - 48px)); margin-left: calc(min(560px, calc(100% - 48px)) / -2); transform: none; border-radius: 28px; bottom: 24px; }
.vn-txA-grab { width: 32px; height: 4px; border-radius: 2px; background: var(--vn-bd); margin: 0 auto 16px; }
.vn-txA-in { display: flex; flex-direction: column; align-items: center; animation: vnTxIn 240ms cubic-bezier(0.2, 0, 0, 1) both; }
.vn-txA h3 { margin: 14px 0 0; font: 600 20px/26px 'Plus Jakarta Sans', system-ui, sans-serif; color: var(--vn-ink); }
.vn-txA p { margin: 6px 0 0; font-size: 14px; line-height: 20px; color: var(--vn-ink2); max-width: 300px; }
.vn-txA .vn-tx-steps { justify-content: center; margin-top: 14px; }
.vn-txA .vn-tx-stepchip { margin-top: 10px; }
.vn-txA-acts { margin-top: 20px; display: flex; gap: 10px; animation: vnTxIn 240ms cubic-bezier(0.2, 0, 0, 1) 60ms both; }
.vn-txA-acts .vn-tx-btn { flex: 1 1 0; height: 50px; border-radius: 25px; }
.vn-txA-acts .vn-tx-text { height: 44px; color: var(--vn-ink2); }
.vn-tx-out { background: transparent; color: var(--vn-ink); box-shadow: inset 0 0 0 1.5px var(--vn-bd); }
.vn-tx-fill { background: var(--vn-grad); color: #FFFFFF; }
.vn-txA .vn-ring { width: 64px; height: 64px; }
.vn-txA .vn-ring-core { width: 60px; height: 60px; font-size: 26px; }
.vn-txA .vn-arc, .vn-txA .vn-seal { width: 64px; height: 64px; }
.vn-txA .vn-ring-off .vn-ring-core { animation: vnNudge 280ms cubic-bezier(0.2, 0, 0, 1) 2; }
@media (prefers-reduced-motion: reduce) { .vn-tx.vn-txA, .vn-txA * { animation-duration: 1ms !important; animation-iteration-count: 1 !important; } }
/* ===== end tx-sheet A ===== */
'''


def styles():
    p = os.path.join(SRC, 'styles.css')
    s = open(p, encoding='utf8').read()
    s = re.sub(r'\n/\* ===== tx-sheet A.*?/\* ===== end tx-sheet A ===== \*/\n', '\n', s, flags=re.S)
    open(p, 'w', encoding='utf8').write(s.rstrip('\n') + '\n' + CSS)


if __name__ == '__main__':
    styles()
    convert()
