# Stop only at stage boundaries (v4.1)

The prototype is at http://localhost:4174/multi-leg.html.

**Why.** A transaction that has been sent cannot be recalled. Once the first legs are broadcast, the window to stop them is a few seconds, so a Stop that pretends to pause them doesn't help. The real app can stop at one point only: a **stage boundary**, where legs are held back until the previous stage has landed. Those legs are signed but not sent; they can be dropped.

- **Stop is offered only when at least one leg is held back by an earlier stage:**
  - Flash repay, between its stages
  - Perps open, between Convert USDC and the order
  - Margin first time, between steps
  - Borrow then swap
- **No Stop button, and no empty space,** when everything left is already in flight: Close all (every close is sent at once and the USDC return follows on its own), close + return, the last stage of any flow, and single-leg sheets.
- **While the current stage is in flight,** the held-back rows read "Waiting".
  - Confirm: **"Stop here?"** / "Steps already sent will finish. The remaining N steps will not be sent." with **Stop** and **Keep going**.
  - N counts only the held-back legs.
- **After Stop:**
  - The header shows **"Stopping after this step…"** / "Steps already sent will finish. Nothing else will be sent."
  - The held-back rows turn to "Not sent" at once.
  - When the current stage lands, the partial result appears with **Continue** (a fresh approval for the remaining legs) and Done.
- **The mock panel:** "Press Stop" is disabled in Close all, with the hint "No Stop here: every close is sent at once and the USDC return follows on its own." It is enabled between stages in Flash repay, with the hint "Stop is available: N steps are held back until this stage lands."
- **App contract** (replaces the v4 Stop handle): `sendSolanaBatch` checks the stop signal **only before starting a new stage**. Parts of the current stage are never interrupted. Every held-back part reports `onLeg(i, "skipped")` and its signed copy is discarded. Continue = `resumeBatch(batch, { only: remaining })`.

---
# Multi-leg transaction sheet: Cancel and Stop (v4)

The prototype is at http://localhost:4174/multi-leg.html. It is design only: nothing is wired into the app yet. Everything from v3 below still applies.

Today the only controls during a run are the X (it hides the sheet while the run continues in the background) and rejecting inside Phantom. v4 adds two calm, secondary text buttons. Each takes no height when absent. Neither is ever red.

## 1 · Cancel: while "Waiting for your wallet"

- A **Cancel** text button sits right under the status line, only while the wallet has not answered. This applies to every scenario, including single-transaction sheets.
- Result: **"Cancelled" / "Nothing was sent."** with **Try again** and **Close**.
  - The rows read "Not sent".
  - The mascot is calm (flat mouth, no shake, no pink badge).
