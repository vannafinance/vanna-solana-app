"""Gradient buttons per space (approved 1 Oct 2026 from compare/previews/refresh.html).

    python compare/tools/buttons_gradient.py      (safe to re-run; run AFTER spaces.py, which rewrites Trade's bar)

1. Bottom bar: the selected item sits on a short gradient pill in its space's colours (white icon), like Current's
   "Lender" pill. The label keeps the space colour (theme-aware).
2. Main buttons (the flat violet ones) use their space's gradient. Short stays red (it means short / loss);
   Welcome and Connect keep their approved look.

All colours live in NAV / CTA below, so the brand gradients can be dropped in later in one place.
Button gradients are a little deeper than the pills: white 16px text needs 4.5:1, measured at the button's centre.
"""
import json, os, re

SRC = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'src')

NAV = {   # bottom-bar pill (white icon on it: 3:1 is enough for an icon)
    'portfolio': 'linear-gradient(90deg, #FC5457, #8B4DF7)',
    'earn': 'linear-gradient(90deg, #2FC9C1, #11838B)',
    'trade': 'linear-gradient(90deg, #8B4DF7, #4B44E0)',
    'farm': 'linear-gradient(90deg, #FC5457, #FF007A)',
}
CTA = {   # full buttons with white 16px labels (centre contrast: portfolio 6.2, earn 5.2, trade 5.4, farm 5.7)
    'portfolio': 'linear-gradient(90deg, #8B4DF7, #5A26C9)',
    'earn': 'linear-gradient(90deg, #14919A, #0B5F66)',
    'trade': 'linear-gradient(90deg, #6C63FF, #4B44E0)',
    'farm': 'linear-gradient(90deg, #E2087A, #B0005A)',
}
SPACE = {'02': 'portfolio', '03': 'portfolio', '04': 'portfolio', '05': 'portfolio', '06': 'portfolio',
         '07': 'trade', '08': 'trade', '09': 'trade', '10': 'trade', '11': 'trade', '12': 'trade', '13': 'trade', '14': 'trade',
         '15': 'earn', '16': 'earn', '17': 'earn', '18': 'earn', '19': 'earn',
         '20': 'farm', '21': 'farm', '22': 'farm', '23': 'farm', '24': 'farm'}
FLAT = 'background: #703AE6; color: #FFFFFF; font-size: 16px; font-weight: 600'
PILL = re.compile(r'(<a [^>]*aria-current="page"[^>]*>)<span (?:class="vn-npill" )?style="width: 64px; height: 32px; border-radius: 16px; background: [^;]+; color: [^;]+;( box-shadow: [^;]+;)?')


def write(p, old, new):
    if new != old:
        open(p, 'w', encoding='utf8').write(new)
        print('patched', os.path.basename(p))


def templates():
    for f in sorted(os.listdir(os.path.join(SRC, 'tpl'))):
        space = SPACE.get(f[:2])
        if not space:
            continue
        p = os.path.join(SRC, 'tpl', f)
        h = open(p, encoding='utf8').read()
        n = h
        if 'class="vn-navbar"' in n:
            n = PILL.sub(lambda m: m.group(1) + '<span class="vn-npill" style="width: 64px; height: 32px; border-radius: 16px; background: %s; color: #FFFFFF; '
                         'box-shadow: 0 4px 12px -4px rgba(17, 11, 46, 0.45);' % NAV[space], n, count=1)
        n = n.replace(FLAT, FLAT.replace('background: #703AE6', 'background: ' + CTA[space]))
        n = re.sub(r'background: linear-gradient\(90deg, #[0-9A-F]{6}, #[0-9A-F]{6}\); color: #FFFFFF; font-size: 16px; font-weight: 600',
                   lambda m: 'background: %s; color: #FFFFFF; font-size: 16px; font-weight: 600' % CTA[space] if any(m.group(0).startswith('background: ' + g) for g in CTA.values()) else m.group(0), n)
        write(p, h, n)


def logic():
    screens = json.load(open(os.path.join(SRC, 'screens.json'), encoding='utf8'))
    tpl_of = {v['c']: v['t'] for v in screens.values() if 'c' in v}
    for f in sorted(os.listdir(os.path.join(SRC, 'cls'))):
        c = int(f[:2])
        space = SPACE.get('%02d' % tpl_of.get(c, -1))
        if not space:
            continue
        p = os.path.join(SRC, 'cls', f)
        s = open(p, encoding='utf8').read()
        n = re.sub(r"ctaBg: ([^,]*?)'#703AE6'", lambda m: "ctaBg: " + m.group(1) + "'" + CTA[space] + "'", s)
        # re-runs with new colours: swap an older CTA gradient of this script for the current one
        for old in set(CTA.values()):
            n = n.replace("'" + old + "'", "'" + CTA[space] + "'") if old != CTA[space] and ("ctaBg" in n) else n
        write(p, s, n)


if __name__ == '__main__':
    templates()
    logic()
