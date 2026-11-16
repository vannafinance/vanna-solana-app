# Vanna mobile app: full-context handoff

Written 2026-11-06 by the previous agent (Claude, in Claude Code) for whoever continues, e.g. Grok in Cursor.
Read this whole file, then `docs/CURRENT_TASK.md`, before changing anything. Facts marked UNVERIFIED were not tested.

---

## 1. What this is

Vanna is a DeFi app (lend, margin, spot, perps, farm, predict) on **two chains: Solana and Stellar**. The web app is live at
https://test.vanna.finance. This repo is the **mobile app**: Expo SDK 58, React Native 0.88, expo-router, TypeScript.
Android first, tested on the user's Redmi K50i through **Expo Go**. iOS code must stay working, but cannot be device-tested
yet: there is no Apple Developer account.

Golden rules from the user:
1. **The V7 design is the source of truth** (`design/app.html`). Match it exactly unless the user decided otherwise.
   Section 4 lists the agreed exceptions.
2. **The app is standalone.** It does not call the Vanna web backend. It reads the chains (and the same public APIs the
   web uses) directly and must compute the **same numbers as test.vanna.finance**. Cross-check against the site.
3. **Be honest.** Say "not done" or "not verified" plainly. Never present sample data as live.

## 2. Current state (2026-11-06)

- Paths:
  - App repo: `C:\Users\akgam\Documents\Company Work\Vanna App\vanna_mobile_app`. The parent folder is not a git repo.
  - Drive `V:` is a `subst` alias of this folder. Build Android from `V:\android`: Windows' path-length limit breaks the
    C++ (CMake/ninja) steps under the long real path.
- **Git: work on branch `claude/vanna-mobile`** (local only, no remote). The user's rule (2026-11-06):
  - Every agent commits each finished piece of work there.
  - Every commit updates this file (section 2 and the work log at the bottom), so the next agent can continue from the
    branch alone, without guessing.
  - Never commit `.env`, `android/`, `ios/` or build output (all are git-ignored).
- Checks:
  - `npx tsc --noEmit`: clean. `npx expo lint`: 0 errors, 8 warnings.
  - `npx expo export --platform android`: builds (2,299 modules).
- Expo dev server:
  - It was running from the previous agent's terminal tab (`npx expo start --clear`, port 8081, LAN `exp://192.168.29.226:8081`).
    If port 8081 is busy, a server is already up. Reuse it, or ask the user to stop it.
  - `app.json` has `experiments.reactCompiler: false`. The server reads `app.json` only at start, so restart after config changes.
- The shared artifact for the owner is https://claude.ai/artifact/1xUZuJGuMomECw3uUuEm5J (version 7). It has three sections:
  - intro styles
  - the wallet flow
  - "V7 vs now", which shows every agreed difference from V7, marked
  - Sources are in `..\_spikes\artifact-src\`. Build them with
    `node ..\_spikes\artifact-src\build-concepts.js ..\_spikes\artifact-src\concepts.tpl.html ..\deslop-preview\concepts.html ..\_spikes\artifact-src\ic4`
    run from `vanna_mobile_app`.
  - Publishing it is a Claude-only tool. In Cursor, give the user the built HTML file instead.

## 3. Read these first

| What | Where | Why |
|---|---|---|
| Expo rules | `AGENTS.md` | Use `npx expo install`, versioned Expo docs, and keep non-route code out of `src/app`. |
| V7 design | `design/app.html` (one big HTML/JS file) | Every screen is `SCREENS['route']`, sheets are `SHEETS[...]`, and the route table is around line 4500. To view it, serve the folder: `npx http-server design -p 8095`. |
| Web app source (logic reference) | `..\_ref\vanna-web-backend\` (copy of private GitHub repo `vannafinance/Vanna_Finance_Backend`, Next 16 monorepo: `apps/solana`, `apps/stellar`) | All the maths, contract IDs and data sources. Port from it; never import from it. Re-clone with `gh repo clone vannafinance/Vanna_Finance_Backend` if needed. |
| Shipped Solana app (older, for UI parts like the leverage slider) | `..\_ref\vanna-solana-app\` | |
| Dynamic native module | `modules/vanna-dynamic/README.md` | How to build the email-wallet module and what to set in the Dynamic dashboard. |
| Task to do now | `docs/CURRENT_TASK.md` | |

## 4. Decisions, and why

**Data and chains**
- **Chain reads use plain `fetch`, not SDKs.**
  - Stellar: `@stellar/stellar-base` builds a transaction, and `simulateTransaction` / `getLedgerEntries` go over JSON-RPC
    (`src/chain/stellar/read.ts`, `readContract(contractId, method, ...args)`).
  - Solana: plain JSON-RPC (`src/chain/solana/rpc.ts`) to the Vanna fork `https://rpc-devnet.solana.vanna.finance`.
  - Rejected: `@stellar/stellar-sdk` (section 5) and `@solana/web3.js` (Node and polyfill weight). PDAs are derived with
    `@noble/curves` 1.9.7 and `@noble/hashes` 1.8.0 (`src/chain/solana/pda.ts`).
