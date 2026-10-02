"""Margin account without a separate page (chosen 2 Oct 2026, previews/marginflow.html "Envelope · Engraved").

    python compare/tools/margin_envelope.py      (safe to re-run; run after tx_sheet.py)

Two ways in, no agreements anywhere (Vanna's first margin action creates the account):
1. Trade > Markets with no margin account shows a small banner on top: "Open your margin account". Open brings up a tall
   sheet over Markets with the envelope: sealed with the Vanna seal, addressed to your wallet, the engraved account card
   inside. One approval in the wallet; while Solana confirms the seal breathes; on success the tick draws into the
   seal, the flap opens and the card rises out. You never leave Markets.
2. Going straight to an order without an account: the normal transaction sheet, in two steps. Step 1 carries the
   same envelope ("Step 1 of 2 · Open margin account"); when Solana confirms it opens and the card rises
   ("Margin account opened"), then step 2 asks for the Long 3x as usual and ends on the seal.

The old margin screens (V7MarginCreate, Agree, Sign, Done, Fee, Rejected) become states of Markets; the old
agreement template 12 is no longer used. New screen V7PerpsOrderFirst shows the two-step order.
"""
import json, math, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(os.path.dirname(HERE), 'src')
sys.path.insert(0, HERE)
import material_icons as mi                              # noqa: E402
from tx_motion import VARS, WALLET_NAME, matching_end    # noqa: E402
from buttons_gradient import CTA                         # noqa: E402

WALLET_ADDR, ACCOUNT_ADDR = '7xKX…9fQa', '3pLm…Uw2c'      # the prototype's connected wallet and margin account


def icon(name, size):
    return ('<svg width="%d" height="%d" viewBox="0 -960 960 960" fill="currentColor" aria-hidden="true">%s</svg>'
            % (size, size, ''.join('<path d="%s"></path>' % d for d in mi.material(name, 'regular'))))


def scallop():
    pts = []
    for i in range(121):
        a = i / 120 * math.pi * 2
        r = 23 + 1.8 * math.cos(9 * a)
        pts.append('%s%.2f %.2f' % ('L' if i else 'M', 28 + r * math.cos(a), 28 + r * math.sin(a)))
    return ''.join(pts) + 'Z'


def wax(size):
    return ('<svg width="%d" height="%d" viewBox="0 0 56 56" aria-hidden="true"><defs><linearGradient id="vnWaxG" x1="0" y1="0" x2="1" y2="1">'
            '<stop offset="0" stop-color="#FC5457"></stop><stop offset="1" stop-color="#703AE6"></stop></linearGradient></defs>'
            '<path d="%s" fill="url(#vnWaxG)"></path><circle cx="28" cy="28" r="17" fill="none" stroke="rgba(255,255,255,0.35)" stroke-width="1.2"></circle>'
            '<path class="vn-env-tick" d="M17.5 28.5 L25 35.5 L39.5 20" fill="none" stroke="#FFFFFF" stroke-width="4.6" stroke-linecap="square" stroke-linejoin="miter"></path></svg>'
            % (size, size, scallop()))


STAR = '<svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden="true"><path d="M7 0 L8.5 5.5 L14 7 L8.5 8.5 L7 14 L5.5 8.5 L0 7 L5.5 5.5Z"></path></svg>'


def envelope(mark, word):
    card = ('<div class="vn-env-card"><div class="vn-env-wm">' + mark + word + '</div>'
            '<div class="vn-env-bt"><div class="vn-env-num">' + ACCOUNT_ADDR + '</div><div class="vn-env-lab">Margin account</div></div></div>')
    return ('<div class="vn-envw {{ envCls }}" aria-hidden="true">'
            + ''.join('<span class="vn-env-spark" style="left: %dpx; top: %dpx; animation-delay: %dms">%s</span>' % (x, y, 1900 + i * 120, STAR)
                      for i, (x, y) in enumerate([(44, 40), (318, 58), (56, 178), (312, 170)])) +
            '<div class="vn-env"><div class="vn-env-back"></div>' + card + '<div class="vn-env-front"></div>'
            '<span class="vn-env-to">To ' + WALLET_ADDR + '</span><div class="vn-env-flap"></div><span class="vn-env-wax">' + wax(48) + '</span></div>'
            '<div class="vn-env-shadow"></div></div>')


