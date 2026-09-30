from common import *

# Devnet parity (devnet.solana.vanna.finance/trade/spot): "You Pay · Wallet", "via Jupiter" picker with
# Raydium marked Soon, settings = slippage Auto/Custom, 0.1/0.5/1.0, custom %, transaction deadline (min).
# Health factor is not shown: a wallet swap does not touch the margin account.
TOKENS_JS = """var TK = [
{ sym: 'USDC', name: 'USD Coin', px: 0.9999, bal: 3120.40, icon: '%(USDC)s' },
{ sym: 'TSLAx', name: 'Tesla xStock', px: 353.59, bal: 1.25, icon: '%(TSLAx)s' },
{ sym: 'SOL', name: 'Solana', px: 118.58, bal: 2.10, icon: '%(SOL)s' },
{ sym: 'GOOGLx', name: 'Alphabet xStock', px: 339.93, bal: 0, icon: '%(GOOGLx)s' },
{ sym: 'AAPLx', name: 'Apple xStock', px: 332.37, bal: 0, icon: '%(AAPLx)s' },
{ sym: 'ANTHROPIC', name: 'Anthropic PreStock', px: 1042.77, bal: 0.96, icon: '%(ANTHROPIC)s' },
{ sym: 'OPENAI', name: 'OpenAI PreStock', px: 2117.09, bal: 0, icon: '%(OPENAI)s' }
];
""" % TOK


def dropdown(which):
    return f"""<sc-if value="{{{{ dd{which} }}}}" hint-placeholder-val="{{{{ false }}}}">
<div role="listbox" aria-label="Choose token" style="position: absolute; z-index: 7; top: 92px; right: 12px; width: 300px; border-radius: 20px; background: {{{{ t.card }}}}; border: 1px solid {{{{ t.line }}}}; box-shadow: 0 16px 40px rgba(17,17,17,0.22); padding: 8px; transform-origin: top right; animation: vnDrop 200ms cubic-bezier(0.2, 0.9, 0.3, 1)">
<label style="height: 40px; padding: 0 12px; border-radius: 12px; background: {{{{ t.page }}}}; display: flex; align-items: center; gap: 8px; color: {{{{ t.text2 }}}}">{ic('magnifying-glass', 16)}<input type="text" placeholder="Search or paste address" aria-label="Search tokens" style="flex-grow: 1; min-width: 0; border: 0; outline: 0; background: transparent; font-size: 14px; color: {{{{ t.text }}}}"></label>
<div style="max-height: 300px; overflow-y: auto; margin-top: 4px">
<sc-for list="{{{{ opts{which} }}}}" as="o" hint-placeholder-count="7">
<button type="button" role="option" aria-selected="{{{{ o.sel }}}}" onClick="{{{{ o.pick }}}}" style="width: 100%; height: 52px; padding: 0 8px; border: 0; border-radius: 12px; background: {{{{ o.bg }}}}; color: {{{{ t.text }}}}; display: flex; align-items: center; gap: 10px; text-align: left"><img src="{{{{ o.icon }}}}" alt="" style="width: 32px; height: 32px; border-radius: 999px"><span style="flex-grow: 1; min-width: 0; display: flex; flex-direction: column"><span style="font-size: 14px; line-height: 20px; font-weight: 600">{{{{ o.sym }}}}</span><span style="font-size: 12px; line-height: 16px; color: {{{{ t.text2 }}}}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis">{{{{ o.name }}}}</span></span><span style="font-size: 12px; font-weight: 600; color: {{{{ o.balC }}}}">{{{{ o.bal }}}}</span></button>
</sc-for>
</div>
</div>
</sc-if>"""