- **Live data mutates module-level sample data.**
  - `src/sample/data.ts` holds `DATA`, `POOLS_BY`, `PX` and similar. `src/chain/live.ts` overwrites them inside `mutate()`
    (`src/state/store.ts`) every 30 s and when the app returns to the foreground.
  - Components re-render through `useDataVersion()`. **Any screen that shows live data must call `useDataVersion()`.**
  - Chosen so every screen kept working on sample data while the chains were wired one by one.
- **What is live, all verified equal to test.vanna.finance on 2026-11-05/06:**
  - Earn pools on both chains: supply, borrow, utilisation and rates.
    - Stellar uses RateModel `get_borrow_rate_per_sec × 31,556,952`, with supply rate = borrow rate × utilisation and no reserve cut.
    - Solana reserves are decoded from account bytes.
  - Prices. Solana: the Vanna oracle PriceBook (Scope, then Pyth). Stellar: oracle `get_price_latest`.
  - Stellar vToken exchange rate (pool supply ÷ vToken `total_supply`).
  - Account readers `fetchStellarAccount(owner)` and `fetchSolanaAccount(owner)`.
    - Stellar was checked exactly against the site for one wallet: HF 2.4538.
    - **They are not connected to screens yet.**
    - On Solana, the debt path is untested because the test wallet has no debt.
  - Farm:
    - Blend reserves via `get_reserve` on pool `CCEBVDYM…Q44HGF`, ported from the web's `_parseReserveData`.
    - Kamino from the `api.kamino.finance` metrics API.
    - Perena 7-day APY from `api.perena.org` (send the header `Origin: https://app.perena.org`).
    - Basis "Funding now" = Phoenix hourly funding × 8,760.
    - LP pool TVL from reserves × prices.
  - Perps: Phoenix `perp-api.phoenix.trade`, public, keyless.
    - The WebSocket `market` channel gives mark price, funding, OI, volume and 24 h change.
    - Candles come from REST `/v1/candles/{SYM}?timeframe=&limit=&endTime=` and the WS `candles` channel. The book and
      trades also come over the WS.
    - Perps price from the Phoenix mark everywhere (`src/chain/perp-mark.ts`). Spot uses the oracle `PX`.
- **Still sample data (be honest about it):**
  - Each user's positions and balances (`DATA[chain]`) until sign-in feeds the account readers.
  - Predict markets: the site's endpoint is behind an access code. The web server reads World's markets from Solana
    mainnet with `getProgramAccounts`, which needs a mainnet RPC that allows it.
  - Perena share price and TVL, basis APY and TVL: the web gets these from its own server's NAV history.
  - LP APR, and the spot price chart (the web has no spot chart either).
  - For the first ~15 s after launch, screens show sample numbers until the live data arrives. Whether to show
    placeholders instead was asked; the user has not answered.

**Wallets**
- **Wallet flow = the version in the artifact**, which the user chose over V7's:
  - several wallets per chain, one tap to switch, plain black sign-in screen
  - email, Google or X, or a wallet
  - V7 itself has one wallet per chain, an orbit background, and Google/Apple/Passkey
  - Full details in `docs/CURRENT_TASK.md`.
