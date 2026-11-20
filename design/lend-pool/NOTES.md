# Lend pool detail: design notes (round 3)

Prototype: `design/lend-pool/index.html`. Start it with `powershell -ExecutionPolicy Bypass -File design/lend-pool/start-server.ps1`, which runs the server hidden and prints the URL, normally http://localhost:4190/ (the port is written to `.port`). Dark only, phone at 360 or 412 px.

Outside the phone (not part of the design): pool switcher (SOL, USDC, USDT, SKR: every pool in `RESERVES` / `POOLS_BY`), phone width, Empty position / With position, "Jump to" chips, and "Mark changes" (a lilac dashed outline on what changed).

Screen: `src/app/(tabs)/lend/vault/[sym].tsx`. Helpers: `src/screens/earn/model.ts`. Pool reads: `src/chain/solana/pools.ts`. Risk and oracle: `src/chain/solana/risk.ts` and `actions.ts`.
Website reference: `apps/solana/components/earn/v3/earn-pool-tabs.tsx`, `earn-format.ts` and `lib/solana/math.ts`. The prototype uses the same formulas and number formats.

Spacing everywhere: a 12 px gap between cards and blocks (the tab content is a column with `gap: 12`), 16 px padding inside cards, and block titles 8 px above their card. Nothing touches or overlaps at 360 or 412 px; this is checked.

---

## 0. Unchanged

- Header card (logo, symbol, Supply APY, Total supply, Available), except the Utilization format (change 1).
- The tab row (`PillTabs`): it scrolls sideways, the fifth tab is cut with the arrow on the right, and the selected tab scrolls into view, leaving room for the arrow.
- Withdraw / Supply footer. Withdraw only shows with a position.
- Collateral tab. It is shown with the four pool tokens' real asset configs; the app lists every token from `collList`.

Touch targets: tab chips stay 36 px tall on screen with a 48 px tap area; the tab arrow, share, copy, explorer, expand and X buttons are 40 px or smaller on screen with 48 px tap areas. In RN, use `hitSlop` or a 48 px Pressable around the visual.

## 1. Utilization, two decimals

Before: `pct(p.util, 1)` → **1.0%**. After: `pct(p.util, 2)` → **1.04%** (website). Data: existing `Pool.util`.

## 2. Position tab

**With a position:**
- The big dollar value and the share button stay.
- Below them is ONE stat row: **Supplied** / **Shares** / **Interest earned**. Each value is number plus unit on one line (`1.00 SOL`, `1.00 vSOL`, `0 SOL`), and the interest has its dollar value under it (`$0.00`).
- Number format is the website's `fT`. Interest earned is plain white with no "+".
- The row sits on the card under a hairline, not in a nested box. Values that do not fit shrink together: RN `numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.82}`. Only USDC and USDT at 360 px shrink (13.5 and 13 px).
- Data: `balTok(LendPos)`, `LendPos.shares`, `LendPos.earned` (`earnedUnknown` still shows "—"), `PX[sym]`. All exist.

**Empty (no position yet), redesigned:**
- One calm card: the app's chameleon in the earn colours, awake (the app's `EmptyCard` uses the sleeping one).
- Title **No position yet**.
- One line built from the pool's real supply APY, with the rate in teal:
  - APY above 0: "Supply USDC to earn **1.91%** a year, added every second."
  - APY between 0 and 0.01% (SOL today, 0.00034%): "Supply SOL to earn **under 0.01%** a year, added every second." This avoids promising "0.00%".
  - APY exactly 0, because nothing is borrowed (SKR today): "Supply SKR to earn interest once margin accounts borrow it. Today's rate is **0.00%**."
- A 48 px primary **Supply <SYM>** button in the card, in the earn gradient. The footer Supply button stays too (owner allowed both); if that reads as duplicated, the card button is the one to drop.
- Data: `Pool.supA` (existing).

## 3. Details tab (round 3 structure)

Order: **Statistics → Oracle → Limits → Contracts**. Oracle, Limits and Contracts are the app's own block names and row style (title text above a card; rows with the label on the left and the value on the right, 48 px or more, 1 px dividers), with updated values. **No info icons and no tooltips anywhere in Details.** Labels are short and plain.

