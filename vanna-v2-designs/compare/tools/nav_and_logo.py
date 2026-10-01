"""Navigation bar: the selected tab is a filled icon in the section's colour (no pill), like a super app's
per-section bars. Home header: the 2026 mark sits in the lockup in white, no circle around it.

    python compare/tools/nav_and_logo.py      (safe to re-run)
"""
import glob, json, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(os.path.dirname(HERE), 'src')
MARK = json.load(open(os.path.join(HERE, 'mark.json')))
# section colour for the selected tab: Vanna violet everywhere, Farm keeps its pink
FARM = ('20-', '21-', '22-', '23-', '24-')
SUPER_APP_NAV = True    # chosen 1 Oct 2026: Swiggy-style bar (filled icon + label in the section colour). False undoes it.
hits = {}


def count(k, n=1):
    hits[k] = hits.get(k, 0) + n


def nav(block, farm):
    tonal = 'width: 64px; height: 32px; border-radius: 16px; background: {{ t.tv }}; color: {{ t.tvI }};'
    if SUPER_APP_NAV:
        ink = '#FF007A' if farm else '{{ t.link }}'
        block, n = re.subn(re.escape(tonal), 'width: 64px; height: 32px; border-radius: 16px; background: transparent; color: %s;' % ink, block)
        count('nav: selected tab -> filled icon in section colour', n)
        # the selected label takes the section colour too
        block, n = re.subn(r'(aria-current="page"[^>]*>.*?<span style="font-size: 12px; line-height: 16px; font-weight: 600; color: )\{\{ t\.text \}\}',
                           lambda m: m.group(1) + ink, block, flags=re.S)
        count('nav: selected label in section colour', n)
        block, n = re.subn(r'(aria-current="page"[^>]*><span[^>]*><svg) width="20" height="20"', lambda m: m.group(1) + ' width="22" height="22"', block)
        count('nav: selected icon same size as the others', n)
    else:
        block, n = re.subn(r'width: 64px; height: 32px; border-radius: 16px; background: transparent; color: (?:\{\{ t\.link \}\}|#FF007A);', tonal, block)
        count('nav: back to the tonal indicator', n)
        block, n = re.subn(r'(aria-current="page"[^>]*>.*?<span style="font-size: 12px; line-height: 16px; font-weight: 600; color: )(?:\{\{ t\.link \}\}|#FF007A)',
                           lambda m: m.group(1) + '{{ t.text }}', block, flags=re.S)
    return block


white_mark = ('<svg width="30" height="30" viewBox="11 12 232 232" role="img" aria-label="Vanna" style="display: block; flex-shrink: 0">'
              '<defs><linearGradient id="vnMarkHd" gradientUnits="userSpaceOnUse" x1="31.7" y1="73" x2="222.3" y2="183"><stop offset="0" stop-color="#FC5457"></stop><stop offset="1" stop-color="#703AE6"></stop></linearGradient></defs>'
              '<path fill="url(#vnMarkHd)" fill-rule="evenodd" d="%s"></path></svg>') % MARK['d']   # brand colours, never white (1 Oct 2026)

for f in sorted(glob.glob(os.path.join(SRC, 'tpl', '*.html'))):
    name = os.path.basename(f)
    h = open(f, encoding='utf8').read(); before = h
    h = re.sub(r'<nav [^>]*class="vn-navbar"[^>]*>.*?</nav>', lambda m: nav(m.group(0), name.startswith(FARM)), h, flags=re.S)
    h, n = re.subn(r'<span style="width: 40px; height: 40px; border-radius: 999px; background: \{\{ logoBg \}\}[^>]*><img src="@IMG:ef5faa62df31da21c9379ab31ec4247a@"[^>]*></span>',
                   lambda m: white_mark, h)
    count('home header: mark in the lockup, no circle', n)
    if h != before:
        open(f, 'w', encoding='utf8').write(h)

for k, v in hits.items():
    print('%4d  %s' % (v, k))