- **Email wallets through Dynamic's native SDKs** (Kotlin on Android, Swift on iOS) in a local Expo module, because:
  - Dynamic's native Kotlin, Swift and Flutter SDKs create and sign **Stellar** embedded wallets (docs pages
    `/docs/kotlin/wallets/stellar/overview` and `/docs/swift/wallets/stellar/overview`).
  - Dynamic's **JS / React Native SDK does not** do embedded Stellar wallets; it supports only Freighter, LOBSTR and
    OneKey extension-style wallets.
  - The web app (test.vanna.finance) uses Dynamic's web SDK, so one email gets one Solana and one Stellar wallet. The
    mobile app must give the same wallets for the same email.
  - The Kotlin and Swift SDKs also cover Solana, so a single module handles both chains.
  - Rejected: Para, Privy, Web3Auth, Crossmint and passkey-kit. The web already uses Dynamic, and only Dynamic gives the
    same email the same wallets. Note that Dynamic has **no free live tier**; Growth is $249/month for 5k MAU.
- **Persistence:** sign-in, wallets (public addresses only) and the "welcome seen" flag live in AsyncStorage
  (`src/state/wallets.ts`, `src/state/session.ts`). They are loaded before the splash hides (`hydrateSession()` in
  `src/app/_layout.tsx`), so a returning user is never asked to connect again. Never store keys.
- **Biometrics:** `expo-local-authentication`, which works in Expo Go (`src/state/lock.ts`, `src/components/app-lock.tsx`).
  - App lock after 5 minutes in the background.
  - Optional "confirm transactions with biometrics", which prompts in `src/ui/tx.tsx`.
  - These toggles live in Account › Security.

**Agreed differences from V7 (the user decided these; do not "fix" them back):**
- **Module heroes:** Trade and Farm use V7's account-strip hero with **no Watch/Safe badge**. Flash repay is the **red
  gradient** button; on Farm's pink hero it also gets a white ring (`ring` prop on `IconAction`). V7 has a translucent one.
- **Health factor:** never show a Watch/Safe word next to the number.
- **Toasts:** an inverse pill with an icon, sitting just above the tab bar (`toast(text, tone)` in `src/ui/overlay.tsx`).
- **Rewards:**
  - Tabs with icons.
  - Quests with coloured icons and done dates.
  - Profile tab: the identity block is the leaderboard row.
  - The rank pill opens Leaderboard (V7 does this too).
- **Account:** the test faucet sits inside the Network card. The faucet is a sheet with one tile per token.
- **Flash repay sheet:** venues are folded to one line, tap to open.
- **Mascot:** always on, with no setting to turn it off.
- **Sliders:** large, like the shipped Solana app's `LeverageSlider`.
- **Theme changes:** cross-fade the whole app (`src/ui/theme-fade.tsx`).
- **Earn vault page:** the content scrolls and Withdraw / Supply are pinned at the bottom, as in V7. For Stellar it shows
  a 0–15% liquidation penalty (no reserve factor) and the real contract addresses.

## 5. Tried and failed (do not repeat)

- **`@stellar/stellar-sdk`:** v17 breaks Metro web (`@noble/hashes/sha2.js` resolution). v14 breaks the Android bundle
  (`eventsource` needs Node `url`). Use `@stellar/stellar-base` and `fetch`.
- **The Vanna Solana fork RPC rejects `getProgramAccounts`.** Derive PDAs instead: seeds `"margin", owner` for the margin
  account and `"debt", margin, reserve` for each debt.
- **Hermes has no `Buffer.subarray().equals`.** Compare bytes in a loop. A global Buffer polyfill comes from
  `src/chain/polyfills.ts`, which must stay the first import in `_layout.tsx`.
- **Token-2022 program ID:** mistyped twice. Copy it from the web repo:
  `TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb`.
- **test.vanna.finance's own APIs** return 401 `access_required`. You cannot use them; read the chain.
- **Perps price:**
  - Mixing the fork oracle price with Phoenix's 24 h change made screens disagree.
  - Perps now use the Phoenix mark everywhere. Add any new perps maths through `perpMark()`.
- **Hero layout:**
  - A fixed 234 px hero left the account strip floating with a gap under it.
  - The user then chose V7's compact hero: `heroAuto` on Trade and Farm.
- **Pushed screens with a pinned footer:**
  - `AfterTransition` (`src/ui/ready.tsx`) must pass `style={{flex:1}}` to its wrapper, or the ScrollView cannot scroll
    and the footer floats up. This is fixed now; keep it that way.
- **Tab screens stay mounted:** Margin reopened on whichever section was last used. It now resets to Leverage on blur
  (`useFocusEffect`).