**Statistics** (new block, above Oracle). One card:
- Top: two ring gauges **side by side**. Each column is centred: a 72 px ring with the percentage inside, then the label, amount, dollar value and a legend line with a coloured dot.
  - Total supplied: `18.82K SOL`, `$1.36M`, ring = available share (`100 − utilization`, **98.96%**), legend "98.96% available".
  - Total borrowed: `194.89 SOL`, `$14.10K`, ring = utilization (**1.04%**), legend "1.04% borrowed".
- Below, after a divider, the figures in the same card:

| Label | SOL value | Sub line | Source |
|---|---|---|---|
| Available liquidity | 18.62K SOL | $1.35M | Reserve liquidity − fees (**new field**; the app has `sup − bor`, which agrees to 0.01) |
| Supply APY | 0.00% | 18.82K SOL (website wording) | `Pool.supA`, `Pool.sup` |
| Borrow APY | 0.04% | – | `Pool.borA` |
| Utilization | 1.04% | – | `Pool.util` |
| Liquidation bonus | 5.00% | Liquidatable at HF 1.10 or below | `ASSET_RISK[sym].liqBonus` |
| Reserve factor | 10.00% | – | `Pool.rf` |
| Status | Active | – | `Pool.status` |
| Rate curve | ×3.5 | linear 0.01 · jump 0.3 | `Pool.curve` |

