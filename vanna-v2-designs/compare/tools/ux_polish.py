"""UX polish, 1 Oct 2026 (user feedback on Farm and Trade).

    python compare/tools/ux_polish.py      (safe to re-run)

1. Dropdown menus open right under their button (Farm's token menu opened ~50px too low after the Farm rebuild)
   and animate like Material 3 menus: fade + slight drop + scale from the button's corner, options fade in one by
   one, and they fade out on close (runtime.js). Every chevron rotates smoothly.
2. Farm: swipe the token chip left / right to switch between the assets you hold (like switching Google accounts
   on the avatar). Dots under it show how many there are. Tapping still opens the menu.
3. Long / Short buttons carry trend icons (trending_up / trending_down): price going up / down.
"""
import os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(os.path.dirname(HERE), 'src')
sys.path.insert(0, HERE)
import material_icons as mi   # noqa: E402

FARM_CLS = ['48-V7Farm.js', '49-V7FarmPools.js', '50-V7FarmTokens.js', '51-V7FarmLev4.js', '52-V7FarmSign.js', '53-V7FarmDone.js',
            '80-V7FarmNoFunds.js', '81-V7FarmFailed.js', '82-V7FarmRejected.js']
ORDER_CLS = ['12-V7PerpsOrder.js', '13-V7PerpsOrderSign.js', '14-V7PerpsOrderConfirm.js', '15-V7PerpsOrderDone.js',
             '65-V7PerpsOrderNoFunds.js', '66-V7PerpsOrderRisky.js', '67-V7PerpsOrderFailed.js', '68-V7PerpsOrderRejected.js']
EASE = 'cubic-bezier(0.2, 0, 0, 1)'   # Material 3 emphasized decelerate


def icon(name, size=20):
    return ('<svg width="%d" height="%d" viewBox="0 -960 960 960" fill="currentColor" aria-hidden="true">%s</svg>'
            % (size, size, ''.join('<path d="%s"></path>' % d for d in mi.material(name, 'regular'))))


def read(rel):
    return open(os.path.join(SRC, rel), encoding='utf8').read()


def write(rel, old, new):
    if new != old:
        open(os.path.join(SRC, rel), 'w', encoding='utf8').write(new)
        print('patched', rel)
    else:
        print('unchanged', rel)


# ---------------------------------------------------------------- 1. menus
def menus(h):
    def fix(m):
        tag = m.group(0)
        if 'vn-menu' not in tag:
            tag = tag.replace('role="listbox"', 'class="vn-menu" role="listbox"', 1)
        origin = 'top right' if re.search(r'[; "]right: ', tag) else ('top left' if re.search(r'[; "]left: 0', tag) else 'top center')
        anim = 'animation: vnMenu 220ms %s both; transform-origin: %s' % (EASE, origin)
        if 'animation: vnMenu' in tag:
            return tag
        if re.search(r'animation: vnDrop[^;"]*', tag):
            return re.sub(r'animation: vnDrop[^;"]*', lambda _: anim, tag, count=1)
        return tag.replace('style="', 'style="' + anim + '; ', 1)
    h = re.sub(r'<div [^>]*role="listbox"[^>]*>', fix, h)
    # chevrons that flip when a menu opens: rotate smoothly
    h = re.sub(r'transform: \{\{ (\w+Rot) \}\}(?!; transition)', lambda m: 'transform: {{ %s }}; transition: transform 220ms %s' % (m.group(1), EASE), h)
    return h


for f in sorted(os.listdir(os.path.join(SRC, 'tpl'))):
    rel = os.path.join('tpl', f)
    s = read(rel)
    write(rel, s, menus(s))

# Farm: the token menu sits 6px under its button and lines up with its right edge; the pool menu 6px under its button
rel = os.path.join('tpl', '20-V7Farm.html')
s = read(rel)
n = s.replace('position: absolute; right: 12px; top: 150px; width: 220px;', 'position: absolute; right: 30px; top: 104px; width: 220px;', 1)
n = n.replace('position: absolute; left: 12px; right: 12px; top: 116px;', 'position: absolute; left: 12px; right: 12px; top: 118px;', 1)

