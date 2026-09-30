# Vanna v2 designs (Android)

Native Android designs for Vanna on Solana, 412 × 915 dp, light and dark. This folder is the v7 design set from the Claude Design canvas: 108 screens across 9 flows, including the sad paths, plus a click-through prototype.

## Start here

- **Prototype:** open `prototype/vanna-v7-prototype.html` in any browser. It works offline and needs no install or server, because fonts and images are inside the file. It starts at the Welcome screen.
  - The side panel decides what Backpack does on the next approval (success or a failure). It can also make new traders create a margin account before their first order, simulate being offline, and jump to any screen.
  - Light and dark mode are set inside the app: tap the avatar, then **Appearance**.
- **All screens:** `screens/` has one PNG per screen (2×), grouped by flow. `flows/` has one overview image per flow.
- **Flow guide:** [`FLOWS.md`](FLOWS.md) lists every screen in order, with its board name and image.

## What is in here

| Folder | Contents |
|---|---|
| `prototype/` | The single-file prototype |
| `screens/` | Every screen as a PNG, by flow |
| `flows/` | One overview image per flow |
| `design-source/` | The Claude Design boards (`*.dc.html`) and the canvas layout (`canvas.json`, `boards.json`, `flows.json`) |
| `generator/` | The Python scripts that generate every board (see below) |
| `assets/` | The Vanna wordmark as SVG (traced from the official logo), the Vanna mark, token icons, and the Earn and Farm icons |
| `tokens/theme.json` | Light and dark colour tokens, product gradients, and health thresholds |

## On the canvas

The v7 page, "v7 · Clean, full flows", has one board per flow (`V7Flow1Start` … `V7Flow9Dark`), and each board shows every screen of its flow side by side. The canvas only keeps a limited number of boards loaded at once, so 108 separate boards on one page left most of them blank. Nine flow boards all load together.

The same screens also sit one per board on the page "v7 · Screens one by one (Play)". Play mode and the links between screens use those boards.

## Design decisions

- **Navigation:** each product has its own bottom tabs. Home has Overview, Lender and Trader. Perps has Markets, Positions and History. Swap has Swap and History. Earn has Vaults, Positions and History. Farm has Deploy, Position and History. The current tab sits on the product's gradient pill, and each product header has a back arrow to Home.
- **Icons:** Earn uses a hand holding coins, and Farm uses a sprout. In dark mode the product icons are white on a light glass circle, so they stay clearly visible.
- **Web parity:** only what devnet has, plus notifications.
  - Swap is wallet-only via Jupiter; Raydium is marked coming soon.
  - Earn pools have the web's Positions, Details, Activity, Collateral, Analytics and Managers tabs.
  - Farm deploys to the USDC or SOL Kamino pool with any xStock or PreStock as collateral. Closing a farm position takes two approvals.
- **Health factor** is gross collateral ÷ debt, with liquidation at 1.10.
  - Farm and Perps change it. Earn (lending) and Swap don't, so health alerts only appear for Farm and Perps.
  - A farm's health is leverage ÷ (leverage − 1), which gives 2.00 at 2x and 1.33 at 4x.
- **Wallet:** Backpack, through Solana Mobile Wallet Adapter. Connecting includes adding Vanna's RPC (`https://rpc-devnet.solana.vanna.finance`).
- **Sad paths:** every action has one.
  - Not enough balance disables the button and says why.
  - Failed transactions explain the cause (network error, price moved past slippage, no SOL for fees, or request expired) and offer a retry.
  - When a two-step close fails on step 2, the screen says what already happened and retries only that step.
  - Offline shows a banner on Home.
- **Type:** Plus Jakarta Sans 400/600. The word "vanna" uses the traced wordmark, not a font.
- **Sample data** mirrors devnet (prices, APYs, pool sizes). Every vault opens the USDC pool, and every farm card opens the GOOGLx position, as examples.

## Regenerating the boards

```bash
cd generator
npm install          # Phosphor icon paths
python3 build7.py    # rewrites design-source/*.dc.html and canvas.json
node validate.js ../design-source
```

The `.dc.html` files run in Claude Design, which provides `support.js` and the `/_blob/…` image assets. To view the designs outside Claude Design, use the prototype or the PNGs.

## Putting this on a feature branch

Nothing has been pushed. When you are ready:

```bash
git checkout -b v2-designs
mkdir -p designs && cp -r vanna-v2-designs designs/v2
git add designs/v2
git commit -m "Add v2 app designs, flows and prototype"
git push -u origin v2-designs
```
