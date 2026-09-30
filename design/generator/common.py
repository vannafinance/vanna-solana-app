import re, os, json, math

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
PROJ = os.path.join(ROOT, 'design-source')
ICONS = os.path.join(HERE, 'node_modules', '@phosphor-icons', 'core', 'assets')

TOK = {
    'TSLAx': '/_blob/a9a1db51309a512ccf9302f8acc244d2',
    'OPENAI': '/_blob/68c99bf0397471dc2d806cfaa2e15d53',
    'GOOGLx': '/_blob/cad380b03cb4c689f02e014100f56452',
    'USDC': '/_blob/022fc945e265208f7997f02a7fbdd97f',
    'SOL': '/_blob/6fe33337309fb2af41d7bb3a0961ebff',
    'AAPLx': '/_blob/74e439ecf30e3316195f26ae04a1689e',
    'ANTHROPIC': '/_blob/c0af4af206fcfbcf3cce92e51a5837cf',
}
MARK = '/_blob/ef5faa62df31da21c9379ab31ec4247a'


def path(name, weight='regular'):
    fn = f'{ICONS}/{weight}/{name}{"" if weight == "regular" else "-" + weight}.svg'
    s = open(fn).read()
    return ' '.join(re.findall(r' d="([^"]+)"', s))


CUSTOM = {
    # Earn: interest that compounds (a % inside a turning arrow)
    'vn-earn': ('<circle cx="12" cy="12" r="5.4" fill="{F}" fill-opacity="{O}" stroke="none"></circle><path d="M18.55 7.41 A8 8 0 1 1 14.74 4.48" fill="none"></path><path d="M11.66 5.92 L15.49 4.76 L13.30 1.41" fill="none"></path><circle cx="9.6" cy="9.6" r="1.4" fill="currentColor" stroke="none"></circle><circle cx="14.4" cy="14.4" r="1.4" fill="currentColor" stroke="none"></circle><path d="M14.6 9.4L9.4 14.6" fill="none"></path>'),
    # Farm: a sprout growing out of a coin (deploy, harvest yield)
    'vn-farm': ('<ellipse cx="12" cy="19" rx="7.5" ry="2.6" fill="{F}" fill-opacity="{O}"></ellipse><ellipse cx="12" cy="19" rx="7.5" ry="2.6" fill="none"></ellipse><path d="M12 16.4V10" fill="none"></path><path d="M12 12.6c0-3.1-2.5-5.6-5.6-5.6h-.9v.9c0 3 2.5 5.4 5.6 5.4h.9z" fill="{F}" fill-opacity="{O}"></path><path d="M12 10.6c0-3.2 2.6-5.8 5.8-5.8h.8v.8c0 3.2-2.6 5.7-5.8 5.7H12z" fill="{F}" fill-opacity="{O}"></path>'),
}


def ic(name, size=20, weight='regular', extra=''):
    if name in CUSTOM:
        sw = {'regular': 1.7, 'bold': 2.2, 'fill': 1.9}.get(weight, 1.7)
        op = '0.32' if weight == 'fill' else '0'
        inner = CUSTOM[name].replace('{F}', 'currentColor').replace('{O}', op)
        return (f'<svg width="{size}" height="{size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="{sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"{extra}>{inner}</svg>')
    return (f'<svg width="{size}" height="{size}" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"{extra}>'
            f'<path d="{path(name, weight)}"></path></svg>')


THEME_JS = """var L = {page:'#F7F7F7',card:'#FFFFFF',text:'#1F1F1F',text2:'#595959',line:'#F4F4F4',bd:'#E5E7EB',hero:'#111111',nav:'#111111',pos:'#1C7C83',neg:'#B33C3E',link:'#703AE6',warn:'#8C0043',shadow:'0 1px 2px rgba(17,17,17,0.04), 0 8px 24px rgba(17,17,17,0.05)',tv:'#F1EBFD',tvI:'#5029A3',tt:'#EBFCFD',ttI:'#155F64',tr:'#FFE6F2',trI:'#8C0043',chipOn:'#111111',chipOnFg:'#FFFFFF',seg:'#F4F4F4',segOn:'#FFFFFF',segShadow:'0 1px 2px rgba(17,17,17,0.08)',off:'#DFDFDF',offFg:'#595959',scrim:'rgba(17,17,17,0.32)'};
var D = {page:'#111111',card:'#1E1E1E',text:'#FFFFFF',text2:'#BFBFBF',line:'#2C2C2C',bd:'#2C2C2C',hero:'#1E1E1E',nav:'#2C2C2C',pos:'#32EEE2',neg:'#FC5457',link:'#BDA4F4',warn:'#FFB0D6',shadow:'none',tv:'#2F1B61',tvI:'#D3C2F7',tt:'#155F64',ttI:'#BFF6FA',tr:'#6B0033',trI:'#FFB0D6',chipOn:'#FFFFFF',chipOnFg:'#111111',seg:'#111111',segOn:'#2C2C2C',segShadow:'none',off:'#2C2C2C',offFg:'#949494',scrim:'rgba(0,0,0,0.56)'};
var t = this.props.dark ? D : L;
var self = this;
var hArc = function (hf) { var f = Math.max(0.02, Math.min(1, (hf - 1) / 1.5)); var a = Math.PI * (1 - f); return 'M2 9 A7 7 0 0 1 ' + (9 + 7 * Math.cos(a)).toFixed(2) + ' ' + (9 - 7 * Math.sin(a)).toFixed(2); };
var money = function (n) { return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };
"""

