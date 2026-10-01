"""Builds the New side's Welcome (animated) and Connect (settled) backdrops from the 2026 Vanna mark.

    python compare/tools/welcome.py

Motion: a price line rises in from the left, its pen flows into the mark's main stroke, the two
short strokes follow, and the pen leaves to the right as the line keeps climbing. The line then
settles into a faint chart trace behind the mark, and the wordmark, headline and actions rise.
Reads the frozen baseline for the wordmark, captions and actions, so re-running is idempotent.
"""
import json, math, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
CMP = os.path.dirname(HERE)
SRC = os.path.join(CMP, 'src')
MARK = json.load(open(os.path.join(HERE, 'mark.json')))
for _k in 'ABC':
    MARK[_k] = [tuple(p) for p in MARK[_k]]


def baseline():
    for line in open(os.path.join(CMP, 'baseline', 'vanna-v7-prototype.html'), encoding='utf8'):
        if line.startswith('var D = '):
            return json.loads(line[len('var D = '):].rstrip().rstrip(';'))
    sys.exit('baseline data not found')


D = baseline()
OLD = D['tpls'][0]

# ---- geometry (screen space is the 412 x 915 frame) -------------------------------------------
SIZE, CX, CY = 136, 206, 320                 # mark box and its centre
DY = 30                                      # vertical offset for the price line and grid
K = SIZE / 232                               # mark viewBox is "11 12 232 232"
MX, MY = CX - SIZE / 2, CY - SIZE / 2


def to_screen(p):
    return (MX + (p[0] - 11) * K, MY + (p[1] - 12) * K)


def rounded(points, r):
    """Polyline -> path with quadratic corners (r in the points' units), so the pen turns smoothly."""
    out = ['M %.1f %.1f' % points[0]]
    for i in range(1, len(points) - 1):
        p, v, n = points[i - 1], points[i], points[i + 1]
        a = (v[0] - p[0], v[1] - p[1]); la = math.hypot(*a)
        b = (n[0] - v[0], n[1] - v[1]); lb = math.hypot(*b)
        ra, rb = min(r, la / 2), min(r, lb / 2)
        s = (v[0] - a[0] / la * ra, v[1] - a[1] / la * ra)
        e = (v[0] + b[0] / lb * rb, v[1] + b[1] / lb * rb)
        out.append('L %.1f %.1f Q %.1f %.1f %.1f %.1f' % (s + v + e))
    out.append('L %.1f %.1f' % points[-1])
    return ' '.join(out)


def length(points):
    return sum(math.dist(points[i], points[i + 1]) for i in range(len(points) - 1))


A = [to_screen(p) for p in MARK['A']]
d = (0.8, -0.6)                                    # the mark's diagonal, so the line flows in and out along it
entry = (A[0][0] - 56 * d[0], A[0][1] - 56 * d[1])
exit_ = (A[-1][0] + 34 * d[0], A[-1][1] + 34 * d[1])
IN = [(-12, 452 + DY), (16, 432 + DY), (34, 444 + DY), (56, 398 + DY), (72, 410 + DY), entry, A[0]]
OUT = [A[-1], exit_, (exit_[0] + 16, exit_[1] + 12), (338, 250 + DY), (354, 262 + DY), (380, 214 + DY), (430, 186 + DY)]

SPEED = 520.0                                      # px per second for the price line
SPEED_MARK = 290.0                                 # slower inside the mark, so it reads as being drawn
T0 = 0.25
t_in = length(IN) / SPEED
t_a = length(A) / SPEED_MARK
t_out = length(OUT) / SPEED
T_A = T0 + t_in
T_OUT = T_A + t_a
T_END = T_OUT + t_out
PENS = [(rounded(IN, 6), T0, t_in), (rounded(A, 10), T_A, t_a), (rounded(OUT, 6), T_OUT, t_out)]

EASE = 'cubic-bezier(0.2, 0.9, 0.3, 1)'
MASK_W = 36                                        # centreline stroke width that covers 100% of the mark


