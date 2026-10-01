"""Converts the New side's components from iOS/web patterns to Material 3 (Android).

    python compare/tools/androidify.py

Safe to re-run: every rule matches only the old pattern, and each prints how often it fired.
Brand stays (Plus Jakarta Sans, Vanna colours, Phosphor icons); the component grammar becomes Android:
  segmented controls -> M3 tabs (view switches) or M3 segmented buttons (choices)
  pill chips          -> M3 chips: 32dp, 8dp corners, tonal when selected, check mark on filter chips
  Appearance          -> the Android "choose theme" radio list
  text fields         -> M3 outlined text fields with the label in the outline
  shape scale         -> cards and menus 16, inner strips 12, sheets 28, chips 8, fields 4
  top app bar icons   -> standard icon buttons (no glass circles)
  navigation bar      -> tonal active indicator, no divider
"""
import glob, os, re

SRC = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'src')
CHECK = ('<svg width="16" height="16" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">'
         '<path d="M229.66,77.66l-128,128a8,8,0,0,1-11.32,0l-56-56a8,8,0,0,1,11.32-11.32L96,188.69,218.34,66.34a8,8,0,0,1,11.32,11.32Z"></path></svg>')
hits = {}


def sub(name, pattern, repl, text, flags=0, literal=False):
    if literal:
        n = text.count(pattern)
        text = text.replace(pattern, repl)
    else:
        text, n = re.subn(pattern, repl, text, flags=flags)
    hits[name] = hits.get(name, 0) + n
    return text


# ---------------------------------------------------------------- logic (selected-state colours)
def cls(js, fname):
    # segmented control -> tab indicator colour
    js = sub('cls: seg -> tab indicator', "bg: on ? t.segOn : 'transparent', sh: on ? t.segShadow : 'none'", "bg: on ? t.link : 'transparent', sh: 'none'", js, literal=True)
    # vault tabs -> underline tabs
    js = sub('cls: vault tabs', "bg: on ? t.chipOn : t.card, fg: on ? t.chipOnFg : t.text2", "bg: on ? t.link : 'transparent', fg: on ? t.text : t.text2", js, literal=True)
    # chips: black fill -> tonal (secondary container), plus a check-mark flag for filter chips
    js = sub('cls: chipList check flag', "bd: on ? t.chipOn : t.bd, pick: function () { self.setState(st); } }; }); };",
             "bd: on ? t.chipOn : t.bd, ck: on ? 'inline-flex' : 'none', pick: function () { self.setState(st); } }; }); };", js, literal=True)
    js = sub('cls: selected fill -> tonal', 'on ? t.chipOn :', 'on ? t.tv :', js, literal=True)
    js = sub('cls: selected ink -> tonal', 'on ? t.chipOnFg :', 'on ? t.tvI :', js, literal=True)
    # Earn hero switch: white thumb -> white underline, inactive label dimmed
    js = sub('cls: hero switch', "bg: on ? '#FFFFFF' : 'transparent', fg: on ? '#2F1B61' : '#FFFFFF'",
             "bg: on ? '#FFFFFF' : 'transparent', fg: on ? '#FFFFFF' : 'rgba(255,255,255,0.72)'", js, literal=True)
    # Appearance: radio list data
    if 'themes = segList(' in js and 'x.ring' not in js:
        js = sub('cls: theme radios', "window.__vnSetTheme(x.label); } catch (e) {} }; return x; });",
                 "window.__vnSetTheme(x.label); } catch (e) {} }; var on = x.on === 'true'; x.ring = on ? t.link : t.text2; x.dot = on ? t.link : 'transparent'; "
                 "x.name = x.label === 'System' ? 'System default' : x.label; return x; });", js, literal=True)
    return js


# ---------------------------------------------------------------- markup
def pill(style):
    h = re.search(r'(?:^|; )height: (\d+)px', style)
    r = re.search(r'border-radius: (\d+)px(?:;|$)', style)
    return bool(h and r and abs(int(r.group(1)) * 2 - int(h.group(1))) <= 1)


def radii(m):
    style = m.group(1)
    if pill(style):
        return m.group(0)
    def fix(r):
        v = int(r.group(1))
        if v in (20, 22, 24, 26):
            return 'border-radius: 16px'
        if v == 14:
            return 'border-radius: 12px'
        return r.group(0)
    return 'style="' + re.sub(r'border-radius: (\d+)px(?=;|$)', fix, style) + '"'


