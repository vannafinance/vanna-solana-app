"""Tags the New side's layout blocks so styles.css can adapt them to Android tablets and foldables.

    python compare/tools/adaptive.py

Safe to re-run. Adds class hooks only; the layouts themselves live in src/styles.css as container
queries on #screen, keyed to Android window size classes (compact < 600dp, medium 600-839, expanded >= 840):
  vn-main      the scrolling content area        -> centred readable column
  vn-has-nav   ... on a screen with a nav bar    -> sits right of the navigation rail
  vn-navbar    bottom navigation bar             -> navigation rail on the left
  vn-sheet     bottom sheet                      -> max 640dp, centred
  vn-actions   sticky bottom action bar          -> full-width bar, buttons follow the content column
  vn-chart     wide charts                       -> fill the column
  vn-w-art / vn-w-copy   Welcome and Connect     -> centred composition, or art | copy split in landscape
"""
import glob, os, re

SRC = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'src')
hits = {}


def tag(name, pattern, cls, text, skip=False):
    if skip:
        return text
    def add(m):
        if 'class="' in m.group(0):
            return m.group(0)
        hits[name] = hits.get(name, 0) + 1
        return m.group(1) + ' class="%s"' % cls + m.group(2)
    return re.sub(pattern, add, text)


def welcome(h):
    """Wrap the art (aurora, orbits, mark, wordmark) and the copy (headline, captions, actions) of the 412 x 915 composition."""
    if 'vn-w-art' in h:
        return h
    start = h.index('<div aria-hidden="true" style="position: absolute; inset: 0; pointer-events: none">')
    copy = h.index('<div style="position: absolute; left: 24px; right: 24px; top: 540px')
    tail = h.index('\n</div>\n', h.index('<div style="position: absolute; left: 16px; right: 16px; bottom: 28px'))  # end of the actions block
    art = h[start:copy]
    body = h[copy:tail + len('\n</div>')]
    hits['welcome wrappers'] = hits.get('welcome wrappers', 0) + 1
    return (h[:start] + '<div class="vn-w-art" style="position: absolute; left: 0; top: 0; width: 412px; height: 560px">\n' + art + '</div>\n'
            + '<div class="vn-w-copy" style="position: absolute; inset: 0">\n' + body + '\n</div>' + h[tail + len('\n</div>'):])


for f in sorted(glob.glob(os.path.join(SRC, 'tpl', '*.html'))):
    h = open(f, encoding='utf8').read(); before = h
    start_screen = os.path.basename(f)[:2] in ('00', '01')
    h = tag('main + nav', r'(<div)( style="position: absolute; inset: 0; bottom: 80px; overflow-y: auto)', 'vn-main vn-has-nav', h)
    h = tag('main', r'(<div)( style="position: absolute; inset: 0;(?: bottom: \d+px;)? overflow-y: auto)', 'vn-main', h)
    h = tag('nav bar', r'(<nav aria-label="[^"]*")( style="position: absolute; left: 0; right: 0; bottom: 0; z-index: 10; height: 80px)', 'vn-navbar', h)
    h = tag('sheet', r'(<div role="dialog"[^>]*?)( style="[^"]*left: 0; right: 0; bottom: 0; border-radius: 28px 28px 0 0)', 'vn-sheet', h)
    h = tag('actions', r'(<div)( style="position: absolute; left: 0; right: 0; bottom: 0; padding: 12px 16px)', 'vn-actions', h, skip=start_screen)
    if os.path.basename(f).startswith('02-'):  # Home: the four product tiles
        h = tag('tiles', r'(<div)( style="display: grid; grid-template-columns: repeat\(2, minmax\(0, 1fr\)\); gap: 12px">\s*<a href="V7Perps)', 'vn-tiles', h)
    h = tag('chart', r'(<svg)( width="3\d\d" height="\d+" viewBox="0 0 3\d\d \d+")', 'vn-chart', h)
    if start_screen:
        h = welcome(h)
    if h != before:
        open(f, 'w', encoding='utf8').write(h)

for k, v in hits.items():
    print('%4d  %s' % (v, k))