def mark_svg(uid, animated):
    """The mark as inline SVG. Animated: drawn through a mask of its three centrelines, then one light sweep."""
    grad = ('<linearGradient id="%sG" gradientUnits="userSpaceOnUse" x1="31.7" y1="73" x2="222.3" y2="183">'
            '<stop offset="0" stop-color="#FC5457"></stop><stop offset="1" stop-color="#703AE6"></stop></linearGradient>') % uid
    if not animated:
        return ('<svg width="%d" height="%d" viewBox="11 12 232 232" role="img" aria-label="Vanna" style="position: absolute; left: %.1fpx; top: %.1fpx">'
                '<defs>%s</defs><path fill="url(#%sG)" fill-rule="evenodd" d="%s"></path></svg>') % (SIZE, SIZE, MX, MY, grad, uid, MARK['d'])

    def stroke(pts, delay, dur):
        pd = 'M ' + ' L '.join('%.1f %.1f' % p for p in pts)
        return ('<path d="%s" pathLength="1" fill="none" stroke="#FFFFFF" stroke-width="%d" stroke-linecap="round" stroke-linejoin="round" '
                'style="stroke-dasharray: 1; stroke-dashoffset: 1; animation: vnwDraw %.2fs linear %.2fs both"></path>') % (pd, MASK_W, dur, delay)
    b_at, c_at = T_A + t_a * 0.62, T_A + t_a * 0.78
    mask = (stroke(MARK['A'], T_A, t_a) + stroke(MARK['B'], b_at, 0.34) + stroke(MARK['C'], c_at, 0.34))
    sweep_at = max(T_END, c_at + 0.34) + 0.05
    return (
        '<svg width="%d" height="%d" viewBox="11 12 232 232" role="img" aria-label="Vanna" style="position: absolute; left: %.1fpx; top: %.1fpx; overflow: visible">'
        '<defs>%s'
        '<linearGradient id="%sS" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#FFFFFF" stop-opacity="0"></stop>'
        '<stop offset="0.5" stop-color="#FFFFFF" stop-opacity="0.55"></stop><stop offset="1" stop-color="#FFFFFF" stop-opacity="0"></stop></linearGradient>'
        '<mask id="%sM" maskUnits="userSpaceOnUse" x="-40" y="-40" width="340" height="340">%s</mask>'
        '<clipPath id="%sC"><path fill-rule="evenodd" d="%s"></path></clipPath></defs>'
        '<path fill="url(#%sG)" fill-rule="evenodd" mask="url(#%sM)" d="%s"></path>'
        '<g clip-path="url(#%sC)"><rect x="-80" y="0" width="70" height="260" fill="url(#%sS)" transform="rotate(20 127 128)" '
        'style="transform-box: view-box; animation: vnwSweep 0.9s cubic-bezier(0.4, 0, 0.2, 1) %.2fs both"></rect></g>'
        '</svg>'
    ) % (SIZE, SIZE, MX, MY, grad, uid, uid, mask, uid, MARK['d'], uid, uid, MARK['d'], uid, uid, sweep_at)


def wordmark(animated, top):
    letters = re.findall(r'<g style="animation: vnLtrS[^"]*">(<path d="[^"]+"></path>)</g>', OLD)
    assert len(letters) == 5, 'wordmark letters not found in baseline'
    h = 36; w = 206 / 48 * h
    gs = ''.join(
        ('<g style="animation: vnwLtr 620ms %s %.2fs both">%s</g>' % (EASE, T_END + 0.05 + i * 0.05, g)) if animated else g
        for i, g in enumerate(letters))
    return ('<svg aria-hidden="true" width="%.1f" height="%d" viewBox="0 0 206 48" style="position: absolute; left: %.1fpx; top: %dpx; overflow: hidden; color: #FFFFFF">'
            '<g fill="currentColor" fill-rule="evenodd">%s</g></svg>') % (w, h, CX - w / 2, top, gs)


def backdrop(animated):
    """Grid, price line (drawn then faded to a trace), pen, mark, wordmark."""
    grid = ''.join('<span style="position: absolute; left: 0; right: 0; top: %dpx; height: 1px; background: rgba(255,255,255,0.05)"></span>' % y
                   for y in (176 + DY, 256 + DY, 336 + DY, 416 + DY))
    grid_anim = 'animation: vnwFade 900ms ease-out 0.05s both' if animated else ''
    line_in = rounded(IN, 6); line_out = rounded(OUT, 6)

    def line(dpath, delay, dur):
        if not animated:
            return '<path d="%s" fill="none" stroke="url(#vnwL)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.18"></path>' % dpath
        return ('<path d="%s" pathLength="1" fill="none" stroke="url(#vnwL)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" '
                'style="stroke-dasharray: 1; stroke-dashoffset: 1; animation: vnwDraw %.2fs linear %.2fs both, vnwTrace 800ms ease-out %.2fs forwards"></path>') % (
                    dpath, dur, delay, T_END + 0.1)
    svg = ('<svg aria-hidden="true" width="412" height="915" viewBox="0 0 412 915" style="position: absolute; left: 0; top: 0; overflow: visible">'
           '<defs><linearGradient id="vnwL" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="412" y2="0"><stop offset="0" stop-color="#FC5457"></stop>'
           '<stop offset="1" stop-color="#703AE6"></stop></linearGradient></defs>%s%s</svg>') % (
               line(line_in, T0, t_in), line(line_out, T_OUT, t_out))
    pen = ''
    if animated:  # one pen per segment so each can keep its own speed; each is visible only while it moves
        for i, (dp, at, dur) in enumerate(PENS):
            fade = 'vnwPenFade' if i == len(PENS) - 1 else 'vnwOn'
            pen += ('<span aria-hidden="true" style="position: absolute; left: 0; top: 0; width: 10px; height: 10px; border-radius: 999px; background: #FFFFFF; opacity: 0; '
                    'box-shadow: 0 0 0 4px rgba(252,84,87,0.22), 0 0 18px 2px rgba(252,84,87,0.55); offset-path: path(\'%s\'); offset-anchor: 50%% 50%%; offset-rotate: 0deg; '
                    'animation: vnwPen %.2fs linear %.2fs both, %s %.2fs linear %.2fs"></span>') % (dp, dur, at, fade, dur, at)
    return ('<div aria-hidden="true" style="position: absolute; inset: 0; pointer-events: none; %s">%s</div>%s%s%s%s') % (
        grid_anim, grid, svg, pen, mark_svg('vnwA' if animated else 'vnwS', animated), wordmark(animated, int(MY + SIZE + 26)))