HELMET = """<helmet>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600&amp;display=swap" rel="stylesheet">
<style>
body{margin:0;font-family:'Plus Jakarta Sans',system-ui,sans-serif}
*{box-sizing:border-box;scrollbar-width:none}
*::-webkit-scrollbar{display:none}
button{font-family:inherit;cursor:pointer}
input{font-family:inherit}
a{color:#703AE6}a:hover{color:#5029A3}
@keyframes vnFade{from{opacity:0}to{opacity:1}}
@keyframes vnSheet{from{transform:translateY(100%)}to{transform:translateY(0)}}
@keyframes vnDrop{from{opacity:0;transform:translateY(-8px) scale(0.98)}to{opacity:1;transform:translateY(0) scale(1)}}
@keyframes vnRing{0%{transform:scale(0.7);opacity:0.55}100%{transform:scale(1.9);opacity:0}}
@keyframes vnFill{from{width:6%}to{width:92%}}
@keyframes vnPop{0%{transform:scale(0.3);opacity:0}60%{transform:scale(1.12);opacity:1}100%{transform:scale(1)}}
@keyframes vnRise{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
@keyframes vnBreath{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}
@keyframes vnCycle{0%{opacity:0;transform:translateY(60%)}4%{opacity:1;transform:translateY(0)}22%{opacity:1;transform:translateY(0)}26%{opacity:0;transform:translateY(-60%)}100%{opacity:0;transform:translateY(-60%)}}
@keyframes vnFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}
@keyframes vnBlink{0%,49%{opacity:1}50%,100%{opacity:0}}
@keyframes vnShine{0%{left:-90px}60%,100%{left:110%}}
@media (prefers-reduced-motion: reduce){*{animation-duration:1ms !important;transition-duration:1ms !important}}
</style>
</helmet>"""


def page(stem, title, body, js, state='{}', props=None, tx_default=None, tx_steps=1, tx_step=1):
    p = {'dark': {'editor': 'boolean', 'default': False, 'section': 'Theme'}}
    if props:
        p.update(props)
    p['$preview'] = {'width': 412, 'height': 915}
    pj = json.dumps(p, separators=(',', ':'))
    m = re.search(r'<!--SUB:(\w+):([^>]*?)-->', body)
    if m:
        body = body.replace(m.group(0), '')
        tabs = subtabs(m.group(1), m.group(2))
        i = body.find('</section>')
        if i >= 0 and tabs:
            body = body[:i] + tabs + body[i:]
    TXJS = ''
    if tx_default is not None:
        TXJS = TX_JS.replace('__DEF__', tx_default).replace('__STEPS__', str(tx_steps)).replace('__STEP__', str(tx_step))
    html = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Vanna v7 · {title}</title>
<script src="./support.js"></script>
</head>
<body>
<x-dc>
{HELMET}
<div style="width: 412px; height: 915px; position: relative; overflow: hidden; background: {{{{ t.page }}}}; color: {{{{ t.text }}}}; font-family: 'Plus Jakarta Sans', system-ui, sans-serif; font-variant-numeric: tabular-nums">
{body}
</div>
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{pj}'>
class Component extends DCLogic {{
constructor(props) {{
super(props);
this.state = {state};
}}
renderVals() {{
{THEME_JS}var __v = (function () {{
{js}
}}).call(this);
var __sw = this.state.__sw === undefined ? !!this.props.switcherOpen : this.state.__sw;
__v.swOpen = __sw;
__v.logoBg = this.props.dark ? '#111111' : '#FFFFFF';
__v.farmIc = this.props.dark ? '#FFFFFF' : '#FF007A';
__v.icoFg = this.props.dark ? '#FFFFFF' : '#703AE6';
__v.icoBg = this.props.dark ? 'rgba(255,255,255,0.18)' : '#FFFFFF';
__v.icoBd = this.props.dark ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0)';
__v.logoBd = this.props.dark ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0)';
__v.swAria = __sw ? 'true' : 'false';
{TXJS}__v.toggleSw = function () {{ self.setState({{ __sw: !__sw }}); }};
return __v;
}}
}}
</script>
</body>
</html>
"""
    open(f'{PROJ}/{stem}.dc.html', 'w').write(html)
    return stem


def wrapper(stem, of, title, attrs='dark="{{ true }}"', bg='#111111'):
    html = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Vanna v7 · {title}</title>
<script src="./support.js"></script>
</head>
<body>
<x-dc>
{HELMET}
<div style="width: 412px; height: 915px; overflow: hidden; background: {bg}">
<dc-import name="{of}" {attrs} hint-size="412px,915px"></dc-import>
</div>
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{{"$preview":{{"width":412,"height":915}}}}'>
class Component extends DCLogic {{
renderVals() {{
return {{}};
}}
}}
</script>
</body>
</html>
"""
    open(f'{PROJ}/{stem}.dc.html', 'w').write(html)
    return stem


