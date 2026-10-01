# Session handoff: Vanna Android redesign (Current vs New)

Written 1 Oct 2026, at the end of a long Claude Code session. Read this whole file before touching anything; then read `compare/README.md` (how the tooling works) and `compare/src/changes.json` (what New changes, in order).

## 1. How to use this

The work is a **design prototype** of the Vanna Android app (Solana leveraged lending: lenders earn, traders borrow and trade, farmers do leveraged yield). It lives in a side-by-side comparison page: **left = Current** (the v7 design from GitHub, frozen, never edited) and **right = New** (our redesign, built from `compare/src/`). Every change is made to New only, logged in `changes.json`, checkpointed, and verified with screenshots before telling the user it is done.

## 2. Current state

- **Project folder:** `C:\Users\akgam\Downloads\vanna-v2-designs\vanna-v2-designs` (not a git repo).
- **Same content as** branch `feature/vanna-v2-designs` of private repo `vannafinance/vanna-solana-app`, cloned at `C:\Users\akgam\Downloads\vanna-v2-designs\vanna-solana-app` (identical except CRLF). Nothing has been committed or pushed. To clone again: the default `gh` account (Sudheesh02) cannot see the repo; use `GH_TOKEN=$(gh auth token --user AdityaVanna)` for that one command. Do not switch the user's default account.
- **Comparison page:** http://localhost:8790. Start it with the `compare` entry in `.claude/launch.json` (`python -m http.server 8790 --directory compare`), or open `compare/index.html` directly in Chrome.
- **Latest checkpoint:** `038 Final: tx motion, connect A, cleanup, history context, positions first`. New builds cleanly; every logic file parses; a simulated fresh checkout runs over http and file://.
- **Built 1 Oct 2026 (second session):** the Swiggy folder tabs and the minimal chooser (section 7). **Waiting on the user:** the "Explore vanna" replacement preview, `compare/previews/explore.html` (render `compare/renders/preview-explore.png`).

## 3. Read these first