def btn(label, on, kind):
    return '<button type="button" onClick="{{ %s }}" class="vn-tx-btn vn-tx-%s">%s</button>' % (on, kind, label)


def state(name, title, text, extra=''):
    return ('<sc-if value="{{ %s }}" hint-placeholder-val="{{ false }}"><div class="vn-txA-in"><h3>%s</h3><p>%s</p></div>%s</sc-if>\n'
            % (name, title, text, extra))


UNLOCKS = [('bolt', 'Long or short up to 5x', 'TSLAx, AAPLx and pre-IPO stocks'),
           ('psychiatry', 'Farm with leverage', 'Borrow USDC or SOL, earn on Kamino'),
           ('lock_open', 'Withdraw anytime', 'No lock-ups')]


def sheet(mark, word):
    unl = ('<div class="vn-munl">' + ''.join(
        '<div class="vn-munl-r"><span style="background: {{ t.tv }}; color: {{ t.tvI }}">%s</span><div><b>%s</b><small>%s</small></div></div>' % (icon(i, 18), a, b)
        for i, a, b in UNLOCKS) + '</div>')
    acts = lambda *b: '<div class="vn-txA-acts">' + ''.join(b) + '</div>'
    return ('<sc-if value="{{ mOpen }}" hint-placeholder-val="{{ false }}">\n'
            '<div aria-hidden="true" class="vn-tx-veil"></div>\n'
            '<div role="dialog" aria-label="Margin account" class="vn-tx vn-txA vn-msheet" style="' + VARS + '; --vn-grad: ' + CTA['trade'] + '">\n'
            '<div class="vn-txA-grab"></div>\n' + envelope(mark, word) + '\n' +
            state('mAsk', 'Oh no, you don’t have a margin account yet', 'It holds the collateral behind your trades.',
                  unl + acts(btn('Not now', 'mClose', 'out'), btn('Open account', 'mGo', 'fill')) + '<p class="vn-mfoot">One approval in your wallet. No forms, no agreements.</p>') +
            state('mSign', 'Approve in ' + WALLET_NAME, 'Your wallet is open. Nothing moves until you approve there.',
                  acts(btn('Cancel', 'mClose', 'text')) + '<button type="button" data-wallet-auto="1" onClick="{{ mApprove }}" tabindex="-1" aria-hidden="true" style="display: none">Approve in wallet</button>') +
            state('mConfirm', 'Opening on Solana', 'Usually under 2 seconds.') +
            state('mDone', 'Your margin account is open', 'Pick a market and go long or short.', acts(btn('Start trading', 'mClose', 'fill'))) +
            state('mRejected', 'Cancelled in ' + WALLET_NAME, 'Nothing was sent.', acts(btn('Close', 'mClose', 'out'), btn('Try again', 'mGo', 'fill'))) +
            state('mFailed', '{{ mFailTitle }}', '{{ mFailBody }}', acts(btn('Close', 'mClose', 'out'), btn('Try again', 'mGo', 'fill'))) +
            '</div>\n</sc-if>\n')


BANNER = ('<sc-if value="{{ noAcct }}" hint-placeholder-val="{{ false }}">'
          '<div class="vn-mban" style="background: {{ t.card }}"><div><b>Open your margin account</b><span style="color: {{ t.text2 }}">One tap, then go long or short up to 5x.</span></div>'
          '<button type="button" onClick="{{ mAskOpen }}" style="background: ' + CTA['trade'] + '">Open</button></div></sc-if>\n')

HERO_OLD = ('<div style="display: flex; align-items: center; justify-content: space-between; gap: 8px"><span style="font-size: 14px; line-height: 20px; color: rgba(255,255,255,0.78)">Net available collateral</span></div>\n'
            '<div style="margin-top: 2px; font-size: 40px; line-height: 48px; font-weight: 600; letter-spacing: -0.02em; color: #FFFFFF">$4,320<span style="color: rgba(255,255,255,0.56)">.37</span></div>\n')
HERO_NEW = ('<sc-if value="{{ acctHero }}" hint-placeholder-val="{{ true }}">' + HERO_OLD + '</sc-if>\n'
            '<sc-if value="{{ walletHero }}" hint-placeholder-val="{{ false }}"><div style="display: flex; align-items: center; justify-content: space-between; gap: 8px"><span style="font-size: 14px; line-height: 20px; color: rgba(255,255,255,0.78)">In your wallet, ready as collateral</span></div>\n'
            '<div style="margin-top: 2px; font-size: 40px; line-height: 48px; font-weight: 600; letter-spacing: -0.02em; color: #FFFFFF">$4,812<span style="color: rgba(255,255,255,0.56)">.40</span></div>\n</sc-if>\n')

