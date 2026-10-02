"""Checks and records the vault's scrolling tab row in the built prototype (new.html).

    python compare/tools/record_tabs.py    -> compare/renders/vault-tabs.mp4, and prints which arrows show at each step
"""
import subprocess, tempfile
from pathlib import Path
from playwright.sync_api import sync_playwright

CMP = Path(__file__).resolve().parent.parent
W, H, PAD = 412, 915, 24
STATE = """() => { const r = document.querySelector('.vn-tabscroll'), w = r.parentNode, cs = s => getComputedStyle(w.querySelector(s)).opacity;
  return { left: cs('.vn-tabless'), right: cs('.vn-tabmore'), selected: (r.querySelector('[aria-selected="true"]') || {}).textContent, scroll: Math.round(r.scrollLeft) + '/' + (r.scrollWidth - r.clientWidth) }; }"""

with tempfile.TemporaryDirectory() as tmp, sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': W + PAD * 2, 'height': H + PAD * 2}, record_video_dir=tmp, record_video_size={'width': W + PAD * 2, 'height': H + PAD * 2})
    pg = ctx.new_page()
    pg.goto((CMP / 'new.html').as_uri() + '?embed=1&side=new&s=V7EarnVault#V7EarnVault')
    pg.wait_for_function('window.__vn && window.__vn.app().shown')
    pg.evaluate("() => { document.documentElement.style.background = '#E9E6F0'; window.__vnSetTheme('Light'); window.__vnFit(); }")
    pg.evaluate('d => window.postMessage({ vnCmd: "device", w: d[0], h: d[1] }, "*")', [W, H])
    pg.wait_for_timeout(1200)
    report = []
    def step(name, wait=700):
        pg.wait_for_timeout(wait)
        report.append((name, pg.evaluate(STATE)))
    step('start')
    pg.click('.vn-tabmore'); step('right arrow once')
    pg.click('.vn-tabmore', force=True); step('right arrow again (end)')
    pg.click('.vn-tabscroll button:has-text("Analytics")', force=True); step('tap Analytics')
    pg.click('.vn-tabless'); step('left arrow once')
    pg.click('.vn-tabless', force=True); step('left arrow again (start)')
    pg.click('.vn-tabscroll button:has-text("Details")', force=True); step('tap Details', 900)
    webm = pg.video.path(); ctx.close(); b.close()
    out = CMP / 'renders' / 'vault-tabs.mp4'
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', webm, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', str(out)], check=True)
    for name, s in report:
        print('%-26s left arrow %s  right arrow %s  selected %-10s scroll %s' % (name, 'shown' if s['left'] != '0' else 'hidden', 'shown' if s['right'] != '0' else 'hidden', s['selected'], s['scroll']))
    print(out)
