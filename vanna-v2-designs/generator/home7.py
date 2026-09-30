from common import *
from notes7 import NOTES_JS, NOTE_ICON

# Home mirrors the devnet Portfolio page: Wallet Balance, Margin Account Balance, Net Available Collateral,
# Total Borrowed, Net Earnings, then Lender / Trader. No net worth, no chart, no deposit/withdraw (not on the web).


def art(key):
    """White line illustrations drawn on the product gradient. Made from shapes, no external art."""
    if key == 'perps':
        c = ''
        data = [(18, 30, 44, 1), (34, 24, 40, 1), (50, 34, 50, 0), (66, 20, 36, 1), (82, 14, 30, 1), (98, 22, 34, 0), (114, 8, 24, 1), (130, 4, 18, 1)]
        for x, top, bot, up in data:
            c += f'<line x1="{x}" y1="{top - 4}" x2="{x}" y2="{bot + 4}" stroke="rgba(255,255,255,0.7)" stroke-width="1.5"></line><rect x="{x - 4}" y="{top}" width="8" height="{bot - top}" rx="1.5" fill="{"#FFFFFF" if up else "rgba(255,255,255,0.35)"}"></rect>'
        return f'<svg width="148" height="58" viewBox="0 0 148 58" aria-hidden="true">{c}</svg>'
    if key == 'swap':
        return (f'<span style="position: relative; width: 120px; height: 56px; display: block">'
                f'<img src="{TOK["USDC"]}" alt="" style="position: absolute; left: 0; top: 6px; width: 44px; height: 44px; border-radius: 999px; border: 3px solid rgba(255,255,255,0.9)">'
                f'<img src="{TOK["TSLAx"]}" alt="" style="position: absolute; right: 0; top: 6px; width: 44px; height: 44px; border-radius: 999px; border: 3px solid rgba(255,255,255,0.9)">'
                f'<span style="position: absolute; left: 50%; top: 50%; z-index: 2; width: 38px; height: 38px; margin: -19px 0 0 -19px; border-radius: 999px; background: {{{{ logoBg }}}}; border: 3px solid rgba(255,255,255,0.9); box-shadow: 0 6px 16px rgba(17,17,17,0.3); display: flex; align-items: center; justify-content: center"><img src="{MARK}" alt="" style="width: 22px; height: 22px"></span></span>')
    if key == 'earn':
        return ('<svg width="148" height="58" viewBox="0 0 148 58" aria-hidden="true"><defs><linearGradient id="eaF" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF" stop-opacity="0.35"></stop><stop offset="1" stop-color="#FFFFFF" stop-opacity="0"></stop></linearGradient></defs>'
                '<path d="M0 50 C 20 48, 34 46, 52 40 S 88 30, 104 22 S 132 10, 148 6 L 148 58 L 0 58 Z" fill="url(#eaF)"></path>'
                '<path d="M0 50 C 20 48, 34 46, 52 40 S 88 30, 104 22 S 132 10, 148 6" fill="none" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round"></path><circle cx="148" cy="6" r="4" fill="#FFFFFF"></circle></svg>')
    if key == 'farm':
        return (f'<span style="display: flex; align-items: flex-end; gap: 6px; height: 56px">'
                + ''.join(f'<span style="width: 18px; height: {h}px; border-radius: 6px 6px 2px 2px; background: {"#FFFFFF" if i == 3 else "rgba(255,255,255,0.4)"}"></span>' for i, h in enumerate([16, 26, 38, 52]))
                + f'<span style="margin-left: 4px; color: #FFFFFF; display: flex">{ic("vn-farm", 30, "bold")}</span></span>')
    return ''


def product_card(key, title, tagline, hook, href):
    sp = SP[key]
    return f"""<a href="{href}.dc.html" style="position: relative; height: 176px; padding: 14px; border-radius: 24px; background: {sp['grad']}; color: #FFFFFF; overflow: hidden; display: flex; flex-direction: column; justify-content: space-between; text-decoration: none">
<span style="display: flex; align-items: center; justify-content: space-between">{space_icon(key, 36, 18)}<span style="width: 32px; height: 32px; border-radius: 999px; background: rgba(255,255,255,0.18); display: flex; align-items: center; justify-content: center">{ic('arrow-up-right', 16, 'bold')}</span></span>
<span style="position: absolute; right: 12px; top: 54px; opacity: 0.95">{art(key)}</span>
<span style="position: relative; display: flex; flex-direction: column; gap: 2px"><span style="font-size: 20px; line-height: 26px; font-weight: 600">{title}</span><span style="font-size: 12px; line-height: 16px; color: rgba(255,255,255,0.82); white-space: nowrap">{tagline}</span></span>
</a>"""


