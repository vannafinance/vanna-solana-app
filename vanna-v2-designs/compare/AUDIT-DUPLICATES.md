# Duplicate audit of New (1 Oct 2026)

Every New screen except Farm (just rebuilt), checked for anything shown twice. Screenshots and text dumps: `compare/renders/audit/`. Nothing here is applied yet unless marked **done**.

Legend: **CD** clear duplicate · **PO** partial overlap · **RS** shortcut that repeats existing navigation.

## Needs the user's decision
1. **Whole screens repeated across spaces.** Portfolio › Lender is the same as Earn › Positions and Earn › History. Portfolio › Trader is Trade › Positions plus the farm card. Options:
   - A. Portfolio keeps only Overview (assets, positions summary) and its rows open the spaces; the Lender / Trader bottom bar goes.
   - B. Keep Portfolio's tabs and remove the spaces' own Positions / History.
2. **Swap screens** (the user said "Swap stays as it is"): "≈ $249.98" under both amounts, "· Wallet" on both, "Not enough USDC" said twice, Swap settings shows 1.0% as a chip and again in the custom field, Swap history says "last 30 days" twice.
3. **Wallet sheets** (MWA design): "Step 1 of 1" on single-step flows; the button already says "approve in wallet" and the sheet says it again.

## Clear fixes (no new decisions)
- **Inner "Current | History" tabs** repeat the bottom bar "Positions | History" (Trade and Earn positions / history and all their states). Remove the inner tabs.
- **History heroes:** "Closed PnL +$30.19" in the hero and "Realized PnL +$30.19" in the card; "Closed 3" equals the tab count (Trade › History, Portfolio › Trader › History). Keep the hero; the card keeps only Win rate.
- **Vault cards** (Earn › Positions, Portfolio › Lender): APY twice ("earning 0.03% APY" and "Supply APY 0.03%"); supplied amount twice ("2,500 USDC" and "Supplied 2,500 USDC"); hero "Supplied 2 assets" equals "Current 2".
- **Vault screen** (hero stays visible over its tabs): Supply APY 0.03% shown 5 times; $55.0K, $52.2K, 5.2% 3 times each. Details keeps only what the hero does not show; the Positions tab card loses its title and duplicate rows; the Managers tab (interest model and oracle, both shown elsewhere) folds into Details; the Analytics label becomes "Average"; identical "Collateral / Borrow" chips on every Collateral row go.
- **Error states say it three times** (order no funds, supply no funds, withdraw over): keep the red amount + the button, drop the inline sentence.
- **Order form:** "3x · $1,500.00 position" repeats the chip and the Position size row; the market row price repeats Entry price.
- **Margin account gate:** "account needed" in the band, the card and a snackbar; the done screen shows the success twice under a stale "needed" band; "Review and sign agreement" + "Please review the terms" say the same.
- **Shortcuts that repeat tabs:** "Open a new position", "Supply to another vault" (twice), Lender › Spot "Swap" button, Markets hero row "2 open positions ›".
- **Profile:** 1.10 written four times in the health card; $10,592.29 twice.
- **Connect:** the wallet list (Seed Vault, Phantom, Solflare, Backpack) and Mobile Wallet Adapter each said twice.
- **Earn list:** "APY" under every value although the column says Supply APY; "Sorted by supply APY" right above that column.
- **Labels repeated on every row:** "Wallet", "From wallet", "Confirmed", per-row "APY".
- **Portfolio hero:** "Net available" equals margin account minus total borrowed (both shown); could become account health instead.
- **Your assets USDC row:** "Stablecoin" and "Pegged to $1" said the same thing. **Done** (checkpoint 030).

## Not duplicates, but found on the way
- Lender › Spot shows USDC $3,120.33 / SOL $249.02 while Portfolio shows $3,120.40 / $248.95.
- V7HomeNotif passes `open: true` but the logic reads `notificationsOpen`, so the panel does not open on that screen.
- V7ConnectRpc / RpcFail still describe the old Backpack custom-RPC step that MWA removed.
- Portfolio › Trader's "+$210.23" leaves out the farm's +$1.47 although the farm card is in the list.