- `compare/README.md`: controls of the comparison page and every tool command.
- `compare/src/changes.json`: the 10 changes on New so far, with reasons (also shown in the page's "Changes" drawer).
- `README.md` and `FLOWS.md` at the project root: the original v7 design notes (screens, flows, design decisions, health factor maths).
- `tokens/theme.json`: light and dark colour tokens.
- The user's devnet site https://devnet.solana.vanna.finance and docs https://docs.solana.vanna.finance (docs index: `/llms.txt`). The web app's nav is Portfolio · Earn · Swap · Perps · Farm (Farm lives at `/one-click`, "Leveraged Yield"). Portfolio has Lender (Lend / Spot) and Trader (Perps / Farm) tabs. There is **no margin-account page**: the Perps page is the trading screen.

### Skills the user set up (summarised for non-Claude agents)
All installed under `C:\Users\akgam\.claude\skills\`. The working method they encode:
- **vanna-mobile-design** (the user's own rulebook, in Claude's skill store): Plus Jakarta Sans 400/600; Vanna palette only (violet #703AE6, coral #FC5457, pink #FF007A, teal pos #1C7C83 / #32EEE2 dark, neg #B33C3E / #FC5457 dark); 8pt grid; one headline number per screen; health shown as dot + "1.69 · Safe", liquidation at 1.10, never a gradient bar; real token icons, never monograms; light and dark for every screen; touch targets ≥ 44–48dp; contrast ≥ 4.5:1. (Its "Capsule" nav and Phosphor-icon rules are **superseded** by decisions below.)
- **appllama-app-design-skill / appllama-usage**: study real apps before drawing; anti-slop (one accent, no glows or blobs, no emoji icons); full state cycles (empty, error, loading). Appllama is iOS-only, so **the user said to skip Appllama for this Android project**.
- **mobile-app-design** (Android guidelines, common mistakes, accessibility), **mobile-app-ui-design**, **cognitive-load**, **design-elevation**, **ui-craft / ui-craft-minimal**, **taste-skill**, **motion-animation**, **apple-design** (review lens), **ux-heuristics-review**, **cognitive-load-conversion**, **journey-mapping**: fewer things per screen, progressive disclosure, Material 3 conventions, motion only when it communicates, heuristic review of flows.
- **session-handoff**: this document's format.

## 4. Decisions, and why (with what was rejected)

1. **Android only, Material 3 grammar, Vanna brand.** The user said the earlier New "looked iOS". Converted: iOS segmented controls → M3 tabs (view switches) or segmented buttons (choices); pill chips → M3 chips (32dp, 8dp corners, tonal + check); Appearance → Android radio list; outlined text fields; ripple on every tap; snackbars at the bottom; glass circles behind header icons removed. Script: `tools/androidify.py`.
2. **Icons are Google Material Symbols (Rounded)**, user approved. Phosphor (required by the old vanna skill) was replaced everywhere (`tools/material_icons.py`, cached SVGs in `tools/material-cache/`). Outlined = inactive, filled = selected.
3. **The ← in the top bar is Android-correct** (Android's "Up button"; Back exits only from the start destination). The user first thought ← was iOS-only; it was explained with Android's navigation principles. Keep ← on detail screens; top-level screens have none.
4. **Edge-to-edge status bar is correct** (Android 15 enforces it): backgrounds draw behind the status bar, text and buttons stay below it. The user asked; no change made. A "solid status bar" toggle was offered, not built.
5. **Super-app structure (Swiggy-inspired, not copied):** top-level spaces **Portfolio (home) · Earn (lenders) · Trade (Perps + Swap) · Farm (leveraged yield)**. Portfolio is the start destination and keeps Overview / Lender / Trader tabs. Back from any space or tab → Portfolio; Back on Portfolio exits. Tapping the current bottom tab scrolls to top. Rejected: the old product-first hub (Home → tile → product → ← back), "17 destinations, 4 History pages". Rejected: 2 spaces (docs describe 3 journeys: Lender, Trader, Farmer). Rejected: removing Home entirely (the user rightly said the flow broke; Portfolio came back as home).
6. **Trade bottom bar:** Markets · Swap · Positions · History. No "Account" tab (devnet has no margin-account page). Swap uses Trade's colours.
7. **Bottom bar style is Swiggy-like:** selected tab = filled icon + bold label in the section colour (Vanna violet; lighter #BDA4F4 in dark; pink #FF007A for Farm), **no pill**. Applied by `tools/nav_and_logo.py` (`SUPER_APP_NAV = True`).
8. **First-launch chooser "What do you want to do?"** (V7Spaces): first-time users only (after Welcome → Explore first, or first wallet connect). Returning users open on Portfolio and never see it.
9. **Wallet = Solana Mobile Wallet Adapter (MWA)**, not Backpack. One "Use installed wallet" option (Seed Vault on Seeker, Phantom, Solflare, Backpack, any MWA wallet), "Get a wallet" fallback, **no custom-RPC step** (MWA passes the network). Approval sheets: "Confirm in your wallet" + "Approve in wallet" + Seeker hint (double-tap side button, then fingerprint). Tapping it opens a **new screen: the wallet's own approval sheet (mocked)** with Vanna identity, vanna.finance, Devnet, what is asked, fee, Reject / Approve, styled neutral dark because it belongs to the wallet. Scripts: `tools/mwa.py`, `tools/wallet_sheet.js`. Open question for engineers: on the devnet fork, can the app submit via its own RPC so users never set a custom RPC?
10. **Logo:** the user's `favicon.ico` traced to `assets/vanna-mark-2026.svg` (99.4% match). Used everywhere; on gradient headers it is **white**, in one lockup with the traced wordmark (no white circle).
11. **Welcome motion = the ORIGINAL v7 motion** with the new logo. A new "price line draws the logo" motion was built (`tools/welcome.py`) and the **user rejected it for now** ("keep the original, change later"). It is not applied; the script remains.
12. **Tablets and foldables:** from 600dp the bottom bar becomes a navigation rail, content sits in a centred 720dp column (840 on expanded), sheets ≤ 640dp centred, charts fill the column, Home tiles 4-up on expanded, landscape Welcome splits art | copy. Welcome/Connect fit any screen height (runtime fit). Phones unchanged.
13. **Screens' own UI stays.** The user wants evolution, not a redesign: "the current UI is good, make some changes, not fully change it". **Swap stays as it is.** **No custom number keypad** for now; add one only if the phone keyboard actually breaks the experience.
14. Each side of the comparison runs independently (no linked navigation). Per side there is only a **Welcome | App** switch. Toolbar: device picker (Android phones, foldables, tablets), Light / Dark / System, Gestures / 3-button, Reload, Changes. 3-button mode adds ◁ ○ □ and takes 48dp; Back also works by edge-swipe gesture and Esc on both sides.

## 5. What was tried and failed

- **Inline Python inside bash heredocs mangles backslashes and `%`.** `r'\1'` became a raw `\x01`, which **wiped the selected-tab markup on all 16 bottom bars** (the user saw "Overview" as a plain underlined link). `%` inside `'width: 100%'` broke `%`-formatting. **Write scripts with the Write/Edit tool, not heredocs**; use function replacements (`lambda m: m.group(1) + ...`) instead of backreference strings.
- **Apostrophes in copy broke 63 logic files.** New text like "didn't" was inserted into single-quoted JS strings in `src/cls/*.js`. `mwa.py` now escapes `n't` for `.js` files. **After any copy change, validate every logic file**: `node -e` loop that runs `new Function('Base', 'class Base0 {}; ' + code.replace('class Component extends DCLogic {','class Component extends Base {') + '\nreturn Component;')` over `compare/src/cls/*`.
- **A class named `.app` collided** with the prototype shell's `.app{position:fixed}`. Prefix all injected classes with `vn-`.
- **Placeholders in comments**: build replaced `__IC__` in a comment instead of the code. Replace the exact code token (`'var IC = __IC__'`).
- **The in-app browser pane is often hidden**, which pauses `requestAnimationFrame`, so the prototype does not re-render and screenshots time out or show stale frames. **Verify with headless Playwright instead** (`tools/shots.py`, or a small script). Also: `page.goto` to the same URL + hash does not reload; add a unique query param.
- First nav-bar conversion forgot the Swiggy toggle state; harmless now, toggle removed.
- The "Material bar / Swiggy bar" toggle on the page was removed once Swiggy was chosen (checkpoint 004 = before).

## 6. Corrections (where earlier work was wrong)

- I told the user the ← is iOS-like before correcting myself: it is Android's Up button and stays on detail screens.
- I removed Home when introducing spaces; the user caught that Portfolio/overview became unreachable. Fixed by making Portfolio the home space.
- Checkpoints **005–008 contain broken bottom-bar markup**; do not restore them. Use 009+.
- The earlier "small pill" space tabs were not what Swiggy does; the approved design is folder tabs (section 7).

## 7. In flight right now

**Done (checkpoint 019):**
1. **Folder tabs** on all 16 space screens. `spaces.py` now splits each space's hero `<section>` into `.vn-band` (dark band: status bar, header, tabs) and `.vn-panel` (the screen's old hero content, panel gradient). `folder_header()` is idempotent (re-runs only refresh). Tab shapes come from `tab_svg()`: fixed left/right paths (right one anchored with a nested `<svg x="100%">`) plus a middle `<rect>` sized by CSS `calc()`, so the shape is exact at any width (tablets checked). The selected tab is drawn 1px taller so it overlaps the panel and leaves no seam. Swap has no hero content, so it gets a 20px lip. Tablet CSS in `src/styles.css` keeps band and panel full-bleed. Tab taps and Back were verified headless (tap Earn/Trade/Farm/Portfolio, Back from Farm returns to Portfolio).
2. **Minimal chooser** (V7Spaces): rows, a violet outline icon (`t.link`), hairlines (`t.bd`), meta in `t.text2` (the preview's #8A8A96 failed 4.5:1).
3. Portfolio's bell lost its glass circle (`bellBg` in `src/cls/05-V7Home.js`: transparent when closed, 0.16 white while the panel is open).

**Shown to the user, waiting for a pick:** replacing Portfolio's "Explore vanna" tiles (`tools/preview_explore.py`). Section "Put your assets to work"; each row has a real token icon, a headline with one live number, one line of context and one tonal button: Earn 1.82% APY on TSLAx · Supply / Long TSLAx up to 5x · Trade / Farm 5.03% on Kamino · Deploy / Swap any token · Swap. Option **A** = rows in one card (recommended: calm, the hero keeps the only big number); option **B** = swipeable cards. Numbers were read from devnet on 1 Oct 2026 (Earn table, /perps TSLAx $356.03 with 5x, /one-click Kamino USDC 5.03%, USDC borrow 0.81%). If approved: replace the Explore `<h2>` + `.vn-tiles` grid in `src/tpl/02-V7Home.html` (via a script, not by hand), wire the buttons to V7EarnVault / V7Perps / V7Farm / V7Swap, and keep the tablet layout (rows can sit 2-up from 840dp).

**Later on 1 Oct 2026 (checkpoints 021-023):**
- **Space colours:** Earn = Vanna teal (band `#04181A→#0A2E31`, panel `#137A82→#0A464B`), Trade = indigo (band `#0B0C2A→#161A55`, panel `#3F3AD8→#231F86`), in `THEME` in `spaces.py`. Earn's bottom bar uses `{{ t.pos }}`; Trade's bar, buttons and links stay Vanna violet. Earn's hero net-earnings value is white (`valC` in `src/cls/35-V7Earn.js`). Options preview: `previews/space-colors.html`.
- **Logo rule (user):** never change the Vanna logo's colours. The mark is always the coral→violet gradient (`brand_mark()` in `spaces.py`, also `nav_and_logo.py`); only the wordmark is white on dark headers.
- **Charts:** the user wants real charts. `src/charts.js` (`vnLine`, `vnRateCurve`) draws at the real width, supports press-and-drag to read values with dates, and computes the interest-rate curve from Vanna's kink model (fitted: base 0, 10% at the 80% kink, lenders earn borrow × utilisation; slope above the kink unknown, 60% placeholder). Preview: `previews/charts.html` (A clean labels vs B value axis). **Wired into New (checkpoint 025, style B chosen by the user):** build.js injects `src/charts.js`; `src/runtime.js` mounts every `.vn-live[data-kind=earn|apy|rate]` and redraws when its data-* attributes change; `tools/live_charts.py` puts the placeholders in `15-V7Earn` (hero) and `16-V7EarnVault` (Analytics; its APY tiles were removed as duplicates).
- **Research board:** `previews/research.html` (`tools/research_board.py`), with real app screenshots. Explore recommendation: one ranked "next step" card (risk > idle assets > setup > new market) + "Your Vanna" rows with live state; Swap → quick action. Farm recommendation: Direction A, one panel (pool chip, amount, leverage preset chips default 2×, live APY + $/yr headline, one risk line, Details collapsed, Review bottom sheet); health = L/(L-1); exposure stays 1× (confirm with engineering).
- Old Explore preview (`preview_explore.py`, rows A / cards B) is superseded by the research recommendation.

## 8. Open questions needing the user

- Approve the "Explore vanna" replacement after seeing its preview.
- Explore-first (browse without a wallet; ask to connect only on the first real action, then continue that action) was agreed in principle and **not built yet**.
- Engineers: can the devnet fork avoid the custom RPC (submit via Vanna's own RPC)? Can the app detect a Seeker to show "Double-tap to approve"?
- Should the Swiggy-style text "Super-app" naming appear anywhere? (No decision; currently not used.)

## 9. How to work here (standing instructions)

- **Talk:** the user writes in Hinglish and short messages. Explain decisions in plain language with screenshots; they often send screenshots back. Show a preview before big visual changes when they ask for one.
- **Never change Current.** New only. Current is built from `compare/baseline/vanna-v7-prototype.html` (read-only).
- **Checkpoint before and after every change:** `node compare/tools/checkpoint.js save "<name>"`; restore with `restore N` (auto-saves first).
- **Log every design change** in `compare/src/changes.json` (`title`, `detail`, `date`, `screens`).
- **Motion work: always render a video and send it** in chat (`python compare/tools/render_motion.py [Screen] [seconds] [WxH]` → `compare/renders/`).
- **Verify visually** before claiming done: `python compare/tools/shots.py V7Home V7Swap [--dark] [--nav3] [--new-only] [--device 800x1280] --out name.png`, then look at the image. Check phone, tablet, dark and 3-button where relevant.
- **Inspiration, not copying** (Swiggy, Jupiter Mobile). Keep Vanna's style (violet gradients, Plus Jakarta, brand palette).
- **Research before recommending** (the user values sources): Android docs, Solana Mobile docs, the devnet site and docs.
- **Build loop:** edit `compare/src/` (or a tool script) → `node compare/tools/build.js` (or `--watch`) → the page reloads New automatically.

### Tool map (`compare/tools/`)
| File | What it does |
|---|---|
| `unpack.js` | baseline prototype → editable `src/` (`--force` resets New) |
| `build.js` | builds `current.html` + `new.html` (+ device chrome, bridge, back gesture, New-only CSS/JS, wallet sheet) |
| `checkpoint.js` | save / list / restore New |
| `androidify.py` | Material 3 component conversion |
| `material_icons.py` | Phosphor → Material Symbols (`material(name, weight)` fetches/caches icons) |
| `adaptive.py` | class hooks for tablets (`vn-main`, `vn-navbar`, `vn-sheet`, `vn-actions`, `vn-w-art/copy`, `vn-tiles`, `vn-chart`) |
| `nav_and_logo.py` | Swiggy-style bottom bar + white logo lockup on Home |
| `spaces.py` | space headers, top cards, Trade bottom bar, chooser (V7Spaces) |
| `mwa.py` + `wallet_sheet.js` | MWA copy/connect/approval + the mocked wallet screen |
| `device-back.js` | Android edge-swipe back + Esc (both sides) |
| `welcome.py` | the rejected new Welcome motion (kept, not applied) |
| `preview_tabs.py` | the folder-tab + chooser preview (now built) |
| `preview_explore.py` | the "Explore vanna" replacement preview (A rows, B cards) |
| `shots.py`, `render_motion.py` | screenshots and frame-exact motion videos |
`src/styles.css` (New-only CSS incl. tablet container queries) and `src/runtime.js` (ripple, Welcome fit, top-level navigation/back stack) are injected into New by `build.js`.

## 10. The immediate next action

**Done on 1 Oct 2026 (checkpoints 033-038), all approved by the user:**
- `tools/tx_motion.py`: connect design A (handshake sheet, always dark over Welcome; wallet auto-opens; dots travel / fill; Vanna seal; auto-continue via `data-auto-go`) and in-place transaction status on all 9 tx screens (wallet opens at once via hidden `data-wallet-auto` button + `tools/wallet_sheet.js`; card: Approve in Phantom -> Sent / Processed / Confirmed -> seal + the screen's next action; failed / cancelled states; "Step N of M" only when n > 1; snackbar hidden while the card shows). Theme tokens, so Light / Dark work.
- `tools/history_swap.py`: Trade > History has Perps | Swaps chips; History opens on Swaps from Swap and on Perps elsewhere; Swap success links to swap history; Swap text repeats fixed; inner Current|History tabs removed in Earn and Trade (Portfolio keeps them, like the web app).
- `tools/dedupe_audit.py`: the clear fixes from `AUDIT-DUPLICATES.md` (see its report in changes.json "Each fact once"). Skipped: the "First trade" snackbar (it lives in the baseline shell, shared with Current) and "From wallet" (Swap only).
- `tools/home_assets.py`: Portfolio shows Your positions before Your assets (assets first when no positions: developer note).

**User decisions to respect:** Portfolio stays informational and keeps Overview / Lender / Trader (no 3b for now, maybe later); Swap UI stays (only text repeats fixed; 1% setting fine); nothing repeated on any screen; logo never recoloured.

**Next (nothing pending from the user):** wait for new requests. The user pushes with the commands given in chat (copy compare/ + assets/vanna-mark-2026.* into vanna-solana-app/vanna-v2-designs/, branch `feature/vanna-v2-android-redesign`).