MARKETS_JS = r'''/* margin-envelope (tools/margin_envelope.py) */
var __m = this.state.__m === undefined ? (this.props.m || '') : this.state.__m;
var __acct = this.state.__acct === undefined ? !this.props.noAcct : this.state.__acct;
var __mwhy = this.state.__mwhy || this.props.mwhy || 'network';
var __mout = function () { try { return (typeof window !== 'undefined' && window.__vnOutcome) || 'ok'; } catch (e) { return 'ok'; } };
var __MF = { network: ['Network error', 'Solana did not confirm this in time. Nothing left your wallet. Check your connection and try again.'],
  fee: ['Not enough SOL for fees', 'Opening the account needs a tiny SOL fee. Add a little SOL to your wallet, then try again.'],
  expired: ['Request expired', 'Your wallet didn\'t answer in time, so the request expired. Nothing was sent.'] };
var __mf = __MF[__mwhy] || __MF.network;
__v.noAcct = !__acct && __m !== 'done';
__v.walletHero = !__acct || __m === 'done'; __v.acctHero = !__v.walletHero;
__v.mOpen = __m !== ''; __v.mAsk = __m === 'ask'; __v.mSign = __m === 'sign'; __v.mConfirm = __m === 'confirm';
__v.mDone = __m === 'done'; __v.mFailed = __m === 'failed'; __v.mRejected = __m === 'rejected';
__v.envCls = __m === 'done' ? 'vn-env-opening' : (__m === 'confirm' ? 'vn-env-pend' : '');
__v.mFailTitle = __mf[0]; __v.mFailBody = __mf[1];
__v.mAskOpen = function () { self.setState({ __m: 'ask' }); };
__v.mGo = function () { self.setState({ __m: 'sign', __mwhy: '' }); };
__v.mClose = function () { self.setState(self.state.__m === 'done' || (self.state.__m === undefined && self.props.m === 'done') ? { __m: '', __acct: true } : { __m: '' }); };
__v.mApprove = function () { var o = __mout(); if (o === 'reject') { self.setState({ __m: 'rejected' }); return; }
  self.setState({ __m: 'confirm' });
  setTimeout(function () { if (self.state.__m !== 'confirm') return; if (o !== 'ok' && o !== 'step2') self.setState({ __m: 'failed', __mwhy: o }); else self.setState({ __m: 'done', __acct: true }); }, 2400); };
/* end margin-envelope */
'''

ORDER_JS = r'''/* margin-envelope (tools/margin_envelope.py): first trade also opens the margin account, step 1 of 2 */
__v.txAcct = __tx === 'acct'; __v.envShow = false; __v.envCls = '';
if (__n === 2) {
  var __next1 = __next;
  __next = function () {   // after step 1 the envelope opens; step 2 follows once the card is out
    var w = self.state.__why;
    if (self.state.__tx === 'confirm' && (self.state.__st || 1) === 1 && !(w && w !== 'ok')) {
      self.setState({ __tx: 'acct', __acct: true });
      setTimeout(function () { if (self.state.__tx === 'acct') self.setState({ __tx: 'sign', __st: 2 }); }, 2800);
      return;
    }
    __next1();
  };
  __v.envShow = (__st === 1 && ['sign', 'confirm', 'failed', 'rejected'].indexOf(__tx) >= 0) || __tx === 'acct';
  __v.envCls = __tx === 'acct' ? 'vn-env-opening' : (__tx === 'confirm' ? 'vn-env-pend' : '');
  __v.acctNext = (this.state.side || 'Long') + ' ' + (this.state.lev || 3) + 'x';
  __v.txStepLabel += __st === 1 ? ' · Open margin account' : ' · ' + (this.state.side || 'Long') + ' ' + (this.state.lev || 3) + 'x';
  if (__v.cta.indexOf('Not enough') < 0) __v.cta = 'Open account & ' + (this.state.side || 'Long').toLowerCase() + ' · 2 approvals';
  __v.doneText = 'Margin account opened. ' + __v.doneText;
}
/* end margin-envelope */
'''

