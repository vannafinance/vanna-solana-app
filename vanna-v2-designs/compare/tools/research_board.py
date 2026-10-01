"""Research board (1 Oct 2026): what apps put under the balance (to replace "Explore vanna"), and how the best
products design leveraged-yield flows (to redesign Farm). Screenshots are hot-linked from public App Store listings
and product docs (Google Play pages could not be fetched); every URL was opened and checked by the research agents.

    python compare/tools/research_board.py   -> compare/previews/research.html + compare/renders/research-*.png
"""
import html, os

HERE = os.path.dirname(os.path.abspath(__file__))
CMP = os.path.dirname(HERE)

EXPLORE = [
    ('SpareCash', 'Closest to Vanna', 'Under the balance: "Perps · $16.83 available · tap to trade", then "$6.89 could be earning 4.7% · Earn", quick actions, a new-market card, holdings. Rows built from <b>your own balances</b>, one action each.',
     ['https://is1-ssl.mzstatic.com/image/thumb/PurpleSource221/v4/6e/c8/84/6ec88404-2f59-31d4-703c-f4b20d1ddb8e/01.png/320x480bb.jpg'], 'https://apps.apple.com/ca/app/sparecashfi/id6756531996'),
    ('Nexo', 'Lending app', 'Two tiles with <b>your state</b>: "Credit Hub · £170,991 available to borrow" and "Savings Hub · £23,879 interest earned", then a "Learn about the risks" line, then a watchlist.',
     ['https://is1-ssl.mzstatic.com/image/thumb/PurpleSource211/v4/9f/eb/da/9febda05-800a-f1cf-29de-62d74333806e/01.jpg/320x480bb.jpg'], 'https://apps.apple.com/gb/app/nexo-buy-bitcoin-crypto/id1455341917'),
    ('Cash App', 'Products with live state', '"Save &amp; invest": each product tile shows your progress (savings goal ring, Bitcoin sparkline). Products you have not used sit lower, under "Explore".',
     ['https://is1-ssl.mzstatic.com/image/thumb/PurpleSource211/v4/8f/e0/4b/8fe04bb7-c60f-b918-d9dc-0ebe60560f44/US_MoneyMove_iPhone6.5__01.png/320x480bb.jpg'], 'https://apps.apple.com/us/app/cash-app/id711923939'),
    ('Revolut', 'Widgets', 'Quick actions, recent and upcoming items ("Est. daily interest"), then small widgets: "Saved this month", "Earned this month". Revolut 10 lets people pick their widgets.',
     ['https://is1-ssl.mzstatic.com/image/thumb/PurpleSource221/v4/06/a0/62/06a06208-b26d-33a1-628b-819e6c343fd6/Screen_2_1242x2208.jpg/320x480bb.jpg'], 'https://apps.apple.com/gb/app/revolut/id932493382'),
    ('DeFi App', 'Points + actions', 'XP and multiplier chips at the top, Deposit / Refer / Withdraw, then holdings. Discovery (categories, all assets) lives on a separate Discover tab.',
     ['https://is1-ssl.mzstatic.com/image/thumb/PurpleSource221/v4/71/76/de/7176de65-3227-ba3d-b4c2-32c76b1e99be/1.png/320x480bb.jpg',
      'https://is1-ssl.mzstatic.com/image/thumb/PurpleSource221/v4/72/ee/b6/72eeb6d7-053b-6a8b-fd25-ae10c879a876/2.png/320x480bb.jpg'], 'https://defi.app'),
    ('Jupiter Mobile', 'Action grid + watchlist', 'Two rows of actions (Send, Deposit, Scan, Swap / Earn, Perps, Refer, More), a spend balance, then a watchlist and news. Earn and Perps are icons, not your state.',
     ['https://is1-ssl.mzstatic.com/image/thumb/PurpleSource211/v4/34/0e/b8/340eb82e-cf94-cde0-38d8-bfaf6b59bbe1/1.png/320x480bb.jpg'], 'https://apps.apple.com/us/app/jupiter-solana-swap-wallet/id6484069059'),
    ('Phantom', 'Only your stuff', 'Receive / Send / Swap / Buy, then your tokens, and since 2025 your perps positions too. Trending and discovery stay on a separate Explore tab.',
     ['https://is1-ssl.mzstatic.com/image/thumb/PurpleSource221/v4/78/94/ee/7894eea0-22c3-b7ff-bec5-68967b77cb98/5.5-1.jpg/392x696bb.jpg'], 'https://phantom.com/learn/blog/phantom-perps'),
    ('Coinbase', 'Grid + prices', 'An 8-icon grid, then a Prices / Watchlist list with sparklines. Earn on USDC is promoted, but the home grid is the same for everyone.',
     ['https://is1-ssl.mzstatic.com/image/thumb/PurpleSource221/v4/b0/54/bf/b054bfcf-f700-7192-ee01-f862c89e8957/da4bf06c-f8e4-40ee-9537-14146a8fe328_ASO-5.5_-SCREEN2.png/392x696bb.png'], 'https://apps.apple.com/us/app/coinbase-buy-bitcoin-ether/id886427730'),
    ('Kraken', 'Movers', 'Portfolio chart, then a switchable list: Watchlist / Most popular / Gainers. A separate Explore tab has "Hot" and "Trending".',
     ['https://is1-ssl.mzstatic.com/image/thumb/PurpleSource221/v4/97/e1/02/97e10272-d957-ff25-c761-6d8f7ce6979c/USA_App_Store_1242x2208_0.jpg/392x696bb.jpg'], 'https://apps.apple.com/us/app/kraken-buy-crypto-bitcoin/id1481947260'),
    ('Trust Wallet', 'Promo carousel', 'Actions, then a dismissible paged promo ("Earn up to 210 Trust Points daily"), then tokens.',
     ['https://is1-ssl.mzstatic.com/image/thumb/PurpleSource221/v4/08/21/cd/0821cd36-41dc-a3c3-4dbb-246ede9a9e73/3_APP_IPHONE_55_3.jpg/392x696bb.jpg'], 'https://apps.apple.com/us/app/trust-crypto-bitcoin-wallet/id1288339409'),
    ('Rainbow', 'Discover bento', 'Mixed tiles on Discover: network fee, a "Learn: protect your wallet" card, profile setup, an index. (Screenshots are old.)',
     ['https://is1-ssl.mzstatic.com/image/thumb/Purple116/v4/83/a1/18/83a11836-54bb-f64b-2683-163963b8cf64/3fa2cd96-a533-4d4e-ad25-26e77788d706_5.5inch-2.png/392x696bb.png'], 'https://apps.apple.com/us/app/rainbow-ethereum-wallet/id1457119021'),
    ('Monzo', 'Summary row', 'Hero card, then Activity topped by one summary line: "3 upcoming payments · in 3 days".',
     ['https://is1-ssl.mzstatic.com/image/thumb/PurpleSource221/v4/a8/c5/2a/a8c52af4-2000-ac92-b285-c8b4d2a4c67e/iOS_1242x2208_01.jpg/392x696bb.jpg'], 'https://apps.apple.com/gb/app/monzo-bank-mobile-banking/id1052238659'),
]

