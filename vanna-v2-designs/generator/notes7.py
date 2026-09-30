from common import *

# Notification icon = the asset it is about + a small status badge, so you know what and why at a glance.
NOTES_JS = """var P = { warn: '%(warn)s', up: '%(up)s', coin: '%(coin)s', plus: '%(plus)s', down: '%(down)s', check: '%(check)s', safe: '%(safe)s' };
var notesAll = [
{ g: 'Today', kind: 'Health', title: 'GOOGLx farm health is 1.33', body: 'It liquidates at 1.10, if GOOGLx falls below $101.01. Nothing to do yet.', time: '2h', unread: true, img: '%(GOOGLx)s', mark: false, d: P.warn, bb: '#B33C3E', cta: 'View position', href: 'V7FarmPosition.dc.html' },
{ g: 'Today', kind: 'Trades', title: 'TSLAx long is up 10.89%%', body: '+$152.52 unrealized on your 3x long.', time: '5h', unread: true, img: '%(TSLAx)s', mark: false, d: P.up, bb: '#1C7C83', cta: 'View position', href: 'V7PerpsPositions.dc.html' },
{ g: 'Today', kind: 'Earn', title: 'You earned $0.12', body: 'Interest from the USDC vault landed.', time: '9h', unread: true, img: '%(USDC)s', mark: false, d: P.coin, bb: '#703AE6', cta: '', href: '' },
{ g: 'Earlier', kind: 'Trades', title: 'OPENAI short opened', body: '0.9174 OPENAI at $2,180.00 · 2x · $1,000 collateral.', time: 'Sep 25', unread: false, img: '%(OPENAI)s', mark: false, d: P.plus, bb: '#703AE6', cta: '', href: '' },
{ g: 'Earlier', kind: 'Earn', title: 'Withdrew 500 USDC', body: 'Sent from the USDC vault to your wallet.', time: 'Sep 25', unread: false, img: '%(USDC)s', mark: false, d: P.down, bb: '#2440A9', cta: '', href: '' },
{ g: 'Earlier', kind: 'Trades', title: 'AAPLx long closed in profit', body: 'Realized +$38.43 (+3.84%%) after 3 days.', time: 'Sep 24', unread: false, img: '%(AAPLx)s', mark: false, d: P.check, bb: '#1C7C83', cta: '', href: '' },
{ g: 'Earlier', kind: 'Health', title: 'Account back to Safe', body: 'Margin account health is 1.69 after your deposit.', time: 'Sep 23', unread: false, img: '', mark: true, d: P.safe, bb: '#1C7C83', cta: '', href: '' }
];
""" % dict(TOK, warn=path('warning', 'fill'), up=path('trend-up', 'bold'), coin=path('coins', 'fill'), plus=path('plus', 'bold'), down=path('arrow-down', 'bold'), check=path('check', 'bold'), safe=path('shield-check', 'fill'))

NOTE_ICON = f"""<span style="position: relative; width: 40px; height: 40px; flex-shrink: 0">
<sc-if value="{{{{ n.img }}}}" hint-placeholder-val="{{{{ true }}}}"><img src="{{{{ n.img }}}}" alt="" style="width: 40px; height: 40px; border-radius: 999px; display: block"></sc-if>
<sc-if value="{{{{ n.mark }}}}" hint-placeholder-val="{{{{ false }}}}"><span style="width: 40px; height: 40px; border-radius: 999px; background: {{{{ t.tv }}}}; display: flex; align-items: center; justify-content: center"><img src="{MARK}" alt="" style="width: 22px; height: 22px"></span></sc-if>
<span style="position: absolute; right: -4px; bottom: -4px; width: 20px; height: 20px; border-radius: 999px; background: {{{{ n.bb }}}}; border: 2px solid {{{{ t.card }}}}; color: #FFFFFF; display: flex; align-items: center; justify-content: center"><svg width="10" height="10" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="{{{{ n.d }}}}"></path></svg></span>
</span>"""
