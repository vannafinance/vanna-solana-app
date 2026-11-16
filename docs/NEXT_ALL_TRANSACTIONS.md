# Next: every wallet and every transaction working, on both chains (handoff for Cursor, 2026-11-06)

Read `docs/HANDOFF.md` (context, rules, what failed) and its **work log at the bottom** first. Work on git branch
`claude/vanna-mobile`. Commit each finished piece there, and append one line per commit to the HANDOFF work log.

**The user's requirement:** every action must really execute on chain, on **both Solana and Stellar**, with every wallet
type:
- the Dynamic email wallet
- Solana: Solflare, Backpack, Phantom
- Stellar: LOBSTR, Freighter, OneKey

Today only Stellar Earn supply/withdraw is real (`src/chain/stellar/submit.ts`). Everything else must be built. Never fake
a success: `runTx` already blocks real-wallet actions that have no `send`.

---

## Step 0: get an installable build (the PC cannot build locally)

The local Android build fails on this Windows PC:
- Windows long paths are off, and the SDK has CMake 3.22 / ninja 1.10.
- React Native's C++ paths go past 260 characters, even from `C:\vb`.
- **The Android Studio emulator does not avoid this**: a local emulator build compiles the same C++.

So build in Expo's cloud (EAS):

1. **The user** logs in, in a terminal, in `vanna_mobile_app`. Free account at https://expo.dev/signup. The agent must not
   type credentials.
   ```
   npx eas-cli@latest login
   npx eas-cli@latest whoami
   ```
2. Create `eas.json`:
   ```json
   {
     "cli": { "version": ">= 16.0.0", "appVersionSource": "local" },
     "build": {
       "development": { "developmentClient": true, "distribution": "internal", "android": { "buildType": "apk" },
                        "env": { "EXPO_PUBLIC_DYNAMIC_ENV_ID": "90dad26e-c7b1-4047-857e-ab4ad5596f9a" } },
       "preview": { "distribution": "internal", "android": { "buildType": "apk" },
                    "env": { "EXPO_PUBLIC_DYNAMIC_ENV_ID": "90dad26e-c7b1-4047-857e-ab4ad5596f9a" } }
     }
   }
   ```
   - `.env` is git-ignored, so EAS won't upload it. That is why the ID goes in `env` (it is a public value).
   - Install the dev client: `npx expo install expo-dev-client`.
   - The Dynamic `.aar` files are committed in `modules/vanna-dynamic/android/libs/`, so EAS gets them.
3. Build:
   - **Development build** (for testing; JS reloads from the PC):
     `npx eas-cli@latest build -p android --profile development`
   - **Standalone APK** (the "vanna.apk" the user wants on the Desktop):
     `npx eas-cli@latest build -p android --profile preview`, then download it from the build page and save it as
     `C:\Users\akgam\Desktop\vanna.apk`.
   - The first EAS build compiles the never-compiled Kotlin in `modules/vanna-dynamic`. Expect fixes. API names to confirm
     are in `modules/vanna-dynamic/README.md`.
4. **Emulator (Android Studio):**
   - Device Manager → create a Pixel with a **Google Play** system image (API 34 or 35). Play is needed to install wallet
     apps.
   - Start it, then `adb install <downloaded>.apk`, then `npx expo start --dev-client` and open the app.
   - The phone works the same way: install the APK and scan the QR code.
5. Test Dynamic email sign-in first.
   - The same email must show the same Solana and Stellar addresses as on test.vanna.finance.
   - If it hangs, mount `DynamicUI()` in the module (HANDOFF section 7), and check that Device Registration is off in the
     Dynamic dashboard.

## Step 1: one signing layer for all wallets

Add `src/chain/sign.ts`:
- `signStellar(xdr)`: Dynamic `signStellarXdr`, or WalletConnect `stellar_signXDR`.
- `signSolana(base64Tx)`: Dynamic `signSolanaTransaction`, or MWA `signTransactions`.
- Both pick the signer from `inUseWallet(chain)` (`src/state/wallets.ts`).

Then:
- Generalise `src/chain/stellar/submit.ts` into `submitStellar(contractId, method, args)`, using the signer above.
- Add `src/chain/solana/submit.ts`:
  - build the message with `@noble` and our own encoder (**no `@solana/web3.js`**)
  - fetch a recent blockhash from the fork RPC `https://rpc-devnet.solana.vanna.finance`
  - sign, then `sendTransaction`, then confirm
- External wallets: see `docs/CURRENT_TASK.md` step 3 for the researched packages (MWA protocol 3.x for Solana; WalletConnect
  sign-client for Stellar, which needs a Reown project ID from the user).

## Step 2: wire every action (port the exact calls from the website)