def chip(m):
    tag, attrs, style = m.group(1), m.group(2), m.group(3)
    h = re.search(r'(?:^|; )height: (28|32|36)px', style)
    if not h or not pill(style) or re.search(r'(?:^|; )width: %spx' % h.group(1), style):
        return m.group(0)
    style = re.sub(r'(^|; )height: (28|32|36)px', r'\1height: 32px', style, count=1)
    style = re.sub(r'border-radius: (14|16|18)px', 'border-radius: 8px', style, count=1)
    hits['tpl: pill -> M3 chip'] = hits.get('tpl: pill -> M3 chip', 0) + 1
    return '<%s%sstyle="%s"' % (tag, attrs, style)


def tpl(h, fname):
    # Profile › Appearance: segmented control -> Android theme radio list
    h = sub('tpl: appearance radios',
            r'<div role="tablist" style="height: 44px; padding: 4px; border-radius: 22px; background: \{\{ t\.seg \}\}; display: flex; gap: 4px">\s*'
            r'<sc-for list="\{\{ themes \}\}" as="s" hint-placeholder-count="2">\s*<button[^>]*>\{\{ s\.label \}\}<span[^>]*>\{\{ s\.count \}\}</span></button>\s*</sc-for>\s*</div>',
            '<div role="radiogroup" aria-label="Theme" style="margin: 0 -16px; display: flex; flex-direction: column">\n'
            '<sc-for list="{{ themes }}" as="s" hint-placeholder-count="3">\n'
            '<button type="button" role="radio" aria-checked="{{ s.on }}" onClick="{{ s.pick }}" style="height: 52px; padding: 0 16px; border: 0; background: transparent; color: {{ t.text }}; '
            'display: flex; align-items: center; gap: 16px; font-size: 16px; line-height: 24px; text-align: left">'
            '<span style="width: 20px; height: 20px; border-radius: 999px; border: 2px solid {{ s.ring }}; display: flex; align-items: center; justify-content: center; flex-shrink: 0">'
            '<span style="width: 10px; height: 10px; border-radius: 999px; background: {{ s.dot }}"></span></span>{{ s.name }}</button>\n'
            '</sc-for>\n</div>', h)

    # Current | History, Supply | Withdraw: segmented control -> M3 tabs
    h = sub('tpl: segmented -> tabs (container)',
            r'<div role="tablist" style="height: 44px; padding: 4px; border-radius: 22px; background: \{\{ t\.seg \}\}; display: flex; gap: 4px">',
            '<div role="tablist" style="height: 48px; display: flex; border-bottom: 1px solid {{ t.bd }}">', h)
    h = sub('tpl: segmented -> tabs (tab)',
            r'style="flex: 1 1 0; height: 36px; border-radius: 18px; border: 0; background: \{\{ (\w+)\.bg \}\}; box-shadow: \{\{ \1\.sh \}\}; color: \{\{ \1\.fg \}\}; font-size: 14px; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 6px"',
            r'style="flex: 1 1 0; height: 48px; border: 0; border-radius: 0; background: transparent; box-shadow: inset 0 -2px 0 {{ \1.bg }}; color: {{ \1.fg }}; font-size: 14px; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 6px"', h)

    # Earn hero: Overall deposit | Net earnings on the dark hero -> white underline tabs
    h = sub('tpl: hero switch -> tabs (container)',
            '<div style="margin-top: 20px; height: 36px; padding: 3px; border-radius: 18px; background: rgba(255,255,255,0.12); display: flex; gap: 2px">',
            '<div role="tablist" style="margin-top: 12px; height: 44px; display: flex; border-bottom: 1px solid rgba(255,255,255,0.18)">', h, literal=True)
    h = sub('tpl: hero switch -> tabs (tab)',
            'aria-pressed="{{ m.on }}" style="flex: 1 1 0; height: 30px; border-radius: 15px; border: 0; background: {{ m.bg }}; color: {{ m.fg }}; font-size: 13px; font-weight: 600">',
            'role="tab" aria-selected="{{ m.on }}" style="flex: 1 1 0; height: 44px; border-radius: 0; border: 0; background: transparent; box-shadow: inset 0 -2px 0 {{ m.bg }}; color: {{ m.fg }}; font-size: 14px; font-weight: 600">', h, literal=True)

    # Compact Current | History inside the vault -> M3 tabs
    h = sub('tpl: compact segmented -> tabs (container)',
            '<div style="margin-top: 16px; height: 40px; padding: 4px; border-radius: 20px; background: {{ t.seg }}; display: flex; gap: 4px">',
            '<div role="tablist" style="margin-top: 8px; height: 44px; display: flex; border-bottom: 1px solid {{ t.bd }}">', h, literal=True)
    h = sub('tpl: compact segmented -> tabs (tab)',
            r'<button type="button" onClick="\{\{ (\w+)\.pick \}\}" style="flex: 1 1 0; height: 32px; border-radius: (?:8|16)px; border: 0; background: \{\{ \1\.bg \}\}; box-shadow: \{\{ \1\.sh \}\}; color: \{\{ \1\.fg \}\}; font-size: 12px; font-weight: 600">',
            r'<button type="button" role="tab" onClick="{{ \1.pick }}" style="flex: 1 1 0; height: 44px; border-radius: 0; border: 0; background: transparent; box-shadow: inset 0 -2px 0 {{ \1.bg }}; color: {{ \1.fg }}; font-size: 14px; font-weight: 600">', h)

    # Long | Short, Auto | Custom: -> M3 segmented buttons (outlined container, flush segments)
    h = sub('tpl: long/short -> segmented button',
            r'role="tablist"( aria-label="[^"]*")? style="height: 52px; padding: 4px; border-radius: 26px; background: [^;"]+; display: flex; gap: 4px"',
            r'role="tablist"\1 style="height: 48px; padding: 0; border-radius: 24px; border: 1px solid {{ t.bd }}; overflow: hidden; display: flex; gap: 0"', h)
    h = sub('tpl: long/short segments', r'style="flex: 1 1 0; height: 44px; border-radius: 22px; border: 0; background: \{\{ (\w+)\.bg \}\}; color: \{\{ \1\.fg \}\}; font-size: 16px',
            r'style="flex: 1 1 0; height: 46px; border-radius: 0; border: 0; background: {{ \1.bg }}; color: {{ \1.fg }}; font-size: 16px', h)
    h = sub('tpl: auto/custom -> segmented button',
            r'role="tablist" style="margin-top: 12px; height: 48px; padding: 4px; border-radius: 24px; background: [^;"]+; display: flex; gap: 4px"',
            'role="tablist" style="margin-top: 12px; height: 40px; padding: 0; border-radius: 20px; border: 1px solid {{ t.bd }}; overflow: hidden; display: flex; gap: 0"', h)
    h = sub('tpl: auto/custom segments', r'style="flex: 1 1 0; height: 40px; border-radius: 20px; border: 0; background: \{\{ (\w+)\.bg \}\}',
            r'style="flex: 1 1 0; height: 38px; border-radius: 0; border: 0; background: {{ \1.bg }}', h)

    # Vault tabs (Positions, Details, …): pill tabs -> M3 scrollable tabs
    h = sub('tpl: vault tabs container', r'role="tablist" style="margin: 20px -20px 0 -20px; padding: 0 20px; display: flex; gap: 8px; overflow-x: auto"',
            'role="tablist" style="margin: 12px -20px 0 -20px; padding: 0 4px; display: flex; gap: 0; overflow-x: auto; border-bottom: 1px solid {{ t.bd }}"', h)
    h = sub('tpl: vault tabs', r'height: 36px; padding: 0 14px; border-radius: 18px; border: 0; background: \{\{ (\w+)\.bg \}\};',
            r'height: 48px; padding: 0 16px; border-radius: 0; border: 0; background: transparent; box-shadow: inset 0 -2px 0 {{ \1.bg }};', h)

    # Filter chips bound to chipList get a leading check mark when selected
    h = sub('tpl: filter chip check',
            r'(<button type="button" role="tab" aria-selected="\{\{ (\w+)\.on \}\}" onClick="\{\{ \2\.pick \}\}" style="height: 36px; padding: 0 16px; border-radius: 18px; border: 1px solid \{\{ \2\.bd \}\}; background: \{\{ \2\.bg \}\}; color: \{\{ \2\.fg \}\}; font-size: 14px; font-weight: 600)">\{\{ \2\.label \}\}</button>',
            r'\1; display: inline-flex; align-items: center; gap: 6px"><span style="display: {{ \2.ck }}; margin-left: -4px">' + CHECK.replace('\\', '\\\\') + r'</span>{{ \2.label }}</button>', h)

    # Every other small pill button -> M3 chip geometry
    h = re.sub(r'<(button|a)((?:(?!style=)[^>])*?)style="([^"]*)"', chip, h)

    # Outlined text fields (swap settings)
    h = sub('tpl: slippage field',
            '<label style="margin-top: 10px; height: 52px; padding: 0 16px; border-radius: 16px; border: 1px solid {{ fieldBd }}; background: {{ t.page }}; display: flex; align-items: center; gap: 8px; opacity: {{ fieldOp }}">',
            '<label style="position: relative; margin-top: 16px; height: 56px; padding: 0 16px; border-radius: 4px; border: 1px solid {{ fieldBd }}; background: transparent; display: flex; align-items: center; gap: 8px; opacity: {{ fieldOp }}">'
            '<span style="position: absolute; left: 12px; top: -9px; padding: 0 4px; background: {{ t.card }}; font-size: 12px; line-height: 16px; color: {{ t.text2 }}">Custom slippage</span>', h, literal=True)
    h = sub('tpl: deadline field',
            '<label style="margin-top: 10px; height: 52px; padding: 0 16px; border-radius: 16px; border: 1px solid {{ t.bd }}; background: {{ t.page }}; display: flex; align-items: center; gap: 8px">',
            '<label style="position: relative; margin-top: 16px; height: 56px; padding: 0 16px; border-radius: 4px; border: 1px solid {{ t.text2 }}; background: transparent; display: flex; align-items: center; gap: 8px">'
            '<span style="position: absolute; left: 12px; top: -9px; padding: 0 4px; background: {{ t.card }}; font-size: 12px; line-height: 16px; color: {{ t.text2 }}">Deadline</span>', h, literal=True)

    # Top app bar icons on product heroes: glass circles -> standard icon buttons
    h = sub('tpl: hero icon buttons', 'width: 44px; height: 44px; border-radius: 999px; background: rgba(255,255,255,0.14);',
            'width: 48px; height: 48px; border-radius: 999px; background: transparent;', h, literal=True)

    # Navigation bar: gradient pill with glow -> tonal active indicator; no top divider
    h = sub('tpl: nav active indicator',
            r'width: 60px; height: 32px; border-radius: 16px; background: linear-gradient\([^)]*\); color: #FFFFFF; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba\(112,58,230,0\.32\)',
            'width: 64px; height: 32px; border-radius: 16px; background: {{ t.tv }}; color: {{ t.tvI }}; display: flex; align-items: center; justify-content: center', h)
    h = sub('tpl: nav inactive indicator', 'width: 60px; height: 32px; border-radius: 16px; color: {{ t.text2 }};',
            'width: 64px; height: 32px; border-radius: 16px; color: {{ t.text2 }};', h, literal=True)
    h = sub('tpl: nav divider', 'height: 80px; padding: 8px 12px 14px 12px; background: {{ t.card }}; border-top: 1px solid {{ t.line }};',
            'height: 80px; padding: 12px 12px 16px 12px; background: {{ t.card }};', h, literal=True)

    # Shape scale: cards/menus 16, inner strips 12 (pills untouched)
    before = h
    h = re.sub(r'style="([^"]*)"', radii, h)
    hits['tpl: shape scale (elements)'] = hits.get('tpl: shape scale (elements)', 0) + sum(1 for a, b in zip(re.findall(r'style="[^"]*"', before), re.findall(r'style="[^"]*"', h)) if a != b)
    return h


for f in sorted(glob.glob(os.path.join(SRC, 'cls', '*.js'))):
    s = open(f, encoding='utf8').read(); n = cls(s, f)
    if n != s: open(f, 'w', encoding='utf8').write(n)
for f in sorted(glob.glob(os.path.join(SRC, 'tpl', '*.html'))):
    s = open(f, encoding='utf8').read(); n = tpl(s, f)
    if n != s: open(f, 'w', encoding='utf8').write(n)
for k, v in hits.items():
    print('%4d  %s' % (v, k))