**Oracle** (app block): **Price** `$72.37` (`PX`), **Source** `Kamino Scope, Pyth fallback` (the app's own `oracleLabel` wording; SKR: `Pyth`), **Max price age** `120s` (`maxAgeSecs`).

**Limits** (app block, updated):
- **Exchange rate**: `1.000000553` with "SOL per vSOL" under it (9 decimals, website `fXr`; this was "1 vSOL is worth 1.000001 SOL"). Data: `Pool.rate`.
- **Supply cap** and **Borrow cap**: `Uncapped` (was "No cap"). A capped pool shows "N SYM" with "x% used" under it.

**Contracts** (app block, now the website's address list):
- Each row has the label, the short address under it in monospace (website `shortAddr`, 6…6), then **Copy** (full address; toast "Address copied") and **Open in explorer** (website link `https://explorer.solana.com/address/<a>?cluster=custom&customUrl=<fork RPC>`).
- Rows: `v<SYM> Share Mint`, `<SYM> Reserve`, `Liquidity Vault`, `Asset Config`, `Scope Prices`, `Pyth Fallback Feed`, `<SYM> Mint`, `Vanna Lending Program`.
- The label sits above the address because label, address and two 48 px icons do not fit on one line at 360 px.
- Data: `shareMintOf(mint)` (existing), `RESERVES[sym].reserve` / `.mint` (existing), Liquidity Vault = Reserve offset 72 (**new**, IDL `liquidity_vault`), `assetConfigPda` (existing), `oracle.scopePrices` / `oracle.pythPrice` (decoded already, **new to display**), `VANNA_PROGRAM_ID`.

| Label | SOL | USDC | USDT | SKR |
|---|---|---|---|---|
| v<SYM> Share Mint | `EK9uA9…yGu7Jy` | `Fj992j…UgERZ8` | `8aCbzJ…13eT6F` | `3z5FdQ…eTD1ag` |
| <SYM> Reserve | `qKe68D…ePvEZK` | `A4x4ZZ…TXTY4t` | `EkSogU…hXuk2X` | `8YMfc1…SZacLu` |
| Liquidity Vault | `37K8ag…UR1rjX` | `CVrvxz…LA5VuR` | `GRRhzA…C7QTDu` | `9er2bC…2YorAF` |
| Asset Config | `EWWMd3…EwjMXa` | `2AbzAu…yHM4eS` | `HC5R9h…8u2xvv` | `BVCzBU…rbV3dd` |
| Scope Prices | `3t4JZc…eBchNH` | `3t4JZc…eBchNH` | `3t4JZc…eBchNH` | *(row hidden)* |
| Pyth Fallback Feed / **Pyth Feed** (SKR) | `7UVimf…1pjLiE` | `Dpw1EA…QCeFbX` | `HT2PLQ…k5oYuM` | `AFrJWh…Y5Vbj5` |
| <SYM> Mint | `So1111…111112` | `EPjFWd…yTDt1v` | `Es9vMF…enwNYB` | `SKRbvo…PGZhW3` |
| Vanna Lending Program | `H37YVB…2QJcGC` | same | same | same |

Removed: Max LTV. Not added: a liquidation threshold.

## 4. Activity tab (approved)

- Each row has: a **Type** badge (Supply teal, Withdraw grey) and a **Status** badge (**Success** teal with a dot, **Failed** red with a dot); **Date** `10/30/2026 · 8:30:53 PM`; **Amount** `1 SOL` with the token logo and the dollar value under it; and a full-width 48 px link row **Tx hash** `2wUnjSjD…G7bt` that opens the explorer. All visible without expanding.
- Heading "Your transactions" with the count. Under the list: "View all on Solana Explorer".
- Empty: the sleeping chameleon with "No transactions yet".
- Present for all four pools, with sample rows that include one Failed row each for SOL, USDC and SKR, and a single Success row for USDT.
- **Failed status needs new data:** a per-transaction success flag (`ok`, from `meta.err`) from the history reader (`src/chain/solana/history.ts`). Today the reader returns no failed Earn transactions, and the website hardcodes "Success". The owner decides separately whether to build it.
- The dollar value uses the current price, as on the website. Pool composition and the USDC Predict markets block are left out (owner's decision).

## 5. Analytics tab (was Rates), cleaner

Above the chart there are only:
1. the **Deposit APY / Borrow APY** dropdown and the **expand** button;
2. the **big current value** (`Pool.supA` / `Pool.borA`);
3. one line, **"At 1.04% utilization"**.

Removed: the "Rate curve: …" sentence, the timestamp, and the at-rest chip "0.04% now, at 1.04% utilization". The current utilization is now a dashed coral marker with a dot and a small **"Now"** label on the chart.

- **Chart:** 201 points, 0 to 100 % utilization, the website's exact bigint maths (`annualBorrowRate` / `annualSupplyRate`) on each pool's own WAD coefficients and reserve factor. Y axis on the right in 4 steps, X axis 0% 33% 67% 100%. Deposit is drawn in teal, Borrow in lilac.
- **Drag:** touch and drag sideways (vertical drags still scroll the page). A crosshair and dot follow the finger, and a chip shows only while dragging ("2.02% at 80.0% utilization"). Hint under the chart: "Drag to read any utilization". RN: `Gesture.Pan()` with `activeOffsetX`.
- **Full screen:** the expand button opens the same header (dropdown kept), a larger chart with the same drag, a legend, and an **X**. Android Back and Esc close it; Back closes the dropdown first.
- **Bug fixed: tapping the dropdown sent the page to the top.** The cause was that the re-render restored the scroll before the chart had its height, so the browser clamped it to the shorter page. The scroll is now restored after the chart is laid out. Checked: the scroll position stays the same after opening the dropdown, picking an option, opening and closing it, opening full screen and closing it with X, and closing it with Back.
- **For the app build:** do not re-mount the screen or the chart card to open the menu; render the menu as an overlay, and open full screen as a modal over the screen without unmounting the ScrollView.
- **Each pool uses its own curve** (checked against an independent evaluation of each pool's parameters at 50 / 90 / 99 %):
  - SOL, USDC and USDT have the **same on-chain parameters** (×3.5, linear 0.01, jump 0.3, reserve factor 10%), so their curves have the same shape (borrow 3.39% at 90%, top of axis 120%). Only the Now marker and the current value differ (1.04%, 77.95%, 63.98%).
  - SKR has its own curve (×5, linear 0.02, jump 0.5, RF 15%): borrow 9.64% at 90%, top of axis 300%, Now marker at 0%.
- Data: `Pool.curve`, `Pool.rf` (existing). For the app, keep the raw WAD coefficients on `Pool` (**new**: `curveWad`) and use the bigint maths from pools.ts instead of the float `rateCurve()`, so values match the website to the last digit.

## SKR choices (where the website does not cover it)

- Only one price feed: labelled **Pyth Feed** (not "Pyth Fallback Feed"); Oracle Source reads **Pyth**.
- No Scope: the Scope Prices row is **hidden**, so Contracts lists 7 rows.
- Utilization 0%: the rings show 100.00% available and 0.00% borrowed (the ring text is 11.5 px so "100.00%" fits). The Analytics Now marker sits at 0 with its label left-aligned.
- Supply APY 0: the empty-state line explains it will earn once margin accounts borrow it, instead of promising "0.00% a year".
- Price $0.0102 (4 decimals under $1, website rule); dollar values like `$2.56K` follow from it.

## Real figures used (read-only snapshot, refreshed for round 3)

Read on **2026-11-20 11:06:46 UTC** (fork clock 1795220961) from `https://rpc-devnet.solana.vanna.finance`, using only `getMultipleAccounts`: the Clock, the PriceBook, 4 Reserves, 4 share mints, 4 AssetConfigs and 4 Pyth feeds. Nothing was sent or signed. Interest is projected to the fork clock. The data is embedded in `pools-data.js` with `readAt`. All four pools were read; **no fallback parameters**.

| Pool | Util | Supply APY | Borrow APY | Total supplied | Total borrowed | Available | Exchange rate | RF | Curve (×, linear, jump) | Bonus | Source | Price | Max age |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| SOL | 1.04% | 0.00% | 0.04% | 18.82K | 194.89 | 18.62K | 1.000000553 | 10% | 3.5, 0.01, 0.3 | 5% | Kamino Scope, Pyth fallback | $72.37 | 120s |
| USDC | 77.95% | 1.91% | 2.73% | 164.69K | 128.40K | 36.29K | 1.003180177 | 10% | 3.5, 0.01, 0.3 | 5% | Kamino Scope, Pyth fallback | $0.9996 | 180s |
| USDT | 63.98% | 1.29% | 2.24% | 44.14K | 28.25K | 15.90K | 1.001846799 | 10% | 3.5, 0.01, 0.3 | 5% | Kamino Scope, Pyth fallback | $0.9988 | 300s |
| SKR | 0.00% | 0.00% | 0.00% | 251.40K | 0.00 | 251.40K | 1.000000004 | 15% | 5, 0.02, 0.5 | 5% | Pyth | $0.0102 | 180s |

All caps are Uncapped and every status is Active. The SOL figures match the owner's website screenshot; the price differs only because it was read at a different moment.

**Sample (not on chain):** the position (SOL 1 vSOL with 0 earned; USDC 1,996 vUSDC with 2.35 earned; USDT 119.9 vUSDT with 0.12 earned; SKR 5,000 vSKR with 0.00002 earned) and every activity row (dates, amounts, hashes).

## Decisions taken (owner)

1. Statistics rings sit side by side, with the figures in the same block, above Oracle.
2. The app's Oracle, Limits and Contracts blocks are kept, with updated values; Contracts carries the website's 8 addresses with copy and explorer.
3. No info icons or tooltips in Details; short labels ("Exchange rate", "Utilization").
4. Supply APY sub line uses the website's wording ("18.82K SOL").
5. An unused address (SKR Scope Prices) is hidden. SKR's feed is labelled "Pyth Feed".
6. Pool composition and the USDC Predict markets block are left out.
7. The Deposit / Borrow dropdown stays in full screen.
8. Interest earned is plain white with no "+".
9. Success and Failed badges are designed; Failed needs the history reader's new success flag (owner decides).

## Could not verify

- That the history reader can return failed Earn transactions cheaply (needs `meta.err` per signature).
- Collateral tab: only the four pool tokens were read.
- The feel on a real phone (fonts, RN gesture). Layout was checked in headless Chrome at 360 and 412 px for every pool, tab and state.

## Open question

- Empty position: keep both the in-card "Supply SOL" button and the footer Supply, or drop the in-card one?