PATTERNS = [
    ('A', 'Your Vanna: one row per space, showing your state', 'Nexo, Cash App, Revolut',
     'Earn "$2,677 supplied · +$1.37 earned", Trade "2 positions · +$210", Farm "health 2.00 · 5.03% on Kamino". If you have not used a space, its row becomes a one-line pitch with a real number. Replaces the tiles without repeating the top tabs.', 'fit'),
    ('B', 'One "next step" card, ranked', 'SpareCash, Monzo, Trust',
     'Only the most useful thing right now: 1) a position close to liquidation (never dismissible), 2) idle money that could earn, 3) setup not finished, 4) a new market. Hidden when there is nothing to say.', 'fit'),
    ('C', 'Markets / movers list', 'Kraken, Coinbase, Jupiter',
     'Repeats the Trade tab, and "top movers" next to 5x leverage nudges impulsive trades. Only acceptable as "your assets" (the stocks behind your health).', 'weak'),
    ('D', 'Quick actions row', 'Coinbase, Jupiter, Phantom, Revolut',
     'Deposit / Withdraw / Swap / Add collateral. Useful, but still navigation: belongs in the header, not as the replacement.', 'part'),
    ('E', 'Rewards / referral strip', 'DeFi App, Trust, Jupiter', 'Only if Vanna runs points or referrals. Secondary and dismissible.', 'later'),
    ('F', 'Learn / risk card', 'Rainbow, Nexo', 'Good for leverage newcomers. Best as the new-user version of B, or a link on the Farm and Trade rows.', 'part'),
]