TX_JS = """var __tx = this.state.__tx === undefined ? '__DEF__' : this.state.__tx;
var __st = this.state.__st || __STEP__, __n = __STEPS__, __why = this.state.__why || 'network';
__v.txOpen = __tx !== ''; __v.txSign = __tx === 'sign'; __v.txConfirm = __tx === 'confirm'; __v.txDone = __tx === 'done'; __v.txFailed = __tx === 'failed'; __v.txRejected = __tx === 'rejected';
__v.txStepLabel = 'Step ' + __st + ' of ' + __n;
var __F = { network: ['Network error', 'Solana did not confirm this in time. Nothing left your wallet. Check your connection and try again.'],
slippage: ['Price moved too much', 'The price moved past your slippage limit, so nothing was swapped. Try again at the new price.'],
fee: ['Not enough SOL for fees', 'Every Solana transaction needs a tiny SOL fee, about 0.00001 SOL. Add a little SOL to your wallet, then try again.'],
expired: ['Request expired', 'Backpack took too long to answer, so the request expired. Nothing was sent.'] };
var __partial = __n > 1 && __st > 1 && __why !== 'fee';
var __f = __partial ? ['Step ' + __st + ' of ' + __n + ' did not go through', __v.partialBody || 'The earlier steps are done and saved on-chain. Try again to finish, nothing is lost.'] : (__F[__why] || __F.network);
__v.txFailTitle = __f[0]; __v.txFailBody = __f[1];
__v.failNet = !__partial && (__why === 'network' || __why === 'expired'); __v.failSlip = !__partial && __why === 'slippage'; __v.failFee = !__partial && __why === 'fee'; __v.failStep = __partial;
__v.txRetryLabel = __partial ? 'Try step ' + __st + ' again' : 'Try again';
var __out = function () { try { return (typeof window !== 'undefined' && window.__vnOutcome) || 'ok'; } catch (e) { return 'ok'; } };
var __next = function () { if (self.state.__tx !== 'confirm') return; var w = self.state.__why; if (w && w !== 'ok') { self.setState({ __tx: 'failed' }); return; } if ((self.state.__st || __STEP__) < __n) self.setState({ __tx: 'sign', __st: (self.state.__st || __STEP__) + 1 }); else self.setState({ __tx: 'done', __ok: true }); };
__v.startTx = function () { self.setState({ __tx: 'sign', __st: 1, __why: '' }); };
__v.approveTx = function () { var o = __out(); if (o === 'reject') { self.setState({ __tx: 'rejected' }); return; } var fail = o !== 'ok' && (o !== 'step2' || (self.state.__st || __STEP__) > 1); self.setState({ __tx: 'confirm', __why: fail ? (o === 'step2' ? 'network' : o) : '' }); setTimeout(__next, 2400); };
__v.finishTx = function () { __next(); };
__v.retryTx = function () { self.setState({ __tx: 'sign', __st: self.state.__st || __STEP__, __why: '' }); };
__v.closeTx = function () { self.setState({ __tx: '', __st: 1, __why: '' }); };
"""


