"""Replaces every Phosphor icon on the New side with its Google Material Symbols (Rounded) equivalent.

    python compare/tools/material_icons.py

Phosphor regular -> Material outlined (FILL 0, weight 400), fill -> filled (FILL 1), bold -> weight 500.
Icons are identified by their exact path data (generator/node_modules/@phosphor-icons/core), and the
Material SVGs come from google/material-design-icons on GitHub, cached in compare/tools/material-cache/.
Each icon keeps its size, colour, style and accessibility attributes. Safe to re-run.
"""
import glob, os, re, sys, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC = os.path.join(ROOT, 'compare', 'src')
CACHE = os.path.join(ROOT, 'compare', 'tools', 'material-cache')
PH = os.path.join(ROOT, 'generator', 'node_modules', '@phosphor-icons', 'core', 'assets')
URL = 'https://raw.githubusercontent.com/google/material-design-icons/master/symbols/web/{n}/materialsymbolsrounded/{n}_{v}24px.svg'

# Phosphor name -> Material Symbols name (by meaning, not by look)
MAP = {
    'arrow-down': 'arrow_downward', 'arrow-left': 'arrow_back', 'arrow-up': 'arrow_upward', 'arrow-up-right': 'arrow_outward',
    'arrows-down-up': 'swap_vert', 'arrows-left-right': 'swap_horiz', 'backpack': 'backpack', 'bell': 'notifications',
    'caret-down': 'keyboard_arrow_down', 'caret-right': 'chevron_right', 'chart-line': 'show_chart', 'chart-line-up': 'trending_up',
    'check': 'check', 'clock-counter-clockwise': 'history', 'coins': 'toll', 'copy': 'content_copy', 'gas-pump': 'local_gas_station',
    'gear-six': 'settings', 'hand-coins': 'savings', 'house': 'home', 'info': 'info', 'lightning': 'bolt', 'lock-key': 'lock',
    'magnifying-glass': 'search', 'plus': 'add', 'prohibit': 'block', 'sign-out': 'logout', 'stack': 'layers', 'star': 'star',
    'trend-down': 'trending_down', 'wallet': 'account_balance_wallet', 'warning': 'warning', 'warning-circle': 'error',
    'wifi-slash': 'wifi_off', 'x': 'close', 'shield-check': 'verified_user', 'trend-up': 'trending_up', 'check-circle': 'check_circle', 'arrow-right': 'arrow_forward',
}
VARIANT = {'regular': '', 'fill': 'fill1_', 'bold': 'wght500_'}


def phosphor_index():
    idx = {}
    for weight in ('regular', 'fill', 'bold'):
        for f in os.listdir(os.path.join(PH, weight)):
            s = open(os.path.join(PH, weight, f), encoding='utf8').read()
            ds = tuple(re.findall(r' d="([^"]+)"', s))
            name = re.sub(r'-(fill|bold)$', '', f[:-4])
            if ds:
                idx[ds] = (name, weight)
    return idx


def material(name, weight):
    os.makedirs(CACHE, exist_ok=True)
    v = VARIANT[weight]
    path = os.path.join(CACHE, '%s__%s.svg' % (name, v or 'regular'))
    if not os.path.exists(path):
        try:
            data = urllib.request.urlopen(URL.format(n=name, v=v), timeout=30).read()
        except Exception:
            data = urllib.request.urlopen(URL.format(n=name, v=''), timeout=30).read()   # fall back to weight 400
        open(path, 'wb').write(data)
    s = open(path, encoding='utf8').read()
    return re.findall(r' d="([^"]+)"', s)


def main():
    if not os.path.isdir(PH):
        sys.exit('Run "npm install" in generator/ first (it provides @phosphor-icons/core).')
    idx = phosphor_index()
    missing, n_svg, n_str = set(), 0, 0

    def to_material(ds):
        hit = idx.get(ds)
        if not hit and ds and ds[0].startswith('M220,169.09l-92,53.65'):   # hand-merged filled stack (selected Positions tab)
            hit = ('stack', 'fill')
        if not hit:
            return None
        name, weight = hit
        if name not in MAP:
            missing.add(name); return None
        return material(MAP[name], weight)

    def svg(m):
        nonlocal n_svg
        attrs, inner = m.group(1), m.group(2)
        ds = tuple(re.findall(r' d="([^"]+)"', inner))
        if any('{{' in d for d in ds):           # data-driven path: switch the coordinate system, the data is converted below
            n_svg += 1
            return '<svg%s>%s</svg>' % (attrs.replace('viewBox="0 0 256 256"', 'viewBox="0 -960 960 960"'), inner)
        md = to_material(ds)
        if md is None:
            return m.group(0)
        n_svg += 1
        return '<svg%s>%s</svg>' % (attrs.replace('viewBox="0 0 256 256"', 'viewBox="0 -960 960 960"'),
                                     ''.join('<path d="%s"></path>' % d for d in md))

    for f in sorted(glob.glob(os.path.join(SRC, 'tpl', '*.html')) + glob.glob(os.path.join(SRC, 'cls', '*.js'))):
        s = open(f, encoding='utf8').read(); before = s
        s = re.sub(r'<svg([^>]*viewBox="0 0 256 256"[^>]*)>(.*?)</svg>', svg, s, flags=re.S)
        if f.endswith('.js'):                    # single-path icons kept as data, e.g. notification badges
            def data_path(m):
                nonlocal n_str
                md = to_material((m.group(1),))
                if md is None or len(md) != 1:
                    return m.group(0)
                n_str += 1
                return "'%s'" % md[0]
            s = re.sub(r"'(M[0-9][^']{20,})'", data_path, s)
        if s != before:
            open(f, 'w', encoding='utf8').write(s)
    print('Converted %d icons in markup and %d in data.' % (n_svg, n_str))
    if missing:
        print('No Material mapping for:', ', '.join(sorted(missing)))
    left = sum(len(re.findall(r'viewBox="0 0 256 256"', open(f, encoding='utf8').read()))
               for f in glob.glob(os.path.join(SRC, 'tpl', '*.html')) + glob.glob(os.path.join(SRC, 'cls', '*.js')))
    print('Phosphor icons left:', left)


if __name__ == '__main__':
    main()
