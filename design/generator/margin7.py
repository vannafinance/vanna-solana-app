from common import *

# From Backend-Solana-v2 create-margin-account.tsx: "Create Your Margin Account" -> "Review and Sign Agreement"
# (5 sections + "I have read and agree to the VANNA Borrow Agreement.") -> sign -> "Margin Account Active".
AGREE = [
    ('Collateral requirement', ['All borrowed positions must remain fully collateralized.', 'If collateral value falls below the liquidation threshold, your position may be liquidated.']),
    ('Borrow limits and leverage', ['You may only borrow assets up to the maximum loan-to-value allowed.', 'Leverage is enabled only when collateral value supports it.']),
    ('Interest and fees', ['Interest rates are variable and accrue in real time.', 'Additional protocol fees may apply for borrowing or liquidation events.']),
    ('Liquidation risk', ['Market volatility can reduce collateral value.', 'If your health factor drops below safe limits, collateral may be partly or fully liquidated without prior notice.']),
    ('Your responsibility', ['You are responsible for monitoring your positions, balances and risks.', 'Vanna is a decentralized protocol with inherent smart contract risks.']),
]
WHY = [('stack', 'Multicollateral loans', 'Borrow against SOL, stablecoins and stocks without selling them.'),
       ('lightning', 'Flexible borrowing', 'Instant liquidity while you keep your long-term positions.'),
       ('chart-line-up', 'Maximize capital', 'Use one account for Perps and Farm, up to 5x.')]