def tx_overlay(done_title, done_body, wallet='Backpack', what='this request', done_cta='Done', done_href=None):
    done_btn = (f'<a href="{done_href}.dc.html" style="margin-top: 24px; width: 100%; height: 52px; border-radius: 26px; background: {{{{ t.chipOn }}}}; color: {{{{ t.chipOnFg }}}}; font-size: 16px; font-weight: 600; display: flex; align-items: center; justify-content: center; text-decoration: none">{done_cta}</a>'
                f'<button type="button" onClick="{{{{ closeTx }}}}" style="margin-top: 8px; width: 100%; height: 48px; border: 0; background: transparent; color: {{{{ t.text }}}}; font-size: 14px; font-weight: 600">Close</button>') if done_href else \
               f'<button type="button" onClick="{{{{ closeTx }}}}" style="margin-top: 24px; width: 100%; height: 52px; border-radius: 26px; border: 0; background: {{{{ t.chipOn }}}}; color: {{{{ t.chipOnFg }}}}; font-size: 16px; font-weight: 600">{done_cta}</button>'
    def bad(title, body, color, icon):
        return f"""<div style="padding: 28px 0 0 0; display: flex; flex-direction: column; align-items: center; text-align: center">
<span style="width: 80px; height: 80px; border-radius: 999px; background: {color}; color: #FFFFFF; display: flex; align-items: center; justify-content: center; animation: vnPop 480ms cubic-bezier(0.34, 1.56, 0.64, 1) both">{ic(icon, 38, 'bold')}</span>
<h2 style="margin: 20px 0 0 0; font-size: 20px; line-height: 28px; font-weight: 600">{title}</h2>
<p style="margin: 4px 0 0 0; font-size: 14px; line-height: 20px; color: {{{{ t.text2 }}}}">{body}</p>
<button type="button" onClick="{{{{ retryTx }}}}" style="margin-top: 24px; width: 100%; height: 52px; border-radius: 26px; border: 0; background: #703AE6; color: #FFFFFF; font-size: 16px; font-weight: 600">Try again</button>
<button type="button" onClick="{{{{ closeTx }}}}" style="margin-top: 8px; width: 100%; height: 48px; border: 0; background: transparent; color: {{{{ t.text }}}}; font-size: 14px; font-weight: 600">Close</button>
</div>"""
    return f"""<sc-if value="{{{{ txOpen }}}}" hint-placeholder-val="{{{{ false }}}}">
<div aria-hidden="true" style="position: absolute; inset: 0; z-index: 50; background: rgba(17,17,17,0.5); animation: vnFade 200ms ease-out"></div>
<div role="dialog" aria-live="polite" aria-label="Transaction status" style="position: absolute; z-index: 51; left: 0; right: 0; bottom: 0; border-radius: 28px 28px 0 0; background: {{{{ t.card }}}}; color: {{{{ t.text }}}}; padding: 10px 20px 28px 20px; animation: vnSheet 360ms cubic-bezier(0.2, 0.9, 0.3, 1)">
<div style="width: 36px; height: 4px; margin: 0 auto; border-radius: 2px; background: {{{{ t.bd }}}}"></div>
<sc-if value="{{{{ txSign }}}}" hint-placeholder-val="{{{{ true }}}}">
<div style="padding: 28px 0 0 0; display: flex; flex-direction: column; align-items: center; text-align: center">
<span style="position: relative; width: 96px; height: 96px; display: flex; align-items: center; justify-content: center">
<span style="position: absolute; inset: 8px; border-radius: 999px; border: 2px solid #703AE6; animation: vnRing 1.8s ease-out infinite"></span>
<span style="position: absolute; inset: 8px; border-radius: 999px; border: 2px solid #703AE6; animation: vnRing 1.8s ease-out 0.9s infinite"></span>
<span style="width: 80px; height: 80px; border-radius: 999px; background: {{{{ t.tv }}}}; color: #703AE6; display: flex; align-items: center; justify-content: center; animation: vnBreath 2.4s ease-in-out infinite">{ic('wallet', 34, 'fill')}</span>
</span>
<span style="margin-top: 20px; height: 24px; padding: 0 10px; border-radius: 12px; background: {{{{ t.page }}}}; font-size: 12px; font-weight: 600; color: {{{{ t.text2 }}}}; display: flex; align-items: center">{{{{ txStepLabel }}}}</span>
<h2 style="margin: 12px 0 0 0; font-size: 20px; line-height: 28px; font-weight: 600; animation: vnRise 300ms ease-out">Approve in {wallet}</h2>
<p style="margin: 4px 0 0 0; font-size: 14px; line-height: 20px; color: {{{{ t.text2 }}}}; animation: vnRise 300ms ease-out 60ms both">{wallet} opened with {what}. Nothing moves until you approve.</p>
<button type="button" onClick="{{{{ approveTx }}}}" style="margin-top: 24px; width: 100%; height: 52px; border-radius: 26px; border: 0; background: #703AE6; color: #FFFFFF; font-size: 16px; font-weight: 600">Open {wallet}</button>
<button type="button" onClick="{{{{ closeTx }}}}" style="margin-top: 8px; width: 100%; height: 48px; border-radius: 24px; border: 0; background: transparent; color: {{{{ t.text }}}}; font-size: 14px; font-weight: 600">Cancel</button>
</div>
</sc-if>
<sc-if value="{{{{ txConfirm }}}}" hint-placeholder-val="{{{{ false }}}}">
<div style="padding: 28px 0 0 0; display: flex; flex-direction: column; align-items: center; text-align: center">
<span style="width: 80px; height: 80px; border-radius: 999px; background: {{{{ t.tv }}}}; display: flex; align-items: center; justify-content: center"><img src="{MARK}" alt="" style="width: 40px; height: 40px; animation: vnBreath 1.2s ease-in-out infinite"></span>
<span style="margin-top: 20px; height: 24px; padding: 0 10px; border-radius: 12px; background: {{{{ t.page }}}}; font-size: 12px; font-weight: 600; color: {{{{ t.text2 }}}}; display: flex; align-items: center">{{{{ txStepLabel }}}}</span>
<h2 style="margin: 12px 0 0 0; font-size: 20px; line-height: 28px; font-weight: 600; animation: vnRise 300ms ease-out">Confirming on Solana</h2>
<p style="margin: 4px 0 0 0; font-size: 14px; line-height: 20px; color: {{{{ t.text2 }}}}">Signed. This usually takes a few seconds.</p>
<div style="margin-top: 24px; width: 100%; height: 8px; border-radius: 4px; background: {{{{ t.line }}}}; overflow: hidden"><div style="height: 8px; width: 92%; border-radius: 4px; background: linear-gradient(90deg, #FC5457, #703AE6); animation: vnFill 2.4s cubic-bezier(0.2, 0.8, 0.2, 1) both"></div></div>
<button type="button" onClick="{{{{ finishTx }}}}" style="margin-top: 20px; width: 100%; height: 48px; border-radius: 24px; border: 1px solid {{{{ t.bd }}}}; background: transparent; color: {{{{ t.text }}}}; font-size: 14px; font-weight: 600">Keep going in the background</button>
</div>
</sc-if>
<sc-if value="{{{{ txDone }}}}" hint-placeholder-val="{{{{ false }}}}">
<div style="padding: 28px 0 0 0; display: flex; flex-direction: column; align-items: center; text-align: center">
<span style="width: 80px; height: 80px; border-radius: 999px; background: #1C7C83; color: #FFFFFF; display: flex; align-items: center; justify-content: center; animation: vnPop 520ms cubic-bezier(0.34, 1.56, 0.64, 1) both">{ic('check', 40, 'bold')}</span>
<h2 style="margin: 20px 0 0 0; font-size: 20px; line-height: 28px; font-weight: 600; animation: vnRise 320ms ease-out 120ms both">{done_title}</h2>
<p style="margin: 4px 0 0 0; font-size: 14px; line-height: 20px; color: {{{{ t.text2 }}}}; animation: vnRise 320ms ease-out 180ms both">{done_body}</p>
<a href="#" style="margin-top: 12px; font-size: 14px; font-weight: 600; color: {{{{ t.link }}}}; text-decoration: none; display: flex; align-items: center; gap: 4px">View on Solana Explorer{ic('arrow-up-right', 14)}</a>
{done_btn}
</div>
</sc-if>
<sc-if value="{{{{ txFailed }}}}" hint-placeholder-val="{{{{ false }}}}">
<div style="padding: 28px 0 0 0; display: flex; flex-direction: column; align-items: center; text-align: center">
<span style="width: 80px; height: 80px; border-radius: 999px; background: #B33C3E; color: #FFFFFF; display: flex; align-items: center; justify-content: center; animation: vnPop 480ms cubic-bezier(0.34, 1.56, 0.64, 1) both">
<sc-if value="{{{{ failNet }}}}" hint-placeholder-val="{{{{ true }}}}">{ic('wifi-slash', 36, 'bold')}</sc-if><sc-if value="{{{{ failSlip }}}}" hint-placeholder-val="{{{{ false }}}}">{ic('trend-down', 36, 'bold')}</sc-if><sc-if value="{{{{ failFee }}}}" hint-placeholder-val="{{{{ false }}}}">{ic('gas-pump', 36, 'bold')}</sc-if><sc-if value="{{{{ failStep }}}}" hint-placeholder-val="{{{{ false }}}}">{ic('warning', 36, 'bold')}</sc-if>
</span>
<h2 style="margin: 20px 0 0 0; font-size: 20px; line-height: 28px; font-weight: 600">{{{{ txFailTitle }}}}</h2>
<p style="margin: 4px 0 0 0; font-size: 14px; line-height: 20px; color: {{{{ t.text2 }}}}">{{{{ txFailBody }}}}</p>
<button type="button" onClick="{{{{ retryTx }}}}" style="margin-top: 24px; width: 100%; height: 52px; border-radius: 26px; border: 0; background: #703AE6; color: #FFFFFF; font-size: 16px; font-weight: 600">{{{{ txRetryLabel }}}}</button>
<button type="button" onClick="{{{{ closeTx }}}}" style="margin-top: 8px; width: 100%; height: 48px; border: 0; background: transparent; color: {{{{ t.text }}}}; font-size: 14px; font-weight: 600">Close</button>
</div>
</sc-if>
<sc-if value="{{{{ txRejected }}}}" hint-placeholder-val="{{{{ false }}}}">
{bad('Cancelled in ' + wallet, 'You declined the request in ' + wallet + '. Nothing was sent.', '#595959', 'prohibit')}
</sc-if>
</div>
</sc-if>"""