def shift(block, by):
    """Moves every animation delay (the 's' value after a duration) in a block by `by` seconds."""
    def fix(m):
        return '%s %.2fs' % (m.group(1), max(0.0, float(m.group(2)) + by))
    return re.sub(r'((?:\d+ms|\d+(?:\.\d+)?s) [^,;"]*?\)|(?:\d+ms|\d+(?:\.\d+)?s) (?:ease-in-out|ease-out|linear)) (\d+(?:\.\d+)?)s', fix, block)


def welcome():
    cap_start = OLD.index('<div style="position: relative; height: 32px')
    actions_start = OLD.index('<div style="position: absolute; left: 16px; right: 16px; bottom: 28px')
    captions = OLD[cap_start:OLD.rindex('</div>', 0, actions_start)]
    actions = OLD[actions_start:OLD.rindex('</div>\n</div>')]
    captions = shift(captions, (T_END + 0.55) - 3.45)
    actions = shift(actions, (T_END + 0.62) - 3.55)
    actions = re.sub(r'<span aria-hidden="true" style="position: absolute; top: 0; bottom: 0; width: 80px;[^"]*"></span>', '', actions)  # no looping shine
    words = [('Tokenized', 0), ('stocks,', 1), ('<br>', None), ('with', 2), ('leverage.', 3)]
    h1 = ''.join(w if i is None else
                 '<span style="display: inline-block; margin: 0 4px; animation: vnWordUp 560ms %s %.2fs both">%s</span>' % (EASE, T_END + 0.25 + i * 0.07, w)
                 for w, i in words)
    root = OLD[:OLD.index('\n') + 1]
    return (root +
            '<div style="position: absolute; inset: 0; background: #111111; color: #FFFFFF; overflow: hidden">\n' +
            backdrop(True) + '\n'
            '<div style="position: absolute; left: 24px; right: 24px; top: 520px; text-align: center">\n'
            '<h1 style="margin: 0; font-size: 28px; line-height: 36px; font-weight: 600; letter-spacing: -0.01em">' + h1 + '</h1>\n' +
            captions + '</div>\n' + actions + '</div>\n</div>\n</div>')


def connect(cur):
    """Swap Connect's aurora, orbits and ring-mark for the settled backdrop; the sheet on top is untouched."""
    start = cur.index('<div aria-hidden="true" style="position: absolute; inset: 0; pointer-events: none">')
    end = cur.index('<div style="position: absolute; left: 24px; right: 24px; top: 540px')
    out = cur[:start] + backdrop(False) + '\n' + cur[end:]
    return out.replace('left: 24px; right: 24px; top: 540px', 'left: 24px; right: 24px; top: 548px', 1)


if __name__ == '__main__':
    tpl = os.path.join(SRC, 'tpl')
    w = [f for f in os.listdir(tpl) if f.startswith('00-')][0]
    c = [f for f in os.listdir(tpl) if f.startswith('01-')][0]
    open(os.path.join(tpl, w), 'w', encoding='utf8').write(welcome())
    base_connect = D['tpls'][1]
    open(os.path.join(tpl, c), 'w', encoding='utf8').write(connect(base_connect))
    print('Welcome timeline: line in %.2fs, mark %.2f-%.2fs, pen out until %.2fs, actions at %.2fs' % (T0, T_A, T_OUT, T_END, T_END + 0.62))
