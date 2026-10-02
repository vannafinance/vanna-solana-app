"""First-launch chooser (V7Spaces), option "4a · calm, dark tiles" (chosen 2 Oct 2026 from previews/onboarding.html).

    python compare/tools/chooser_dark.py      (safe to re-run; run after spaces.py, which first creates the screen)

Always dark, whatever the theme: a near-black page with a coral-violet glow living in the top-right corner.
Each space is one dark tile: its colour is only on the icon, a soft corner tint and the audience
("For lenders", "For traders", "Leveraged yield") as plain coloured words on the right of the name (no pill: the
user found the badge bubble generic, 2 Oct). The other facts are one quiet
line, and the whole tile is the button (no arrow). The words are the user's own.
"""
import os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(os.path.dirname(HERE), 'src')
sys.path.insert(0, HERE)
import material_icons as mi              # noqa: E402
from buttons_gradient import CTA         # noqa: E402

SPACES = [  # name, link, icon, text, meta, label colour (the space's colour lifted for a dark tile), CTA key
    ('Earn', 'V7Earn.dc.html', 'savings', 'Supply USDC, SOL or stocks and earn the interest borrowers pay.', 'For lenders · No leverage · Withdraw anytime', '#5ED3CB', 'earn'),
    ('Trade', 'V7Perps.dc.html', 'candlestick_chart', 'Long or short TSLAx, AAPLx and pre-IPO stocks, and swap any token.', 'For traders · Up to 5x', '#B0ABFF', 'trade'),
    ('Farm', 'V7Farm.dc.html', 'psychiatry', 'Keep your stock as collateral, borrow USDC or SOL and earn on Kamino.', 'Leveraged yield · Up to 5x', '#FF84BD', 'farm'),
]
TITLE, SUB, NOTE = 'What do you want to do?', 'Pick one to start. Everything stays one tap away at the top.', 'New to leverage? Start with Earn. Nothing is ever liquidated there.'
PAGE = ('radial-gradient(56% 21% at 100% 0%, rgba(252, 84, 87, 0.55), rgba(252, 84, 87, 0) 72%), '
        'radial-gradient(44% 17% at 72% 0%, rgba(112, 58, 230, 0.55), rgba(112, 58, 230, 0) 72%), '
        'radial-gradient(34% 14% at 100% 17%, rgba(226, 8, 122, 0.22), rgba(226, 8, 122, 0) 72%), #0E0C13')


def icon(name, size):
    return ('<svg width="%d" height="%d" viewBox="0 -960 960 960" fill="currentColor" aria-hidden="true">%s</svg>'
            % (size, size, ''.join('<path d="%s"></path>' % d for d in mi.material(name, 'regular'))))


def first_colour(grad):
    return grad.split('(')[1].split(',')[1].strip()


def tile(name, href, ic, text, meta, label, key):
    who, *facts = meta.split(' · ')
    c0 = first_colour(CTA[key])
    return ('<a href="%s" aria-label="%s. %s %s" style="display: flex; flex-direction: column; gap: 6px; padding: 16px; border-radius: 22px; text-decoration: none; color: #FFFFFF; '
            'background: radial-gradient(90%% 120%% at 0%% 0%%, %s55, transparent 60%%), #1A1721; box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.07)">'
            '<span style="display: flex; align-items: center; gap: 10px; margin-bottom: 4px">'
            '<span style="width: 36px; height: 36px; border-radius: 12px; background: %s; display: flex; align-items: center; justify-content: center; flex-shrink: 0">%s</span>'
            '<span style="font-size: 19px; line-height: 24px; font-weight: 600">%s</span>'
            '<span style="margin-left: auto; color: %s; font-size: 13px; line-height: 18px; font-weight: 700">%s</span></span>'
            '<span style="font-size: 14px; line-height: 20px; color: #D9D7E3">%s</span>'
            '<span style="font-size: 12.5px; line-height: 16px; font-weight: 600; color: #9A98A8">%s</span></a>'
            % (href, name, text, meta, c0, CTA[key].replace('90deg', '150deg'), icon(ic, 22), name, label, who, text, ' · '.join(facts)))


def build(logo_svg):
    return ('<div style="width: 412px; height: 915px; position: relative; overflow: hidden; background: ' + PAGE + '; color: #FFFFFF; '
            "font-family: 'Plus Jakarta Sans', system-ui, sans-serif; font-variant-numeric: tabular-nums\">\n"
            '<div class="vn-main" style="position: absolute; inset: 0; overflow-y: auto; padding-bottom: 32px">\n'
            '<div style="padding: 68px 20px 0 20px">\n' + logo_svg + '\n'
            '<h1 style="margin: 28px 0 0 0; font-size: 28px; line-height: 36px; font-weight: 600; letter-spacing: -0.01em">' + TITLE + '</h1>\n'
            '<p style="margin: 8px 0 24px 0; font-size: 16px; line-height: 24px; color: #B9B7C6">' + SUB + '</p>\n'
            '<div style="display: flex; flex-direction: column; gap: 14px">\n' + '\n'.join(tile(*s) for s in SPACES) + '\n</div>\n'
            '<p style="margin: 18px 4px 0 4px; display: flex; gap: 8px; font-size: 14px; line-height: 20px; color: #A9A7B6">'
            '<span style="color: #C9B8FF; display: flex; flex-shrink: 0; margin-top: 1px">' + icon('info', 18) + '</span>' + NOTE + '</p>\n'
            '</div>\n</div>\n</div>\n')


def main():
    tpl = os.path.join(SRC, 'tpl')
    f = [x for x in os.listdir(tpl) if x.endswith('-V7Spaces.html')][0]
    p = os.path.join(tpl, f)
    h = open(p, encoding='utf8').read()
    logo = h[h.index('<svg'):h.index('</svg>') + 6]      # the Vanna mark already on the screen (original gradient)
    assert 'vnChG' in logo, 'logo not found'
    new = build(logo)
    if new != h:
        open(p, 'w', encoding='utf8').write(new)
        print('chooser:', f, 'dark tiles')
    else:
        print('chooser: unchanged')


if __name__ == '__main__':
    main()
