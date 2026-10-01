"""One shareable file: the whole Current vs New comparison in a single HTML that opens with a double-click.

    node compare/tools/build.js && python compare/tools/bundle.py   -> compare/vanna-compare.html

Both prototypes (current.html, new.html, with their images already inline), the change log (meta.js) and the
comparison page are packed into one file. The phones load from that embedded copy (iframe srcdoc) instead of from
separate files, so no server and no other files are needed; it can be sent over Slack or email. Only the font comes
from Google Fonts (without internet the page falls back to the system font).
"""
import base64, json, os, re

CMP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def read(name):
    return open(os.path.join(CMP, name), encoding='utf8').read()


def must_replace(s, old, new, label):
    assert old in s, 'bundle: anchor not found (' + label + ')'
    return s.replace(old, new, 1)


def prototype(name):
    h = read(name)
    # side and start screen come from the page that embeds it (srcdoc has no ?query or #hash of its own)
    h = must_replace(h, 'new URLSearchParams(location.search)', 'new URLSearchParams(window.__vnQS || location.search)', name + ' query')
    h = must_replace(h, "var start = (location.hash || '').replace('#', '');", "var start = window.__vnStartStem || (location.hash || '').replace('#', '');", name + ' start')
    return h


LOADER = r'''function loadFrame(side) {
    var f = frames[side]; f.removeAttribute('src');
    f.srcdoc = vnPage(side, 'embed=1&side=' + side, stems[side] || 'V7Welcome');
  }
  /* single-file build (tools/bundle.py): the prototypes live in this file */
  function vnPage(side, qs, stem) {
    var boot = '<script>window.__vnQS=' + JSON.stringify(qs) + ';window.__vnStartStem=' + JSON.stringify(stem) + ';<\/script>';
    return window.__VN_SRC[side].replace('<head>', '<head>' + boot);
  }
  ['current', 'new'].forEach(function (side) {   // "Open full size": the same prototype alone in a new tab
    $(side === 'current' ? 'curOpen' : 'newOpen').addEventListener('click', function (e) {
      e.preventDefault();
      var w = window.open('', '_blank'); if (!w) return;
      w.document.open(); w.document.write(vnPage(side, 'side=' + side, stems[side] || 'V7Welcome')); w.document.close();
    });
  });'''


def main():
    src = {'current': prototype('current.html'), 'new': prototype('new.html')}
    page = read('index.html')
    mark = 'data:image/svg+xml;base64,' + base64.b64encode(open(os.path.join(CMP, 'mark.svg'), 'rb').read()).decode()
    page = must_replace(page, '<link rel="icon" href="mark.svg">', '<link rel="icon" href="' + mark + '">', 'favicon')
    page = page.replace('src="mark.svg"', 'src="' + mark + '"')
    page = must_replace(page, 'function loadFrame(side) { frames[side].src = url(side); }', LOADER, 'loader')
    page = must_replace(page, 'pollMeta(); setInterval(pollMeta, 1500);', '/* change log is embedded below (no polling in the single file) */', 'meta polling')
    data = json.dumps(src, ensure_ascii=False).replace('</', '<\\/')
    head_data = '<script>window.__VN_SRC = ' + data + ';</script>\n'
    page = must_replace(page, '</head>', head_data + '</head>', 'head')
    meta = read('meta.js').replace('</', '<\\/')
    page = page[:page.rindex('</body>')] + '<script>\n' + meta + '\n</script>\n' + page[page.rindex('</body>'):]
    out = os.path.join(CMP, 'vanna-compare.html')
    open(out, 'w', encoding='utf8').write(page)
    print('%s  (%.1f MB)' % (out, os.path.getsize(out) / 1e6))


if __name__ == '__main__':
    main()
