# Phoenix perps first-time flow: handoff notes

This is an **interactive** prototype in `design/perps-flow/`, served at http://localhost:4174/:
- `first-time.html`: the first-time flow
- `returning.html`: the returning-trader flow
- `index.html`: the landing page

## How to use it

1. The phone opens on the **review sheet** and waits. Nothing plays on its own and nothing loops.
2. Tap **Open long**. The sheet shows "Waiting for your wallet".
3. Answer in the **mock Phantom panel** beside the phone:
   - **Approve:** the stage plays each moment once, then lands on the done state.
   - **Reject:** "Not confirmed / You declined it in Phantom. Nothing was sent." with Try again or Close.
   - **Time out:** "Your wallet did not answer. Nothing was sent." with Try again or Close.

   Nothing advances before Approve, as in the app.
4. **"On chain after approval"** in the wallet panel picks the outcome. The animation runs up to the point where the part fails, then shows the failure.
   - First time: Everything lands / Setting up the account fails / Adding USDC fails / The order fails after the deposit / No fill at the price.
   - Returning: Everything lands / (Adding USDC fails) / The order fails / No fill.
5. On "Order not placed" or "No fill", the buttons work:
   - **Retry order** asks the wallet again (one transaction), then the order fires and the position opens. It uses the USDC already in Phoenix.
   - **Return USDC to margin** asks the wallet, then the USDC flows back to the margin account and both balances count back.
6. **Done** closes the sheet and reopens the review. **X**, a tap on the dimmed screen, or Close shuts the sheet; the "Review long" button on the Perps screen behind reopens it.
7. Returning page: the **Situation** toggle switches between "Order only · Phoenix holds 25.00 USDC" and "Add USDC + order · holds 4.20 USDC".
8. If you leave the wallet waiting for 60 s, the waiting state turns patient (heavier eyelids, slower breathing). It is visual only.

**Dev controls** sit in a collapsed panel under the wallet:
- Speed 0.5x / 1x / 2x
- Replay the last animation, plus Pause / Resume
- A scrub slider for the current animation
- Light / dark, reduce motion, Redmi K50i or Galaxy S Ultra frame
- **Phone width** 320 / 360 / 380 / 412
- **Layout check**: outline every box, and a "longest strings" mode (1,234.56 USDC). It lists anything outside the stage or the card, so it should read "nothing outside".
- Frame counter
- Jump to any state
- The data each state needs

## Stage widths (final)

The stage is built from the sheet body width B (phone width - 32).

| Phone | B | Side zone | Circle | Card (w x h) | Gap card ↔ side | Notes |
|---|---|---|---|---|---|---|
| 412 | 380 | 72 | 44 | 196 x 116 | 20 | |
| 380 | 348 | 68 | 44 | 196 x 116 | 8 | |
| 360 | 328 | 64 | 44 | 188 x 116 | 6 | |
| 320 | 288 | 56 | 40 | 164 x 116 | 6 | "tight" type: amount 18 px, labels 11 px |

- **Amount:** the number at 20 px (18 px when tight) with a smaller "USDC" unit (12 px). "1,234.56 USDC" fits at every width.
- **Card last line:** may wrap to two lines ("Long SOL 2x · 0.1067 SOL"), so it is never truncated.
- **Side labels:** "Margin" / "SOL-PERP" with the value underneath. Long values ("32.50 USDC", "Not placed") wrap under the circle instead of spilling out.
- **Paths and particles:** they run from the circle edge to the card **edge** and stop there. The card is opaque (surface background) and sits above every path and particle (z-index 2 over the SVG at 0), so a dotted line or a dot can never cross the amount or any card text. This fixes the reported overlap.
- **The position chip:** pops over the market circle, clamped inside the stage, then docks onto the card's last line.
## What the code does today (verified)

- `solanaPerpsOpen` (`src/chain/solana/actions.ts:3137`) builds up to three parts. They go out in **one** wallet approval (`sendWalletParts` → `sendSolanaBatch`) and are sent in order, each one confirmed before the next:
  1. `"Set up Phoenix"`: `registerTraderIx(owner, margin)`. Only added when `phoenixTraderPda(margin)` has no account, so it happens once per margin account.
  2. `"Add USDC for X-PERP"`: Ember wrap plus `deposit_funds`, only when `collateralUsdc > 0`. When the transaction is too big, it can be **two** parts with the same label. The UI must group parts by label so the user still sees one step.
  3. `"Open X-PERP long|short"`: the market order.