AVATAR = f'<img src="{TOK["SOL"]}" alt="" style="width: 36px; height: 36px; border-radius: 999px; display: block">'
IDENTICON = AVATAR

# Every product stays inside the Vanna logo colours (coral, pink, violet, deep violet).
SP = {
    'home': dict(name='Vanna', grad='linear-gradient(155deg, #FC5457 -25%, #703AE6 45%, #2F1B61 110%)', deep='#2F1B61', accent='#703AE6', pos='#32EEE2', icon='house', href='V7Home',
                 pitch='Your portfolio', hook=''),
    'perps': dict(name='Perps', grad='linear-gradient(155deg, #8D61EB -10%, #703AE6 35%, #2F1B61 110%)', deep='#2F1B61', accent='#703AE6', pos='#32EEE2', icon='chart-line-up', href='V7Perps',
                  pitch='Long or short xStocks and PreStocks, up to 5x', hook='2 open · +$210.23'),
    'swap': dict(name='Swap', grad='linear-gradient(155deg, #FF007A -30%, #703AE6 55%, #3E207F 110%)', deep='#3E207F', accent='#703AE6', pos='#32EEE2', icon='arrows-left-right', href='V7Swap',
                 pitch='Swap any token from your wallet', hook='via Jupiter'),
    'earn': dict(name='Earn', grad='linear-gradient(155deg, #703AE6 -20%, #3E207F 50%, #111111 125%)', deep='#2F1B61', accent='#703AE6', pos='#32EEE2', icon='hand-coins', href='V7Earn',
                 pitch='Supply to vaults. No lockups, withdraw anytime', hook='+$1.37 earned'),
    'farm': dict(name='Farm', grad='linear-gradient(155deg, #FC5457 -20%, #FF007A 40%, #8C0043 110%)', deep='#8C0043', accent='#FF007A', pos='#FFFFFF', icon='vn-farm', href='V7Farm',
                 pitch='Borrow up to 5x and deploy to Kamino in one click', hook='1 position · 4.23% net APR'),
}

# The Vanna wordmark, traced from the official logo (web repo public/logos/vanna-white.png), one path per letter.
WM = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'wordmark.json')))


def wordmark(h=18, color='currentColor', extra=''):
    w = WM['w'] * h / WM['h']
    paths = ''.join(f'<path d="{L["d"]}"></path>' for L in WM['letters'])
    return (f'<svg role="img" aria-label="Vanna" width="{w:.1f}" height="{h}" viewBox="0 0 {WM["w"]} {WM["h"]}" style="display: inline-block; flex-shrink: 0; color: {color};{extra}">'
            f'<g fill="currentColor" fill-rule="evenodd">{paths}</g></svg>')


LOGO_CHIP = f'<span style="width: 40px; height: 40px; border-radius: 999px; background: {{{{ logoBg }}}}; border: 1px solid {{{{ logoBd }}}}; display: flex; align-items: center; justify-content: center; flex-shrink: 0; box-shadow: 0 2px 8px rgba(17,17,17,0.18)"><img src="{MARK}" alt="" style="width: 24px; height: 24px"></span>'


def space_icon(key, size=36, isz=20, bg='{{ logoBg }}'):
    sp = SP[key]
    if key == 'home':
        inner = f'<img src="{MARK}" alt="" style="width: {isz + 2}px; height: {isz + 2}px">'
    else:
        inner = ic(sp['icon'], isz, 'bold')
    # product chips: white chip with the brand colour in light mode; in dark mode a bright white glyph on a glass chip
    col = '{{ icoFg }}' if key != 'farm' else '{{ farmIc }}'
    if key == 'home':
        chip_bg, chip_bd, col = bg, '{{ logoBd }}', sp['accent']
    else:
        chip_bg, chip_bd = '{{ icoBg }}', '{{ icoBd }}'
    return f'<span style="width: {size}px; height: {size}px; border-radius: 999px; background: {chip_bg}; border: 1px solid {chip_bd}; color: {col}; display: flex; align-items: center; justify-content: center; flex-shrink: 0">{inner}</span>'