FARM = [
    ('Kamino Multiply', 'The venue Vanna uses', 'Strategy list, then one panel: amount + target leverage, with <b>Net APY as the headline</b>. One transaction. Manage: adjust leverage, collateral, debt, withdraw (full withdraw unwinds).',
     ['https://mintcdn.com/kamino-3d73a151/PLATQ08CVUwkaQvR/images/learn/multiply/select-vault.webp',
      'https://mintcdn.com/kamino-3d73a151/PLATQ08CVUwkaQvR/images/learn/multiply/review-vault.webp',
      'https://mintcdn.com/kamino-3d73a151/PLATQ08CVUwkaQvR/images/learn/multiply/manage-position.webp?fit=max&auto=format&n=PLATQ08CVUwkaQvR&q=85&s=0800492eb0a110a90c55e024b6da9f6c'],
     'https://kamino.com/docs/learn/multiply/opening-a-position.md'),
    ('Drift Amplify (now Velocity)', 'Outcome and risk kept apart', 'Pick a pair, then one panel: amount + "Amplify ratio", then two short blocks: <b>Position preview</b> and <b>Risk preview</b>, then confirm.',
     ['https://cdn.prod.website-files.com/6310e7dee49f08e5798eed50/680b6688d281e816d1bc71f3_image%20(5).png',
      'https://cdn.prod.website-files.com/6310e7dee49f08e5798eed50/680b6702ed70ee2ddab458f5_image%20(9).png'],
     'https://www.drift.trade/updates/introducing-amplify'),
    ('DeFi Saver', 'Live preview, details at confirm', 'One amount field, and the new safety ratio and liquidation price update before you act. Route, slippage and fees appear only in the confirm step.',
     ['https://blog.defisaver.com/content/images/2026/04/data-src-image-d002af30-6e1b-4e8f-a595-7f7589b09629.png',
      'https://blog.defisaver.com/content/images/2026/04/data-src-image-2863a0d8-6b0b-4735-b66d-92cda4327197.png'],
     'https://help.defisaver.com/features/boost-and-repay/use-case'),
    ('Summer.fi Multiply', 'Shut down after a July 2026 exploit', 'Collateral + one leverage slider labelled by meaning ("decrease risk / increase risk"), liquidation price and LTV live underneath, "current → after" values when adjusting.',
     ['https://substackcdn.com/image/fetch/$s_!9sZF!,w_1456,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F159885a0-f515-410d-8859-7c296a60d84c_2460x1742.png'],
     'https://beincrypto.com/summer-fi-shutdown-lazy-summer-exploit/'),
    ('Morpho vault', 'Money, not just %', 'Deposit input with simulated APY and <b>projected earnings in $ per month and per year</b>; details in tabs.',
     ['https://bmrusbsmlkbzfoehomle.supabase.co/storage/v1/object/public/media/media/defirate/31aa219e-20e6-4000-a574-01af0480029e/image-5.png'], 'https://defirate.com/reviews/morpho/'),
]
FARM_TEXT_ONLY = [
    ('Jupiter Lend Multiply', 'Header shows your net value and total PnL; each position has a <b>status showing how close it is to liquidation</b>. Manage: Multiply / Unwind / Collateral / Debt.'),
    ('Kraken xStocks Vaults (Sep 2026)', 'Closest competitor: deposit SPYx/QQQx/NVDAx, a curator borrows against it on Kamino, about 2% net. <b>No leverage choice at all.</b> Vanna\'s edge is letting people choose the boost, so that choice must feel just as simple.'),
    ('DeFi App', 'No leveraged yield. Leverage for perps is picked in a bottom sheet, not a form step; one shared progress modal; settings folded into the button label.'),
    ('Hyperliquid mobile', 'Leverage is a chip ("20x") that opens a sheet with a slider; the order preview shows margin and liquidation price.'),
    ('Pendle', 'Two modes on the same product: Simple (one fixed-APY tile) and Pro.'),
]

