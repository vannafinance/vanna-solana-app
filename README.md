# Vanna v2 · Android redesign (Current vs New)

This branch adds a **side-by-side comparison of the Vanna Android app**: on the left, **Current** (the v7 design from `feature/vanna-v2-designs`); on the right, **New** (the redesign), both running as clickable prototypes inside Android phone, foldable and tablet frames. Every change New makes is listed, with the reason, inside the page.

---

## Start in 2 minutes

You need **Git** and **Python 3** (or Node.js). Nothing to install: the built pages are committed.

> The repository is private. Clone it with a GitHub account that has access to `vannafinance`. If Git says *"Repository not found"*, you are signed in with an account that has no access.

### Windows (PowerShell)

Run these one by one (PowerShell 5 does not accept `&&` between commands):

```powershell
git clone https://github.com/vannafinance/vanna-solana-app.git
cd vanna-solana-app
git checkout feature/vanna-v2-android-redesign
cd vanna-v2-designs
python -m http.server 8790 --directory compare
```

### macOS / Linux

```bash
git clone https://github.com/vannafinance/vanna-solana-app.git && cd vanna-solana-app
git checkout feature/vanna-v2-android-redesign && cd vanna-v2-designs
python3 -m http.server 8790 --directory compare
```

Then open **http://localhost:8790** in Chrome or Edge.

- `python` not found on Windows? Use `py -m http.server 8790 --directory compare`, or with Node: `npx serve compare -l 8790`.
- No server at all? Double-click `vanna-v2-designs/compare/index.html` (works in Chrome and Edge).
- Port 8790 busy? Use any other port, e.g. `8791`, and open that instead.
- Already cloned? `git fetch` then `git checkout feature/vanna-v2-android-redesign`.

---

## How to compare

| Where | What it does |
|---|---|
| **Left phone** | **Current**: the design as it is on `feature/vanna-v2-designs` (never edited) |
| **Right phone** | **New**: the redesign on this branch |
| **Welcome \| App** (above each phone) | Restart that side from Welcome, or jump into the app. Each side runs on its own |
| **Device** | Android phones, foldables (folded and open) and tablets, portrait and landscape |
| **Light / Dark / System** | Theme for both apps |
| **Gestures / 3-button** | Android's two navigation modes. Back = swipe in from an edge, the ◁ key, or `Esc` |
| **Changes** | Every change New makes, with the reason. Tap a screen name to open it on both sides |
| **Open full size** | Opens one side alone in a new tab |

### A 5-minute walkthrough of New

1. **Welcome → Connect wallet.** The sheet grows from the button; tap *Open Phantom*. The wallet's own approval screen is mocked (the dark sheet); *Approve* connects, *Reject* shows the cancelled state.
2. **Portfolio.** Folder tabs Portfolio · Earn · Trade · Farm, each with its own colour; your positions, then your assets.
3. **Earn → a vault → Analytics.** Live charts: press and drag on a chart to read any day; drag along the interest-rate curve.
4. **Trade → a market → Long.** The first time, it asks you to create a margin account (one-time). Confirm: the wallet opens, then a status card on the same screen shows Sent → Processed → Confirmed and the Vanna seal. *History* has Perps and Swaps.
5. **Farm.** One panel: the header shows the result live; move the leverage slider; swipe the token chip left / right to switch assets.
6. Switch to **Dark** and to a **tablet** to see the same screens adapt.

The wallet is **Solana Mobile Wallet Adapter**: in the real app the installed wallet (Phantom, Solflare, Seed Vault on Seeker…) draws its own approval screen. Here it is mocked so every outcome can be tried.

---

## Previews (ideas and research)

Open these with the same server. Some were built into New, some are options for later.

| Page | What it is |
|---|---|
| [/previews/motion.html](http://localhost:8790/previews/motion.html) | Connect-wallet designs and transaction motion (A and the in-place status were built) |
| [/previews/ideas.html](http://localhost:8790/previews/ideas.html) | Ideas for Portfolio and Farm (Portfolio 3 and Farm 2 were built) |
| [/previews/charts.html](http://localhost:8790/previews/charts.html) | Live charts, label styles A and B (B was built) |
| [/previews/research.html](http://localhost:8790/previews/research.html) | Research board: what 12 finance apps show under the balance, and how 10 products design leveraged yield |
| [/previews/space-colors.html](http://localhost:8790/previews/space-colors.html) | Colour per space (proposal 1 was built) |

---

## What is where

All paths are inside `vanna-v2-designs/compare/`.

| Path | Contents |
|---|---|
| `index.html` | The comparison page |
| `current.html`, `new.html` | The two built prototypes (generated; do not edit by hand) |
| `baseline/` | Current: the untouched v7 prototype (read-only) |
| `src/` | New's source: `tpl/` markup, `cls/` logic, `styles.css`, `runtime.js`, `charts.js`, `changes.json` (the change log) |
| `tools/` | Build and design scripts (all safe to re-run) |
| `previews/` | The preview pages above |
| `README.md` | Controls and tools in detail |
| `SESSION-HANDOFF.md` | Every design decision, with the reason and what was rejected |
| `AUDIT-DUPLICATES.md` | The "each fact once per screen" audit |

The original v7 design notes (screens, flows, health-factor maths) are in [`vanna-v2-designs/README.md`](vanna-v2-designs/README.md) and [`FLOWS.md`](vanna-v2-designs/FLOWS.md).

---

## Changing the New side

Needs **Node 18+** (no npm packages). From `vanna-v2-designs/`:

```bash
node compare/tools/build.js --watch
```

Edit files in `compare/src/`; every save rebuilds `new.html` and the page reloads the New side on the same screen.

- Never edit `compare/baseline/` (that is Current).
- Log each design change in `compare/src/changes.json`; it shows up in the **Changes** drawer.
- The Python tools in `compare/tools/` need only Python 3. `shots.py` (screenshots) and the preview renderers also need Playwright: `pip install playwright` then `python -m playwright install chromium`.
- House rules for New: each number appears once per screen; the Vanna mark always keeps its coral → violet gradient; Material 3 components; light and dark for every screen.

---

## Notes for the app engineers

- **Wallet trust:** pass Vanna's domain in the Mobile Wallet Adapter `identity.uri` and host `/.well-known/assetlinks.json` (Play signing certificate SHA-256), or Phantom warns *"This app's identity could not be verified"*.
- **Returning users** should never see the connect sheet: reuse the saved auth token.
- **Show success on `confirmed`**, not `finalized`; real steps (Sent → Processed → Confirmed), no fake progress bars.
- **Health factor and liquidation price** come from the backend; the prototype shows example values.
- Numbers in the prototype are devnet values from 1 Oct 2026 and example wallet balances.