def hglyph(hf=1.69, size=18, track='rgba(255,255,255,0.3)', fill=None):
    """Tiny half-gauge used wherever health appears inline (replaces the plain dot)."""
    fill = fill or ('#32EEE2' if hf >= 1.5 else ('#FF8AC2' if hf > 1.1 else '#FC5457'))
    frac = max(0.02, min(1, (hf - 1.0) / 1.5))
    r = 7
    ang = math.pi * (1 - frac)
    x, y = 9 + r * math.cos(ang), 9 - r * math.sin(ang)
    return (f'<svg width="{size}" height="{size * 10 // 18}" viewBox="0 0 18 10" aria-hidden="true" style="flex-shrink: 0">'
            f'<path d="M2 9 A7 7 0 0 1 16 9" fill="none" stroke="{track}" stroke-width="2.5" stroke-linecap="round"></path>'
            f'<path d="M2 9 A7 7 0 0 1 {x:.2f} {y:.2f}" fill="none" stroke="{fill}" stroke-width="2.5" stroke-linecap="round"></path></svg>')


def hdyn(dhole, chole, track='{{ t.line }}'):
    return (f'<svg width="18" height="10" viewBox="0 0 18 10" aria-hidden="true" style="flex-shrink: 0">'
            f'<path d="M2 9 A7 7 0 0 1 16 9" fill="none" stroke="{track}" stroke-width="2.5" stroke-linecap="round"></path>'
            f'<path d="{{{{ {dhole} }}}}" fill="none" stroke="{{{{ {chole} }}}}" stroke-width="2.5" stroke-linecap="round"></path></svg>')


def gauge(hf=1.69, label='Safe', w=240):
    """Half-circle health gauge: three zones (liquidation, caution, safe) and a marker. Range 1.00 to 2.50."""
    cx, cy, r = 120, 116, 96
    def pt(v):
        f = max(0, min(1, (v - 1.0) / 1.5))
        a = math.pi * (1 - f)
        return cx + r * math.cos(a), cy - r * math.sin(a)
    def arc(v0, v1, col, dash=''):
        x0, y0 = pt(v0); x1, y1 = pt(v1)
        return f'<path d="M{x0:.2f} {y0:.2f} A{r} {r} 0 0 1 {x1:.2f} {y1:.2f}" fill="none" stroke="{col}" stroke-width="14" stroke-linecap="butt"></path>'
    mx, my = pt(hf)
    lx, ly = pt(1.10); sx, sy = pt(1.50)
    return (f'<svg width="{w}" height="{w * 132 // 240}" viewBox="0 0 240 132" role="img" aria-label="Health {hf:.2f}, {label}. Liquidation at 1.10" style="display: block; margin: 0 auto">'
            + arc(1.0, 1.1, '#FC5457') + arc(1.1, 1.5, '#FF8AC2') + arc(1.5, 2.5, '{{ gaugeSafe }}')
            + f'<circle cx="{mx:.2f}" cy="{my:.2f}" r="11" fill="{{{{ t.card }}}}"></circle><circle cx="{mx:.2f}" cy="{my:.2f}" r="7" fill="{{{{ t.text }}}}"></circle>'
            + f'<text x="{cx}" y="{cy - 22}" text-anchor="middle" font-size="36" font-weight="600" fill="{{{{ t.text }}}}">{hf:.2f}</text>'
            + f'<text x="{cx}" y="{cy}" text-anchor="middle" font-size="14" font-weight="600" fill="{{{{ gaugeLabelC }}}}">{label}</text>'
            + '</svg>')


def header(space='home', bell_toggle=False):
    sp = SP[space]
    badge = f'<span style="position: absolute; top: 2px; right: 0; min-width: 18px; height: 18px; padding: 0 5px; border-radius: 9px; background: #FF007A; color: #FFFFFF; font-size: 11px; line-height: 14px; font-weight: 600; text-align: center; border: 2px solid {sp["deep"]}">3</span>'
    if bell_toggle:
        bell = f'<button type="button" onClick="{{{{ toggleNotif }}}}" aria-label="Notifications, 3 unread" aria-expanded="{{{{ notifAria }}}}" style="position: relative; width: 44px; height: 44px; border-radius: 999px; border: 0; background: {{{{ bellBg }}}}; color: #FFFFFF; display: flex; align-items: center; justify-content: center">{ic("bell")}{badge}</button>'
    else:
        bell = f'<a href="V7Notifications.dc.html" aria-label="Notifications, 3 unread" style="position: relative; width: 44px; height: 44px; border-radius: 999px; background: rgba(255,255,255,0.14); color: #FFFFFF; display: flex; align-items: center; justify-content: center">{ic("bell")}{badge}</a>'
    if space == 'home':
        left = f'<span style="display: flex; align-items: center; gap: 10px">{LOGO_CHIP}' + wordmark(18, '#FFFFFF') + '</span>'
    else:
        left = (f'<a href="V7Home.dc.html" aria-label="Back to Vanna home" style="width: 44px; height: 44px; border-radius: 999px; background: rgba(255,255,255,0.14); color: #FFFFFF; display: flex; align-items: center; justify-content: center">{ic("arrow-left", 20)}</a>'
                f'<span style="display: flex; align-items: center; gap: 8px; margin-left: 4px">{space_icon(space, 32, 18)}<span style="font-size: 20px; line-height: 28px; font-weight: 600">{sp["name"]}</span></span>')
    return f"""<header style="height: 52px; display: flex; align-items: center; gap: 8px">
{left}
<span style="flex-grow: 1"></span>
{bell}
<a href="V7Profile.dc.html" aria-label="Profile" style="width: 40px; height: 40px; border-radius: 999px; overflow: hidden; display: block; box-shadow: 0 0 0 2px rgba(255,255,255,0.7)">{AVATAR.replace('width: 36px; height: 36px', 'width: 40px; height: 40px')}</a>
</header>"""