LEV = [('1.5×', '$500', '2.1%', '$21', '3.00', '−95%'), ('2×', '$1,000', '4.2%', '$42', '2.00', '−90%'), ('2.5×', '$1,500', '6.3%', '$63', '1.67', '−85%'),
       ('3×', '$2,000', '8.4%', '$84', '1.50', '−80%'), ('4×', '$3,000', '12.7%', '$127', '1.33', '−70%'), ('5×', '$4,000', '16.9%', '$169', '1.25', '−60%')]


def shots(urls, name):
    return ''.join('<a href="%s" target="_blank" rel="noopener"><img src="%s" alt="%s screenshot"></a>' % (html.escape(u), html.escape(u), name) for u in urls)


def app_card(name, tag, text, urls, src):
    return ('<article class="app"><div class="shots">%s</div><div class="meta"><div class="name">%s <span class="tag">%s</span></div><p>%s</p>'
            '<a class="src" href="%s" target="_blank" rel="noopener">Source</a></div></article>' % (shots(urls, name), name, tag, text, html.escape(src)))


def main():
    pat = ''.join('<div class="pat %s"><div class="pk">%s</div><div><div class="pt">%s</div><div class="pw">Seen in %s</div><p>%s</p></div></div>' % (cls, k, t, who, d)
                  for k, t, who, d, cls in PATTERNS)
    lev = ''.join('<tr><td>%s</td><td>%s</td><td><b>%s</b></td><td>%s</td><td><span class="dot %s"></span>%s</td><td>%s</td></tr>'
                  % (l, b, a, y, 'mod' if float(h) < 1.5 else 'safe', h + (' · Moderate' if float(h) < 1.5 else ' · Safe'), d) for l, b, a, y, h, d in LEV)
    page = '''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Vanna research board</title>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600&display=swap" rel="stylesheet">
<style>
:root{--page:#F7F7F7;--card:#FFFFFF;--text:#1F1F1F;--text2:#595959;--line:#ECEAF1;--violet:#703AE6;--teal:#1C7C83;--tv:#F1EBFD;--tvI:#5029A3}
*{box-sizing:border-box}body{margin:0;background:var(--page);color:var(--text);font-family:'Plus Jakarta Sans',system-ui,sans-serif;font-variant-numeric:tabular-nums;line-height:1.5}
main{max-width:1240px;margin:0 auto;padding:32px 16px 64px}
h1{font-size:32px;line-height:40px;margin:0;font-weight:600;letter-spacing:-.01em}
.lede{color:var(--text2);margin:8px 0 0;max-width:760px}
h2{font-size:24px;margin:48px 0 4px;font-weight:600}h2+p{color:var(--text2);margin:0 0 20px;max-width:820px}
h3{font-size:16px;margin:28px 0 12px;font-weight:600}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(360px,1fr));gap:16px}
.app{background:var(--card);border-radius:16px;box-shadow:0 1px 2px rgba(17,17,17,.04),0 8px 24px rgba(17,17,17,.05);overflow:hidden;display:flex;flex-direction:column}
.shots{display:flex;gap:8px;padding:12px;background:#EFEDF4;overflow-x:auto;min-height:280px;align-items:flex-start}
.shots img{height:280px;width:auto;border-radius:10px;display:block;background:#E2E0E8}
.meta{padding:14px 16px 16px}.meta p{margin:6px 0 8px;font-size:14px;color:var(--text2)}
.name{font-weight:600;font-size:16px}.tag{font-size:12px;font-weight:600;color:var(--tvI);background:var(--tv);padding:2px 8px;border-radius:8px;margin-left:6px;white-space:nowrap}
.src{font-size:13px;color:var(--violet);text-decoration:none}
.pats{display:grid;grid-template-columns:repeat(auto-fill,minmax(360px,1fr));gap:12px}
.pat{display:flex;gap:14px;background:var(--card);border-radius:16px;padding:16px;border:1px solid var(--line)}
.pk{flex-shrink:0;width:32px;height:32px;border-radius:50%;background:var(--tv);color:var(--tvI);font-weight:600;display:flex;align-items:center;justify-content:center}
.pat.fit{border-color:var(--teal)}.pat.fit .pk{background:#E3F4F5;color:#155F64}
.pat.weak{opacity:.72}
.pt{font-weight:600}.pw{font-size:12px;color:var(--text2)}.pat p{margin:6px 0 0;font-size:14px;color:var(--text2)}
.rec{margin-top:16px;background:linear-gradient(180deg,#5B2BC0,#3B1C82);color:#fff;border-radius:20px;padding:20px 24px}
.rec b{color:#fff}.rec .k{font-size:12px;font-weight:600;letter-spacing:.06em;opacity:.8}.rec p,.rec li{font-size:15px;color:rgba(255,255,255,.92)}.rec ol{margin:8px 0 0;padding-left:20px}
.rec.farm{background:linear-gradient(180deg,#E0006B,#9A0049)}
.notes{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px}
.note{background:var(--card);border-radius:16px;padding:14px 16px;border:1px solid var(--line);font-size:14px;color:var(--text2)}.note b{color:var(--text)}.note .name{color:var(--text);margin-bottom:4px}
.common{background:var(--card);border-radius:16px;padding:8px 20px;border:1px solid var(--line)}.common li{margin:10px 0;font-size:15px}
table{width:100%;border-collapse:collapse;background:var(--card);border-radius:16px;overflow:hidden;font-size:14px}
th,td{text-align:left;padding:10px 14px;border-bottom:1px solid var(--line)}th{font-size:12px;color:var(--text2);font-weight:600}
.dot{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:6px;vertical-align:middle}.dot.safe{background:#1C7C83}.dot.mod{background:#C77700}
.dirs{display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:12px}
.dir{background:var(--card);border-radius:16px;padding:16px 18px;border:1px solid var(--line)}.dir.best{border:2px solid #E0006B}
.dir .pt{font-size:16px}.dir ul{margin:8px 0 0;padding-left:18px;font-size:14px;color:var(--text2)}.dir li{margin:4px 0}
.small{font-size:13px;color:var(--text2)}
@media (max-width:600px){.grid,.pats,.dirs{grid-template-columns:1fr}.shots img{height:220px}h1{font-size:26px}}
</style></head><body><main>
<h1>Research: Explore and Farm</h1>
<p class="lede">What 12 finance and crypto apps put under the balance, and how 10 products design leveraged yield. Screenshots come from the public App Store listings and product docs (the Play Store pages could not be read by the tools). Tap any screenshot to open it full size.</p>

<h2>1 · What replaces "Explore vanna"</h2>
<p>Today's four tiles repeat the top tabs. The best apps use this space for <b>your</b> state and your next step, not for navigation.</p>
<div class="grid">''' + ''.join(app_card(*a) for a in EXPLORE) + '''</div>
<h3>Six patterns found</h3>
<div class="pats">''' + pat + '''</div>
<div class="rec"><div class="k">RECOMMENDATION</div>
<p><b>B + A: one "next step" card, then "Your Vanna" rows.</b> Closest to Nexo, Cash App and SpareCash.</p>
<ol><li><b>Next step</b> (only if there is something worth saying): risk first ("TSLAx long · health 1.25 · Add collateral"), then idle money ("1.25 TSLAx is idle · earn 1.82%, about $8/yr"), then setup, then a new market.</li>
<li><b>Your Vanna</b>: Earn, Trade, Farm rows with your live numbers; unused spaces show a one-line pitch with a real APY.</li>
<li>Swap becomes a quick action in the header; movers stay in Trade; rewards only if Vanna launches points.</li></ol>
<p>A new user sees: "Make your first deposit" + three pitch rows. Once they act, it becomes personal.</p></div>

<h2>2 · Farm without the step-by-step form</h2>
<p>Today Farm is a numbered form (pool → 1 deposit → 2 leverage → long table → profit). No strong product does it this way.</p>
<div class="grid">''' + ''.join(app_card(*a) for a in FARM) + '''</div>
<h3>Also checked</h3>
<div class="notes">''' + ''.join('<div class="note"><div class="name">%s</div>%s</div>' % (n, t) for n, t in FARM_TEXT_ONLY) + '''</div>
<h3>What every good one has in common</h3>
<ul class="common">
<li><b>No numbered steps.</b> Pick a strategy → one panel (amount + leverage, result updating live) → a confirm sheet.</li>
<li><b>One headline number:</b> net APY, also said in money ("≈ $63 a year").</li>
<li><b>Risk in one line</b>, not a table: health and the liquidation point.</li>
<li><b>Rates, route, slippage, fees only at confirm.</b></li>
<li><b>Leverage as preset chips</b> (or a chip that opens a slider sheet).</li>
<li><b>Managing reuses the same panel</b> with "now → after" values.</li></ul>
<h3>What leverage really means in Farm ($1,000 of TSLAx, Kamino 5.03%, borrow 0.81%)</h3>
<table><tr><th>Leverage</th><th>Borrow</th><th>Net APY</th><th>Per year</th><th>Health at open</th><th>Liquidates if TSLA falls</th></tr>''' + lev + '''</table>
<p class="small">Health = L ÷ (L − 1), which matches the app today (2.0x → 2.00). Your TSLA exposure stays 1× because the borrowed USDC goes to Kamino, not into more stock, so "5×" boosts the yield, not the stock bet. <b>Please confirm both with engineering.</b> The Safe / Moderate cut at 1.50 is a proposal.</p>
<h3>Three directions</h3>
<div class="dirs">
<div class="dir best"><div class="pt">A · One panel, one number (recommended)</div><ul>
<li>Pool as a chip at the top: "Kamino · USDC 5.03%"</li><li>Amount + TSLAx picker</li><li>Leverage chips 1.5× · 2× · 3× · 5× · Custom (default 2×), "Borrow 1,000 USDC → Kamino" under it</li>
<li>Headline: <b>4.2% APY · ≈ $42 a year</b>, live</li><li>Risk line: ● 2.00 · Safe · liquidates if TSLA falls 90%</li><li>"Details" collapsed; sticky "Review" → bottom sheet → sign</li></ul></div>
<div class="dir"><div class="pt">B · Presets first</div><ul><li>Three cards: Steady 1.5× · Balanced 2.5× · Boosted 5×, each with APY and health</li><li>Then just the amount, then the same review sheet</li><li>Easiest for newcomers; two screens; risks selling the 5× card</li></ul></div>
<div class="dir"><div class="pt">C · Strategy list as Farm home</div><ul><li>Your open farms on top (value, health, earned)</li><li>Then one row per stock / pool ("TSLAx → Kamino USDC · up to 16.9%")</li><li>Tap opens A's panel. Use once there are several pools</li></ul></div></div>
<div class="rec farm"><div class="k">RECOMMENDATION</div><p><b>Build A with B's preset chips; wrap it in C when more pools arrive.</b> The long table goes: deposit repeats the input, borrow and "supplied to Kamino" become one line under leverage, the two APYs move to Details and the review sheet ("5.03% − 0.81% = 4.22%"), pool size and utilisation only appear as a warning when the pool is above 90% used, and projected profit becomes the live headline.</p></div>
<p class="small" style="margin-top:28px">Research 1 Oct 2026. Note: Summer.fi shut down after an exploit (July 2026) and Drift became Velocity; their patterns still apply.</p>
</main></body></html>'''
    out = os.path.join(CMP, 'previews', 'research.html')
    open(out, 'w', encoding='utf8').write(page)
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
        b = p.chromium.launch(); pg = b.new_page(viewport={'width': 1280, 'height': 900})
        pg.goto('file:///' + out.replace('\\', '/'), wait_until='networkidle'); pg.wait_for_timeout(2500)
        broken = pg.evaluate("[...document.images].filter(i => !i.complete || !i.naturalWidth).map(i => i.src)")
        print('images:', pg.evaluate('document.images.length'), 'broken:', len(broken)); [print('  ', u[:110]) for u in broken]
        top = pg.evaluate("document.querySelectorAll('h2')[1].getBoundingClientRect().top + scrollY")
        pg.screenshot(path=os.path.join(CMP, 'renders', 'research-explore.png'), clip={'x': 0, 'y': 0, 'width': 1280, 'height': int(top) - 20}, full_page=True)
        h = pg.evaluate('document.body.scrollHeight')
        pg.screenshot(path=os.path.join(CMP, 'renders', 'research-farm.png'), clip={'x': 0, 'y': int(top) - 20, 'width': 1280, 'height': int(h - top + 20)}, full_page=True)
        b.close()
    print(out)


if __name__ == '__main__':
    main()
