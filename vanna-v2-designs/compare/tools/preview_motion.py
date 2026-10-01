"""Preview (not implemented): connect-wallet designs and transaction motion, from the MWA research (1 Oct 2026).

    python compare/tools/preview_motion.py          -> compare/previews/motion.html
    python compare/tools/preview_motion.py --video  -> also compare/renders/motion-connect.mp4, motion-transaction.mp4

The page itself lives in tools/motion_template.html; this fills in the Vanna mark, Material icons and token image.
"""
import json, os, subprocess, sys, tempfile, time

HERE = os.path.dirname(os.path.abspath(__file__))
CMP = os.path.dirname(HERE)
sys.path.insert(0, HERE)
import material_icons as mi   # noqa: E402

ICONS = {'wallet': ('account_balance_wallet', 'regular'), 'check': ('check', 'regular'), 'lock': ('lock', 'regular'), 'trend': ('trending_up', 'regular')}


def build():
    tpl = open(os.path.join(HERE, 'motion_template.html'), encoding='utf8').read()
    mark = json.load(open(os.path.join(HERE, 'mark.json')))['d']
    icons = {k: ''.join('<path d="%s"/>' % d for d in mi.material(n, w)) for k, (n, w) in ICONS.items()}
    tsla = json.load(open(os.path.join(CMP, 'src', 'img.json'), encoding='utf8'))['a9a1db51309a512ccf9302f8acc244d2']
    html = tpl.replace("'__MARK__'", json.dumps(mark)).replace('__ICONS__', json.dumps(icons)).replace('__TSLA__', tsla)
    out = os.path.join(CMP, 'previews', 'motion.html')
    open(out, 'w', encoding='utf8').write(html)
    return out


def video(out):
    from playwright.sync_api import sync_playwright
    renders = os.path.join(CMP, 'renders'); os.makedirs(renders, exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp, sync_playwright() as p:
        b = p.chromium.launch()
        for sec, name, secs in [(0, 'motion-connect', 10.5), (1, 'motion-transaction', 10.5)]:
            ctx = b.new_context(viewport={'width': 1310, 'height': 900}, record_video_dir=tmp, record_video_size={'width': 1310, 'height': 900})
            pg = ctx.new_page()
            pg.goto('file:///' + out.replace('\\', '/'))
            pg.evaluate('i => document.querySelectorAll("section")[i].scrollIntoView()', sec)
            pg.evaluate('() => { document.querySelector(".top").style.display = "none"; }')
            pg.evaluate('i => document.querySelectorAll("section")[i].scrollIntoView()', sec)
            pg.evaluate('() => { const s = window.SEQ || null; }')
            pg.reload(); pg.wait_for_timeout(300)
            pg.evaluate('() => { document.querySelector(".top").style.display = "none"; }')
            pg.evaluate('i => { document.querySelectorAll("section").forEach((s, k) => s.style.display = k === i ? "" : "none"); }', sec)
            pg.evaluate('() => document.querySelectorAll("section > h2, section > p, .ctrl").forEach(e => e.style.display = "none")')   # phones only
            pg.evaluate('() => { seqA("happy"); seqB(); seqC(); SEQ.T1(); SEQ.T2(); SEQ.T3(); }')
            t0 = time.time()
            pg.wait_for_timeout(int(secs * 1000))
            webm = pg.video.path()
            ctx.close()
            mp4 = os.path.join(renders, name + '.mp4')
            subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-ss', '0.6', '-i', webm, '-vf', 'crop=1310:880:0:0,scale=1310:-2', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', mp4], check=True)
            print(mp4)
        b.close()


if __name__ == '__main__':
    out = build()
    print(out)
    if '--video' in sys.argv:
        video(out)