def hero_stats(label, big, stats=(), right='', big_color='#FFFFFF'):
    """Clean hero: label, one big number, then plain stat columns. No boxes, no captions."""
    cols = ''
    for i, (k, v) in enumerate(stats):
        sep = '' if i == 0 else ' padding-left: 12px; border-left: 1px solid rgba(255,255,255,0.18);'
        cols += f'<div style="display: flex; flex-direction: column; gap: 2px;{sep}"><span style="font-size: 12px; line-height: 16px; color: rgba(255,255,255,0.72)">{k}</span><span style="font-size: 16px; line-height: 22px; font-weight: 600">{v}</span></div>'
    grid = f'<div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.16); display: grid; grid-template-columns: repeat({max(len(stats), 1)}, minmax(0, 1fr)); gap: 12px">{cols}</div>' if stats else ''
    return f"""<div style="margin-top: 24px; display: flex; align-items: center; justify-content: space-between; gap: 8px"><span style="font-size: 14px; line-height: 20px; color: rgba(255,255,255,0.78)">{label}</span>{right}</div>
<div style="margin-top: 2px; font-size: 40px; line-height: 48px; font-weight: 600; letter-spacing: -0.02em; color: {big_color}">{big}</div>
{grid}"""


def health_inline(hf=1.69):
    return f'<span style="display: flex; align-items: center; gap: 6px; font-size: 12px; color: rgba(255,255,255,0.86)">{hglyph(hf)}Health {hf:.2f}</span>'


DOT_CHIP = '<span style="width: 8px; height: 8px; border-radius: 999px; background: #32EEE2"></span>Health 1.69 · Safe'


def recolor(inner, space):
    sp = SP[space]
    inner = inner.replace(DOT_CHIP, hglyph(1.69) + 'Health 1.69 · Safe')
    for a, b in [('#BFBFBF', 'rgba(255,255,255,0.78)'), ('#777777', 'rgba(255,255,255,0.56)'), ('#32EEE2', sp['pos']),
                 ('rgba(255,255,255,0.06)', 'rgba(255,255,255,0.12)'), ('rgba(255,255,255,0.08)', 'rgba(255,255,255,0.14)'),
                 ('{{ t.hero }}', sp['deep'])]:
        inner = inner.replace(a, b)
    return inner


def hero(space, inner, bell_toggle=False, pad_bottom=20):
    sp = SP[space]
    return f"""<section style="background: {sp['grad']}; border-radius: 0 0 28px 28px; padding: 36px 16px {pad_bottom}px 16px; color: #FFFFFF">
{header(space, bell_toggle)}
{recolor(inner, space)}
</section>"""


NAV = {
    'home': [('Overview', 'house', 'V7Home'), ('Lender', 'coins', 'V7Lender'), ('Trader', 'chart-line-up', 'V7Trader')],
    'perps': [('Markets', 'chart-line', 'V7Perps'), ('Positions', 'stack', 'V7PerpsPositions'), ('History', 'clock-counter-clockwise', 'V7PerpsHistory')],
    'swap': [('Swap', 'arrows-left-right', 'V7Swap'), ('History', 'clock-counter-clockwise', 'V7SwapHistory')],
    'earn': [('Vaults', 'hand-coins', 'V7Earn'), ('Positions', 'coins', 'V7EarnPositions'), ('History', 'clock-counter-clockwise', 'V7EarnHistory')],
    'farm': [('Deploy', 'vn-farm', 'V7Farm'), ('Position', 'stack', 'V7FarmPositions'), ('History', 'clock-counter-clockwise', 'V7FarmHistory')],
}


GNAV = [('home', 'Home', 'house', 'V7Home'), ('perps', 'Perps', 'chart-line-up', 'V7Perps'), ('swap', 'Swap', 'arrows-left-right', 'V7Swap'),
        ('earn', 'Earn', 'hand-coins', 'V7Earn'), ('farm', 'Farm', 'vn-farm', 'V7Farm')]


def capsule(space, active, with_switcher=False):
    """Per-product bottom navigation (v7 model): each product keeps its own tabs. The current tab sits on the product's gradient pill."""
    grad = SP[space]['grad']
    out = [f'<nav aria-label="{SP[space]["name"]}" style="position: absolute; left: 0; right: 0; bottom: 0; z-index: 10; height: 80px; padding: 8px 12px 14px 12px; background: {{{{ t.card }}}}; border-top: 1px solid {{{{ t.line }}}}; display: flex; align-items: flex-start">']
    for label, icon, stem in NAV[space]:
        on = label == active
        cur = ' aria-current="page"' if on else ''
        if on:
            pill = f'<span style="width: 60px; height: 32px; border-radius: 16px; background: {grad}; color: #FFFFFF; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(112,58,230,0.32)">{ic(icon, 20, "fill")}</span>'
            lab = f'<span style="font-size: 12px; line-height: 16px; font-weight: 600; color: {{{{ t.text }}}}">{label}</span>'
        else:
            pill = f'<span style="width: 60px; height: 32px; border-radius: 16px; color: {{{{ t.text2 }}}}; display: flex; align-items: center; justify-content: center">{ic(icon, 22)}</span>'
            lab = f'<span style="font-size: 12px; line-height: 16px; color: {{{{ t.text2 }}}}">{label}</span>'
        out.append(f'<a href="{stem}.dc.html"{cur} style="flex: 1 1 0; height: 56px; display: flex; flex-direction: column; align-items: center; gap: 4px; text-decoration: none">{pill}{lab}</a>')
    out.append('</nav>')
    return '\n'.join(out)