- `sendSolanaBatch` (`submit.ts:1042`) calls `onStatus("signing")` and `emitTxStatus("waiting_for_wallet")` before the approval. It has **no per-part callback**: the UI cannot tell today which part is being sent or which has confirmed.
- **Failure after the first part:**
  - `BatchPartError(failedIndex, landed)`. When there was a deposit, `solanaPerpsOpen` rewrites it as: "Your N USDC is in Phoenix now, but the order did not go through: … Open the position again, or withdraw the USDC from Perps."
  - If setup landed and the deposit part failed, the same branch fires (amount > 0), so the message wrongly says the USDC is in Phoenix. See open question 1.
- **No fill:** after the batch confirms, a position that did not change throws "No fill at your price limit. Your USDC stays in Phoenix (Tx: …)".
- **The "Phoenix already holds N USDC of yours" notice** is **not** in `src/screens/trade/perps.tsx` today. The closest is "Free collateral in Phoenix" in Close all, and `d.phoenixIdle`. I designed it for the review sheet and the ticket.

## Simplified structure (after user review)

- **No steps shown anywhere.** There is no numbered stepper, no step list in the review and no "Step 1 of 3" or "Add USDC" heading. Opening a position is **one action** ("Opening long SOL 2x") with the normal Sent / Processed / Confirmed bar from `tx.tsx`, even when it is two or three transactions under one approval.
- **No margin account card.** The returning flow never shows it. The first-time flow shows it as a small 44 px circle to the left of the Phoenix card: dimmed, and lit only while USDC leaves it or comes back.
- **Returning trader** = the normal transaction sheet:
  1. review (with "Phoenix already holds N USDC of yours")
  2. Waiting for your wallet
  3. Sent / Processed / Confirmed
  4. done

  One caption line says what happens: "Uses the USDC already in Phoenix" or "Adds 10.00 USDC to Phoenix, then places the order". There is no stage. Build it with `TxFlow` in `tx.tsx`, not `MarginFlowSheet`.
- **First time** = the same sheet, plus the motion stage above the header (the part the user values). The review is the normal review sheet plus one line: "Phoenix is the exchange that runs perps. Your USDC moves there as collateral and comes back when you close." Under the button: "First trade on Phoenix: your trading account is set up in the same approval".
- **Failure after the deposit**: compact. Header "Order not placed" and the caption "Your USDC is in Phoenix. The order did not go through: …". Buttons: Retry order, then Return USDC to margin. In the first-time flow the stage shows the USDC still in the Phoenix card ("No position") and the market circle in pink. The returning flow has no stage.

**One bar for the whole action.** It is honest because each mark only lights on a real event:
- **Sent:** the wallet signed and the first part is out (`onSigned`).
- **Processed:** while parts land.
- **Confirmed:** the order part confirmed.

In the first-time flow the bar sits at Sent during setup and at Processed while USDC moves; it reaches Confirmed when the order confirms.

## The storyline (first time only)

**Stage dimensions:** the stage is 132 px tall and as wide as the sheet body; see "Stage widths (final)" above for each phone width. It is one row: the margin circle, the Phoenix card (the hero) and the SOL-PERP circle. The paths join the circle edges to the card edges. The run view gap is 14 px, so the caption sits right under the stage and the bar right under the caption.

The card is the hero in every state. The two side circles stay in place, dimmed (opacity 0.55) as "the plan", and light up only for their moment. So the composition never has an empty area, and nothing jumps around.

Estimated sheet height at 412 px wide: about 72 (handle and title) + 132 (stage) + 14 + 56 (header) + 14 + 42 (bar) + 44 (bottom padding) = about 374 px. That is about 41% of a 915 dp screen, and about 480 px with the failure buttons.