def box(which, label):
    chip = f"""<button type="button" onClick="{{{{ toggle{which} }}}}" aria-haspopup="listbox" aria-expanded="{{{{ dd{which}Aria }}}}" style="height: 44px; padding: 0 12px 0 6px; border-radius: 22px; border: 1px solid {{{{ chip{which}Bd }}}}; background: {{{{ t.page }}}}; color: {{{{ t.text }}}}; display: flex; align-items: center; gap: 8px; font-size: 16px; font-weight: 600; flex-shrink: 0"><img src="{{{{ tok{which}.icon }}}}" alt="" style="width: 32px; height: 32px; border-radius: 999px">{{{{ tok{which}.sym }}}}<span style="display: flex; transition: transform 200ms ease; transform: {{{{ rot{which} }}}}">{ic('caret-down', 14)}</span></button>"""
    if which == 'In':
        extra = f"""<div style="margin-top: 6px; display: flex; justify-content: space-between; align-items: center"><span style="font-size: 12px; color: {{{{ t.text2 }}}}">≈ {{{{ payUsd }}}}</span><span style="display: flex; gap: 6px"><sc-for list="{{{{ quick }}}}" as="q" hint-placeholder-count="3"><button type="button" onClick="{{{{ q.pick }}}}" style="height: 28px; padding: 0 10px; border-radius: 14px; border: 1px solid {{{{ t.bd }}}}; background: transparent; color: {{{{ t.text }}}}; font-size: 12px; font-weight: 600">{{{{ q.label }}}}</button></sc-for></span></div>
<sc-if value="{{{{ err }}}}" hint-placeholder-val="{{{{ false }}}}"><div style="margin-top: 8px; font-size: 12px; line-height: 16px; color: {{{{ t.neg }}}}">{{{{ err }}}}</div></sc-if>"""
        amount = f'<span style="flex-grow: 1; min-width: 0; font-size: 32px; line-height: 40px; font-weight: 600; color: {{{{ payC }}}}">{{{{ pay }}}}</span>'
        right = '{{ balIn }}'
    else:
        extra = f'<div style="margin-top: 6px; font-size: 12px; color: {{{{ t.text2 }}}}">≈ {{{{ recUsd }}}}</div>'
        amount = f'<span style="flex-grow: 1; min-width: 0; font-size: 32px; line-height: 40px; font-weight: 600">{{{{ rec }}}}</span>'
        right = '{{ balOut }}'
    return f"""<div style="position: relative; border-radius: 20px; background: {{{{ t.card }}}}; box-shadow: {{{{ t.shadow }}}}; padding: 16px">
<div style="display: flex; justify-content: space-between; font-size: 12px; line-height: 16px; color: {{{{ t.text2 }}}}"><span>{label}</span><span>{right}</span></div>
<div style="margin-top: 8px; display: flex; align-items: center; gap: 12px">{amount}{chip}</div>
{extra}
{dropdown(which)}
</div>"""


