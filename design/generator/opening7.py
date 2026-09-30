from common import *
import math
import screens_earn

# Opening, one continuous shot (~3.4s):
# 1. the mark focuses in while a gradient ring draws around it, the ring bursts outward
# 2. the mark steps left and "Vanna" rises out letter by letter, holds, then lifts away
# 3. the mark returns to centre, its ring redraws, a shockwave rolls out and the products
#    (tokens) fly out of the mark into their orbits
# 4. headline words rise out of blur, the feature line starts cycling, buttons settle in
# Behind everything: a slow aurora and a few twinkling stars.

T = 3.2  # length of the mark/word choreography

KF = (
    # mark path: rest, step left, hold, return
    '@keyframes vnIntroShift{0%,28%{transform:translateX(0)}40%,68%{transform:translateX(-82px)}82%,100%{transform:translateX(0)}}'
    '@keyframes vnMarkIn{0%{transform:scale(0.4) rotate(-24deg);filter:blur(12px);opacity:0}14%{transform:scale(1.08) rotate(3deg);filter:blur(0);opacity:1}20%,100%{transform:scale(1) rotate(0deg);filter:blur(0);opacity:1}}'
    '@keyframes vnLtrS{0%,31%{transform:translateY(58px);opacity:0.4}39%,66%{transform:translateY(0);opacity:1}74%,100%{transform:translateY(-60px);opacity:0.4}}'
    '@keyframes vnLtr{0%,31%{transform:translateY(110%);filter:blur(4px)}39%,66%{transform:translateY(0);filter:blur(0)}74%,100%{transform:translateY(-115%);filter:blur(4px)}}'
    '@keyframes vnDraw{from{stroke-dashoffset:330}to{stroke-dashoffset:0}}'
    '@keyframes vnShock{0%{transform:scale(1);opacity:0.85}100%{transform:scale(2.6);opacity:0}}'
    '@keyframes vnBurst{0%{transform:scale(1);opacity:1}100%{transform:scale(1.9);opacity:0}}'
    '@keyframes vnOrbitIn{from{transform:scale(0.55);opacity:0}to{transform:scale(1);opacity:1}}'
    '@keyframes vnWordUp{from{transform:translateY(16px);filter:blur(8px);opacity:0}to{transform:translateY(0);filter:blur(0);opacity:1}}'
    '@keyframes vnAuroraA{0%{transform:translate(0,0) scale(1)}100%{transform:translate(60px,40px) scale(1.2)}}'
    '@keyframes vnAuroraB{0%{transform:translate(0,0) scale(1.1)}100%{transform:translate(-50px,-60px) scale(0.9)}}'
    '@keyframes vnTwinkle{0%,100%{opacity:0;transform:scale(0.4)}50%{opacity:0.9;transform:scale(1)}}'
    '@keyframes vnSpin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}'
    '@keyframes vnSpinRev{from{transform:rotate(360deg)}to{transform:rotate(0deg)}}'
    '@keyframes vnGlow{0%,100%{box-shadow:0 0 36px rgba(112,58,230,0.4)}50%{box-shadow:0 0 70px rgba(252,84,87,0.38)}}'
    '@keyframes vnText4{0%{opacity:0;transform:translateY(10px)}3%{opacity:1;transform:translateY(0)}23%{opacity:1;transform:translateY(0)}26%{opacity:0;transform:translateY(-10px)}100%{opacity:0}}'
    + ''.join('@keyframes vnDot%d{0%%{width:6px;background:rgba(255,255,255,0.3)}%d%%{width:6px;background:rgba(255,255,255,0.3)}%d%%{width:20px;background:#FFFFFF}%d%%{width:20px;background:#FFFFFF}%d%%{width:6px;background:rgba(255,255,255,0.3)}100%%{width:6px;background:rgba(255,255,255,0.3)}}' % (k, max(25 * k - 1, 0), 25 * k + 1, 25 * k + 24, 25 * k + 26) for k in range(4))
)