| Moment | Card (centre) | Sides | Timing |
|---|---|---|---|
| Waiting for the wallet | dashed outline, skeleton lines, "Waiting to sign" | margin and market dimmed | static (only the header loader and the mascot move) |
| Account being created | outline turns violet, a shimmer sweeps across, "Creating on Solana" | dimmed | shim 1200 ms linear loop |
| Account ready | fills with the Perps gradient, "Trading account", "Ready just now" | dimmed | fill 600 ms |
| USDC flows in | shows its balance (20 px) and a sheen; on confirm it counts 0.00 → 10.00 USDC | margin circle lights up, dotted path plus drawn line, particles stream into the card; margin counts 42.50 → 32.50 | line 550 ms; particles 760 ms, 130 ms apart; CountText 900 ms |
| Order fires | sheen while the shots run | the market circle lights up and its halo pulses; shots run card → market; on confirm a check and "Filled $187.42"; the "Long SOL 2x" chip pops over the market and docks onto the card's last line, which becomes "Long SOL 2x · 0.1067 SOL" | shots 520 ms; chip 420 ms spring, dock 520 ms |
| Done | holds 10.00 USDC + the position | margin and market dimmed | header: drawn check, ripple, tongue flick |
| Order failed | holds 10.00 USDC, "No position" | market pink with an X, "Not placed" / "No fill" | shake 380 ms |
| Setup failed | pink dashed outline, "Not created" | dimmed | |
| Return USDC | balance counts down | margin circle active, particles run back out of the card | as the inflow, reversed |

Caption lines (one line, no numbers):
- account being created: "Creating your Phoenix trading account (one time)"
- USDC flowing: "Moving 10.00 USDC from your margin account"
- order: "Placing the order on Phoenix"
## Copy per state

Amounts in the prototype: collateral 10.00 USDC, 2x, SOL $187.42, margin USDC 42.50, size 0.1067 SOL.

| State | Sheet title | Header title | Caption / body | Buttons |
|---|---|---|---|---|
| Review, first time | Review long SOLUSDC | n/a | Legs "You add 10.00 USDC / From your margin account" ↓ "You open Long SOL 2x / 0.1067 SOL · about $20.00". Line: "Phoenix is the exchange that runs perps. Your USDC moves there as collateral and comes back when you close." Rows: Entry price, Liquidation price, Fee, Account. Under the button: "First trade on Phoenix: your trading account is set up in the same approval" | Open long |
| Review, order only | Review long SOLUSDC | n/a | Leg "You open Long SOL 2x / 0.2668 SOL · about $50.00". Line: "Phoenix already holds 25.00 USDC of yours. This order uses it, so nothing new moves." | Open long |
| Review, deposit + order | Review long SOLUSDC | n/a | Legs as first time. Line: "Phoenix already holds 4.20 USDC of yours. It will hold 14.20 USDC after this." | Open long |
| Waiting for wallet (all) | (same) | Waiting for your wallet | "Approve in Phantom. If it shows a warning, tap Confirm (unsafe)." | none |
| Waiting 60 s+ | (same) | Waiting for your wallet | same; visual only | none |
| Running, first time | (same) | Opening long SOL 2x | one line that follows the stage (see above) | none |
| Running, returning | (same) | Opening long SOL 2x | "Uses the USDC already in Phoenix" / "Adds 10.00 USDC to Phoenix, then places the order" | none |
| Done | (same) | Long SOL 2x opened | "0.1067 SOL on Phoenix · 10.00 USDC collateral" (order only: "0.2668 SOL on Phoenix") plus the explorer icon | Done |
| Setup failed (first time) | (same) | Not confirmed | "Setting up your Phoenix account didn't go through. Nothing moved and no order was placed." | Try again · Close |
| Deposit failed (first time) | (same) | Not confirmed | "Your Phoenix account is ready. Adding USDC didn't go through, so nothing moved and no order was placed." | Try again · Close |
| Order failed after the deposit | (same) | Order not placed | "Your USDC is in Phoenix. The order did not go through: <reason>. Phoenix holds 10.00 USDC of yours." | Retry order · Return USDC to margin |
| No fill | (same) | No fill at your price | "The price moved more than 1% before the order filled. Your 10.00 USDC is in Phoenix." | Retry order · Return USDC to margin |
| Return: waiting / running / done | Withdraw from Phoenix | Waiting for your wallet / Returning 10.00 USDC / Back in your margin account | "Approve in Phantom…" / "To your margin account" / "10.00 USDC from Phoenix" | Done (at the end) |