def home(stem='V7Home', title='Home'):
    stats = ''.join(f'<div style="display: flex; flex-direction: column; gap: 2px;{"" if i == 0 else " padding-left: 12px; border-left: 1px solid rgba(255,255,255,0.18);"}"><span style="font-size: 12px; line-height: 16px; color: rgba(255,255,255,0.72)">{k}</span><span style="font-size: 16px; line-height: 22px; font-weight: 600; color: {c}">{v}</span></div>' for i, (k, v, c) in enumerate([('Net available', '$4,320.37', '#FFFFFF'), ('Total borrowed', '$6,271.92', '#FFFFFF'), ('Net earnings', '+$1.37', '#32EEE2')]))
    hero_inner = f"""<div style="margin-top: 24px; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px">
<div style="display: flex; flex-direction: column; gap: 2px"><span style="font-size: 14px; line-height: 20px; color: rgba(255,255,255,0.78)">Wallet balance</span><span style="font-size: 30px; line-height: 38px; font-weight: 600; letter-spacing: -0.02em">$4,812<span style="color: rgba(255,255,255,0.56)">.40</span></span></div>
<div style="display: flex; flex-direction: column; gap: 2px"><span style="font-size: 14px; line-height: 20px; color: rgba(255,255,255,0.78)">Margin account</span><span style="font-size: 30px; line-height: 38px; font-weight: 600; letter-spacing: -0.02em">$10,592<span style="color: rgba(255,255,255,0.56)">.29</span></span></div>
</div>
<div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.16); display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px">{stats}</div>"""

    attention = f"""<a href="V7FarmPosition.dc.html" style="padding: 12px 12px 12px 14px; border-radius: 20px; background: {{{{ t.tr }}}}; color: {{{{ t.trI }}}}; display: flex; align-items: center; gap: 12px; text-decoration: none">
<span style="position: relative; width: 40px; height: 40px; flex-shrink: 0">{token('GOOGLx', 40)}<span style="position: absolute; right: -4px; bottom: -4px; width: 20px; height: 20px; border-radius: 999px; background: #B33C3E; border: 2px solid {{{{ t.tr }}}}; color: #FFFFFF; display: flex; align-items: center; justify-content: center">{ic('warning', 10, 'fill')}</span></span>
<span style="flex-grow: 1; display: flex; flex-direction: column; gap: 2px"><span style="font-size: 14px; line-height: 20px; font-weight: 600">GOOGLx farm needs attention</span><span style="font-size: 12px; line-height: 16px">Health 1.33 · add 0.75 GOOGLx to reach 1.50</span></span>
<span style="height: 36px; padding: 0 14px; border-radius: 18px; background: {{{{ t.card }}}}; color: {{{{ t.text }}}}; font-size: 14px; font-weight: 600; display: flex; align-items: center">Fix</span>
</a>"""

    prow = lambda sym, name, tag, tc, v, sub, first: f"""<a href="V7Trader.dc.html" style="height: 64px; display: flex; align-items: center; gap: 12px; text-decoration: none; color: {{{{ t.text }}}};{'' if first else ' border-top: 1px solid {{ t.line }};'}">{token(sym, 40)}<span style="flex-grow: 1; display: flex; flex-direction: column"><span style="font-size: 16px; line-height: 22px; font-weight: 600">{name}</span><span style="font-size: 12px; line-height: 16px; font-weight: 600; color: {tc}">{tag}</span></span><span style="display: flex; flex-direction: column; align-items: flex-end"><span style="font-size: 16px; line-height: 22px; font-weight: 600; color: {{{{ t.pos }}}}">{v}</span><span style="font-size: 12px; line-height: 16px; color: {{{{ t.text2 }}}}">{sub}</span></span></a>"""
    positions = f"""<div style="margin-top: 8px; display: flex; align-items: baseline; justify-content: space-between"><h2 style="margin: 0; font-size: 20px; line-height: 28px; font-weight: 600">Your positions</h2><a href="V7Trader.dc.html" style="font-size: 14px; font-weight: 600; color: {{{{ t.link }}}}; text-decoration: none">See all</a></div>
<div style="border-radius: 22px; background: {{{{ t.card }}}}; box-shadow: {{{{ t.shadow }}}}; padding: 4px 16px">

{prow('TSLAx', 'TSLAx', 'Long 3x', '{{ t.link }}', '+$152.52', '+10.89%', True)}{prow('OPENAI', 'OPENAI', 'Short 2x', '{{ t.neg }}', '+$57.71', '+5.77%', False)}{prow('GOOGLx', 'GOOGLx farm', 'Farm 4x', '{{ t.text2 }}', '+$1.47', '4.23% net APR', False)}
</div>"""

    products = f"""<h2 style="margin: 4px 0 0 0; font-size: 20px; line-height: 28px; font-weight: 600; display: flex; align-items: center; gap: 7px">Explore {wordmark(15, extra=" margin-top: 2px;")}</h2>
<div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px">
{product_card('perps', 'Perps', 'Long or short up to 5x', '', 'V7Perps')}
{product_card('swap', 'Swap', 'Any token, in seconds', '', 'V7Swap')}
{product_card('earn', 'Earn', 'Lend, withdraw anytime', '', 'V7Earn')}
{product_card('farm', 'Farm', 'Yield in one click', '', 'V7Farm')}
</div>"""

    dropdown = f"""<sc-if value="{{{{ notif }}}}" hint-placeholder-val="{{{{ false }}}}">
<div aria-hidden="true" onClick="{{{{ toggleNotif }}}}" style="position: absolute; inset: 0; z-index: 20; background: {{{{ t.scrim }}}}; animation: vnFade 160ms ease-out"></div>
<div role="dialog" aria-label="Notifications" style="position: absolute; z-index: 21; top: 96px; left: 16px; right: 16px; border-radius: 22px; background: {{{{ t.card }}}}; box-shadow: 0 16px 40px rgba(17,17,17,0.24); border: 1px solid {{{{ t.line }}}}; padding: 8px 0; color: {{{{ t.text }}}}; transform-origin: top right; animation: vnDrop 220ms cubic-bezier(0.2, 0.9, 0.3, 1)">
<div style="height: 48px; padding: 0 16px; display: flex; align-items: center; justify-content: space-between"><span style="font-size: 16px; font-weight: 600">Notifications</span><button type="button" onClick="{{{{ markAll }}}}" style="border: 0; background: transparent; padding: 0; font-size: 12px; font-weight: 600; color: {{{{ t.link }}}}">Mark all read</button></div>
<sc-for list="{{{{ notes }}}}" as="n" hint-placeholder-count="3">
<div style="padding: 12px 16px; display: flex; gap: 12px; border-top: 1px solid {{{{ t.line }}}}">
{NOTE_ICON}
<span style="flex-grow: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px"><span style="display: flex; justify-content: space-between; gap: 8px; font-size: 14px; line-height: 20px; font-weight: 600"><span>{{{{ n.title }}}}</span><span style="font-size: 12px; font-weight: 400; color: {{{{ t.text2 }}}}; flex-shrink: 0; display: flex; align-items: center; gap: 6px">{{{{ n.time }}}}<sc-if value="{{{{ n.unread }}}}" hint-placeholder-val="{{{{ true }}}}"><span style="width: 8px; height: 8px; border-radius: 999px; background: #FF007A"></span></sc-if></span></span><span style="font-size: 12px; line-height: 16px; color: {{{{ t.text2 }}}}">{{{{ n.body }}}}</span></span>
</div>
</sc-for>
<a href="V7Notifications.dc.html" style="margin: 4px 16px 8px 16px; height: 44px; border-radius: 14px; background: {{{{ t.page }}}}; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 600; color: {{{{ t.text }}}}; text-decoration: none">See all notifications</a>
</div>
</sc-if>"""

    body = scroller(f"""{hero('home', hero_inner, bell_toggle=True)}
<div style="padding: 16px 16px 0 16px; display: flex; flex-direction: column; gap: 12px">
<sc-if value="{{{{ offline }}}}" hint-placeholder-val="{{{{ false }}}}">
<div role="status" style="padding: 12px 12px 12px 14px; border-radius: 20px; background: {{{{ t.tr }}}}; color: {{{{ t.trI }}}}; display: flex; align-items: center; gap: 12px; animation: vnDrop 280ms ease-out">
<span style="width: 36px; height: 36px; border-radius: 999px; background: {{{{ t.card }}}}; color: {{{{ t.trI }}}}; display: flex; align-items: center; justify-content: center; flex-shrink: 0">{ic('wifi-slash', 18, 'bold')}</span>
<span style="flex-grow: 1; display: flex; flex-direction: column; gap: 2px"><span style="font-size: 14px; line-height: 20px; font-weight: 600">You're offline</span><span style="font-size: 12px; line-height: 16px">Balances are from 2 min ago. Trades and swaps are paused.</span></span>
<button type="button" onClick="{{{{ retryNet }}}}" style="height: 36px; padding: 0 14px; border-radius: 18px; border: 0; background: {{{{ t.card }}}}; color: {{{{ t.text }}}}; font-size: 14px; font-weight: 600">Retry</button>
</div>
</sc-if>
{products}
{positions}
</div>""") + '\n' + dropdown + '\n' + capsule('home', 'Overview')
    js = NOTES_JS + """var notif = this.state.notif === undefined ? !!this.props.notificationsOpen : this.state.notif;
var info = !!this.state.info, read = !!this.state.read;
var notes = notesAll.slice(0, 3).map(function (n) { var c = {}; for (var k in n) c[k] = n[k]; c.unread = n.unread && !read; c.img = n.img ? n.img : false; return c; });
var offline = this.state.offline === undefined ? !!this.props.offline : this.state.offline;
return { t: t, offline: offline, retryNet: function () { self.setState({ offline: false }); }, notes: notes, notif: notif, notifAria: notif ? 'true' : 'false', bellBg: notif ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.14)', toggleNotif: function () { self.setState({ notif: !notif }); },
markAll: function () { self.setState({ read: true }); } };"""
    page(stem, title, body, js, props={'notificationsOpen': {'editor': 'boolean', 'default': False, 'section': 'State'}, 'offline': {'editor': 'boolean', 'default': False, 'section': 'State'}})


def build():
    home()


if __name__ == '__main__':
    build()