CX, CY = 206, 318
LINES = [('chart-line-up', 'Trade stocks up to 5x'), ('hand-coins', 'Earn on idle assets'), ('vn-farm', 'Farm in one tap'), ('arrows-left-right', 'Swap any token')]
OUTER = [('TSLAx', 90), ('GOOGLx', 0), ('OPENAI', 210), ('SOL', 320)]
INNER = [('USDC', 40), ('ANTHROPIC', 160), ('AAPLx', 270)]
FLY = {}  # name -> keyframes, filled by orbit()


def orbit(radius, tokens, size, dur, rev, delay0, tag, intro):
    box = radius * 2
    items = ''
    for k, (sym, deg) in enumerate(tokens):
        a = math.radians(deg)
        x = radius + radius * math.cos(a) - size / 2
        y = radius - radius * math.sin(a) - size / 2
        dx, dy = -radius * math.cos(a), radius * math.sin(a)
        name = f'vnFly{tag}{k}'
        FLY[name] = (f'@keyframes {name}{{0%{{transform:translate({dx:.1f}px,{dy:.1f}px) scale(0.15);opacity:0}}'
                     f'62%{{transform:translate({-dx * 0.07:.1f}px,{-dy * 0.07:.1f}px) scale(1.1);opacity:1}}100%{{transform:translate(0,0) scale(1);opacity:1}}}}')
        fly = f'animation: {name} 760ms cubic-bezier(0.2, 0.9, 0.3, 1) {delay0 + k * 0.08:.2f}s both' if intro else ''
        items += (f'<span style="position: absolute; left: {x:.1f}px; top: {y:.1f}px; width: {size}px; height: {size}px; animation: {"vnSpin" if rev else "vnSpinRev"} {dur}s linear {delay0:.2f}s infinite">'
                  f'<img src="{TOK[sym]}" alt="" style="width: {size}px; height: {size}px; border-radius: 999px; border: 2px solid rgba(255,255,255,0.85); box-shadow: 0 6px 18px rgba(0,0,0,0.35); display: block; {fly}"></span>')
    ring_in = f'animation: vnOrbitIn 700ms cubic-bezier(0.2, 0.9, 0.3, 1) {delay0 - 0.15:.2f}s both' if intro else ''
    return (f'<div aria-hidden="true" style="position: absolute; left: {CX - radius}px; top: {CY - radius}px; width: {box}px; height: {box}px; border-radius: 999px; border: 1px solid rgba(255,255,255,0.09); {ring_in}">'
            f'<div style="position: absolute; inset: 0; animation: {"vnSpinRev" if rev else "vnSpin"} {dur}s linear {delay0:.2f}s infinite">{items}</div></div>')


def backdrop(intro):
    fade = 'vnFade 1400ms ease-out both, ' if intro else ''
    blobs = (f'<span style="position: absolute; left: -120px; top: 40px; width: 380px; height: 380px; border-radius: 999px; background: radial-gradient(circle, rgba(112,58,230,0.42), rgba(112,58,230,0) 68%); animation: {fade}vnAuroraA 14s ease-in-out infinite alternate"></span>'
             f'<span style="position: absolute; right: -140px; top: 300px; width: 400px; height: 400px; border-radius: 999px; background: radial-gradient(circle, rgba(255,0,122,0.2), rgba(255,0,122,0) 66%); animation: {fade}vnAuroraB 17s ease-in-out infinite alternate"></span>'
             f'<span style="position: absolute; left: 60px; top: 620px; width: 300px; height: 300px; border-radius: 999px; background: radial-gradient(circle, rgba(141,97,235,0.18), rgba(141,97,235,0) 66%); animation: {fade}vnAuroraA 19s ease-in-out infinite alternate-reverse"></span>')
    stars = ''
    for k in range(18):
        x = (k * 97 + 23) % 392 + 10
        y = (k * 173 + 41) % 520 + 40
        s = 2 + (k % 3)
        dur = 2.4 + (k % 5) * 0.7
        dl = (k * 0.37) % 3 + (1.2 if intro else 0)
        stars += f'<span style="position: absolute; left: {x}px; top: {y}px; width: {s}px; height: {s}px; border-radius: 999px; background: #FFFFFF; opacity: 0; animation: vnTwinkle {dur:.1f}s ease-in-out {dl:.2f}s infinite"></span>'
    return f'<div aria-hidden="true" style="position: absolute; inset: 0; pointer-events: none">{blobs}{stars}</div>'