Website source: `..\_ref\vanna-web-backend\apps\{stellar,solana}\` (read-only reference).
- Stellar maths and calls: `lib/margin-utils.ts`, `lib/stellar-utils.ts` (ContractService), `lib/blend-utils.ts`,
  `lib/aquarius-utils.ts`, `lib/soroswap-utils.ts`.
- Solana maths and calls: `lib/solana/margin.ts`, `lend.ts`, `exec.ts` (`margin_execute`, `farmDeposit` / `farmWithdraw`),
  `flash-repay.ts`, `swap.ts` / `titan.ts` (Jupiter / Titan quotes), `perps.ts` / `phoenix.ts`, `perena.ts`,
  `vault-actions.ts`, `tx.ts`, `broadcast.ts`.

| App screen (file, runTx title) | Stellar | Solana |
|---|---|---|
| Earn supply / withdraw (`screens/earn/amount.tsx`) | **done** (`deposit` / `redeem_vtokens`; withdraw takes vToken shares) | lend.ts |
| Margin: deposit collateral, borrow, leverage (`screens/margin/margin.tsx` "Review borrow") | margin-utils `deposit_and_borrow(_cross)`, create account if none | margin.ts |
| Margin: repay, withdraw, transfer (`margin.tsx`, `screens/move/move.tsx` "Review move/transfer/withdraw") | margin-utils repay / withdraw | margin.ts |
| Flash repay, close all (`screens/margin/sheets.tsx`) | margin-utils | flash-repay.ts |
| Spot swap, long / short (`screens/trade/spot.tsx` "Review swap", "Review long …") | soroswap-utils / aquarius-utils via controllers | swap.ts (Jupiter / Titan) via margin_execute |
| Perps open / close / close all (`screens/trade/perps.tsx`) | n/a (Solana only) | perps.ts / phoenix.ts |
| Farm deposit / withdraw (`screens/farm/farm.tsx`, footer of `farm/vault.tsx`) | blend-utils, aquarius / soroswap LP | exec.ts farmDeposit / farmWithdraw (Kamino), perena.ts, vault-actions.ts (basis) |
| Predict buy / sell / claim (`screens/predict/trade.tsx`) | n/a | the World markets program. The site's API is gated; read the web server code under `apps/solana/app/api/solana/predict` |
| Copilot actions (`src/app/copilot.tsx`) | route to the same functions | same |
| Test faucet (Account) | the website's faucet route logic | same |

For each action: give its `runTx` spec a `send: () => submit…(...)` that returns the transaction hash. Keep `apply` for the
optimistic UI. `runTx` re-reads the account after a successful send.

## Step 3: read everything a real account holds

`src/chain/account-live.ts` loads Stellar fully. On Solana it loads the wallet, collateral and debt only. Add:
- Solana Earn lender positions
- Phoenix perps positions (`perp-api.phoenix.trade` account endpoints)
- Kamino cToken receipts (`exec.ts` / `farm.ts` `farmPositionsFromSnapshot`)
- Perena and basis vault shares
- Predict positions

## Test checklist (emulator and phone, testnet / fork funds only)

- For each chain and each wallet type: sign in → balances match the site → every action in the table above.
  - The confirm screen must show the real transaction hash.
  - The account must refresh with the new figures.
  - test.vanna.finance must show the same result.
- Switching wallets with one tap needs no new approval.
- Relaunching the app keeps you signed in.
- Report per action: works, fails (with the error), or not built. Never say "works" without a confirmed transaction hash.

## Hard rules (from HANDOFF)

- **No new heavy packages:** never add `@stellar/stellar-sdk` or `@solana/web3.js`.
- **Before every commit:** `npx tsc --noEmit` and `npx expo lint` (0 errors).
- **Design:** V7 (`design/app.html`) is the source of truth.
- **Talking to the user:** plain language.
- **Ask the user before:** downloading anything, creating accounts, or entering credentials.

---

## MANDATORY: verify everything against the website and its source code (any agent: Cursor, Antigravity, others)

Agents before you have misplaced numbers, mixed up units, and invented values. Treat every number and every
transaction as **wrong until checked** against both of these:
1. **The website's code:** `..\_ref\vanna-web-backend\` (`apps/stellar`, `apps/solana`). This is the source of truth
   for every formula, contract method, argument order, unit and decimal.
2. **The live site:** https://test.vanna.finance. It needs the access code; the user enters it. Use the same wallet as
   in the app, and switch chain in the header.

### How to check (do it for every change)
- **Formulas:** find the function the website uses: grep the web repo for the label shown on the site (e.g. "Supply APY",
  "Health Factor"). Port it line by line. Write the web file path and function name in a code comment above your port.
- **Contract calls:** copy the method name, argument order, `nativeToScVal` types and unit scaling exactly from the web
  code.
  - Known traps:
    - Amounts are often ×1e18 (WAD), not ×1e7.
    - `redeem_vtokens` takes vToken **shares**, not the underlying amount.
    - vToken decimals vary (BLUSDC's vToken uses 6). Read `decimals()` rather than assuming.
    - Symbols are canonicalised (USDC→BLUSDC, AQUIRESUSDC→AQUSDC).
    - The Solana fork rejects `getProgramAccounts`.
- **Numbers on screen:** run the reader in Node against the live chain, then compare with the site for the same wallet.
  - Pool APYs, utilisation and totals must match to the shown precision.
  - Prices: Solana uses the Vanna oracle PriceBook, Stellar `get_price_latest`. Perps use the Phoenix mark.
  - Health factor, debt, collateral and leverage must match the site's Margin page.
  - Write the values you compared into the HANDOFF work log, app vs site.
- **Transactions:** a transaction counts as working only when **all** of these hold:
  - (a) the confirm screen shows a real hash
  - (b) the explorer shows success: stellar.expert/explorer/testnet, or the Solana fork's explorer
  - (c) the site shows the changed position for the same wallet
  - (d) the app's re-read shows the same figures
  - Record the hash in the work log.
- **Never:**
  - show a sample or made-up value as live
  - report "works" from reading code alone
  - change a formula because it "looks wrong" without checking the web code
  - change the V7 design without the user asking
- **When the site and the web code disagree** (e.g. the deployed site is newer): say so to the user and ask. Don't guess.

### Report format after each piece of work
```
Action / screen: ...
Ported from: <web file>:<function>
Checked: app value X vs site value Y (wallet ...), tx hash ... (explorer: success)
Not checked / unknown: ...
Commit: <hash> on claude/vanna-mobile
```