CSS = r'''
/* ===== margin-envelope (tools/margin_envelope.py) ===== */
.vn-mban { margin: 0; padding: 12px 12px 12px 16px; border-radius: 18px; display: flex; align-items: center; gap: 12px; box-shadow: 0 0 0 1.5px #D9D3FB; animation: vnMban 420ms cubic-bezier(0.05, 0.7, 0.1, 1) both; }
.vn-isdark .vn-mban { box-shadow: 0 0 0 1.5px rgba(189, 164, 244, 0.35); }
.vn-mban > div { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.vn-mban b { font-size: 15px; line-height: 20px; font-weight: 600; } .vn-mban span { font-size: 13px; line-height: 18px; }
.vn-mban button { flex-shrink: 0; height: 40px; padding: 0 18px; border: 0; border-radius: 20px; color: #FFFFFF; font: 600 14px 'Plus Jakarta Sans', system-ui, sans-serif; }
@keyframes vnMban { from { opacity: 0; transform: translateY(-12px); } to { opacity: 1; transform: none; } }
.vn-msheet { max-height: calc(100% - 24px); overflow: visible; }
.vn-mfoot { margin: 12px 0 0 !important; font-size: 12px !important; color: var(--vn-ink2); max-width: none !important; }
.vn-munl { margin-top: 16px; text-align: left; border-top: 1px solid var(--vn-bd); }
.vn-munl-r { display: flex; align-items: center; gap: 12px; padding: 10px 2px; border-bottom: 1px solid var(--vn-bd); }
.vn-munl-r > span { width: 34px; height: 34px; border-radius: 11px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.vn-munl-r b { display: block; font-size: 14px; line-height: 20px; font-weight: 600; color: var(--vn-ink); } .vn-munl-r small { font-size: 12.5px; line-height: 16px; color: var(--vn-ink2); }

/* the envelope */
.vn-envw { position: relative; height: 256px; margin: -6px -20px 0; }
.vn-envw::before { content: ''; position: absolute; inset: 0; background-image: radial-gradient(rgba(75, 68, 224, 0.2) 1px, transparent 1.3px); background-size: 16px 16px;
  -webkit-mask-image: radial-gradient(55% 70% at 50% 55%, #000 20%, transparent 75%); mask-image: radial-gradient(55% 70% at 50% 55%, #000 20%, transparent 75%); }
.vn-envw::after { content: ''; position: absolute; inset: 0; background: radial-gradient(42% 52% at 50% 58%, rgba(108, 99, 255, 0.16), transparent 70%); pointer-events: none; }
.vn-env { position: absolute; left: 50%; top: 84px; width: 250px; height: 156px; margin-left: -125px; z-index: 2; animation: vnEnvBob 2600ms ease-in-out infinite; }
@keyframes vnEnvBob { 50% { transform: translateY(-7px); } }
.vn-env-shadow { position: absolute; left: 50%; top: 240px; width: 180px; height: 14px; margin-left: -90px; border-radius: 50%; background: radial-gradient(closest-side, rgba(47, 27, 97, 0.25), transparent); }
.vn-env-back, .vn-env-front, .vn-env-flap { position: absolute; inset: 0; }
.vn-env-back { border-radius: 16px; background: linear-gradient(180deg, #DCD3FB, #E9E3FD); z-index: 1; }
.vn-env-front { z-index: 3; border-radius: 16px; background: linear-gradient(170deg, #F6F3FF, #E6DFFC); clip-path: polygon(0 0, 50% 54%, 100% 0, 100% 100%, 0 100%); box-shadow: 0 18px 34px -18px rgba(75, 68, 224, 0.55); }
.vn-env-to { position: absolute; left: 16px; bottom: 12px; z-index: 4; font: 600 11px ui-monospace, Menlo, monospace; color: #7D72C9; letter-spacing: 0.04em; }
.vn-env-flap { z-index: 5; transform-origin: 50% 0; clip-path: polygon(0 0, 100% 0, 50% 62%); background: linear-gradient(180deg, #CFC4FA, #DCD3FB); border-radius: 16px 16px 0 0; }
.vn-env-wax { position: absolute; left: 50%; top: 97px; margin: -24px 0 0 -24px; z-index: 6; display: flex; border-radius: 50%; }
.vn-env-tick { stroke-dasharray: 34; stroke-dashoffset: 34; }
.vn-env-pend .vn-env-wax { animation: vnEnvBreathe 1200ms ease-in-out infinite; }
@keyframes vnEnvBreathe { 0%, 100% { box-shadow: 0 0 0 0 rgba(112, 58, 230, 0.35); } 50% { box-shadow: 0 0 0 9px rgba(112, 58, 230, 0); } }
/* the engraved card */
.vn-env-card { position: absolute; left: 7px; top: 4px; z-index: 2; width: 236px; height: 148px; border-radius: 18px; overflow: hidden; padding: 14px 16px; display: flex; flex-direction: column; color: #FFFFFF;
  background: repeating-radial-gradient(circle at 115% 125%, rgba(255, 255, 255, 0.07) 0 1px, transparent 1px 7px), radial-gradient(120% 100% at 0% 0%, rgba(112, 58, 230, 0.45), transparent 60%), #17131F;
  box-shadow: 0 22px 40px -18px rgba(47, 27, 97, 0.85), inset 0 0 0 1px rgba(255, 255, 255, 0.08); }
.vn-env-card::after { content: ''; position: absolute; top: -20%; bottom: -20%; width: 60px; left: -80px; transform: skewX(-18deg); background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent); }
.vn-env-wm { display: flex; align-items: center; gap: 7px; color: #FFFFFF; } .vn-env-wm svg { display: block; }
.vn-env-bt { margin-top: auto; }
.vn-env-num { font: 600 17px/22px ui-monospace, 'SFMono-Regular', Menlo, monospace; letter-spacing: 0.08em; }
.vn-env-lab { margin-top: 4px; font-size: 10.5px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: #CDBFFF; }
.vn-env-spark { position: absolute; width: 14px; height: 14px; color: #8B7CF6; opacity: 0; z-index: 6; }
/* success: the tick draws into the seal, the seal lifts, the flap opens, the card rises out and the envelope drops away */
.vn-env-opening .vn-env-tick { animation: vnEnvTick 300ms cubic-bezier(0.05, 0.7, 0.1, 1) both; }
.vn-env-opening .vn-env-wax { animation: vnEnvPop 360ms cubic-bezier(0.3, 0, 0.8, 0.15) 600ms both; }
.vn-env-opening .vn-env-flap { animation: vnEnvFlap 1400ms cubic-bezier(0.2, 0, 0, 1) 700ms both; }
.vn-env-opening .vn-env-card { animation: vnEnvRise 1300ms cubic-bezier(0.2, 0, 0, 1) 1150ms both; }
.vn-env-opening .vn-env-card::after { animation: vnEnvSweep 900ms cubic-bezier(0.2, 0, 0, 1) 1900ms both; }
.vn-env-opening .vn-env-back, .vn-env-opening .vn-env-front, .vn-env-opening .vn-env-to { animation: vnEnvOut 320ms cubic-bezier(0.2, 0, 0, 1) 1850ms both; }
.vn-env-opening .vn-env-shadow { animation: vnEnvShadow 600ms cubic-bezier(0.2, 0, 0, 1) 1850ms both; }
.vn-env-opening .vn-env-spark { animation: vnEnvSpark 900ms cubic-bezier(0.05, 0.7, 0.1, 1) both; }
@keyframes vnEnvTick { to { stroke-dashoffset: 0; } }
@keyframes vnEnvPop { to { transform: scale(1.5); opacity: 0; } }
@keyframes vnEnvFlap { 0% { transform: none; z-index: 5; } 17% { z-index: 5; } 18% { z-index: 0; } 36% { transform: perspective(700px) rotateX(180deg); opacity: 1; z-index: 0; }
  80% { transform: perspective(700px) rotateX(180deg); opacity: 1; z-index: 0; } 100% { transform: perspective(700px) rotateX(180deg) translateY(-50px); opacity: 0; z-index: 0; } }
@keyframes vnEnvRise { 0% { transform: none; z-index: 2; } 45% { transform: translateY(-112px); z-index: 2; } 52% { z-index: 7; } 100% { transform: translateY(-56px) scale(1.06); z-index: 7; } }
@keyframes vnEnvOut { to { transform: translateY(22px); opacity: 0; } }
@keyframes vnEnvShadow { to { transform: scale(1.15); opacity: 0.8; } }
@keyframes vnEnvSweep { to { left: 300px; } }
@keyframes vnEnvSpark { 0% { opacity: 0; transform: scale(0.2) rotate(0); } 40% { opacity: 1; transform: scale(1.1) rotate(45deg); } 100% { opacity: 0; transform: scale(0.6) rotate(90deg); } }
.vn-wide .vn-envw { margin: -6px 0 0; }
.vn-txA:has(.vn-envw) .vn-ring { display: none; }
.vn-txA:has(.vn-envw) .vn-txA-in h3 { margin-top: 2px; }
@media (prefers-reduced-motion: reduce) { .vn-env, .vn-envw * { animation-duration: 1ms !important; animation-delay: 0ms !important; animation-iteration-count: 1 !important; } }
/* ===== end margin-envelope ===== */
'''


