"""Preview (not implemented): six styles for the in-place transaction status (waiting, cancelled in the wallet,
confirming, success), each animated through the same story on the Swap screen. 2 Oct 2026 user feedback on the
"Cancelled in Main Wallet" card seen in the Android build.

    python compare/tools/preview_txcards.py [--video]   -> compare/previews/txcards.html (+ renders/txcards-*.png / .mp4)
"""
import base64, json, os, subprocess, sys, tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
CMP = os.path.dirname(HERE)
sys.path.insert(0, HERE)
import material_icons as mi   # noqa: E402

ICONS = {'wallet': ('account_balance_wallet', 'regular'), 'close': ('close', 'regular'), 'check': ('check', 'regular')}


def build():
    tpl = open(os.path.join(HERE, 'txcards_template.html'), encoding='utf8').read()
    img = json.load(open(os.path.join(CMP, 'src', 'img.json'), encoding='utf8'))
    logo = 'data:image/png;base64,' + base64.b64encode(open(os.path.join(os.path.dirname(CMP), 'assets', 'vanna-favicon-256.png'), 'rb').read()).decode()
    icons = {k: ''.join('<path d="%s"/>' % d for d in mi.material(n, w)) for k, (n, w) in ICONS.items()}
    html = (tpl.replace('__ICONS__', json.dumps(icons)).replace('__MARK__', '""').replace('__LOGO__', logo)
            .replace('__USDC__', img['022fc945e265208f7997f02a7fbdd97f']).replace('__TSLA__', img['a9a1db51309a512ccf9302f8acc244d2']))
    out = os.path.join(CMP, 'previews', 'txcards.html')
    open(out, 'w', encoding='utf8').write(html)
    return out


def shots(out, video):
    from playwright.sync_api import sync_playwright
    renders = os.path.join(CMP, 'renders')
    errs = []
    with sync_playwright() as p:
        # frame captures at fixed moments of the loop
        for t, name in ((2000, 'wait'), (4200, 'cancel'), (8650, 'confirm'), (10400, 'done')):
            b = p.chromium.launch(); pg = b.new_page(viewport={'width': 1300, 'height': 1000})
            pg.on('pageerror', lambda e: errs.append(str(e)))
            pg.goto('file:///' + out.replace('\\', '/'), wait_until='networkidle')
            pg.evaluate('() => document.querySelector(".top").style.display = "none"')
            pg.wait_for_timeout(t)
            for sid in ('r1', 'r2'):
                pg.locator('#' + sid + ' .row').screenshot(path=os.path.join(renders, 'txcards-%s-%s.png' % (sid, name)))
            b.close()
        print('errors:', errs[:3])
        if video:
            for sid in ('r1', 'r2'):
                with tempfile.TemporaryDirectory() as tmp:
                    b = p.chromium.launch()
                    ctx = b.new_context(viewport={'width': 1300, 'height': 860}, record_video_dir=tmp, record_video_size={'width': 1300, 'height': 860})
                    pg = ctx.new_page(); pg.goto('file:///' + out.replace('\\', '/'), wait_until='networkidle')
                    pg.evaluate("""s => { document.querySelector('.top').style.display = 'none';
                        document.querySelectorAll('section').forEach(x => x.style.display = x.id === s ? '' : 'none');
                        document.querySelectorAll('section h2, figcaption').forEach(e => e.style.display = 'none');
                        document.querySelectorAll('.phone').forEach(ph => { ph.innerHTML = ''; });
                        document.querySelectorAll('#' + s + ' .phone').forEach(play); }""", sid)
                    pg.wait_for_timeout(13000); webm = pg.video.path(); ctx.close(); b.close()
                    mp4 = os.path.join(renders, 'txcards-%s.mp4' % sid)
                    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-ss', '0.3', '-i', webm, '-vf', 'crop=1300:850:0:0', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', mp4], check=True)
                    print(mp4)


if __name__ == '__main__':
    o = build()
    print(o)
    shots(o, '--video' in sys.argv)
