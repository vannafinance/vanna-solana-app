"""Renders a screen's motion to MP4, frame-exact (pauses every animation and steps time per frame).

    python compare/tools/render_motion.py                 # Welcome: New alone + Current vs New side by side
    python compare/tools/render_motion.py V7Connect 3     # any screen, seconds

Writes compare/renders/<screen>-new.mp4 and <screen>-compare.mp4. Needs Playwright (Python) and ffmpeg.
"""
import os, shutil, subprocess, sys, tempfile
from pathlib import Path
from playwright.sync_api import sync_playwright

CMP = Path(__file__).resolve().parent.parent
OUT = CMP / 'renders'
STEM = sys.argv[1] if len(sys.argv) > 1 else 'V7Welcome'
SECONDS = float(sys.argv[2]) if len(sys.argv) > 2 else 5.0
FPS, PAD = 30, 56
DEVICE = sys.argv[3] if len(sys.argv) > 3 else '412x915'   # e.g. 1280x800 for a landscape tablet
W, H = (int(v) for v in DEVICE.split('x'))
BG = '#F5F3FA'


def render(page, side, frames_dir):
    url = (CMP / ('current.html' if side == 'current' else 'new.html')).as_uri() + '?embed=1&side=' + side + '#' + STEM
    page.goto(url)
    page.wait_for_function('window.__vn && window.__vn.app().shown')
    page.evaluate("""bg => { document.documentElement.style.background = bg; document.body.style.background = bg;
        document.documentElement.style.colorScheme = 'light'; window.__vnFit(); }""", BG)
    page.evaluate('d => window.postMessage({ vnCmd: "device", w: d[0], h: d[1] }, "*")', [W, H])
    page.wait_for_timeout(300)                                   # fonts and images settle
    page.evaluate('() => document.getAnimations().forEach(a => a.pause())')
    n = int(SECONDS * FPS) + 1
    for i in range(n):
        page.evaluate('t => document.getAnimations().forEach(a => { a.currentTime = t; })', i * 1000 / FPS)
        page.screenshot(path=str(frames_dir / ('f%04d.png' % i)))
    return n


def encode(frames_dir, dest):
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-framerate', str(FPS), '-i', str(frames_dir / 'f%04d.png'),
                    '-vf', 'tpad=stop_mode=clone:stop_duration=1.5', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18',
                    '-movflags', '+faststart', str(dest)], check=True)


def main():
    OUT.mkdir(exist_ok=True)
    tmp = Path(tempfile.mkdtemp())
    with sync_playwright() as p:
        try:
            browser = p.chromium.launch()
        except Exception:
            browser = p.chromium.launch(channel='chrome')
        page = browser.new_page(viewport={'width': W + PAD * 2, 'height': H + PAD * 2}, device_scale_factor=2)
        for side in ('current', 'new'):
            (tmp / side).mkdir()
            render(page, side, tmp / side)
        browser.close()
    tag = STEM + ('' if DEVICE == '412x915' else '-' + DEVICE)
    new_mp4 = OUT / ('%s-new.mp4' % tag)
    encode(tmp / 'new', new_mp4)
    cur_mp4 = tmp / 'current.mp4'
    encode(tmp / 'current', cur_mp4)
    both = OUT / ('%s-compare.mp4' % tag)
    label = "drawtext=fontfile='C\:/Windows/Fonts/segoeui.ttf':text='%s':fontcolor=0x595959:fontsize=30:x=(w-text_w)/2:y=34"
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', str(cur_mp4), '-i', str(new_mp4), '-filter_complex',
                    '[0:v]' + (label % 'Current  v7') + '[a];[1:v]' + (label % 'New') + '[b];[a][b]hstack=inputs=2[v]',
                    '-map', '[v]', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-movflags', '+faststart', str(both)], check=True)
    shutil.rmtree(tmp, ignore_errors=True)
    print(new_mp4); print(both)


if __name__ == '__main__':
    main()