def margin(stem='V7MarginCreate', title='Create margin account', agree=False, tx='', state='{}'):
    why = ''.join(f'<div style="display: flex; gap: 12px; align-items: flex-start; padding: 12px 0; border-top: 1px solid {{{{ t.line }}}}"><span style="width: 36px; height: 36px; border-radius: 999px; background: {{{{ t.tv }}}}; color: {{{{ t.tvI }}}}; display: flex; align-items: center; justify-content: center; flex-shrink: 0">{ic(i, 18, "bold")}</span><span style="display: flex; flex-direction: column; gap: 2px"><span style="font-size: 14px; line-height: 20px; font-weight: 600">{a}</span><span style="font-size: 12px; line-height: 16px; color: {{{{ t.text2 }}}}">{b}</span></span></div>' for i, a, b in WHY)
    art = f"""<span style="position: relative; width: 120px; height: 96px; display: block; margin: 0 auto">
<span style="position: absolute; left: 20px; top: 8px; width: 80px; height: 80px; border-radius: 28px; background: {SP['home']['grad']}; box-shadow: 0 12px 28px rgba(112,58,230,0.35); display: flex; align-items: center; justify-content: center; animation: vnPop 520ms cubic-bezier(0.34, 1.56, 0.64, 1) both"><span style="width: 48px; height: 48px; border-radius: 999px; background: #FFFFFF; display: flex; align-items: center; justify-content: center"><img src="{MARK}" alt="" style="width: 28px; height: 28px"></span></span>
<img src="{TOK['USDC']}" alt="" style="position: absolute; left: 0; top: 56px; width: 36px; height: 36px; border-radius: 999px; border: 3px solid {{{{ t.card }}}}; animation: vnRise 400ms ease-out 200ms both">
<img src="{TOK['SOL']}" alt="" style="position: absolute; right: 0; top: 0; width: 34px; height: 34px; border-radius: 999px; border: 3px solid {{{{ t.card }}}}; animation: vnRise 400ms ease-out 300ms both">
<img src="{TOK['TSLAx']}" alt="" style="position: absolute; right: 4px; top: 60px; width: 30px; height: 30px; border-radius: 999px; border: 3px solid {{{{ t.card }}}}; animation: vnRise 400ms ease-out 400ms both">
</span>"""
    create = f"""<sc-if value="{{{{ noAccount }}}}" hint-placeholder-val="{{{{ true }}}}">
<div style="border-radius: 24px; background: {{{{ t.card }}}}; box-shadow: {{{{ t.shadow }}}}; padding: 24px 16px 8px 16px">
{art}
<h2 style="margin: 16px 0 0 0; text-align: center; font-size: 20px; line-height: 28px; font-weight: 600">Create your margin account</h2>
<p style="margin: 6px 0 16px 0; text-align: center; font-size: 14px; line-height: 20px; color: {{{{ t.text2 }}}}">You need a margin account to borrow and use leverage on Vanna. It holds your collateral for Perps and Farm.</p>
{why}
</div>
<button type="button" onClick="{{{{ openAgree }}}}" style="height: 56px; border-radius: 28px; border: 0; background: #703AE6; color: #FFFFFF; font-size: 16px; font-weight: 600">Create margin account</button>
</sc-if>
<sc-if value="{{{{ hasAccount }}}}" hint-placeholder-val="{{{{ false }}}}">
<div style="border-radius: 24px; background: {{{{ t.card }}}}; box-shadow: {{{{ t.shadow }}}}; padding: 24px 16px; text-align: center; animation: vnRise 320ms ease-out">
<span style="width: 72px; height: 72px; margin: 0 auto; border-radius: 999px; background: #1C7C83; color: #FFFFFF; display: flex; align-items: center; justify-content: center; animation: vnPop 520ms cubic-bezier(0.34, 1.56, 0.64, 1) both">{ic('check', 36, 'bold')}</span>
<h2 style="margin: 16px 0 0 0; font-size: 20px; line-height: 28px; font-weight: 600">Margin account active</h2>
<p style="margin: 4px 0 0 0; font-size: 14px; line-height: 20px; color: {{{{ t.text2 }}}}">Account <span style="font-family: ui-monospace, monospace">3pLm…Uw2c</span>. Add collateral to open your first position.</p>
</div>
<a href="V7PerpsOrder.dc.html" style="height: 56px; border-radius: 28px; background: #703AE6; color: #FFFFFF; font-size: 16px; font-weight: 600; display: flex; align-items: center; justify-content: center; text-decoration: none">Open a position</a>
</sc-if>"""
    sections = ''
    for n, (h, items) in enumerate(AGREE):
        lis = ''.join(f'<li style="margin-top: 4px">{x}</li>' for x in items)
        sections += f"""<div style="border-top: 1px solid {{{{ t.line }}}}">
<button type="button" onClick="{{{{ sec{n}.pick }}}}" aria-expanded="{{{{ sec{n}.aria }}}}" style="width: 100%; height: 48px; padding: 0; border: 0; background: transparent; color: {{{{ t.text }}}}; display: flex; align-items: center; gap: 10px; text-align: left; font-size: 14px; font-weight: 600"><span style="width: 24px; height: 24px; border-radius: 999px; background: {{{{ t.tv }}}}; color: {{{{ t.tvI }}}}; font-size: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0">{n + 1}</span><span style="flex-grow: 1">{h}</span><span style="display: flex; color: {{{{ t.text2 }}}}; transition: transform 200ms ease; transform: {{{{ sec{n}.rot }}}}">{ic('caret-down', 14)}</span></button>
<sc-if value="{{{{ sec{n}.open }}}}" hint-placeholder-val="{{{{ false }}}}"><ul style="margin: 0 0 12px 0; padding: 0 0 0 52px; font-size: 12px; line-height: 18px; color: {{{{ t.text2 }}}}; animation: vnDrop 180ms ease-out">{lis}</ul></sc-if>
</div>"""
    sheet = f"""<sc-if value="{{{{ agreeOpen }}}}" hint-placeholder-val="{{{{ false }}}}">
<div aria-hidden="true" onClick="{{{{ closeAgree }}}}" style="position: absolute; inset: 0; z-index: 40; background: rgba(17,17,17,0.5); animation: vnFade 180ms ease-out"></div>
<div role="dialog" aria-label="Review and sign agreement" style="position: absolute; z-index: 41; left: 0; right: 0; bottom: 0; border-radius: 28px 28px 0 0; background: {{{{ t.card }}}}; color: {{{{ t.text }}}}; padding: 10px 20px 24px 20px; animation: vnSheet 320ms cubic-bezier(0.2, 0.9, 0.3, 1)">
<div style="width: 36px; height: 4px; margin: 0 auto; border-radius: 2px; background: {{{{ t.bd }}}}"></div>
<h2 style="margin: 16px 0 0 0; font-size: 20px; line-height: 28px; font-weight: 600">Review and sign agreement</h2>
<p style="margin: 4px 0 12px 0; font-size: 14px; line-height: 20px; color: {{{{ t.text2 }}}}">Please review the terms of borrowing on Vanna before you continue.</p>
{sections}
<button type="button" role="checkbox" aria-checked="{{{{ chkAria }}}}" onClick="{{{{ toggleChk }}}}" style="margin-top: 8px; width: 100%; min-height: 52px; padding: 12px; border-radius: 16px; border: 1px solid {{{{ chkBd }}}}; background: {{{{ chkBg }}}}; color: {{{{ t.text }}}}; display: flex; align-items: center; gap: 12px; text-align: left; font-size: 14px; line-height: 20px"><span style="width: 24px; height: 24px; border-radius: 8px; border: 2px solid {{{{ boxBd }}}}; background: {{{{ boxBg }}}}; color: #FFFFFF; display: flex; align-items: center; justify-content: center; flex-shrink: 0">{ic('check', 14, 'bold')}</span>I have read and agree to the Vanna Borrow Agreement.</button>
<div style="margin-top: 12px; display: flex; gap: 8px">
<button type="button" onClick="{{{{ closeAgree }}}}" style="flex: 1 1 0; height: 52px; border-radius: 26px; border: 1px solid {{{{ t.bd }}}}; background: transparent; color: {{{{ t.text }}}}; font-size: 16px; font-weight: 600">Close</button>
<button type="button" onClick="{{{{ sign }}}}" aria-disabled="{{{{ signDis }}}}" style="flex: 1 1 0; height: 52px; border-radius: 26px; border: 0; background: {{{{ signBg }}}}; color: {{{{ signFg }}}}; font-size: 16px; font-weight: 600">Sign agreement</button>
</div>
</div>
</sc-if>"""
    hero_inner = hero_stats('One-time setup', '<span style="font-size: 28px; line-height: 36px">Margin account needed</span>')
    body = scroller(f"""{hero('perps', hero_inner)}
<div style="padding: 16px 16px 0 16px; display: flex; flex-direction: column; gap: 12px">
{create}
</div>""") + '\n' + capsule('perps', 'Markets') + '\n' + sheet + '\n' + tx_overlay('Margin account active', 'Account 3pLm…Uw2c is ready. You can now trade Perps and Farm.', 'Backpack', 'your new margin account', 'Start trading', 'V7Perps')
    js = f"""var s = this.state;
var ag = s.ag === undefined ? {'true' if agree else 'false'} : s.ag;
var chk = !!s.chk, open = s.open === undefined ? 0 : s.open, made = !!s.made;
var sec = function (n) {{ var o = n === open; return {{ open: o, aria: o ? 'true' : 'false', rot: o ? 'rotate(180deg)' : 'none', pick: function () {{ self.setState({{ open: o ? -1 : n }}); }} }}; }};
var txNow = s.__tx === undefined ? '{tx}' : s.__tx;
return {{ t: t, sec0: sec(0), sec1: sec(1), sec2: sec(2), sec3: sec(3), sec4: sec(4),
noAccount: !s.__ok && txNow !== 'done', hasAccount: !!s.__ok || txNow === 'done',
agreeOpen: ag, openAgree: function () {{ self.setState({{ ag: true }}); }}, closeAgree: function () {{ self.setState({{ ag: false }}); }},
chkAria: chk ? 'true' : 'false', chkBd: chk ? '#703AE6' : t.bd, chkBg: chk ? t.tv : 'transparent', boxBd: chk ? '#703AE6' : t.text2, boxBg: chk ? '#703AE6' : 'transparent', toggleChk: function () {{ self.setState({{ chk: !chk }}); }},
signDis: chk ? 'false' : 'true', signBg: chk ? '#703AE6' : t.off, signFg: chk ? '#FFFFFF' : t.offFg,
sign: function () {{ if (chk) self.setState({{ ag: false, __tx: 'sign', __st: 1, __why: '' }}); }} }};"""
    page(stem, title, body, js, state=state, tx_default=tx)


def build():
    margin()
    margin('V7MarginAgree', 'Borrow agreement', agree=True)
    margin('V7MarginSign', 'Approve margin account', tx='sign')
    margin('V7MarginDone', 'Margin account active', tx='done')
    margin('V7MarginFee', 'Not enough SOL', tx='failed', state="{ __why: 'fee' }")
    margin('V7MarginRejected', 'Cancelled in Backpack', tx='rejected')


if __name__ == '__main__':
    build()