def settings_sheet():
    return f"""<sc-if value="{{{{ setOpen }}}}" hint-placeholder-val="{{{{ false }}}}">
<div aria-hidden="true" onClick="{{{{ toggleSet }}}}" style="position: absolute; inset: 0; z-index: 40; background: rgba(17,17,17,0.5); animation: vnFade 180ms ease-out"></div>
<div role="dialog" aria-label="Swap settings" style="position: absolute; z-index: 41; left: 0; right: 0; bottom: 0; border-radius: 28px 28px 0 0; background: {{{{ t.card }}}}; color: {{{{ t.text }}}}; padding: 10px 20px 28px 20px; animation: vnSheet 320ms cubic-bezier(0.2, 0.9, 0.3, 1)">
<div style="width: 36px; height: 4px; margin: 0 auto; border-radius: 2px; background: {{{{ t.bd }}}}"></div>
<div style="height: 56px; display: flex; align-items: center; justify-content: space-between"><h2 style="margin: 0; font-size: 20px; line-height: 28px; font-weight: 600">Swap settings</h2><button type="button" onClick="{{{{ toggleSet }}}}" aria-label="Close" style="width: 44px; height: 44px; border-radius: 22px; border: 0; background: {{{{ t.page }}}}; color: {{{{ t.text }}}}; display: flex; align-items: center; justify-content: center">{ic('x', 18)}</button></div>
<div style="font-size: 14px; line-height: 20px; font-weight: 600">Slippage tolerance</div>
<div style="font-size: 12px; line-height: 16px; color: {{{{ t.text2 }}}}">How far the price can move before the swap cancels itself.</div>
<div role="tablist" style="margin-top: 12px; height: 48px; padding: 4px; border-radius: 24px; background: {{{{ t.seg }}}}; display: flex; gap: 4px">
<sc-for list="{{{{ modes }}}}" as="m" hint-placeholder-count="2">
<button type="button" role="tab" aria-selected="{{{{ m.on }}}}" onClick="{{{{ m.pick }}}}" style="flex: 1 1 0; height: 40px; border-radius: 20px; border: 0; background: {{{{ m.bg }}}}; color: {{{{ m.fg }}}}; font-size: 14px; font-weight: 600">{{{{ m.label }}}}</button>
</sc-for>
</div>
<div style="margin-top: 10px; display: flex; gap: 8px">
<sc-for list="{{{{ presets }}}}" as="p" hint-placeholder-count="3">
<button type="button" onClick="{{{{ p.pick }}}}" aria-pressed="{{{{ p.on }}}}" style="flex: 1 1 0; height: 44px; border-radius: 22px; border: 1px solid {{{{ p.bd }}}}; background: {{{{ p.bg }}}}; color: {{{{ p.fg }}}}; font-size: 14px; font-weight: 600">{{{{ p.label }}}}</button>
</sc-for>
</div>
<label style="margin-top: 10px; height: 52px; padding: 0 16px; border-radius: 16px; border: 1px solid {{{{ fieldBd }}}}; background: {{{{ t.page }}}}; display: flex; align-items: center; gap: 8px; opacity: {{{{ fieldOp }}}}"><span style="flex-grow: 1; font-size: 16px; font-weight: 600">{{{{ slipVal }}}}</span><span style="font-size: 16px; color: {{{{ t.text2 }}}}">%</span></label>
<sc-if value="{{{{ slipWarn }}}}" hint-placeholder-val="{{{{ false }}}}"><div style="margin-top: 8px; display: flex; gap: 6px; font-size: 12px; line-height: 16px; color: {{{{ warnC }}}}">{ic('warning-circle', 16)}<span>{{{{ slipWarn }}}}</span></div></sc-if>
<div style="margin-top: 20px; font-size: 14px; line-height: 20px; font-weight: 600">Transaction deadline</div>
<div style="font-size: 12px; line-height: 16px; color: {{{{ t.text2 }}}}">Cancel the swap if it is still pending after this long.</div>
<label style="margin-top: 10px; height: 52px; padding: 0 16px; border-radius: 16px; border: 1px solid {{{{ t.bd }}}}; background: {{{{ t.page }}}}; display: flex; align-items: center; gap: 8px"><input type="text" inputmode="numeric" value="20" aria-label="Transaction deadline in minutes" style="flex-grow: 1; min-width: 0; border: 0; outline: 0; background: transparent; font-size: 16px; font-weight: 600; color: {{{{ t.text }}}}"><span style="font-size: 14px; color: {{{{ t.text2 }}}}">min</span></label>
<button type="button" onClick="{{{{ toggleSet }}}}" style="margin-top: 16px; width: 100%; height: 52px; border-radius: 26px; border: 0; background: #703AE6; color: #FFFFFF; font-size: 16px; font-weight: 600">Save</button>
</div>
</sc-if>"""


