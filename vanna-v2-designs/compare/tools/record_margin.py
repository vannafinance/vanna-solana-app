"""Records the margin account flows in the built prototype (new.html), clicking through them like a person would.

    python compare/tools/record_margin.py    -> compare/renders/margin-live.mp4 (+ margin-live-*.png key frames)

1. Trade > Markets without an account: banner > Open > envelope sheet > Open account > wallet Approve >
   Solana confirms > the envelope opens > Start trading (the banner is gone).
2. A first order without an account: Open account & long > step 1 with the envelope > wallet Approve >
   the envelope opens > step 2 > wallet Approve > the seal.
"""
import subprocess, tempfile
from pathlib import Path
from playwright.sync_api import sync_playwright

CMP = Path(__file__).resolve().parent.parent
R = CMP / 'renders'
W, H, PAD = 412, 915, 24


def load(pg, stem):
    pg.goto((CMP / 'new.html').as_uri() + '?embed=1&side=new&s=' + stem + '#' + stem)
    pg.wait_for_function('window.__vn && window.__vn.app().shown')
    pg.evaluate("() => { document.documentElement.style.background = '#E9E6F0'; window.__vnSetTheme('Light'); window.__vnFit(); }")
    pg.evaluate('d => window.postMessage({ vnCmd: "device", w: d[0], h: d[1] }, "*")', [W, H])
    pg.wait_for_timeout(900)


def approve(pg):
    pg.wait_for_selector('.vn-wal .ok', timeout=5000)
    pg.wait_for_timeout(900)
    pg.click('.vn-wal .ok')


def shot(pg, name):
    pg.screenshot(path=str(R / ('margin-live-%s.png' % name)))


with tempfile.TemporaryDirectory() as tmp, sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': W + PAD * 2, 'height': H + PAD * 2}, record_video_dir=tmp, record_video_size={'width': W + PAD * 2, 'height': H + PAD * 2})
    pg = ctx.new_page()
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))

    load(pg, 'V7MarginCreate')
    shot(pg, '1-banner')
    pg.click('.vn-mban button'); pg.wait_for_timeout(1200)
    shot(pg, '2-sheet')
    pg.click('button:has-text("Open account")')
    approve(pg)
    pg.wait_for_timeout(1200); shot(pg, '3-confirming')
    pg.wait_for_timeout(2400); shot(pg, '4-opening')
    pg.wait_for_timeout(2200); shot(pg, '5-open')
    pg.click('button:has-text("Start trading")'); pg.wait_for_timeout(1200)
    shot(pg, '6-markets')

    load(pg, 'V7PerpsOrderFirst')
    shot(pg, '7-order')
    pg.click('button:has-text("Open account &")')
    pg.wait_for_timeout(700); shot(pg, '8-step1')
    approve(pg)
    pg.wait_for_timeout(1000); shot(pg, '9-step1-confirm')
    pg.wait_for_timeout(2600); shot(pg, '10-account-opened')
    approve(pg)
    pg.wait_for_timeout(1000); shot(pg, '11-step2-confirm')
    pg.wait_for_timeout(2600); shot(pg, '12-done')
    pg.wait_for_timeout(1200)

    webm = pg.video.path(); ctx.close(); b.close()
    out = R / 'margin-live.mp4'
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', webm, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', str(out)], check=True)
    print(out)
    print('page errors:', errs[:3])