No jargon: the user never sees phUSD, trader, PDA, Ember, venue or step numbers.

## Data each state needs

| State | Data |
|---|---|
| Review | `registered` (the trader account exists), Phoenix free collateral, amount to add, market, side, leverage, size (as `solanaPerpsOpen` sizes it), mark, estimated liquidation, fee, wallet app + short address |
| Waiting | `externalWalletName(chain)`, elapsed > 60 s |
| Running | overall status for the one bar (wallet signed / a part landed / the order part confirmed). First time also: which part is running (it drives the stage) and the margin and Phoenix amounts before and after, for the count-ups |
| Done | filled size (`loadPerps` after), Phoenix collateral after, last signature (explorer) |
| Setup failed | error; nothing landed |
| Deposit failed | the deposit part failed and setup landed |
| Order failed / no fill | the order part failed (or the no-fill check) with the deposit landed; Phoenix free collateral now |
| Return | free collateral to return, withdraw signature(s) |
## Components to reuse from `first-time-flow.tsx`

- `MarginFlowSheet` shell: the phases (review / run / done / fail), `guardSheet` while the wallet is waited on, `setLivePaused`, `useOnForeground` to re-read, haptics.
- `Stage` primitives:
    - `outline`, `fillStyle`, `shimmer`, `sheen` (the card no longer docks, so `cardStyle`, `big` and `strip` are not needed)
  - `Particle` (path and timing as is)
  - `FlowLine`
  - `Node` (the market node is a `Node` with a candles icon and a check / X badge)
  - `CountText`
- `Bar`, unchanged. Do **not** use `Stepper`: the user does not want steps shown.
- Do **not** use the review "first time" step box. The first-time review is the normal review plus one notice line.
- Header: `TailLoader` and `MascotDone`, or the concept-A face with the loader badge from design/tx-motion.

New pieces:
- `PhoenixStage` (first time only, 380 x 132): margin circle, the Phoenix card in the centre (no docking: it stays the hero), the market circle, the two short paths, the particles and the position chip.
- A `Chip` view (pop, then dock with translate + fade).

## New props (TxSpec / flow)

```ts
type PerpsFlow = {
  kind: "perps";
  // parts are internal: they drive the stage (first time) and the one progress bar, never a visible step list
  parts: { key: "setup" | "add" | "order" | "return"; caption: string }[];
  // one approval for all parts: the sheet waits once, then follows the parts
  send: (on: { onStatus?: (s: TxStatus) => void; onPart?: (i: number, s: "sending" | "confirmed", sig?: string) => void }) => Promise<string>;
  margin: { before: number; after: number }; // USDC in the margin account, for the count
  phoenix: { before: number; after: number }; // Phoenix collateral
  order: { pair: string; side: "long" | "short"; lev: number; size: string; mark: string };
  onFailAfterDeposit?: { retry: () => void; returnUsdc: () => void };
};
```

- `sendSolanaBatch` needs `opts.onPart(i, "sending" | "confirmed", sig)`. Today it only has `onStatus`. `solanaPerpsOpen` must map batch parts to UI steps: group by label, because a split deposit is two parts with one label.
- `solanaPerpsOpen` should return or throw something structured instead of a sentence, e.g. `{ landed: ("setup" | "add")[], failed: "setup" | "add" | "order" | "nofill", reason }`, so the sheet picks the right copy and buttons.
- Retry order: call `solanaPerpsOpen({ ..., collateralUsdc: 0 })` to use the USDC already in Phoenix, without the setup and add steps. That is the returning "order only" flow.
- Return USDC to margin: the existing withdraw path (`perpsWithdrawParts`, as Close all / "Withdraw from Phoenix").

## Open questions