def swap(stem='V7Swap', title='Swap', dd='', settings=False, tx='', dexOpen=False, state='{}'):
    hero_inner = ''
    toolbar = f"""<div style="position: relative; z-index: {{{{ zDex }}}}; height: 44px; display: flex; align-items: center; justify-content: space-between">
<button type="button" onClick="{{{{ toggleDex }}}}" aria-haspopup="listbox" aria-expanded="{{{{ dexAria }}}}" style="height: 40px; padding: 0 12px 0 14px; border-radius: 20px; border: 1px solid {{{{ dexBd }}}}; background: {{{{ t.card }}}}; color: {{{{ t.text }}}}; display: flex; align-items: center; gap: 6px; font-size: 14px"><span style="color: {{{{ t.text2 }}}}">via</span><span style="font-weight: 600">Jupiter</span><span style="display: flex; transition: transform 200ms ease; transform: {{{{ dexRot }}}}">{ic('caret-down', 14)}</span></button>
<button type="button" onClick="{{{{ toggleSet }}}}" aria-label="Swap settings" style="width: 40px; height: 40px; border-radius: 20px; border: 1px solid {{{{ t.bd }}}}; background: {{{{ t.card }}}}; color: {{{{ t.text }}}}; display: flex; align-items: center; justify-content: center">{ic('gear-six', 20)}</button>
<sc-if value="{{{{ dexOpen }}}}" hint-placeholder-val="{{{{ false }}}}">
<div role="listbox" aria-label="Route" style="position: absolute; top: 48px; left: 0; width: 260px; border-radius: 18px; background: {{{{ t.card }}}}; border: 1px solid {{{{ t.line }}}}; box-shadow: 0 16px 40px rgba(17,17,17,0.22); padding: 6px; transform-origin: top left; animation: vnDrop 200ms cubic-bezier(0.2, 0.9, 0.3, 1)">
<button type="button" role="option" aria-selected="true" onClick="{{{{ toggleDex }}}}" style="width: 100%; height: 56px; padding: 0 10px; border: 0; border-radius: 12px; background: {{{{ t.tv }}}}; color: {{{{ t.text }}}}; display: flex; align-items: center; gap: 10px; text-align: left"><span style="flex-grow: 1; display: flex; flex-direction: column"><span style="font-size: 14px; line-height: 20px; font-weight: 600">Jupiter</span><span style="font-size: 12px; line-height: 16px; color: {{{{ t.text2 }}}}">Best price across Solana pools</span></span><span style="color: {{{{ t.link }}}}; display: flex">{ic('check', 18, 'bold')}</span></button>
<button type="button" role="option" aria-selected="false" aria-disabled="true" style="width: 100%; height: 56px; padding: 0 10px; border: 0; border-radius: 12px; background: transparent; color: {{{{ t.text2 }}}}; display: flex; align-items: center; gap: 10px; text-align: left; cursor: default"><span style="flex-grow: 1; display: flex; flex-direction: column"><span style="font-size: 14px; line-height: 20px; font-weight: 600">Raydium</span><span style="font-size: 12px; line-height: 16px">Direct Raydium pools</span></span><span style="height: 22px; padding: 0 8px; border-radius: 11px; background: {{{{ t.page }}}}; font-size: 12px; font-weight: 600; display: flex; align-items: center">Soon</span></button>
</div>
</sc-if>
</div>"""
    flip = f"""<div style="height: 0; position: relative; z-index: 4; display: flex; justify-content: center"><button type="button" onClick="{{{{ flip }}}}" aria-label="Flip tokens" style="margin-top: -26px; width: 52px; height: 52px; border-radius: 999px; border: 4px solid {{{{ t.page }}}}; background: {{{{ t.card }}}}; box-shadow: 0 4px 14px rgba(112,58,230,0.28); display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: transform 460ms cubic-bezier(0.34, 1.56, 0.64, 1); transform: rotate({{{{ rot }}}}deg)"><img src="{MARK}" alt="" style="width: 26px; height: 26px"></button></div>"""
    details = f"""<div style="border-radius: 20px; background: {{{{ t.card }}}}; box-shadow: {{{{ t.shadow }}}}; padding: 4px 16px">
<sc-for list="{{{{ rows }}}}" as="r" hint-placeholder-count="5">
<div style="height: 44px; display: flex; align-items: center; justify-content: space-between; font-size: 14px; border-top: 1px solid {{{{ r.bt }}}}"><span style="color: {{{{ t.text2 }}}}">{{{{ r.k }}}}</span><span style="font-weight: 600; color: {{{{ r.c }}}}">{{{{ r.v }}}}</span></div>
</sc-for>
</div>"""
    body = scroller(f"""{hero('swap', hero_inner, pad_bottom=16)}
<sc-if value="{{{{ anyOpen }}}}" hint-placeholder-val="{{{{ false }}}}"><div aria-hidden="true" onClick="{{{{ closeAll }}}}" style="position: absolute; inset: 0; z-index: 5"></div></sc-if>
<div style="padding: 12px 16px 0 16px; display: flex; flex-direction: column; gap: 12px">
{toolbar}
<div style="position: relative; display: flex; flex-direction: column; gap: 8px">
{box('In', 'You pay · Wallet').replace('position: relative; border-radius', 'position: relative; z-index: {{ zIn }}; border-radius')}
{flip}
{box('Out', 'You receive · Wallet').replace('position: relative; border-radius', 'position: relative; z-index: {{ zOut }}; border-radius')}
</div>
{details}
<button type="button" onClick="{{{{ cta }}}}" aria-disabled="{{{{ dis }}}}" style="height: 56px; border-radius: 28px; border: 0; background: {{{{ ctaBg }}}}; color: {{{{ ctaFg }}}}; font-size: 16px; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 8px">{{{{ ctaLabel }}}}{ic('wallet', 18)}</button>
</div>""") + '\n' + capsule('swap', 'Swap') + '\n' + settings_sheet() + '\n' + tx_overlay('Swapped', '{{ doneText }}', 'Backpack', 'this swap')
    js = TOKENS_JS + f"""var s = this.state;
var inS = s.inS || 'USDC', outS = s.outS || 'TSLAx';
var amt = s.amt === undefined ? 250 : s.amt;
var dd = s.dd === undefined ? '{dd}' : s.dd;
var setO = s.setO === undefined ? {'true' if settings else 'false'} : s.setO;
var mode = s.mode || '{'Custom' if settings else 'Auto'}', slip = s.slip || '{'1.0' if settings else '0.5'}';
var find = function (sym) {{ return TK.filter(function (k) {{ return k.sym === sym; }})[0]; }};
var A = find(inS), B = find(outS);
var f2 = function (n) {{ return n.toLocaleString('en-US', {{ minimumFractionDigits: 2, maximumFractionDigits: 2 }}); }};
var fu = function (n, sym) {{ if (sym === 'USDC' || n >= 100) return f2(n); var x = n.toFixed(4).replace(/0+$/, ''); return x.split('.')[1] && x.split('.')[1].length >= 2 ? x : n.toFixed(2); }};
var rec = amt * A.px / B.px;
var over = amt > A.bal;
var eff = mode === 'Auto' ? '0.5' : slip;
var effN = parseFloat(eff);
var opts = function (which, cur, other) {{ return TK.map(function (k) {{ var on = k.sym === cur; return {{ sym: k.sym, name: k.name, icon: k.icon, bal: k.bal > 0 ? fu(k.bal, k.sym) : '0', balC: k.bal > 0 ? t.text : t.text2, sel: on ? 'true' : 'false', bg: on ? t.tv : 'transparent', pick: function () {{ var st = {{ dd: '' }}; var mine = k.sym, theirs = k.sym === other ? cur : other; if (which === 'In') {{ st.inS = mine; st.outS = theirs; }} else {{ st.outS = mine; st.inS = theirs; }} self.setState(st); }} }}; }}); }};
var quick = [['25%', 0.25], ['50%', 0.5], ['Max', 1]].map(function (q) {{ return {{ label: q[0], pick: function () {{ self.setState({{ amt: Math.floor(A.bal * q[1] * 100) / 100 }}); }} }}; }});
var modes = ['Auto', 'Custom'].map(function (m) {{ var on = m === mode; return {{ label: m, on: on ? 'true' : 'false', bg: on ? t.tv : 'transparent', fg: on ? t.link : t.text2, pick: function () {{ self.setState({{ mode: m }}); }} }}; }});
var presets = ['0.1', '0.5', '1.0'].map(function (p) {{ var on = mode === 'Custom' && p === slip; return {{ label: p + '%', on: on ? 'true' : 'false', bg: on ? t.tv : 'transparent', fg: on ? t.link : t.text, bd: on ? t.tv : t.bd, pick: function () {{ self.setState({{ slip: p, mode: 'Custom' }}); }} }}; }});
var warn = mode === 'Custom' && effN >= 1 ? (effN >= 5 ? 'Very high slippage. You could lose a large part of this trade.' : 'High slippage can give you a worse price.') : false;
var dex = s.dex === undefined ? {'true' if dexOpen else 'false'} : s.dex;
var rows0 = [
{{ k: 'Price impact', v: '< 0.01%', c: t.pos }},
{{ k: 'Minimum received', v: fu(rec * (1 - effN / 100), outS) + ' ' + outS, c: t.text }},
{{ k: 'Slippage', v: (mode === 'Auto' ? 'Auto · ' : '') + eff + '%', c: t.text }}
];
var rows = rows0.map(function (r, i) {{ r.bt = i === 0 ? 'transparent' : t.line; return r; }});
var ok = !over && amt > 0;
return {{ t: t, tokIn: A, tokOut: B, pay: f2(amt), payC: over ? t.neg : t.text, payUsd: money(amt * A.px), rec: fu(rec, outS), recUsd: money(rec * B.px),
balIn: 'Balance ' + (A.bal > 0 ? fu(A.bal, A.sym) : '0'), balOut: 'Balance ' + (B.bal > 0 ? fu(B.bal, B.sym) : '0'), zIn: dd === 'In' ? '6' : '3', zOut: dd === 'Out' ? '6' : '1', zDex: dex ? '6' : '4',
dexOpen: dex, dexAria: dex ? 'true' : 'false', dexRot: dex ? 'rotate(180deg)' : 'none', dexBd: dex ? '#703AE6' : t.bd, toggleDex: function () {{ self.setState({{ dex: !dex, dd: '' }}); }},
anyOpen: dex || dd !== '', closeAll: function () {{ self.setState({{ dex: false, dd: '' }}); }}, err: over ? 'Not enough ' + A.sym + ' in your wallet.' : false,
quick: quick, rate: '1 ' + B.sym + ' = ' + fu(B.px / A.px, A.sym) + ' ' + A.sym, rows: rows,
ddIn: dd === 'In', ddOut: dd === 'Out', ddInAria: dd === 'In' ? 'true' : 'false', ddOutAria: dd === 'Out' ? 'true' : 'false', rotIn: dd === 'In' ? 'rotate(180deg)' : 'none', rotOut: dd === 'Out' ? 'rotate(180deg)' : 'none',
chipInBd: dd === 'In' ? '#703AE6' : t.page, chipOutBd: dd === 'Out' ? '#703AE6' : t.page,
toggleIn: function () {{ self.setState({{ dd: dd === 'In' ? '' : 'In', dex: false }}); }}, toggleOut: function () {{ self.setState({{ dd: dd === 'Out' ? '' : 'Out', dex: false }}); }},
optsIn: opts('In', inS, outS), optsOut: opts('Out', outS, inS),
rot: s.rot || 0, flip: function () {{ self.setState({{ inS: outS, outS: inS, amt: Math.min(Math.round(rec * 100) / 100 || 1, B.bal), rot: (s.rot || 0) + 180, dd: '' }}); }},
setOpen: setO, toggleSet: function () {{ self.setState({{ setO: !setO, dex: false, dd: '' }}); }}, modes: modes, presets: presets, slipVal: eff, fieldOp: mode === 'Auto' ? '0.5' : '1', fieldBd: mode === 'Custom' ? '#703AE6' : t.bd,
slipWarn: warn, warnC: effN >= 5 ? t.neg : t.warn, slipShort: (mode === 'Auto' ? 'Auto ' : '') + eff + '%', slipLong: (mode === 'Auto' ? 'Auto · ' : 'Custom · ') + eff + '%',
dis: ok ? 'false' : 'true', ctaBg: ok ? '#703AE6' : t.off, ctaFg: ok ? '#FFFFFF' : t.offFg, ctaLabel: ok ? 'Swap · approve in wallet' : (over ? 'Not enough ' + A.sym : 'Enter an amount'),
cta: function () {{ if (ok) self.setState({{ __tx: 'sign', __st: 1, __why: '', dd: '' }}); }},
doneText: f2(amt) + ' ' + inS + ' → ' + fu(rec, outS) + ' ' + outS }};"""
    page(stem, title, body, js, state=state, tx_default=tx)


def build():
    swap()
    swap('V7SwapTokens', 'Swap token dropdown', dd='In')
    swap('V7SwapRoute', 'Swap route picker', dexOpen=True)
    swap('V7SwapSettings', 'Swap settings', settings=True)
    swap('V7SwapSign', 'Approve in wallet', tx='sign')
    swap('V7SwapConfirm', 'Confirming', tx='confirm')
    swap('V7SwapDone', 'Swap done', tx='done')
    swap('V7SwapNoFunds', 'Not enough balance', state='{ amt: 5000 }')
    swap('V7SwapFailed', 'Swap failed', tx='failed', state="{ __why: 'network' }")
    swap('V7SwapSlippage', 'Price moved', tx='failed', state="{ __why: 'slippage' }")
    swap('V7SwapFee', 'No SOL for fees', tx='failed', state="{ __why: 'fee' }")
    swap('V7SwapRejected', 'Swap cancelled', tx='rejected')


if __name__ == '__main__':
    build()
