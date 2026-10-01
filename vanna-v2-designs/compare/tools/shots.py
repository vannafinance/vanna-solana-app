"""Screenshots screens on both sides and lays them out as Current | New pairs for review.

    python compare/tools/shots.py V7Home V7PerpsOrder --dark --out review.png

Writes compare/renders/<out> (default shots.png).
"""
import argparse
from pathlib import Path
from PIL import Image
from playwright.sync_api import sync_playwright

CMP = Path(__file__).resolve().parent.parent
PAD, W, H = 30, 412, 915

ap = argparse.ArgumentParser()
ap.add_argument('stems', nargs='+')
ap.add_argument('--dark', action='store_true')
ap.add_argument('--out', default='shots.png')
ap.add_argument('--new-only', action='store_true')
ap.add_argument('--device', default='412x915', help='device size in dp, e.g. 800x1280')
ap.add_argument('--swiggy', action='store_true', help='Swiggy-style bottom bar on the New side')
ap.add_argument('--nav3', action='store_true', help='Android 3-button navigation instead of gestures')
a = ap.parse_args()
W, H = (int(v) for v in a.device.split('x'))

sides = ['new'] if a.new_only else ['current', 'new']
tiles = []
with sync_playwright() as p:
    try:
        b = p.chromium.launch()
    except Exception:
        b = p.chromium.launch(channel='chrome')
    page = b.new_page(viewport={'width': W + PAD * 2, 'height': H + PAD * 2}, device_scale_factor=1)
    for stem in a.stems:
        for side in sides:
            page.goto((CMP / (side + '.html')).as_uri() + '?embed=1&side=' + side + '&s=' + stem + '#' + stem)
            page.wait_for_function('window.__vn && window.__vn.app().shown')
            page.evaluate("""m => { document.documentElement.style.background = '#E9E6F0'; window.__vnSetTheme(m); window.__vnFit(); }""", 'Dark' if a.dark else 'Light')
            page.evaluate('d => window.postMessage({ vnCmd: "device", w: d[0], h: d[1] }, "*")', [W, H])
            if a.swiggy and side == 'new':
                page.evaluate("() => window.postMessage({ vnCmd: 'navstyle', style: 'swiggy' }, '*')")
            if a.nav3:
                page.evaluate("() => window.postMessage({ vnCmd: 'navmode', mode: '3btn' }, '*')")
            page.wait_for_timeout(250)
            page.evaluate('() => document.getAnimations().forEach(x => { try { x.finish(); } catch (e) {} })')
            page.wait_for_timeout(120)
            path = CMP / 'renders' / ('_%s_%s.png' % (stem, side))
            page.screenshot(path=str(path))
            tiles.append(Image.open(path))
    b.close()

cols = len(sides) * min(len(a.stems), (3 if len(sides) == 2 else 5) if W < 600 else (1 if len(sides) == 2 else 2))
rows = -(-len(tiles) // cols)
tw, th = tiles[0].size
sheet = Image.new('RGB', (tw * cols, th * rows), (233, 230, 240))
for i, t in enumerate(tiles):
    sheet.paste(t, ((i % cols) * tw, (i // cols) * th))
out = CMP / 'renders' / a.out
sheet.save(out)
for f in (CMP / 'renders').glob('_*.png'):
    f.unlink()
print(out)
