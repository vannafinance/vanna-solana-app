"""Preview (not implemented), 2 Oct 2026: the three margin-account flows from previews/onboarding.html
(A inside the first trade, B one screen, C banner), animated like the transaction sheet. No agreements:
Vanna's first margin action creates the account.

    python compare/tools/preview_marginflow.py [--video]   -> compare/previews/marginflow.html (+ renders/marginflow-*.png / .mp4)
"""
import base64, json, os, subprocess, sys, tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
CMP = os.path.dirname(HERE)
sys.path.insert(0, HERE)
import material_icons as mi   # noqa: E402

ICONS = {'wallet': 'account_balance_wallet', 'check': 'check', 'arrow_back': 'arrow_back', 'arrow_forward': 'arrow_forward',
         'bolt': 'bolt', 'swap': 'swap_horiz', 'lock_open': 'lock_open', 'farm': 'psychiatry'}


def build():
    tpl = open(os.path.join(HERE, 'marginflow_template.html'), encoding='utf8').read()
    img = json.load(open(os.path.join(CMP, 'src', 'img.json'), encoding='utf8'))
    logo = 'data:image/png;base64,' + base64.b64encode(open(os.path.join(os.path.dirname(CMP), 'assets', 'vanna-favicon-256.png'), 'rb').read()).decode()
    icons = {k: ''.join('<path d="%s"/>' % d for d in mi.material(n, 'regular')) for k, n in ICONS.items()}
    imgs = {'tsla': img['a9a1db51309a512ccf9302f8acc244d2'], 'goog': img['cad380b03cb4c689f02e014100f56452'], 'aapl': img['74e439ecf30e3316195f26ae04a1689e'], 'usdc': img['022fc945e265208f7997f02a7fbdd97f']}
    html = tpl.replace('__ICONS__', json.dumps(icons)).replace('__LOGO__', logo).replace('__IMG__', json.dumps(imgs))
    out = os.path.join(CMP, 'previews', 'marginflow.html')
    open(out, 'w', encoding='utf8').write(html)
    return out


def shots(out, video):
    from playwright.sync_api import sync_playwright
    renders = os.path.join(CMP, 'renders')
    errs = []
    with sync_playwright() as p:
        b = p.chromium.launch()
        for t, name in ((1500, 'start'), (3000, 'wallet'), (4700, 'confirm'), (6000, 'open'), (6600, 'done'), (8200, 'end')):
            pg = b.new_page(viewport={'width': 1300, 'height': 1000})
            pg.on('pageerror', lambda e: errs.append(str(e)))
            pg.goto('file:///' + out.replace('\\', '/'), wait_until='networkidle')
            pg.evaluate('() => document.querySelector(".top").style.display = "none"')
            pg.wait_for_timeout(t)
            pg.locator('#m1 .row').screenshot(path=os.path.join(renders, 'marginflow-%s.png' % name))
            pg.locator('#m2 .row').screenshot(path=os.path.join(renders, 'marginflow-b-%s.png' % name))
            pg.locator('#m3 .row').screenshot(path=os.path.join(renders, 'marginflow-env-%s.png' % name))
            pg.close()
        print('errors:', errs[:3])
        if video:
            for sid, name, ms in (('m1', 'marginflow.mp4', 10400), ('m2', 'marginflow-b.mp4', 11200), ('m3', 'marginflow-env.mp4', 11200)):
                with tempfile.TemporaryDirectory() as tmp:
                    ctx = b.new_context(viewport={'width': 1300, 'height': 860}, record_video_dir=tmp, record_video_size={'width': 1300, 'height': 860})
                    pg = ctx.new_page(); pg.goto('file:///' + out.replace('\\', '/'), wait_until='networkidle')
                    pg.evaluate("""s => { document.querySelector('.top').style.display = 'none';
                        document.querySelectorAll('section').forEach(x => x.style.display = x.id === s ? '' : 'none');
                        document.querySelectorAll('section h2, figcaption').forEach(e => e.style.display = 'none');
                        document.querySelectorAll('.phone').forEach(ph => { ph.innerHTML = ''; });
                        document.querySelectorAll('#' + s + ' .phone').forEach(play); }""", sid)
                    pg.wait_for_timeout(ms); webm = pg.video.path(); ctx.close()
                    mp4 = os.path.join(renders, name)
                    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-ss', '0.3', '-i', webm, '-vf', 'crop=1300:850:0:0', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', mp4], check=True)
                    print(mp4)
        b.close()


if __name__ == '__main__':
    o = build()
    print(o)
    shots(o, '--video' in sys.argv)