1. **Setup landed, add failed:** the current message says "Your N USDC is in Phoenix now" whenever `amount > 0`, but in this case nothing moved. The structured error above fixes it.
2. **Split deposit, only the wrap landed:** the USDC sits wrapped in the margin account. The user should get a plain message (e.g. "Your USDC is still in your margin account; tap Try again") and the next Withdraw or Retry must unwrap it.
3. **Return USDC: how much?** Only what this attempt deposited (10.00), or all free collateral (14.20 in the returning case)? The prototype returns the deposit in the first-time case and all free collateral in the returning case.
4. **Order only:** what should the ticket do when Phoenix already holds enough? Today the ticket always takes collateral from the margin account. Does the user choose "use what is in Phoenix", or is it automatic?
5. **Is setup really one time per margin account** if the trader is later closed? The prototype labels it "One time".
6. **Fee row:** show the per-part fee × parts, or the total of the batch?
7. **Long wait inside a part** (after signing, e.g. a slow confirmation): keep "processed" with the glint, or add a quiet line after 20 s?

---

# Multi-leg transaction sheet (`multi-leg.html`)

**Problem.** Close all with 2+ positions signs once, then sends one transaction per position. Today the sheet only says "Sent to Solana" with the Sent / Processed / Confirmed bar, so for 30 s to minutes the user can't tell which position is closing or which are done.

**Design.** Under the header and the Sent / Processed / Confirmed labels, a compact card lists one row per leg, in order:
- a status icon: grey dot, turning brand-gradient arc, purple check, pink cross, amber clock
- the leg's label in plain words: "Close META short", "Convert USDC", "Open ETH long", "Return USDC to margin"
- a short state word that follows the leg's real phases

The bar above is **segmented, one segment per leg**. A segment fills when its leg is done (pink when it failed), and the active segments carry the soft glint. The labels light on real events:
- **Sent:** any leg is sending.
- **Processed:** a leg landed.
- **Confirmed:** every leg is done.

Each row is 40 px. A failed or unsure row adds one 12 px line with the reason.

| Phase (word) | When (submit.ts) | Icon |
|---|---|---|
| Waiting to sign | parts built, `signSolanaBatch` waiting for the wallet | grey dot |
| Waiting | signed, but a dependent leg waits for the previous one | grey dot |
| Needs approval | a follow-up transaction that needs its own approval (Close all → "Return USDC to margin", `returnUsdcAfterClose`) | purple dot, breathing |
| Checking | `before` / `refreshAll` plus the re-simulation (`checkSigned`) | slow arc |
| Sending | `broadcastAndConfirm` broadcast | arc |
| Confirming | waiting for `confirmed` | arc |
| Still confirming | the confirmation timed out; the app reads the chain (`loadPerps`) to decide | amber clock + "Confirmation timed out. Reading the chain…" |
| Done | confirmed | check (pops) |
| Failed | simulation or send error | pink cross + reason |
| Not sent | the wallet said no, or an earlier dependent leg failed | grey dot, muted label |

**Order:**
- Independent batches (`sendSolanaBatch` with `independent: true`, i.e. Close all) move together: all legs go to Checking at once, then each one moves on by itself, so the rows change in parallel.
- Dependent batches (Perps open: Convert USDC, then Open ETH long; margin steps; the first-time Phoenix flow) run in order, and the next leg shows "Waiting" until the previous one is done.

**Finish states:**
- **All done:** every row ticked; header "Closed 2 positions" / "41.20 USDC is back in your margin account"; mascot tongue flick; Done.
- **Partial:**
  - Header "Closed 3 of 4" with "ETH long is still open. The other closes are done."
  - The failed row shows its reason ("No liquidity near the mark. Try again shortly.").
  - Buttons: **Close the remaining 1** (a new run with only those legs) and Done.
  - Perps open with the order failed: "Order not placed. Your USDC is in Phoenix…" with **Retry order** and **Return USDC to margin**.