def tpl(n):
    return [os.path.join(SRC, 'tpl', f) for f in os.listdir(os.path.join(SRC, 'tpl')) if f.startswith('%02d-' % n)][0]


def cls(n):
    return [os.path.join(SRC, 'cls', f) for f in os.listdir(os.path.join(SRC, 'cls')) if f.startswith('%02d-' % n)][0]


def drop_block(h, opener):
    while opener in h:
        a = h.index(opener)
        b = matching_end(h, a)
        if h[b:b + 1] == '\n':
            b += 1
        h = h[:a] + h[b:]
    return h


def load(p):
    raw = open(p, encoding='utf8', newline='').read()
    return raw, raw.replace('\r\n', '\n'), '\r\n' in raw


def write(p, new, old, label, crlf=False):
    if crlf:
        new = new.replace('\n', '\r\n')
    if new != old:
        open(p, 'w', encoding='utf8', newline='').write(new)
        print('margin:', label)


def markets(screens):
    p = tpl(screens['V7Perps']['t'])
    h0, h, crlf = load(p)
    mark = re.search(r'<svg width="30" height="30" viewBox="11 12 232 232".*?</svg>', h, flags=re.S).group(0)
    word = re.search(r'<svg role="img" aria-label="Vanna" width="77\.2".*?</svg>', h, flags=re.S).group(0)
    mark = (mark.replace('width="30" height="30"', 'width="24" height="24"').replace('vnMarkHd', 'vnMarkEnv')
            .replace('role="img" aria-label="Vanna" ', 'aria-hidden="true" '))
    word = word.replace('role="img" aria-label="Vanna" width="77.2" height="18"', 'aria-hidden="true" width="64.4" height="15"')
    if '{{ walletHero }}' not in h:   # no margin account yet: the hero shows wallet money instead of collateral
        assert h.count(HERO_OLD) == 1, 'Markets hero'
        h = h.replace(HERO_OLD, HERO_NEW)
    h = drop_block(h, '<sc-if value="{{ noAcct }}"')
    h = drop_block(h, '<sc-if value="{{ mOpen }}"')
    anchor = '<div style="padding: 16px 16px 0 16px; display: flex; flex-direction: column; gap: 12px">\n'
    assert h.count(anchor) == 1, 'Markets content anchor'
    h = h.replace(anchor, anchor + BANNER, 1)
    end = h.rstrip()
    assert end.endswith('</div>')
    h = end[:-len('</div>')] + sheet(mark, word) + '</div>\n'
    write(p, h, h0, os.path.basename(p), crlf)
    c = cls(screens['V7Perps']['c'])
    j0, j, crlf = load(c)
    j = re.sub(r'/\* margin-envelope .*?/\* end margin-envelope \*/\n', '', j, flags=re.S)
    i = j.rindex('return __v;')
    j = j[:i] + MARKETS_JS + j[i:]
    write(c, j, j0, os.path.basename(c), crlf)


