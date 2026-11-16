# Session handoff, 2026-11-16 (Stellar testing, Dynamic session, charts)

Nothing is committed or pushed. When done: ONE squashed commit, author `adityavanna`, title + description only, no AI attribution
(exclude `credentials.json` and `credentials/`; include `docs/CONTRACT_DEV_QUESTIONS.md`).

## Verified on the emulator (Stellar testnet, each confirmed on-chain)
Earn supply/withdraw, margin deposit+borrow, repay, swap, faucet, Blend XLM deposit and 50% withdraw, Soroswap XLM/USDC LP
deposit and full withdraw, margin transfer to wallet and back, AqUSDC wallet -> margin collateral.

## Open: Aquarius LP deposit fails on submit
Preview now correct (live reserves, ~19.4 XLM per USDC). Pressing Deposit gives "XDR Read Error: unknown ScValType member for
value 22" (stellar-base 14.1.0 and 15.0.0 both stop at type 21). Not yet located. Temporary `console.warn("[submit] ...")` lines
were added in `src/chain/stellar/submit.ts` (after sendTransaction and on getTransaction) to find which decode throws: check
`adb logcat -s ReactNativeJS:W | grep submit` after a deposit attempt. Suspects: `describeFailedTx` / diagnostic events (submit.ts ~82),
`SorobanTransactionData.fromXDR` (~181), auth entries (~180), or `TransactionBuilder.fromXDR` on the Dynamic-signed XDR.
Withdraw path for Aquarius is untested. Needs 2,000+ XLM idle in the margin account for 100 AqUSDC.

## Changes made this session
- Dynamic session: `src/chain/sign.ts` waits for Dynamic's own wallets (`walletsBack`), else signs the user out; new
  `src/chain/session-guard.ts` (`useSessionGuard`, called in `src/app/_layout.tsx`) returns the user to sign-in with
  "Your session ended. Sign in again" when Dynamic has no session after ~90 s. Root cause seen: the app's saved sign-in outlived
  Dynamic's session (emulator cold boot). Real-phone behaviour (Redmi K50i) still unverified.
- Dark mode now persists: `src/state/appearance.ts` (`reapplyAppearance`, also accepts "system") called from `_layout.tsx`.
- Farm: deposit limit uses the margin account's full balance (`mbal`/`mTake`/`mAddColl`); chain-read Blend positions
  (`fetchBlendPositions` in `src/chain/stellar/farm.ts`) shown at the vault's live APY (`apyOf`); Holding shows token amount with USD
  below; LP deposit preview uses live pool reserves (`lpReserves`).
- Health factor matches the website: Blend supply counts as collateral (`account.ts` `blend`, `gross` includes it). Website HF 3.50.
- Charts: all `curve()` sample series removed (Earn deposits chart is real, from `src/state/series.ts` + timestamps `ms` on activity;
  everything else shows "No history yet"); Margin History no longer shows the empty P&L/HF chart card.
- Copilot: Agent (MCP) card removed from the lock screen. Interactive redesign study (NOT in the app) is in
  `../copilot-lock-design/` (index.html + mascot.json), served with `python -m http.server 5190`.
- "Vanna wallet" prefix removed from the tx review Account row.

## Findings to pass on
- Aquarius pool APR shows 4.32% in the app (Aquarius API); the website shows 0.00% because it reads only page 1 of
  `/pools/` (50 items) and our pool is on page 8. Other dev is fixing the website. Do not copy the 0% into the app.
- Solana fork RPC `rpc-devnet.solana.vanna.finance` was down, then back (getSlot answers).
- SDKs: Dynamic Kotlin SDK 1.7.1 AAR (`modules/vanna-dynamic/android/libs/dynamic-sdk-android.aar`), `@stellar/stellar-base ^14.1.0`,
  Dynamic environment 90dad26e-c7b1-4047-857e-ab4ad5596f9a.

## Still to do
1. Fix the Aquarius LP deposit (above), then test its withdraw. Test Stellar send (wallet to another address).
2. Solana, through the app UI: earn, margin, swap, perps, predict, send, farm (all pools); check data is live and correct.
   `src/screens/copilot/chg.ts` still has a hard-coded 24h-change table.
3. Real wallets (user does the approvals): Freighter + OneKey (Stellar), Phantom + Solflare (Solana); Redmi K50i, including
   closing and reopening the app. Wallet list vs website (Solana: Email+Backpack; Stellar: Freighter+OneKey, others "Soon").
4. Remove debug logs: `[sign]` in sign.ts, `[faucet]` in actions.ts, `[submit]` in submit.ts.
5. Build the Copilot lock-screen redesign in the app if the user approves it (keep the mascot).
6. Commit/push once testing is done.

## Emulator how-to
AVD `vanna_pixel`, started hidden (`emulator.exe -avd vanna_pixel -no-snapshot`, PowerShell `-WindowStyle Hidden`); Metro
`npx expo start --dev-client --host localhost --port 8081` plus `adb reverse tcp:8081 tcp:8081`. Taps: `C:\v\tap.sh x y [sleep]`
(coordinates as displayed at 900x2000). A cold boot loses the Dynamic session, so the user signs in again (I never enter logins).