- **Wallet rejected or timed out:** "Not confirmed / … Nothing was sent." with Try again / Close; the rows read "Not sent".
- **Second approval declined** (the return leg): "Closed 2 positions / Your USDC stays in Phoenix for now" with **Move USDC to margin** / Done.
- **Dismissed with X while legs run:** the sheet closes and the legs go on. A toast (the overlay toast: #2C2C2C, 44 px, radius 22) sits above the tab bar with a small spinner: "Closing positions · 2 of 4 done", and **View** reopens the sheet. When the run finishes, the final toast reads "Closed 3 of 4 · META is still open" (or "Closed 4 positions · USDC back in margin") with **View**.

**Motion** happens on state changes only:
- the row spinner turns (900 ms linear; 1400 ms while Checking)
- the check pops (scale 0.6 → 1, spring 380 ms)
- a failed row nudges (shake 380 ms)
- the active row gets a light purple tint (300 ms)
- the state word swaps in (260 ms)
- a segment fills (500 ms, `bezier(.2,0,0,1)`)
- the header is concept A (face + loader badge → drawn check / concerned face)

Reduce motion removes every animation and transition; the icons and words alone tell the state.

**Interaction:**
1. Pick a scenario in **Simulate**:
   - Close all · 2 positions
   - Close all · 4 positions
   - Perps open · two parts
   - Close all · one leg fails
   - Perps open · the order fails
   - Close all · a confirmation times out
2. Tap the sheet's button.
3. Answer in the **mock Phantom** panel (Approve / Reject / Time out). Nothing moves before Approve.
4. Move the chain on with **Play next step**, or with the per-leg buttons ("Checked → send", "Sent → confirm", "Confirms", "Fails", "Times out", "It landed" / "It did not land"). The **Auto-play** toggle steps every 900 ms but never answers the wallet for you.
5. Reset any time.

**Dev controls** (collapsed): speed, light/dark, reduce motion, device, phone width 320 / 360 / 380 / 412, and a debug line with every leg's phase.

## What the app needs to report (data shape)

```ts
type LegPhase = "wait" | "queued" | "approve" | "check" | "send" | "confirm" | "unsure" | "done" | "failed" | "skipped";
type Leg = { id: string; label: string; phase: LegPhase; reason?: string; signature?: string };
type TxLegs = { legs: Leg[]; independent: boolean };

// sendSolanaBatch (submit.ts) already knows every part's label and the moments below; today it reports only an overall status.
type BatchOpts = {
  // ...existing (computeUnits, independent, refreshAll)
  onLeg?: (i: number, phase: LegPhase, info?: { signature?: string; reason?: string }) => void;
};
```

Where each callback fires in `sendSolanaBatch`:

| Callback | Fires at |
|---|---|
| `onLeg(i, "wait")` | after `prepareTransaction`, for every part |
| `onLeg(i, "queued")` | right after signing, for the later parts of a dependent batch |
| `onLeg(i, "check")` | before `before()` / `refreshAll()` and `checkSigned(i)` (independent: all at once) |
| `onLeg(i, "send")` | when `broadcastAndConfirm` broadcasts |
| `onLeg(i, "confirm")` | when it starts waiting for `confirmed` |
| `onLeg(i, "unsure")` | when the confirmation times out (the caller then reads the chain) |
| `onLeg(i, "done", { signature })` / `onLeg(i, "failed", { reason })` | when the part settles; for a dependent batch, mark the remaining parts `"skipped"` |

Also:
- **The second-approval leg** ("Return USDC to margin" after the last close) is added by the caller (`solanaPerpsCloseMany` → `returnUsdcAfterClose`) as `{ phase: "approve" }`, then follows the same callbacks.
- **Close all's result after a timed-out confirmation** comes from the chain read (`stillOpen`): set those legs to `done` or `failed` from it.
- **Labels:** user words, not part labels. Map "Close META-PERP" → "Close META short", and "Add USDC for X-PERP" (it can be two parts) → one leg "Add USDC".

**Components to reuse:**
- From `src/ui/tx.tsx`: `TxFlow` (phases, `recover` buttons → "Close the remaining N" / "Retry order", the hidden-run announcement → the toast with View), `Progress` (keep the labels and replace the single fill with one `Animated.View` segment per leg, each animating `width`), `MascotDone` / `TailLoader`.
- From `src/ui/first-time-flow.tsx`: `Tag` / `ck` row styling for the leg rows, the `trow` layout, haptics on each confirmation, `guardSheet` while waiting for the wallet, and `useOnForeground` to re-read on return.
- New: `LegRow` (icon cross-fade between dot / spinner / check / cross / clock, the state word, an optional reason line) and `LegList` (adds rows when a leg appears, e.g. the return leg).

> **v2 of the multi-leg sheet** (whole-operation prose, one explorer link per leg, every flow in the app, retry only the failed legs and the app-side contract) is in [MULTI-LEG.md](MULTI-LEG.md).