def order(screens):
    m0, mh, _ = load(tpl(screens['V7Perps']['t']))
    mark = re.search(r'<svg width="24" height="24" viewBox="11 12 232 232".*?</svg>', mh, flags=re.S).group(0).replace('vnMarkEnv', 'vnMarkEnv2')
    word = re.search(r'<svg aria-hidden="true" width="64.4" height="15".*?</svg>', mh, flags=re.S).group(0)
    p = tpl(screens['V7PerpsOrder']['t'])
    h0, h, crlf = load(p)
    h = drop_block(h, '<sc-if value="{{ envShow }}"')
    h = drop_block(h, '<sc-if value="{{ txAcct }}"')
    grab = '<div class="vn-txA-grab"></div>\n'
    assert h.count(grab) == 1, 'order sheet grab'
    h = h.replace(grab, grab + '<sc-if value="{{ envShow }}" hint-placeholder-val="{{ false }}">' + envelope(mark, word).replace('vnWaxG', 'vnWaxG2') + '</sc-if>\n')
    done = '<sc-if value="{{ txDone }}"'
    assert h.count(done) == 1, 'order done state'
    h = h.replace(done, '<sc-if value="{{ txAcct }}" hint-placeholder-val="{{ false }}"><div class="vn-txA-in"><h3>Margin account opened</h3>'
                        '<p>Next, approve your {{ acctNext }} in ' + WALLET_NAME + '.</p></div></sc-if>\n' + done)
    write(p, h, h0, os.path.basename(p), crlf)
    c = cls(screens['V7PerpsOrder']['c'])
    j0, j, crlf = load(c)
    j = re.sub(r'/\* margin-envelope .*?/\* end margin-envelope \*/\n', '', j, flags=re.S)
    j = j.replace('var __st = this.state.__st || 1, __n = 1,', 'var __st = this.state.__st || 1, __n = this.props.noAcct ? 2 : 1,')
    assert '__n = this.props.noAcct ? 2 : 1' in j, 'order step count'
    i = j.rindex('return __v;')
    j = j[:i] + ORDER_JS + j[i:]
    write(c, j, j0, os.path.basename(c), crlf)