- The mock wallet shows the request struck through, with **"Request cancelled by the app"**. Approve, Reject and Time out are disabled.
- **The X behaves as Cancel while the wallet is waiting** (same copy, the sheet stays on "Cancelled"). Reason, for the notes only: if the sheet just closed while the request still sat in Phantom, the user could approve it later and run a transaction they believe is cancelled.
- **Cancel during a later approval** (the second approval in "one approval per stage", or a retry's approval) cancels only that request. What already landed stays, and the sheet shows the stopped result below.

## 2 · Stop: after the wallet approved, while legs are being sent

- A **Stop** text button sits in the footer, below the leg rows. It is shown only when the sheet has 2+ legs and at least one leg has not been sent yet. It never appears on single-leg sheets.
- Tapping it opens an inline confirm in the footer:
  - Title: **"Stop here?"**
  - Body: "Steps already sent cannot be undone. The remaining N steps will not be sent."
  - If something is in flight, the body adds "Steps already sent will still finish." (Close all says "Closes already sent will still finish.")
  - Buttons: **Stop** (outline) and **Keep going** (primary).
- **What Stop does:**
  - Legs already in flight (Sending, Confirming, Still confirming) finish.
  - Legs not yet sent (Waiting to sign, Waiting, Needs approval, Checking) become **Not sent**, and their signed copies are discarded.
  - While the in-flight legs finish, the caption reads "Stopping. Steps already sent will still finish."
  - Then the sheet shows the partial result with **Continue** (= retry only the remaining legs, with one fresh approval) and **Done**.
- **The mock panel** has **Press Cancel** and **Press Stop** under Chain, so either can be pressed at any moment. Press Stop opens the confirm on the phone.

## 3 · Copy per scenario after Stop

| Scenario (where it stopped) | Title / line | Buttons |
|---|---|---|
| Close all 4 (after 2 closed) | Stopped: 2 of 4 closed / META and ETH closed. SOL and BTC were not sent and are still open. | Continue · Done |
| Close all (all closed, stopped before the return) | Closed 4 positions / Stopped before returning the USDC. It stays in Phoenix. | Continue · Done |
| Flash repay (after the closes) | Stopped / Positions closed. Loans not repaid yet. (or "…and USDC moved out of Phoenix", or "…and turned into cash") | **Continue repaying** · Done |
| Flash repay (one loan repaid) | Stopped / Loans partly repaid: 0.50 SOL still owed. | Continue repaying · Done |
| Flash repay (before the send home) | Account repaid / Stopped before sending anything to your wallet. It stays in your margin account. | Continue · Done |
| Perps two-part (after Convert USDC) | USDC converted, order not placed / 10.00 USDC is converted and waits in your margin account. | Continue · **Return USDC to margin** · Done |
| Margin first time (after the account opened) | Account opened, nothing deposited yet / Your margin account is open. The deposits and the borrow were not sent. | Continue · Done |
| Margin first time (after a deposit) | Stopped: 2 of 4 done / Account open, 1.50 SOL deposited. 100.00 USDC and 50.00 USDC were not sent. | Continue · Done |
| Borrow and swap (after the borrow) | Borrowed 50.00 USDC, swap not done / 50.00 USDC is borrowed and sits in your margin account. | Continue · **Repay 50.00 USDC** · Done |
| Any other multi-leg flow | Stopped: X of N done / *names* were not sent. | Continue · Done |
| Cancel before the wallet answered (any flow) | Cancelled / Nothing was sent. | Try again · Close |

The first-time stages (margin and Phoenix) keep their approved motion. After Stop they rest on what really landed: the account docked with nothing deposited, the Phoenix card without a position, and so on.

## 4 · App-side contract

- **Cancel handle (before the wallet answers).** `signSolanaBatch` / `signSolana` need an abort: `sign(…, { signal })`.
  - On Cancel (or X while waiting), call the wallet library's `terminateSession()` so Phantom drops the pending request, then reject with a `CancelledError`.
  - The sheet maps `CancelledError` to "Cancelled / Nothing was sent." (not "Not confirmed").
  - Ignore any late answer that arrives after termination.
- **Stop handle (between legs).** `sendSolanaBatch(parts, { signal, onLeg })` checks `signal.aborted` before each part's refresh, check and send.
  - Parts already broadcast are awaited to their confirmation, as today.
  - Every part not yet broadcast reports `onLeg(i, "skipped")`, and its signed transaction is dropped. It is never broadcast.
  - The batch resolves with `{ landed[], skipped[] }`, or rejects with a `StoppedError` carrying the same data.
  - In an independent batch (Close all), parts already broadcast run to completion; Stop only prevents the ones not yet broadcast.
- **Discarded signed legs.** A signed but unsent part can't be kept for later, because its durable nonce or blockhash and its fork price stamp go stale. So Continue always rebuilds and re-signs.
- **Resume = retry of the remaining legs.** Continue calls `resumeBatch(batch, { only: remainingLegIds })`, the same path as "Retry failed (N)": one fresh approval for exactly the legs that did not land. Done legs are never sent again.
- **Extra actions after Stop:** "Return USDC to margin" (Perps, the existing withdraw) and "Repay 50.00 USDC" (Spot borrow, the existing repay). Each is its own single-transaction sheet.

---
# Multi-leg transaction sheet: handoff notes (v3)

The prototype is at http://localhost:4174/multi-leg.html. It is design only: nothing is wired into the app yet.

## What changed in v3

1. **The first-time flows keep their approved motion graphics.**
   - **Margin first time** shows the approved margin stage from `design/margin-account-open-flow.html` (the `Stage` in `src/ui/first-time-flow.tsx`): the account card draws in, shimmers while it is created, fills with a ripple, then docks into the strip; each asset node streams particles up into the strip, and the strip counts. Its markup, values and timings are copied into `margin-stage.js` / `margin-stage.css`, with classes prefixed `m-`. The stage now follows the legs' real phases instead of a fixed script.
   - **Phoenix first time** shows the approved 132 px one-row stage from `design/perps-flow/first-time.html` (margin pill, Phoenix card, SOL-PERP circle, USDC particles, position chip). `phoenix-stage.js` contains the `Stage` class copied verbatim from `perps.js`.
   - **What sits below each stage:** the header (concept A face + loader badge), the bar, and the compact leg rows (explorer icon per confirmed leg, Retry per failed leg). There is no stepper and there are no numbered labels.
   - **Scrolling:** the sheet body scrolls inside itself. The title row stays at the top and the action buttons stick to the bottom.
   - **Unchanged:** the review sheet (before confirming).
2. **Scenarios that don't exist in the app are gone.**
   - Farm only deposits idle margin funds (`solanaFarmDeposit({ sym, marginAmount })` in `farm.tsx`), so "Kamino: borrow, then supply" was removed. Kamino and Perena deposit / withdraw are each one transaction: the receipt or token accounts are created inside the same transaction, and the Kamino withdraw is one part.
   - The Titan "prepare accounts" variant was merged into "Borrow and swap". The account-setup split is still shown on the Jupiter scenario.
3. **Flash repay follows the website's plan** (`vanna-web-backend/apps/solana/lib/solana/flash-repay.ts`, the `steps`):
   1. Perps: close each position, then one withdraw from Phoenix.
   2. Kamino Farm exits.
   3. Swaps of spot positions.
   4. Repay each loan.
   5. Optional: send everything to the wallet.

   Legs inside a stage run together, and each stage starts only when the previous one has landed (the repays use the cash the earlier stages bring back). The sheet shows rows only, with no stage labels. A new scenario matches your account today: **no positions, one USDC loan → a single "Repay 52.27 USDC" leg**, which shows the single-transaction sheet.
4. **The approval mode can be compared.** A Simulate toggle switches between **One approval for everything** (default: every leg signed once, sent stage by stage) and **One approval per stage**. It applies to Flash repay, Close all, Close + return USDC, and Borrow and swap.
   - Close + return and Borrow and swap are two separate approvals in the app today, so "per stage" is today's behaviour.
   - With one approval, the second leg still waits until the first has landed.
   - Plain labels: "Borrow 50.00 USDC" / "Swap USDC to SOL"; "Close META short" / "Return 139.19 USDC to margin".
5. **Everything v2 had is kept.** The whole-operation prose, one explorer icon per confirmed leg (none in the header with 2+ legs), Retry per failed row with "Retry failed (N)", the mock wallet, and step-by-step control.

## Scenarios and their real source

| Scenario | Legs (stage order) | Source |
|---|---|---|
| Earn supply / withdraw | 1 leg | `solanaEarnSupply` / `solanaEarnWithdraw` (lend screens) |
| Margin first time | Open your margin account → Deposit 1.50 SOL → Deposit 100.00 USDC → Borrow 50.00 USDC (**with the margin stage**) | `solanaDepositAndBorrow` (parts "Open margin account", "Deposit X", "Borrow X"), `MarginFlowSheet` |
| Margin deposit / borrow / repay / withdraw collateral / transfer | 1 leg each | `solanaDepositMarginCollateral`, `solanaDepositAndBorrow`, `solanaRepay`, `solanaWithdrawCollateral`, `solanaWalletTransfer` |
| Margin deposit + borrow | Deposit 100.00 USDC → Borrow 0.50 SOL | `solanaDepositAndBorrow`, split only when it doesn't fit one transaction |
| Flash repay (full) | Close ETH long, Close META short → Withdraw 84.20 USDC from Phoenix → Exit USDC on Kamino → Swap 1.20 SOL to USDC → Repay 120.00 USDC, Repay 0.50 SOL → Send 85.40 USDC to your wallet | website `flash-repay.ts` plan; the app's `solanaFlashRepay` today only exits Kamino and repays, one approval each, and swallows errors |
| Flash repay (your account now) | Repay 52.27 USDC | same |
| Farm Kamino deposit / withdraw | 1 leg each | `solanaFarmDeposit({ sym, marginAmount })` / `solanaFarmWithdraw` (`farm.tsx`) |
| Farm Perena deposit / withdraw | 1 leg each | `solanaPerenaAction` |
| Spot Jupiter with account setup | Create your BONK account → Swap 10.00 USDC for BONK | `solanaMarginSwap` + `setupSplits` (Titan's `solanaMarginTitanSwap` splits the same way) |
| Spot Borrow and swap | Borrow 50.00 USDC → Swap USDC to SOL | `spot.tsx` `go()`: `solanaDepositAndBorrow`, then `solanaMarginSwap` (2 approvals today) |
| Perps first time | Set up your Phoenix account → Add 10.00 USDC to Phoenix → Open SOL long (**with the Phoenix stage**) | `solanaPerpsOpen` (parts "Set up Phoenix", "Add USDC for X-PERP", order) |
| Perps two parts | Convert 10.00 USDC for Phoenix → Add it to Phoenix and open ETH long | `solanaPerpsOpen` ("Convert USDC for X-PERP") |
| Perps close (last position) | Close META short → Return 52.10 USDC to margin | `solanaPerpsClose` + `returnUsdcAfterClose` (2 approvals today) |
| Perps Close all 2 / 4 | Close each (together) → Return USDC to margin | `solanaPerpsCloseMany` (`independent: true`) + `returnUsdcAfterClose` |
| Perps withdraw | Move 52.10 USDC out of Phoenix → Turn it back into USDC | `solanaPerpsWithdraw` / `perpsWithdrawParts` |

Prose for the flows that changed:
- **Flash repay, all done:** "Account repaid / 2 positions closed on Phoenix, Kamino USDC exited, 1.20 SOL swapped to USDC, 120.00 USDC and 0.50 SOL repaid. 85.40 USDC sent to your wallet."
- **Flash repay, partial:** "Closed 1 of 2 / ETH long is still open on Phoenix, so the loans were not repaid yet." · "Not repaid yet / Positions closed. Moving 84.20 USDC out of Phoenix didn't go through, so the loans were not repaid yet." · "Not repaid yet / Phoenix is done. Exiting Kamino didn't go through, …" · "Not repaid yet / Everything is closed. Swapping 1.20 SOL to USDC didn't go through, …" · "Repaid 1 of 2 loans / Everything is closed. 0.50 SOL is still owed." · "Account repaid / All loans repaid. Sending 85.40 USDC to your wallet didn't go through; it stays in your margin account."
- **Flash repay, your account now:** "Account repaid / 52.27 USDC loan repaid. Nothing else was open."
- **Farm Kamino deposit:** "Farming 150.00 USDC on Kamino / Supplied from the idle USDC in your margin account".
- **Borrow and swap:** "Swapped 50.00 USDC to 0.27 SOL / 50.00 USDC borrowed, then swapped to 0.27 SOL. It's in your margin account." Partial: "Borrowed, not swapped / 50.00 USDC is borrowed and sits in your margin account. The swap didn't go through."

---
# (v2 notes, still valid except where v3 above changes them)

The prototype is at http://localhost:4174/multi-leg.html. It is design only: nothing is wired into the app yet.

It builds on the v1 notes at the end of `NOTES.md` (phases, the legs data shape, `onLeg`). v2 adds:
- prose that describes the whole operation
- one explorer link per leg
- a scenario for every multi-transaction action in the app
- retrying only the legs that failed

## How to use it

1. Pick an action in **Simulate**. The actions are grouped as Earn, Margin, Flash repay, Farm, Spot and Perps.
2. Optionally pick a failure under **On chain**: "*leg* fails" or "*leg*: confirmation times out".
3. Tap the sheet's button and answer in the **mock Phantom** panel (Approve / Reject / Time out). Nothing moves before Approve, and a second approval is asked for separately when the flow needs one.
4. Move the chain on with **Play next step**, or with the per-leg buttons (Checked → send, Sent → confirm, Confirms, Fails, Times out, It landed / It did not land). **Auto-play** never answers the wallet for you.
5. At the end, use **Retry failed (N)**, or **Retry** on a single failed row. Only the legs that did not land are signed and sent again.
6. Dev controls: speed, light / dark, reduce motion, device, phone width 320 / 360 / 380 / 412.

## 1 · Prose: the title and line describe the whole operation

Rules:
- The title says what the user now has.
- The line says what moved, how much, and where it is now.
- A partial result names what is still open or still owed.
- Plain words only. No "phUSD", "atlas", "ATA" or "PDA".

| Flow | All done: title / line | Partial (example): title / line |
|---|---|---|
| Earn supply | Supplied 100.00 USDC / Earning 6.40% in the USDC pool | (single) Not confirmed / … |
| Earn withdraw | Withdrew 50.00 USDC / Back in your wallet | (single) |
| Margin first time (open, deposit SOL, deposit USDC, borrow) | Margin account opened / 1.50 SOL and 100.00 USDC deposited, 50.00 USDC borrowed | Account open, not borrowed / 1.50 SOL and 100.00 USDC are in your margin account. Borrowing 50.00 USDC didn't go through. · Open failed: Not confirmed / Opening your margin account didn't go through. Nothing moved. |
| Margin deposit | Deposited 100.00 USDC / In your margin account as collateral | (single) |
| Margin borrow | Borrowed 50.00 USDC / In your margin account | (single) |
| Margin deposit + borrow | Deposited and borrowed / 100.00 USDC deposited, 0.50 SOL borrowed | Deposited, not borrowed / 100.00 USDC is in your margin account. Borrowing 0.50 SOL didn't go through. |
| Margin repay | Repaid 50.00 USDC / Your USDC loan is closed | (single) |
| Margin withdraw collateral | Withdrew 1.00 SOL / Back in your wallet | (single) |
| Margin transfer | Sent 20.00 USDC / To 9wQp…T4ra | (single) |
| Flash repay (3 closes, 2 repays, collateral home) | Account repaid / 3 positions closed, 120.00 USDC and 0.50 SOL repaid. 85.40 USDC sent to your wallet. | Close failed: Closed 2 of 3 / ETH long is still open, so the loans were not repaid yet. · Repay failed: Repaid 1 of 2 loans / Positions closed and 120.00 USDC repaid. 0.50 SOL is still owed. · Send failed: Account repaid / Loans repaid. Sending 85.40 USDC to your wallet didn't go through; it stays in your margin account. |
| Farm Kamino (borrow, then supply) | Farming 150.00 USDC on Kamino / 50.00 USDC borrowed, 150.00 USDC supplied to Kamino | Borrowed, not farmed / 50.00 USDC is borrowed and sits in your margin account. Supplying to Kamino didn't go through. |
| Farm Kamino withdraw | Withdrew 152.10 USDC from Kamino / Back in your margin account | (single) |
| Farm Perena deposit | Deposited 100.00 USDC to USD* / Earning in Perena USD* | (single) |
| Farm Perena withdraw | Withdrew 101.30 USDC from USD* / Back in your margin account | (single) |
| Spot Jupiter (create account, swap) | Swapped 10.00 USDC for 1.21M BONK / BONK is in your margin account | Not swapped / Only the empty BONK account was created. Nothing was swapped. |
| Spot borrow + Titan (borrow; prepare accounts + swap) | Bought 0.21 SOL / 25.00 USDC borrowed, then 40.00 USDC swapped for 0.21 SOL on Titan | Borrowed, not swapped / 25.00 USDC is borrowed and sits in your margin account. The swap didn't go through. |
| Perps open, first time (set up, add USDC, order) | Long SOL 2x opened / Phoenix account set up, 10.00 USDC moved there as collateral, 0.1067 SOL long | Order not placed / Your 10.00 USDC is in Phoenix. The order did not go through. (+ Return USDC to margin) |
| Perps open, two parts (convert, add + order) | Long ETH 2x opened / 10.00 USDC moved to Phoenix as collateral, 0.0062 ETH long on Phoenix | Order not placed / 10.00 USDC is converted and waits in your margin account. Opening ETH long didn't go through. |
| Perps close (last position: close, USDC home) | Closed META short / +3.10 USDC profit. 52.10 USDC is back in your margin account | Closed META short / +3.10 USDC profit. Your 52.10 USDC stays in Phoenix for now. |
| Perps Close all, 2 | Closed 2 positions / META and ETH closed. 61.30 USDC is back in your margin account | Closed 1 of 2 / ETH is still open |
| Perps Close all, 4 | Closed 4 positions / META, ETH, SOL and BTC closed. 139.19 USDC is back in your margin account | Closed 3 of 4 / META is still open · Return declined: Closed 4 positions / All closed. Your USDC stays in Phoenix for now. |
| Perps withdraw (out of Phoenix, unwrap) | Back in your margin account / 52.10 USDC moved from Phoenix to your margin account | Moved, not converted / 52.10 USDC left Phoenix and sits in your margin account in Phoenix's own form. Retry to turn it into USDC. |
| Any flow, wallet said no before anything was sent | Not confirmed / You declined it in Phantom. Nothing was sent. (or "Your wallet did not answer. Nothing was sent.") | |

While running, the header shows the operation and a count: "Closing 4 positions / 2 of 5 done". A single transaction shows "Checking before sending" → "Sent to Solana" → "Confirming on Solana".

**Waiting copy:**
- First approval: "Waiting for your wallet / Approve in Phantom (5 transactions, one approval). If it shows a warning, tap Confirm (unsafe)."
- Second approval: "Approve once more / Phantom asks again for: return 139.19 USDC to margin."
- Retry: "Waiting for your wallet / Approve the retry in Phantom: close eth long. Done steps are not sent again."

## 2 · Explorer links

- **One transaction:** the header keeps its explorer icon, as today.
- **Two or more legs:** no header link, because it could only open the last leg. Each **confirmed** row gets its own small open-in-explorer icon (32 px tap target) and shows its short signature underneath (e.g. `5Kq2…8sWd`).
- Failed and not-sent rows have no link.

Both cases are in the prototype. Try Earn supply (single) against Close all (multi).

## 3 · Every multi-transaction action in the app (verified in `src/chain/solana/actions.ts`, `src/screens/*`)

Legs on the same stage run together (an independent batch). A later stage waits for the previous one. "ap 2" means a second wallet approval.

| Action (code) | Legs, in plain words (code label) | Order | Approvals today |
|---|---|---|---|
| Earn supply / withdraw (`solanaEarnSupply` / `solanaEarnWithdraw`) | Supply 100.00 USDC to the USDC pool ("Supply USDC") / Withdraw … ("Withdraw USDC") | single | 1 |
| Margin first time (`solanaDepositAndBorrow`, `MarginFlowSheet`) | Open your margin account ("Open margin account"); Deposit 1.50 SOL ("Deposit SOL"); Deposit 100.00 USDC; Borrow 50.00 USDC ("Borrow USDC") | in order (sendSolanaBatch, dependent) | 1 when it fits as one batch |
| Margin deposit / borrow / repay / withdraw collateral / transfer (`solanaDepositMarginCollateral`, `solanaRepay`, `solanaWithdrawCollateral` via `sendMarginWalletSafe`, `solanaWalletTransfer`) | one leg each | single | 1 |
| Margin deposit + borrow, existing account | Deposit 100.00 USDC; Borrow 0.50 SOL | in order (split only when it does not fit one transaction) | 1 |
| Flash repay (`solanaFlashRepay`) | Close ETH-PERP long on Phoenix; Exit USDC on Kamino ("Exit USDC on Kamino"); Sell SOL long on Jupiter → Repay 120.00 USDC; Repay 0.50 SOL ("Repay X") → Send 85.40 USDC to your wallet | closes together → repays together → send home | **today: one approval per transaction, run one after another, errors swallowed** (`catch {}`). Proposed: one batch (independent stages) so the sheet can show and retry each leg. |
| Farm Kamino deposit (`solanaFarmDeposit`) | Borrow 50.00 USDC into your margin account ("Farm USDC on Kamino: move funds") → Supply 150.00 USDC to Kamino ("Farm USDC on Kamino") | in order; one part when it fits | 1 |
| Farm Kamino withdraw (`solanaFarmWithdraw`) | Exit USDC on Kamino | single | 1 |
| Farm Perena deposit / withdraw (`solanaPerenaAction`) | Deposit / Withdraw … Perena USD* (token accounts created inside the same transaction) | single | 1 |
| Spot Jupiter (`solanaMarginSwap`, `setupSplits`) | Create your BONK account ("…: prepare accounts") → Swap 10.00 USDC for BONK ("Margin Swap USDC → BONK") | in order; one part when it fits | 1 |
| Spot borrow shortfall + Titan (`spot.tsx` → `solanaDepositAndBorrow`, then `solanaMarginTitanSwap`) | Borrow 25.00 USDC → Prepare accounts for the swap (atlas + vault) → Swap 40.00 USDC for SOL on Titan | in order | **2** (borrow, then swap batch) |
| Perps open, first time (`solanaPerpsOpen`) | Set up your Phoenix account ("Set up Phoenix") → Add 10.00 USDC to Phoenix ("Add USDC for X-PERP", can be 2 parts: show as one leg) → Open SOL long | in order | 1 |
| Perps open, two parts | Convert 10.00 USDC for Phoenix ("Convert USDC for X-PERP") → Add it to Phoenix and open ETH long | in order | 1 |
| Perps close (`solanaPerpsClose` + `returnUsdcAfterClose`) | Close META short ("Close X-PERP") → Return 52.10 USDC to margin ("Withdraw from Phoenix") | in order | **2** (the return only after the last position) |
| Perps Close all (`solanaPerpsCloseMany`, `independent: true`) | Close META short; Close ETH long; Close SOL long; Close BTC short → Return 139.19 USDC to margin | closes together → return | **2** |
| Perps withdraw (`solanaPerpsWithdraw`, `perpsWithdrawParts`) | Move 52.10 USDC out of Phoenix ("Withdraw from Phoenix") → Turn it back into USDC ("Unwrap phUSD to USDC") | in order | 1 |

Long lists (Close all 4 + return, Flash repay with 6 legs) scroll inside the legs card, which is capped at 268 px. The header, bar, summary and buttons stay in place.

## 4 · Partial failure: retry only the failed legs

- **The failed row** shows its reason on one short line (e.g. "No liquidity near the mark. Try again shortly.") plus a **Retry** button on the row.
- **The primary button** reads **Retry failed (N)**, where N = failed + not-sent legs. The secondary button is **Done**.
- **What a retry sends:**
  - Done legs keep their tick and signature and are **never sent again**.
  - Not-sent legs (skipped because an earlier leg failed) are **included**.
  - A per-row Retry sends that leg plus its not-sent dependents.
- **One new approval** covers exactly the legs that are left. Those rows animate back to "Waiting to sign", then Checking. The other rows don't move.
- The prototype shows it for Close all (4 legs, 1 fails → "Retry failed (2)": the close plus the return), a dependent flow (Perps two-part: convert done, add + order failed → retry only the order), and Flash repay (a repay fails → retry that repay plus the send home).

### App-side contract

`sendSolanaBatch` (`submit.ts`) already knows what landed and what failed:
- **Dependent batch:** it throws `BatchPartError(message, landed[], failedIndex, failedLabel)`.
- **Independent batch:** it throws `BatchPartError(…, failed: { index, label, message }[])`.

What the wiring needs:

1. **Legs data:** `legs: { id, label, phase, reason?, signature?, stage, approval }[]`, with `onLeg(i, phase, info)` as described in the v1 section of `NOTES.md`.
2. **A resumable batch.** Keep the batch's part *builders* (not the signed transactions) together with the leg state.
   - **Why not the signed ones:** a signed leg cannot be reused. Its durable nonce is consumed when another part lands with the same nonce account, it advances, and the signature also goes stale with the refreshed fork prices. The legs left to send must be **rebuilt and signed again**.
   - **Proposal:** `resumeBatch(batch, { only: legIds })`. It rebuilds the parts for `only` (through each part's builder and `before`), asks for one `signSolanaBatch` approval, and sends them with the same independent / dependent rule. Results go back through `onLeg`.
   - **For the callers:** keep the variant builders (`sendWalletParts` variants, `solanaPerpsCloseMany` targets) addressable by leg id, so a retry can build a batch with only those. For Close all, retry = `solanaPerpsCloseMany(stillOpen)`, which `PerpsCloseIncompleteError` already carries.
3. **Timeout first:** before offering a retry, re-read the chain (as `solanaPerpsCloseMany` already does) so a leg whose confirmation timed out but landed is ticked, not retried.
4. **Second approvals** (the return after Close all, the Titan swap after a borrow) are their own legs with `approval: 2`. A declined second approval leaves that leg failed with "You declined it in Phantom." and offers Retry failed (1).
5. **Flash repay:** move `solanaFlashRepay` from one approval per transaction with swallowed errors to a staged batch (closes → repays → send home). Without that, partial results and retries can't be shown honestly.

## Components to reuse

- From `src/ui/tx.tsx`:
  - `TxFlow`: phases, `recover` buttons → "Retry failed (N)", and the hidden-run announcement → the toast with View.
  - `Progress`: the labels, plus one segment per leg.
  - `MascotDone`, `TailLoader`.
- From `src/ui/first-time-flow.tsx`: row styling (`trow`, `ck`, `Tag`), haptics per confirmation, `guardSheet` while the wallet is waited on, `useOnForeground`.
- New:
  - `LegRow`: icon cross-fade, state word, reason line, short signature, explorer icon, Retry.
  - `LegList`: a capped, scrolling card that adds rows when a leg appears.