def subtabs(space, active):
    items = NAV.get(space, [])
    if len(items) < 2:
        return ''
    links = ''
    for label, icon, stem in items:
        on = label == active
        cur = ' aria-current="page"' if on else ''
        bar = '<span style="position: absolute; left: 0; right: 0; bottom: 0; height: 3px; border-radius: 2px; background: #FFFFFF"></span>' if on else ''
        links += f'<a href="{stem}.dc.html"{cur} style="position: relative; height: 44px; display: flex; align-items: center; font-size: 15px; font-weight: {600 if on else 400}; color: {"#FFFFFF" if on else "rgba(255,255,255,0.7)"}; text-decoration: none; white-space: nowrap">{label}{bar}</a>'
    return f'<nav aria-label="{SP[space]["name"]} pages" style="margin: 16px 0 -12px 0; display: flex; gap: 24px; border-top: 1px solid rgba(255,255,255,0.14)">{links}</nav>\n'


def scroller(inner):
    return f'<div style="position: absolute; inset: 0; bottom: 80px; overflow-y: auto; padding-bottom: 24px">\n{inner}\n</div>'


def topbar(title, back='V7Home', right=''):
    return f"""<header style="height: 56px; margin-top: 28px; padding: 0 8px 0 4px; display: flex; align-items: center; gap: 4px">
<a href="{back}.dc.html" aria-label="Back" style="width: 48px; height: 48px; border-radius: 24px; color: {{{{ t.text }}}}; display: flex; align-items: center; justify-content: center">{ic('arrow-left', 22)}</a>
<h1 style="margin: 0; flex-grow: 1; font-size: 20px; line-height: 28px; font-weight: 600">{title}</h1>
{right}
</header>"""


def seg(listname, var='s', dark_hero=False):
    """Segmented control bound to a list with label, on, bg, fg, sh, pick, count."""
    return f"""<div role="tablist" style="height: 44px; padding: 4px; border-radius: 22px; background: {{{{ t.seg }}}}; display: flex; gap: 4px">
<sc-for list="{{{{ {listname} }}}}" as="{var}" hint-placeholder-count="2">
<button type="button" role="tab" aria-selected="{{{{ {var}.on }}}}" onClick="{{{{ {var}.pick }}}}" style="flex: 1 1 0; height: 36px; border-radius: 18px; border: 0; background: {{{{ {var}.bg }}}}; box-shadow: {{{{ {var}.sh }}}}; color: {{{{ {var}.fg }}}}; font-size: 14px; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 6px">{{{{ {var}.label }}}}<span style="font-size: 12px; font-weight: 400; color: {{{{ t.text2 }}}}">{{{{ {var}.count }}}}</span></button>
</sc-for>
</div>"""


SEG_JS = """var segList = function (labels, cur, key, counts) { return labels.map(function (l, i) { var on = l === cur; var st = {}; st[key] = l; return { label: l, count: counts ? counts[i] : '', on: on ? 'true' : 'false', bg: on ? t.segOn : 'transparent', sh: on ? t.segShadow : 'none', fg: on ? t.text : t.text2, pick: function () { self.setState(st); } }; }); };
var chipList = function (labels, cur, key) { return labels.map(function (l) { var on = l === cur; var st = {}; st[key] = l; return { label: l, on: on ? 'true' : 'false', bg: on ? t.chipOn : 'transparent', fg: on ? t.chipOnFg : t.text, bd: on ? t.chipOn : t.bd, pick: function () { self.setState(st); } }; }); };
"""


def chips(listname, var='c', count=3):
    return f"""<div role="tablist" style="display: flex; gap: 8px">
<sc-for list="{{{{ {listname} }}}}" as="{var}" hint-placeholder-count="{count}">
<button type="button" role="tab" aria-selected="{{{{ {var}.on }}}}" onClick="{{{{ {var}.pick }}}}" style="height: 36px; padding: 0 16px; border-radius: 18px; border: 1px solid {{{{ {var}.bd }}}}; background: {{{{ {var}.bg }}}}; color: {{{{ {var}.fg }}}}; font-size: 14px; font-weight: 600">{{{{ {var}.label }}}}</button>
</sc-for>
</div>"""


def card(inner, pad='16px', extra=''):
    return f'<div style="border-radius: 20px; background: {{{{ t.card }}}}; box-shadow: {{{{ t.shadow }}}}; padding: {pad}{extra}">{inner}</div>'


def section_title(text, right=''):
    return f'<div style="height: 32px; margin-top: 8px; display: flex; align-items: center; justify-content: space-between"><h2 style="margin: 0; font-size: 16px; line-height: 24px; font-weight: 600">{text}</h2>{right}</div>'


def token(sym, size=40, border=False):
    b = f'; border: 2px solid {{{{ t.card }}}}' if border else ''
    return f'<img src="{TOK[sym]}" alt="" style="width: {size}px; height: {size}px; border-radius: 999px; flex-shrink: 0{b}">'


CHEV = ic('caret-right', 16)
