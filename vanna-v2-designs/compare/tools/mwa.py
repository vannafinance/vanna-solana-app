"""Solana Mobile Wallet Adapter (MWA): wallet-agnostic connect and approval on the New side.

    python compare/tools/mwa.py      (safe to re-run)

- Copy: no Backpack. Every flow talks about "your wallet" (Seed Vault on Seeker, Phantom, Solflare, Backpack...).
- Connect: one "Use installed wallet" option, a "Get a wallet" fallback, and no custom-RPC step:
  MWA passes the network with the connect request, so approve goes straight to connected (signed in).
- Approval sheets: "Confirm in your wallet", an "Approve in wallet" button, and a Seeker hint
  (double-tap the side button, then the fingerprint sensor).
The wallet's own approval screen is drawn by src/runtime.js when "Approve in wallet" is tapped.
"""
import glob, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(os.path.dirname(HERE), 'src')
sys.path.insert(0, HERE)
import material_icons as mi   # noqa: E402

hits = {}


def icon(name, weight='regular', size=20):
    return ('<svg width="%d" height="%d" viewBox="0 -960 960 960" fill="currentColor" aria-hidden="true">%s</svg>'
            % (size, size, ''.join('<path d="%s"></path>' % d for d in mi.material(name, weight))))


COPY = [  # (old, new): wallet-agnostic wording
    ('Approve in Backpack</h2>', 'Confirm in your wallet</h2>'),
    ('Backpack opened. Approve the connection there, then come back to Vanna.',
     "Your wallet shows Vanna's request to connect and sign in. Approve it there and you'll come straight back."),
    ('Backpack opened with ', 'Your wallet shows '),
    ('Nothing moves until you approve.', 'Nothing moves until you approve it there.'),
    ('Backpack took too long to answer, so the request expired.', "Your wallet didn't answer in time, so the request expired."),
    ('You declined the request in Backpack. Nothing was sent.', 'You declined in your wallet. Nothing was sent.'),
    ('Cancelled in Backpack', 'Declined in your wallet'),
    ('two approvals in Backpack', 'two approvals in your wallet'),
    ("Backpack didn't share your address. Nothing was connected.", "Your wallet didn't share your address. Nothing was connected."),
    ("Backpack didn&#39;t share your address. Nothing was connected.", "Your wallet didn&#39;t share your address. Nothing was connected."),
    ('Vanna supports Backpack today. More wallets are coming.',
     'Works with Seed Vault on Seeker, Phantom, Solflare, Backpack and any wallet that supports Mobile Wallet Adapter.'),
    ('Your keys never leave Backpack.', 'Your keys never leave your wallet.'),
    ('Get Backpack first', 'Get a Solana wallet first'),
    ("Backpack isn't on this phone yet. Install it, create or import a wallet, then come back.",
     "There's no Solana wallet on this phone yet. Get one from the Solana dApp Store or Google Play, then come back."),
    ('>Install Backpack<', '>Get a wallet<'),
    ('Connect a wallet</h2>', 'Connect your wallet</h2>'),
    ('Vanna connects through Solana Mobile Wallet Adapter. You approve everything in your wallet.',
     'Vanna uses Solana Mobile Wallet Adapter, so it works with the wallet already on your phone.'),
    ('</span> · Backpack</p>', '</span> · Signed in with Solana</p>'),
    ("cs: __o() === 'reject' ? 'declined' : 'rpc'", "cs: __o() === 'reject' ? 'declined' : 'done'"),   # no RPC step
]

SEEKER = ('<div class="vn-seeker" style="margin-top: 16px; width: 100%; padding: 12px; border-radius: 12px; background: {{ t.page }}; display: flex; gap: 10px; '
          'align-items: flex-start; text-align: left; font-size: 12px; line-height: 16px; color: {{ t.text2 }}"><span style="color: {{ t.link }}; display: flex; flex-shrink: 0">__ICON__</span>'
          '<span><span style="font-weight: 600; color: {{ t.text }}">On Solana Seeker,</span> double-tap the side button, then touch the fingerprint sensor.</span></div>')


def main():
    seeker = SEEKER.replace('__ICON__', icon('fingerprint', 'regular', 18))
    wallet_fill = mi.material('account_balance_wallet', 'fill')
    backpack_fill = set(mi.material('backpack', 'fill'))
    for f in sorted(glob.glob(os.path.join(SRC, 'tpl', '*.html')) + glob.glob(os.path.join(SRC, 'cls', '*.js'))):
        s = open(f, encoding='utf8').read(); before = s
        for old, new in COPY:
            if f.endswith('.js'):
                new = new.replace("n't", "n\\'t")      # these strings live inside single quotes in the logic files
            n = s.count(old)
            if n:
                s = s.replace(old, new); hits['copy: ' + old[:38]] = hits.get('copy: ' + old[:38], 0) + n
        if f.endswith('.html'):
            # primary approval button: "Open Backpack" -> wallet icon + "Approve in wallet"
            s, n = re.subn(r'(<button type="button" onClick="\{\{ \w+ \}\}" style="[^"]*?)">Open Backpack</button>',
                           lambda m: m.group(1) + '; display: flex; align-items: center; justify-content: center; gap: 8px">' + icon('account_balance_wallet', 'regular', 20) + 'Approve in wallet</button>', s)
            hits['button: Approve in wallet'] = hits.get('button: Approve in wallet', 0) + n
            # Seeker hint above it, once per approval sheet
            s, n = re.subn(r'(</p>\n)(<button type="button" onClick="\{\{ \w+ \}\}" style="margin-top: 24px[^>]*>(?:<svg[^>]*>.*?</svg>)?Approve in wallet</button>)',
                           lambda m: m.group(1) + seeker + '\n' + m.group(2), s, flags=re.S) if 'class="vn-seeker"' not in s else (s, 0)
            hits['seeker hint'] = hits.get('seeker hint', 0) + n
            # Connect: one MWA option instead of a Backpack row
            s, n = re.subn(r'<span style="font-size: 16px; line-height: 22px; font-weight: 600">Backpack</span><span style="font-size: 12px; line-height: 16px; color: \{\{ t\.text2 \}\}">\{\{ bpCap \}\}</span>',
                           '<span style="font-size: 16px; line-height: 22px; font-weight: 600">Use installed wallet</span>'
                           '<span style="font-size: 12px; line-height: 16px; color: {{ t.text2 }}">Seed Vault, Phantom, Solflare, Backpack and more</span>', s)
            hits['connect: use installed wallet'] = hits.get('connect: use installed wallet', 0) + n
            # Backpack-red wallet tiles -> Vanna violet wallet tile
            def tile(m):
                ds = tuple(re.findall(r' d="([^"]+)"', m.group(2)))
                if set(ds) != backpack_fill:
                    return m.group(0)
                hits['tile: backpack -> wallet'] = hits.get('tile: backpack -> wallet', 0) + 1
                return m.group(1).replace('background: #B33C3E', 'background: #703AE6') + ''.join('<path d="%s"></path>' % d for d in wallet_fill) + '</svg>'
            s = re.sub(r'(<span style="[^"]*background: #B33C3E[^"]*"><svg[^>]*>)(.*?)</svg>', tile, s, flags=re.S)
        if s != before:
            open(f, 'w', encoding='utf8').write(s)
    for k, v in hits.items():
        print('%4d  %s' % (v, k))


if __name__ == '__main__':
    main()