def ring_svg(delay, dur, burst=None):
    """Gradient ring that draws itself around the mark."""
    anim = f'animation: vnDraw {dur}s cubic-bezier(0.6, 0, 0.2, 1) {delay:.2f}s both' if delay is not None else ''
    wrap = f'animation: vnBurst 520ms ease-out {burst:.2f}s both' if burst is not None else ''
    gid = 'vnRingG' + ('b' if burst is not None else 'a')
    return (f'<svg width="112" height="112" viewBox="0 0 112 112" aria-hidden="true" style="position: absolute; left: -4px; top: -4px; transform: rotate(-90deg); {wrap}">'
            f'<defs><linearGradient id="{gid}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FC5457"></stop><stop offset="1" stop-color="#703AE6"></stop></linearGradient></defs>'
            f'<circle cx="56" cy="56" r="52" fill="none" stroke="url(#{gid})" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="330" style="{anim}"></circle></svg>')


def base(intro=True):
    FLY.clear()
    d = 2.75 if intro else 0.0
    ring_out = orbit(158, OUTER, 44, 46, False, d + 0.05, 'O', intro)
    ring_in = orbit(104, INNER, 36, 30, True, d + 0.2, 'I', intro)
    if intro:
        letters = ''.join(f'<g style="animation: vnLtrS {T}s cubic-bezier(0.2, 0.9, 0.3, 1) {k * 0.06:.2f}s both"><path d="{L["d"]}"></path></g>' for k, L in enumerate(WM['letters']))
        wm_w = WM['w'] * 42 / WM['h']
        logo = f"""<div style="position: absolute; left: {CX - 52}px; top: {CY - 52}px; width: 104px; height: 104px">
{ring_svg(0.15, 0.7, burst=0.9)}
<span style="position: absolute; inset: 0; border-radius: 999px; background: #111111; animation: vnFade 300ms ease-out 2.55s both, vnGlow 4s ease-in-out 3.1s infinite"></span>
{ring_svg(2.55, 0.6)}
<span aria-hidden="true" style="position: absolute; inset: 0; border-radius: 999px; border: 2px solid rgba(189,164,244,0.7); opacity: 0; animation: vnShock 1100ms ease-out 2.7s forwards"></span>
<span aria-hidden="true" style="position: absolute; inset: 0; border-radius: 999px; border: 1px solid rgba(255,51,149,0.55); opacity: 0; animation: vnShock 1400ms ease-out 2.85s forwards"></span>
<span style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; animation: vnIntroShift {T}s cubic-bezier(0.65, 0, 0.25, 1) both"><img src="{MARK}" alt="Vanna" style="width: 60px; height: 60px; display: block; animation: vnMarkIn {T}s cubic-bezier(0.2, 0.9, 0.3, 1) both"></span>
</div>
<svg aria-hidden="true" width="{wm_w:.1f}" height="42" viewBox="0 0 {WM['w']} {WM['h']}" style="position: absolute; left: {CX - 82 + 30 + 14}px; top: {CY - 21}px; overflow: hidden; color: #FFFFFF"><g fill="currentColor" fill-rule="evenodd">{letters}</g></svg>"""
    else:
        logo = f"""<div style="position: absolute; left: {CX - 52}px; top: {CY - 52}px; width: 104px; height: 104px">
<span style="position: absolute; inset: 0; border-radius: 999px; background: #111111; animation: vnGlow 4s ease-in-out infinite"></span>
{ring_svg(None, 0)}
<span style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center"><img src="{MARK}" alt="Vanna" style="width: 60px; height: 60px"></span>
</div>"""
    words = [('Tokenized', 0), ('stocks,', 1), ('<br>', None), ('with', 2), ('leverage.', 3)]
    head = ''.join('<br>' if w == '<br>' else f'<span style="display: inline-block; margin: 0 4px; animation: vnWordUp 560ms cubic-bezier(0.2, 0.9, 0.3, 1) {d + 0.35 + k * 0.08:.2f}s both">{w}</span>' for w, k in words)
    lines = ''.join(f'<div style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; gap: 8px; opacity: 0; animation: vnText4 12s ease-in-out {d + 0.8 + k * 3:.1f}s infinite both"><span style="width: 28px; height: 28px; border-radius: 999px; background: rgba(255,255,255,0.1); color: #FFFFFF; display: flex; align-items: center; justify-content: center">{ic(i, 16, "bold")}</span><span style="font-size: 16px; line-height: 24px; font-weight: 600">{t_}</span></div>' for k, (i, t_) in enumerate(LINES))
    dots = ''.join(f'<span style="height: 6px; width: 6px; border-radius: 3px; background: rgba(255,255,255,0.3); animation: vnDot{k} 12s ease-in-out {d + 0.8:.1f}s infinite both"></span>' for k in range(4))
    rise = lambda dl: f'animation: vnRise 520ms cubic-bezier(0.2, 0.9, 0.3, 1) {dl:.2f}s both'
    return f"""<div style="position: absolute; inset: 0; background: #111111; color: #FFFFFF; overflow: hidden">
{backdrop(intro)}
{ring_out}
{ring_in}
{logo}
<div style="position: absolute; left: 24px; right: 24px; top: 540px; text-align: center">
<h1 style="margin: 0; font-size: 28px; line-height: 36px; font-weight: 600; letter-spacing: -0.01em">{head}</h1>
<div style="position: relative; height: 32px; margin-top: 16px; {rise(d + 0.7)}">{lines}</div>
<div style="margin-top: 10px; display: flex; justify-content: center; gap: 6px; {rise(d + 0.75)}">{dots}</div>
</div>
<div style="position: absolute; left: 16px; right: 16px; bottom: 28px; display: flex; flex-direction: column; gap: 8px">
<a href="V7Connect.dc.html" style="position: relative; overflow: hidden; height: 56px; border-radius: 28px; background: #703AE6; color: #FFFFFF; font-size: 16px; font-weight: 600; display: flex; align-items: center; justify-content: center; text-decoration: none; {rise(d + 0.8)}">Connect wallet<span aria-hidden="true" style="position: absolute; top: 0; bottom: 0; width: 80px; background: linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,0.24), rgba(255,255,255,0)); animation: vnShine 3.2s ease-in-out {d + 1.6:.1f}s infinite"></span></a>
<a href="V7Home.dc.html" style="height: 52px; border-radius: 26px; background: #1E1E1E; color: #FFFFFF; font-size: 16px; font-weight: 600; display: flex; align-items: center; justify-content: center; text-decoration: none; {rise(d + 0.9)}">Explore first</a>
<div style="height: 24px; display: flex; align-items: center; justify-content: center; gap: 6px; font-size: 12px; color: #949494; {rise(d + 1.0)}">{ic('lock-key', 14)}Your keys stay in your wallet</div>
</div>
</div>"""


def inject(stem, fly):
    fn = f'{PROJ}/{stem}.dc.html'
    h = open(fn).read().replace('@media (prefers-reduced-motion: reduce)', KF + ''.join(fly.values()) + '\n@media (prefers-reduced-motion: reduce)', 1)
    open(fn, 'w').write(h)


def build():
    b = base(True)
    fly = dict(FLY)
    page('V7Welcome', 'Welcome', b, 'return { t: t };')
    inject('V7Welcome', fly)
    screens_earn.welcome('V7Connect', True, base_override=base(False))
    inject('V7Connect', {})


if __name__ == '__main__':
    build()