ALIASES = {  # stem: (props, title)
    'V7MarginCreate': ({'noAcct': True}, 'Markets · no margin account yet'),
    'V7MarginAgree': ({'noAcct': True, 'm': 'ask'}, 'Open margin account · envelope'),
    'V7MarginSign': ({'noAcct': True, 'm': 'sign'}, 'Margin account · approve in wallet'),
    'V7MarginDone': ({'noAcct': True, 'm': 'done'}, 'Margin account · opened'),
    'V7MarginFee': ({'noAcct': True, 'm': 'failed', 'mwhy': 'fee'}, 'Margin account · not enough SOL'),
    'V7MarginRejected': ({'noAcct': True, 'm': 'rejected'}, 'Margin account · cancelled in wallet'),
}
FIRST = ('V7PerpsOrderFirst', 'First trade · account + order, 2 approvals')
ROW_TITLE = 'Margin account: a banner on Markets opens the envelope; a first order adds it as step 1 of 2'


def registry():
    sp, tp, rp = (os.path.join(SRC, f) for f in ('screens.json', 'titles.json', 'rows.json'))
    screens, titles, rows = (json.load(open(x, encoding='utf8')) for x in (sp, tp, rp))
    before = json.dumps([screens, titles, rows])
    for stem, (props, title) in ALIASES.items():
        screens[stem] = {'w': 'V7Perps', 'p': props}
        titles[stem] = title
    screens[FIRST[0]] = {'w': 'V7PerpsOrder', 'p': {'noAcct': True}}
    titles[FIRST[0]] = FIRST[1]
    for row in rows:
        stems = [s for s, _ in row[1]]
        if 'V7MarginCreate' in stems:
            row[0] = ROW_TITLE
            for item in row[1]:
                if item[0] in titles:
                    item[1] = titles[item[0]]
            if FIRST[0] not in stems:
                row[1].append([FIRST[0], FIRST[1]])
        else:
            for item in row[1]:
                if item[0] in ALIASES:
                    item[1] = titles[item[0]]
    if json.dumps([screens, titles, rows]) != before:
        for x, d in ((sp, screens), (tp, titles), (rp, rows)):
            json.dump(d, open(x, 'w', encoding='utf8'), indent=1)
        print('margin: screens/titles/rows')
    return screens


def styles():
    p = os.path.join(SRC, 'styles.css')
    s0 = s = open(p, encoding='utf8').read()
    s = re.sub(r'\n/\* ===== margin-envelope.*?/\* ===== end margin-envelope ===== \*/\n', '\n', s, flags=re.S)
    s = s.rstrip('\n') + '\n' + CSS
    write(p, s, s0, 'styles.css')


if __name__ == '__main__':
    scr = registry()
    styles()
    markets(scr)
    order(scr)
