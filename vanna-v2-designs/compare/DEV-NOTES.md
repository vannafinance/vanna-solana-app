# Notes for the app developers

How three recent designs map onto the app. Open the screens in `compare/vanna-compare.html` (New side) to try them.

## Test faucet (Profile) · design F3

Screens: **Profile** (`V7Profile`) and **Profile · test faucet** (`V7ProfileFaucet`).

This wraps the faucet component you already built. Its contract stays the same: the same token list, one call per token, and the same note. Only the presentation changes.

| Part | What it is | From your component |
|---|---|---|
| Settings row | One card after **Account**: four token logos stacked, "Test faucet", "Get test tokens for the Vanna fork", a chevron. Tap opens the sheet. | New wrapper, no logic |
| Sheet | Bottom sheet: title "Test faucet", a **Fork only** tag, "Tap a token to get some. Use them anywhere in Vanna.", a 3-column grid, then the note. | New wrapper |
| Grid tile | Token logo (34dp), symbol, and a label under it. The whole tile is the button (accessible name "Get test USDC"). | One tile per token in your list |
| Tap | Calls your existing mint for that token. | Your call, unchanged |
| States | **Idle**: label "Get". **Getting**: a ring spins around the logo, label "Getting…", taps ignored. **Sent**: a teal tick lands on the logo, label "Sent", back to idle after ~2.4 s. **Failed** (if your call errors; not mocked in the prototype): label "Try again" in red, tap retries. | Map to your call's pending / success / error |
| Note | "Test tokens for the Vanna fork. SOL for fees is not included." | Your text, unchanged |
| Visibility | Show the row only on the fork (devnet / local), never on mainnet. | Same flag you use today |

Sizes: tiles are 92dp tall with 8dp gaps and a 16dp corner radius. The sheet has a 28dp top radius and 20dp side padding. The tick badge is 18dp, the success colour is `#1C7C83`, and the spinner colour is `#4B44E0`.

## Earn › vault tabs · design T2

Screens: **USDC vault** and its Details, Activity, Collateral and Analytics states (`V7EarnVault*`).

- The five tabs are pills (36dp tall, 18dp radius) in a horizontally scrolling row with 20dp side padding. The selected pill is filled teal `#11727A` with white text.
- While there is more on a side, that edge fades into the page (72dp) and shows a 32dp round arrow button that scrolls the row by about 160dp. At each end, that side's fade and arrow disappear.
- When a tab is selected it is scrolled fully into view, clear of the arrows. The first tab scrolls to the start and the last tab to the end.
- On Android: `LazyRow` or `ScrollableTabRow` plus an overlay for the fades and arrows. Drive their visibility from `canScrollBackward` / `canScrollForward`.

## Margin account in place

Screens: **Markets · no margin account yet** (`V7MarginCreate`), the envelope sheet states (`V7MarginAgree`, `V7MarginSign`, `V7MarginDone`, `V7MarginFee`, `V7MarginRejected`) and **First trade** (`V7PerpsOrderFirst`).

- There is no separate margin page and no agreement. Vanna's first margin action creates the account (`user_create_margin`).
- **Markets without an account:** a banner, "Open your margin account / One tap, then go long or short up to 5x / Open". The header shows the wallet balance as "In your wallet, ready as collateral".
- **Open** brings up a sheet with the envelope (sealed with the Vanna seal, addressed to the wallet, the account card inside). One wallet approval. While Solana confirms, the seal breathes. On success the tick draws into the seal, the flap opens, the card rises out, and the sheet says "Your margin account is open".
- **First order without an account:** the normal transaction sheet in two steps. Step 1 shows the envelope ("Step 1 of 2 · Open margin account"). When it confirms, the envelope opens with "Margin account opened"; step 2 then asks for the order. If both can go in one transaction, drop step 1's separate approval and keep the envelope.
- **Engraved card:** dark `#17131F` with fine rings, the Vanna mark with the wordmark, the account address in monospace 17dp, and "MARGIN ACCOUNT" in small caps.
- **Motion:** about 2.3 s in total, using emphasized decelerate `cubic-bezier(.05,.7,.1,1)`. The video is `compare/renders/margin-live.mp4`.
