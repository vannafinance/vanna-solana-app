"""Walks through every space screen in the built prototype (new.html) using the floating island and each space's
bottom bar, in Light then Dark, and records it.

    python compare/tools/record_island.py    -> compare/renders/island-walkthrough.mp4 (+ island-*.png key frames)
"""
import subprocess, tempfile
from pathlib import Path
from playwright.sync_api import sync_playwright

CMP = Path(__file__).resolve().parent.parent
W, H, PAD = 412, 915, 24

# (where to tap: island or bottom bar, label) in order
TOUR = [('bar', 'Lender'), ('bar', 'Trader'), ('bar', 'Overview'),
        ('island', 'Earn'), ('bar', 'Positions'), ('bar', 'History'), ('bar', 'Vaults'),
        ('island', 'Trade'), ('bar', 'Swap'), ('bar', 'Positions'), ('bar', 'History'), ('bar', 'Markets'),
        ('island', 'Farm'), ('bar', 'Position'), ('bar', 'History'), ('bar', 'Deploy'),
        ('island', 'Portfolio')]
DARK_TOUR = [('island', 'Earn'), ('island', 'Trade'), ('island', 'Farm'), ('island', 'Portfolio')]

TAP = """([zone, label]) => {
  const scr = document.getElementById('screen'), r = scr.getBoundingClientRect();
  const links = [...scr.querySelectorAll(zone === 'island' ? '.vn-island a' : 'a, button')];
  const el = links.find(a => a.textContent.trim() === label && (zone === 'island' || a.getBoundingClientRect().top > r.bottom - 140));
  if (!el) return false; el.click(); return true; }"""

with tempfile.TemporaryDirectory() as tmp, sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': W + PAD * 2, 'height': H + PAD * 2}, record_video_dir=tmp, record_video_size={'width': W + PAD * 2, 'height': H + PAD * 2})
    pg = ctx.new_page()
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto((CMP / 'new.html').as_uri() + '?embed=1&side=new&s=V7Home#V7Home')
    pg.wait_for_function('window.__vn && window.__vn.app().shown')
    pg.evaluate("() => { document.documentElement.style.background = '#E9E6F0'; window.__vnSetTheme('Light'); window.__vnFit(); }")
    pg.evaluate('d => window.postMessage({ vnCmd: "device", w: d[0], h: d[1] }, "*")', [W, H])
    pg.wait_for_timeout(1400)
    missed, shown = [], []
    for i, (zone, label) in enumerate(TOUR):
        if not pg.evaluate(TAP, [zone, label]):
            missed.append(label)
        pg.wait_for_timeout(1300)
        shown.append(pg.evaluate('() => window.__vn.app().shown'))
        if zone == 'island':
            pg.screenshot(path=str(CMP / 'renders' / ('island-%s.png' % label.lower())))
    pg.evaluate("() => window.__vnSetTheme('Dark')"); pg.wait_for_timeout(1200)
    for zone, label in DARK_TOUR:
        if not pg.evaluate(TAP, [zone, label]):
            missed.append(label + ' (dark)')
        pg.wait_for_timeout(1300)
        shown.append(pg.evaluate('() => window.__vn.app().shown'))
        pg.screenshot(path=str(CMP / 'renders' / ('island-dark-%s.png' % label.lower())))
    webm = pg.video.path(); ctx.close(); b.close()
    out = CMP / 'renders' / 'island-walkthrough.mp4'
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', webm, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', str(out)], check=True)
    print('screens:', ' > '.join(shown))
    print('missed taps:', missed or 'none')
    print('page errors:', errs[:3] or 'none')
    print(out)