# ---------------------------------------------------------------- 2. Farm: swipe the token chip
DOTS = ('<span aria-hidden="true" style="display: {{ dotsD }}; gap: 4px; justify-content: flex-end; margin: 6px 14px 0 0">'
        '<sc-for list="{{ tokDots }}" as="d" hint-placeholder-count="2"><span style="width: 6px; height: 6px; border-radius: 999px; background: {{ d.bg }}; transition: background 200ms ease"></span></sc-for></span>')
if 'data-swipe-host' not in n:
    n = n.replace('<button type="button" onClick="{{ toggleTok }}"', '<button type="button" data-swipe-host="tok" onClick="{{ toggleTok }}"', 1)
    # hidden next / previous buttons the swipe gesture presses (state stays in the screen's own logic)
    n = n.replace('<div style="margin-top: 2px; font-size: 12px; color: {{ t.text2 }}">≈ {{ usd }}</div>',
                  '<div style="margin-top: 2px; display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: {{ t.text2 }}"><span>≈ {{ usd }}</span>' + DOTS + '</div>'
                  '<button type="button" data-swipe="tok-next" onClick="{{ nextTok }}" tabindex="-1" aria-hidden="true" style="display: none"></button>'
                  '<button type="button" data-swipe="tok-prev" onClick="{{ prevTok }}" tabindex="-1" aria-hidden="true" style="display: none"></button>', 1)
write(rel, s, n)

SWIPE_JS = ("var held = FT.filter(function (x) { return x.bal > 0; }); if (!held.length) held = FT; "
            "var hi = held.map(function (x) { return x.sym; }).indexOf(ts); "
            "var stepTok = function (d) { var j = ((hi < 0 ? 0 : hi + d) % held.length + held.length) % held.length; self.setState({ ts: held[j].sym, amt: undefined, open: '' }); };\n")
SWIPE_RET = ("nextTok: function () { stepTok(1); }, prevTok: function () { stepTok(-1); }, dotsD: held.length > 1 ? 'flex' : 'none', "
             "tokDots: held.map(function (x) { return { bg: x.sym === ts ? '#703AE6' : t.bd }; }),\n")
for f in FARM_CLS:
    rel = os.path.join('cls', f)
    s = read(rel)
    n = s
    if 'stepTok' not in n:
        n = n.replace('var over = amt > tok.bal', SWIPE_JS + 'var over = amt > tok.bal', 1)
        n = n.replace("apyTxt: ", SWIPE_RET + "apyTxt: ", 1)
        assert 'stepTok(1)' in n, f
    write(rel, s, n)

# ---------------------------------------------------------------- 3. Long / Short icons
UP, DOWN = icon('trending_up', 20), icon('trending_down', 20)
rel = os.path.join('tpl', '08-V7PerpsMarket.html')
s = read(rel)
n = s
if 'aria-hidden="true">' + UP[UP.index('<path'):UP.index('<path') + 30] not in n:
    n = n.replace('justify-content: center; text-decoration: none">Long</a>', 'justify-content: center; gap: 8px; text-decoration: none">' + UP + 'Long</a>', 1)
    n = n.replace('justify-content: center; text-decoration: none">Short</a>', 'justify-content: center; gap: 8px; text-decoration: none">' + DOWN + 'Short</a>', 1)
write(rel, s, n)

rel = os.path.join('tpl', '09-V7PerpsOrder.html')
s = read(rel)
n = s
if '{{ s.upD }}' not in n:
    n = n.replace('font-size: 16px; font-weight: 600">{{ s.label }}</button>',
                  'font-size: 16px; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 8px">'
                  '<span style="display: {{ s.upD }}">' + UP + '</span><span style="display: {{ s.dnD }}">' + DOWN + '</span>{{ s.label }}</button>', 1)
write(rel, s, n)
for f in ORDER_CLS:
    rel = os.path.join('cls', f)
    s = read(rel)
    n = s
    if 'upD:' not in n:
        n = n.replace("return { label: l, on: on ? 'true' : 'false',", "return { label: l, upD: l === 'Long' ? 'flex' : 'none', dnD: l === 'Short' ? 'flex' : 'none', on: on ? 'true' : 'false',", 1)
    write(rel, s, n)