- **Design fragments:** when patching design HTML with JS `String.replace`, `$$` turns into `$`. Use `split().join()`.

## 6. Corrections (the previous agent was wrong here)

- I told the user "Dynamic's Swift SDK has no Stellar" after reading its stale intro page. **Wrong.** The per-chain pages
  confirm Stellar on Swift, Kotlin and Flutter. Cite per-chain wallet pages, never intro pages.
- I told the user "V7 has no wallet flow". **Wrong.** V7 has:
  - `SCREENS.signin`
  - `SCREENS['chain-pick']`
  - `SHEETS['ob-link']`, one wallet per chain
  - the Account wallets card and the Security card
  The user then chose the artifact's multi-wallet version anyway.
- I once redesigned the intro orbit without being asked, and the user was upset. **Never change a design the user
  didn't ask to change.** Preview first.
- An earlier vault page showed made-up supply and borrow caps and a made-up share rate. Fixed. **Never show invented
  numbers as real.**

## 7. In flight / unfinished

- **Dynamic module (`modules/vanna-dynamic`):** the code is written (Kotlin, Swift, JS wrapper `src/chain/dynamic.ts`,
  config plugin registered in `app.json`).
  - Dynamic's Android SDK files `dynamic-sdk-android.aar` and `solana-web3.aar` (GitHub release 1.7.1 of
    `dynamic-labs-oss/android-sdk-and-sample-app`; not on Maven) are in `modules/vanna-dynamic/android/libs/` and
    committed.
  - `.env` holds `EXPO_PUBLIC_DYNAMIC_ENV_ID` (the web's ID `90dad26e-…`); `.env.example` names the variable.
  - Kotlin in `modules/vanna-dynamic` compiled cleanly on EAS Android development build `6f84f3e5-3322-49fd-b922-9d5d618540e6`.
  - Bytecode inspection (`javap` on `dynamic-sdk-android.aar`) confirmed `DynamicWebViewController` creates its own headless `android.webkit.WebView` on `DynamicSDK.initialize(...)`, and all method/parameter signatures match `VannaDynamicModule.kt`.
  - Expo Go cannot load native modules: test email sign-in with the installed EAS development APK (`https://expo.dev/artifacts/eas/VisGaIoD20AY_zVWk9B2RHXCiI4bmOFtKRpba-g577U.apk`).
  - UNVERIFIED on device: end-to-end email OTP verification and Device Registration setting in the Dynamic dashboard.
- **Sign-in (`src/app/sign-in.tsx`):**
  - Email uses Dynamic when `dynamic.available`, and otherwise a stand-in where any 6-digit code works and example
    addresses are made up.
  - Google, X and external wallets are **stand-ins**: sample addresses, no real connection.
- **Account data:** `src/chain/account-live.ts` loads the signed-in **real** wallet's figures into `DATA[chain]`:
  - wallet balances
  - Earn positions (vToken balance × live rate; vToken decimals are read from the token: BLUSDC's are 6)
  - margin collateral, debt and LP rows
  - It refreshes on wallet change, every 30 s, and when the app comes back.
  - Health, debt, equity and leverage come from the chain readers through `LIVE_ACCT`, which `acct()` in
    `src/sample/model.ts` uses.
  - With a stand-in (preview) wallet, screens show dashes (`src/state/personal.ts`) and `DATA` keeps the demo account.
  - Solana: wallet, collateral and debt only. Earn lender positions, Phoenix perps and Kamino receipts are not read yet.
- **Transactions:** `runTx` (`src/ui/tx.tsx`) runs review → biometric → `spec.send()` → progress → done or fail.
  - **The only real on-chain action is Stellar Earn supply / withdraw** (`src/chain/stellar/submit.ts`): build →
    `simulateTransaction` → sign with Dynamic → `sendTransaction` → poll `getTransaction`. These are the same calls the
    website makes: `deposit(user, amount×1e18)` and `redeem_vtokens(user, shares×1e18)`.
  - **Withdraw takes vToken shares**, not the underlying amount. A 100% withdraw sends the exact vToken balance.
  - Any other action with a real wallet stops with "not connected to the chain yet. Nothing was sent", never a pretend
    success.
  - After a real transaction, the account is re-read, and "View on Stellar Expert" opens the real hash.

## 8. Open questions for the user (blocked on a person)

1. OK to download the two Dynamic `.aar` files from GitHub? Alternatively, the user runs the fetch script themselves.
2. Is the Dynamic environment ID `90dad26e-c7b1-4047-857e-ab4ad5596f9a` (from the web repo's `cloudbuild.yaml`) the right
   one for mobile? Put it in `.env` as `EXPO_PUBLIC_DYNAMIC_ENV_ID=...`. There is no `.env` yet.
3. In the Dynamic dashboard, the user (or the owner) must:
   - whitelist the mobile deeplink `vannadynamic://`
   - enable Email
   - turn on embedded wallets for Solana and Stellar
   - set Stellar to Testnet
4. How to make the development build:
   - **Local** (`npx expo run:android`) needs Android Studio, the Android SDK, and the phone on USB debugging.
   - **EAS** needs an Expo account. There is no `eas.json` yet.
5. Show loading placeholders instead of sample numbers during the first ~15 s?
6. Predict live data: is it OK to use a paid or keyed Solana mainnet RPC that allows `getProgramAccounts`?
7. The owner is still reviewing the wallet flow in the artifact. If they reject it, its UI comes out (files listed in
   CURRENT_TASK.md).

## 9. How to work here (standing instructions from the user)

- **Talking to the user:**
  - Plain, simple language. Use Hinglish when the user writes Hinglish or asks for it.
  - Short answers: say what changed, what is verified, and what is not.
  - Say "not done" honestly. No hype.
- **Design work:**
  - Show a preview before applying design changes. Use a standalone HTML page, served locally, or the artifact.
  - Never change a design the user didn't ask to change.
  - For any new screen, open the matching V7 screen first and compare side by side before calling it done.
- **Before saying done, always run:**
  - `npx tsc --noEmit`
  - `npx expo lint` (keep 0 errors)
  - for big changes, `npx expo export --platform android --output-dir <temp dir>` (proves the Android bundle builds)
- **Checking numbers:** compare against https://test.vanna.finance; the user is logged in there in their browser.
  Pool pages are `/earn`, `/earn/BLUSDC`, `/farm`, `/margin`, and the chain switch is in the header.
- **Expo:**
  - Use `npx expo install <pkg>`, never plain npm, so versions match SDK 58.
  - Native packages need a dev build; prefer packages that work in Expo Go until the dev-build phase.
- **Architecture:**
  - Routes live in `src/app/`. Screens go in `src/screens/<module>/`, shared UI in `src/components/` and `src/ui/`,
    chain code in `src/chain/`, state in `src/state/`.
  - Data shapes and sample data live in `src/sample/`, view-models in `src/sample/model.ts`
    (`acct()`, `perpPnl()`, `priceRoom()`, ...).
- **Money actions** always go through `runTx(spec)` in `src/ui/tx.tsx`: review, then biometric sign, then progress, then
  done or fail.
- **Sheets, menus, tooltips and toasts:** `openSheet` / `openMenu` / `toast` from `src/ui/overlay.tsx`.
- **Icons:** Material Symbols from `src/components/ui/material-symbols.ts`, which is a subset. Check an icon exists there
  before using it; to add one, follow the existing entries' format.
- **Token logos:** `src/generated/logos.ts` plus `assets/logos/*.png`. Take new logos from
  `..\_ref\vanna-web-backend\apps\solana\public\logos-v3\`.
- **Never add** `@stellar/stellar-sdk` or `@solana/web3.js` to the app (section 5). The Dynamic module has its own native
  Solana library, which is fine.
- **Known warning, not caused by you:** the require cycle move.tsx → margin.tsx → trader.tsx → sheets.tsx → move.tsx.

## 10. Immediate next action

1. Start the dev server so the user can test on the phone:
   ```
   cd "C:\Users\akgam\Documents\Company Work\Vanna App\vanna_mobile_app"
   npx expo start --clear
   ```
   Tell the user to open **Expo Go** on the phone, on the same Wi-Fi as the PC, and scan the QR code. Web preview:
   http://localhost:8081. If port 8081 is already in use, a server is already running: reuse it.
2. Then start `docs/CURRENT_TASK.md` step 1.

---

## Work log (newest last; every agent appends one entry per commit)

- **2026-11-06, Claude (Claude Code), commit "Vanna mobile app: V7 screens…" (baseline):**
  - **Caught up on Cursor's session.** Cursor had added:
    - `.env` with the Dynamic environment ID
    - the downloaded `.aar` files
    - `src/chain/stellar/submit.ts` (real Stellar Earn supply / withdraw)
    - `src/state/personal.ts` (dashes for stand-in wallets)
    - the `send()` path in `src/ui/tx.tsx`
    - Aquarius LP APR from `amm-api-testnet.aqua.network`
    - the `V:` drive
    - It left `tx.tsx` without `useEffect` / `useRef` imports, so the app would have crashed. Fixed.
  - **Fixed** withdraw sending the underlying amount instead of vToken shares.
  - **Added** `src/chain/account-live.ts`, so real wallets show their real balances and positions.
    - Verified in Node for `GBNGN4TGUXX7OOH5XPN7JXWQ6FNIG567H6PDLR4OPBXGN5DKLQQCHHM3`: Earn 8.029 BLUSDC (the site showed
      8.02), HF 2.4286, debt $102.58.
    - Re-checking against the site was blocked: it asked for the access code again.
  - **Added** honest failure for real-wallet actions that have no on-chain path.
  - `tsc` clean, `expo lint` 0 errors.
  - First release build failed on the Windows path length (CMake/ninja), not on our code. Retrying from `V:\android`
    with `-PreactNativeArchitectures=arm64-v8a`.
- **2026-11-06, Claude, APK build attempt:**
  - **Local release builds fail on this PC.** The cause:
    - Windows `LongPathsEnabled` is 0.
    - The Android SDK only has CMake 3.22.1, which comes with ninja 1.10.2.
    - React Native's generated C++ object paths pass 260 characters, so ninja fails with `mkdir(...): No such file or directory`.
  - What was tried:
    - From the real path: fails.
    - `subst V:`: the tools resolve it back to the real path. Also, a project at a drive root breaks Expo autolinking
      ("Couldn't find package.json up from V:\").
    - A copy in `C:\vb`: still fails, in react-native-gesture-handler codegen.
  - Kotlin compile of `vanna-dynamic` is still unproven, because the build never reached it.
  - Ways forward:
    - (a) EAS cloud build (Linux), which needs the user's Expo login.
    - (b) The user enables long paths (admin) and installs a newer CMake (3.31+), then pins it for React Native.
  - `scripts/build-apk.ps1` builds from `C:\vb` and puts `vanna.apk` on the Desktop. Use it after option (b).
  - `C:\vb` is a disposable build copy.
- **2026-11-06, Claude:** wrote `docs/NEXT_ALL_TRANSACTIONS.md`, the plan for every wallet and every transaction on both chains (EAS cloud build, emulator, signing layer, per-action source map, test checklist). The user corrected me: all actions must be real, not only Stellar Earn.
- **2026-11-06, Claude:** added the MANDATORY verification section to `docs/NEXT_ALL_TRANSACTIONS.md` (every number and transaction checked against the web code and test.vanna.finance) and `GEMINI.md` for Antigravity.
- **2026-11-06, Antigravity (Step 0 — EAS development build):** added `eas.json` (`development` and `preview` APK profiles with `EXPO_PUBLIC_DYNAMIC_ENV_ID`), installed `expo-dev-client`, linked `@akizhere_08/vanna-mobile` (`a305e4f8-63a5-440f-8190-635cb0a03ab4`), verified `VannaDynamicModule.kt` against `dynamic-sdk-android.aar` bytecode (`javap`), and built the Android development APK on EAS (`6f84f3e5-3322-49fd-b922-9d5d618540e6`, status `FINISHED`, APK `https://expo.dev/artifacts/eas/VisGaIoD20AY_zVWk9B2RHXCiI4bmOFtKRpba-g577U.apk`). Kotlin module compiled cleanly; on-device email sign-in verification pending install on emulator/phone.
- **2026-11-06, Antigravity (Step 1 & Step 3 — Unified signing layer, Stellar & Solana actions, Solana position readers, 15 screen call sites, and live Perps terminal UI):**
  - Added unified signing dispatcher `src/chain/sign.ts` (`signStellar`, `signSolana`, `requireActiveRealWallet`) routing secret keys (`S...`), Dynamic embedded wallets (`VannaDynamic`), MWA (`@solana-mobile/mobile-wallet-adapter-protocol`), and WalletConnect.
  - Added `src/chain/stellar/actions.ts` & extended `src/chain/stellar/submit.ts` for all Stellar Soroban & Classic operations (Margin open/deposit/withdraw, Borrow, Leverage via Soroswap/Aquarius, Repay, Flash Repay, Spot Swap, Farm Blend/Soroswap/Aquarius, Transfer, and Faucet).
  - Added zero-`@solana/web3.js` V0/Legacy compiler & submitter `src/chain/solana/submit.ts`, full protocol actions in `src/chain/solana/actions.ts` & `src/chain/solana/perps-ix.ts` (Earn supply/withdraw, Margin create/deposit/borrow/repay/withdraw with `buildHealthRemainingAccounts`, Jupiter wallet & margin swaps, Kamino farm deposit/withdraw, Perena vault deposit/withdraw, Phoenix Perps open/close/withdraw with trader registration & LUT, Flash Repay, Wallet transfer, Fork Faucet, and World Predict split/merge), and live Solana position readers (`src/chain/solana/derive.ts`, `src/chain/solana/tokens.ts`, `src/chain/solana/positions.ts`, `src/chain/account-live.ts`).
  - Wired all 15 `runTx` screen call sites + Faucet + Copilot execution (`earn/amount.tsx`, `margin/margin.tsx`, `margin/sheets.tsx`, `move/move.tsx`, `trade/spot.tsx`, `trade/perps.tsx`, `farm/farm.tsx`, `predict/model.ts`, `copilot/engine.ts`, `app/copilot.tsx`).
  - Upgraded Perps terminal (`src/app/(tabs)/trade/perp/[k].tsx`, `src/screens/trade/perps.tsx`, `src/components/candle-chart.tsx`, `src/components/form.tsx`, `src/chain/market-live.ts`, `src/chain/solana/phoenix.ts`): `0.5x` leverage slider & stepper increments (`1x -> 1.5x -> 2x -> 2.5x -> 3x`), `SOLUSDC`/`ETHUSDC`/`BTCUSDC`/`TSLAUSDC`/`METAUSDC` naming with top Market Switcher dropdown, taller `300px` inline / `460px` full-screen interactive candlestick chart with `+`/`−`/reset zoom & live price pill, and 10-level live-streaming order book & trades. `tsc --noEmit` 0 errors, `expo lint` 0 errors. On-chain transaction hashes pending live wallet execution.
- **2026-11-06, Antigravity (Perps V7 Design & Circular Dependency Fix):**
  - Eliminated circular dependency between `src/chain/solana/actions.ts` and `src/chain/solana/perps-ix.ts` by moving `phoenixOracleAccountsHook` into `perps-ix.ts` (`setPhoenixOracleAccountsHook`), resolving the Metro web runtime error when opening `/trade/perp/[k]`.
  - Upgraded Perps market terminal (`src/app/(tabs)/trade/perp/[k].tsx`, `src/screens/trade/perps.tsx`) to match V7 design (`design/app.html` `SCREENS['perps-market']`): added compact V7 margin account strip (`.card.px-as`) at the top, V7 market header row + 4-column horizontal stats card with live 1-second funding countdown timer, native `openMenu` dropdown with smooth in-place market switching (no page reload), `1D` default chart timeframe with `#1C7C83` active pill, and in-place Full-Screen Long/Short `Ticket` bottom sheet overlay keeping the candle chart visible above it. `tsc --noEmit` 0 errors, `expo lint` 0 errors.
- **2026-11-10, Antigravity (Lend Pool SubTabs, Stellar Swap Venue Enforcement, Solana 10-Token Expansion & Attached-Chip Dropdowns):**
  - **Lend Pool SubTabs & Position Tab Fix:** Resolved routing and tab switching inside `/lend/vault/[sym]` and added aliased route `/earn/pool/[id]`. Added secondary `SubTabs` navigation (`Overview` vs `Position`) matching V7 design (`design/app.html`), displaying user-specific collateral, debt, health factor impact, and supply/withdraw position details.
  - **Stellar Swap Venue-Token Pair Enforcement:** In `src/screens/trade/spot.tsx`, enforced strict protocol venue pairing for Stellar testnet (Soroswap vs Aquarius). Prevented invalid pool routes by dynamically filtering token pickers and routing trades through the correct on-chain AMM contract.
  - **Solana 10-Token Live Expansion:** Expanded active Solana tokens in `src/sample/data.ts` and `src/chain/solana/tokens.ts` to 10 verified protocol assets (`SOL`, `USDC`, `USDT`, `ETH`, `BTC`, `BONK`, `JUP`, `PYTH`, `RAY`, `MSOL`), complete with verified devnet mint addresses, decimals, and price feeds.
  - **Attached-Chip 60fps Scroll-Tracking Dropdowns:** Refactored `openMenu` and custom dropdowns in `src/ui/overlay.tsx` and `src/components/motion.tsx` using `measureInWindow` and animated scroll listeners to anchor dropdown menus directly to trigger chips with zero frame drops during fast gestures or scroll transitions. `tsc --noEmit` clean, 0 errors.
- **2026-11-10, Antigravity (PillTabs Restoration & Vault Tab Alignment):**
  - Restored `<PillTabs>` horizontal scroll and view alignment logic in `src/components/motion.tsx`: simplified scroll-into-view to clamp within bounds only on value change or initial layout, preventing redundant scroll jumps while preserving smooth animated pill highlight.
  - Aligned `/lend/vault/[sym]` tabs with V7 design: switched from `SubTabs` to `<PillTabs>` with `color={families.earn.tab}`, standardizing tab identifiers (`Position`, `Details`, `Activity`, `Collateral`, `Rates`).
  - Restored `<SubTabs>` component in `src/components/motion.tsx` as a standard full-width underline tab bar for two-segment layouts. `tsc --noEmit` 0 errors, `expo lint` 0 errors.


- **2026-11-10, Claude (sign-in + on-chain verification):**
  - Code step redesigned (blinking caret, auto keyboard, logo + wordmark, 30 s resend, checking state). In a real build Google, X and wallet apps show "soon" and never produce made-up addresses.
  - `VannaDynamicModule.kt` had an undefined `awaitSdk`; fixed and compiled. On-device OTP still unverified.
  - Ran the real action code on Stellar testnet and the Solana fork with throwaway keys. Fixed: Stellar margin swap symbols (SOUSDC), Solana health accounts (missing delisted Kamino assets, oracles only for held tokens), fork lookup table for large txs, fork price keeper (`solana/fork-prices.ts`, the site's route is gated), repay rules and rent reclaim, Earn share maths (was 1 share = 1 asset), `venueAsset` placeholder.
  - Still failing on Solana: wallet swap (price expired), margin swap (Jupiter route not restricted as on the site's server), Kamino farm deposit (price source), perps (no validator rules for the call). External wallets are not wired.
- **2026-11-10, Claude:** ported the website's fork pool repair (healStaleDexPools), Jupiter route limits, and price accounts for margin swap and Kamino. Wallet swap, margin swap and Kamino deposit/withdraw confirmed on the fork with exact amounts. Perps open still fails: Vanna's validator returns No rules for this program.
- **2026-11-10, Claude:** ported the website's perps flow (validator accounts on deposit, venue tracking in one transaction, fork index prices, sizing cap, close retry and auto-withdraw). Open, close and withdraw confirmed on the fork. Preview APK is arm64-only to cut size.
- **2026-11-10, Claude:** Stellar Soroswap and Aquarius LP farms now deposit the typed USDC plus XLM at the pool ratio and convert dollar withdrawals to LP shares. Perena withdraw converts dollars to shares. Predict refuses sample markets. All verified on chain except Predict, which has no live markets in the app.
- **2026-11-10, Claude:** real World.xyz Predict (mainnet prices, in-memory fork maker), Google/X via Dynamic, Mobile Wallet Adapter and WalletConnect, Vanna app icon, Explore removed, minification off because it renamed Dynamic's classes. Solana Predict buy/sell verified on the fork. Wallet apps and Google/X are untested on a device.
- **2026-11-10, Claude:** index.js loads the crypto polyfill first (Stellar WalletConnect failed without it). Real builds now clear all sample positions, history, notifications and profile. Account: one This chain card replaces the Wallets card; tapping a chain row opens wallet switching.
- **2026-11-10, Claude:** Solana faucet matches the website. Fingerprint step only shows when the setting is on. Health and leverage previews use the website's rule (holdings / debt), so a 2x fresh borrow previews 2.00 and 2.00x.
