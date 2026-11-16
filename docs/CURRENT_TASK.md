# Current task: real wallets and the wallet flow (as in the artifact)

Read `docs/HANDOFF.md` first. Paths are relative to `vanna_mobile_app/`.

## Goal

Make sign-in and wallets real on both chains, following the wallet flow the user approved in the artifact
(https://claude.ai/artifact/1xUZuJGuMomECw3uUuEm5J, "Wallets" section). The UI is already built and wired. What is
missing is the real connections, real balances and positions, and real transactions.

The owner may still reject the flow. Keep the work isolated, so the files listed at the bottom can be removed.

## The flow (what the user approved)

1. **Sign in** (`src/app/sign-in.tsx`, plain black background, "style A"). It opens from the welcome screen's
   "Get started" (`?mode=new`) and "I have an account" (`?mode=back`). The steps are:
   - `main`: an email field with Continue, then Google, X and Wallet.
   - `code`: a 6-digit email code.
   - `other`: asks once to add a wallet for the other chain.
   - `name`: the display name.
   - Wallet: a sheet listing wallet apps per chain:
     - Solana: Phantom, Solflare, Backpack.
     - Stellar: Freighter, OneKey, and LOBSTR marked "soon".
2. **Both chains on first use.** Email, Google or X give one Vanna (Dynamic) wallet on each chain. A wallet sign-in covers
   one chain, so the `other` step offers the other one, either a Vanna email wallet or another app.
3. **Several wallets per chain**, listed in Account's wallets card (`WalletsCard`, `src/screens/wallets/wallets.tsx`).
   Exactly one per chain is "in use".
4. **Switch with one tap** in that card, with no new approval (the connection is remembered). Long-press removes a wallet.
   Switching chain to one with no wallet opens a "connect a wallet" sheet (`switchChain()`).
5. **Signing:** every transaction is signed by the wallet in use.
   - Vanna email wallet: Dynamic, with the phone's biometric confirm when that toggle is on.
   - External wallet: the wallet app opens to approve.
6. **Lock:** optional app lock with biometrics. This is already done (`src/state/lock.ts`).

State lives in `src/state/wallets.ts`: `signedIn`, `method`, `email`, `wallets[chain][]`, `inUse[chain]` and `askedOther`.
It is persisted in AsyncStorage. Helpers: `signInWithEmail(method, email, real?)`, `connectWallet`, `setWalletInUse`,
`removeWallet`, `addEmbedded(chain, email, real?)`, `signOut()`. Today only the Dynamic email path can produce real
addresses; everything else uses `sampleAddr()`.

## Steps, in order

### Step 0: start the server for the phone (do this first)
```
cd "C:\Users\akgam\Documents\Company Work\Vanna App\vanna_mobile_app"
npx expo start --clear
```
The user scans the QR code with Expo Go (same Wi-Fi). If port 8081 is in use, a server is already running.
Everything in steps 2 and 5 can be built and tested in Expo Go. Steps 1, 3 and 4 need a development build.

### Step 1: Dynamic email wallets on a real device (needs the user's OK; see HANDOFF section 8)
1. Get the user's OK, then run `node modules/vanna-dynamic/scripts/fetch-android-sdk.mjs`. It downloads 2 `.aar` files
   from GitHub into `modules/vanna-dynamic/android/libs`.
2. Create `.env` with `EXPO_PUBLIC_DYNAMIC_ENV_ID=<confirmed id>`.
3. Make a development build:
   - Locally: `npx expo run:android` (Android Studio and SDK installed, phone on USB debugging).
   - Or with EAS: create `eas.json` with a `development` profile (`developmentClient: true`), then
     `npx eas-cli@latest build --profile development --platform android`.
   - Then run `npx expo start --dev-client` instead of using Expo Go.
4. Test email sign-in end to end.
   - The code must arrive by email.
   - `verifyEmailCode` must return a Solana and a Stellar address.
   - **The same email on test.vanna.finance must show the same two addresses.** That is the acceptance check.
   - If it hangs: mount Dynamic's `DynamicUI()` overlay (see HANDOFF section 7), and check that Device Registration is
     off in the dashboard.
5. Fix whatever the Kotlin code got wrong. It was written from the docs and never compiled. API names to confirm are
   listed in `modules/vanna-dynamic/README.md`.

### Step 2: drive the screens from the signed-in wallets (works in Expo Go with any known address)
- On sign-in, on in-use change, and on each live refresh, call:
  - `fetchStellarAccount(inUse.stellar.full)` (`src/chain/stellar/account.ts`)
  - `fetchSolanaAccount(inUse.solana.full)` (`src/chain/solana/account.ts`)
- Map the results into `DATA[chain]` (`src/sample/data.ts`) inside `mutate()`:
  - wallet balances
  - margin account
  - collateral rows
  - debts (canonical symbols: USDC → BLUSDC on Stellar)
  - LP / farm rows
- Screens already read `DATA` through `src/sample/model.ts` (`acct()` etc.) and `useDataVersion()`.
- Verify against test.vanna.finance for the same wallet.
  - Stellar test wallet with a margin account: `GBNGN4TG…HHM3` (the full address is the user's wallet on the site).
    Expected: HF 2.4538, gross $251.45, debt $102.47.
  - The Solana test wallet `HQpb…` has no margin account and no debt, so the debt path is still unverified.
- Decide with the user what a signed-out user sees. Today it is sample data. Options: empty states, or sample data
  labelled "Demo".
- Wire a Sign out row in Account. `signOut()` exists, and it also signs out of Dynamic, but no button calls it yet.

### Step 3: external wallets (development build)

**Research done 2026-11-06. Not yet tried on a device; UNCONFIRMED means no source confirmed it.**

**Solana: Mobile Wallet Adapter (MWA)**
- Package: use the core `@solana-mobile/mobile-wallet-adapter-protocol` 3.x (`transact`, `authorize`,
  `signTransactions`) with raw base64 transactions.
  - Do not use the `-web3js` wrapper; it pulls in `@solana/web3.js`.
  - 3.x depends on `@solana/kit` 8 and `@noble` v2, which are ESM-only. Spike it under Metro/Hermes first; if it breaks,
    try 2.x.
  - Needs a dev build and the `react-native-get-random-values` polyfill.
- Auth token:
  - Persist `auth_token` per wallet entry, preferably in `expo-secure-store`.
  - Always store the newest token. A valid token skips the approval dialog.
  - On `ERROR_AUTHORIZATION_FAILED`, call `authorize` again without a token.
- Wallets:
  - The official MWA directory lists Solflare and Backpack; Phantom is UNCONFIRMED.
  - Android shows its own wallet picker, so the app cannot choose a specific wallet.
- Our RPC is a mainnet fork. Whether wallets accept `solana:mainnet` there is UNCONFIRMED.
- iOS has no MWA. Use the Phantom and Solflare deeplink protocols (x25519 box via `@noble/curves`).

**Stellar: WalletConnect v2**
- Package: Reown AppKit RN has no Stellar adapter. Use `@walletconnect/sign-client` plus
  `@walletconnect/react-native-compat` (import it first) and `react-native-get-random-values`.
- Needs a **Reown project ID** (free; the user must create it at dashboard.reown.com).
- Chains: `stellar:testnet` and `stellar:pubnet`.
- Method: `stellar_signXDR({ xdr })` returns `{ signedXDR }`. It only signs; the app submits.
- Persist each wallet's session `topic`, so switching needs no approval.
- Wallet support on mobile:
  - LOBSTR is the most likely to work.
  - Freighter mobile and OneKey over WalletConnect are UNCONFIRMED. Test them on the phone before promising them.

Sources:
- github.com/solana-mobile/mobile-wallet-adapter
- docs.solanamobile.com/react-native
- wallets.solanamobile.com
- docs.reown.com/advanced/multichain/rpc-reference/stellar-rpc
- docs.walletconnect.com/wallets/chains/stellar
- **Solana:** Mobile Wallet Adapter for Phantom, Solflare and Backpack on Android. Research the current Solana Mobile
  package for React Native/Expo that works **without `@solana/web3.js`**, or isolate it. iOS has no MWA; Phantom and
  Solflare deeplinks are the iOS route. Store the auth token so switching needs no re-approval.
- **Stellar:** WalletConnect v2 (Reown) with chain `stellar:testnet` for Freighter mobile, OneKey and LOBSTR. Research the
  current Reown React Native packages and the Stellar WalletConnect methods (`stellar_signXDR`). Keep sessions so
  switching needs no re-approval.
- Replace `connectWallet()`'s `sampleAddr()` with the real address. Research current docs first; the previous agent
  did not verify these packages.

### Step 4: real transactions
- `runTx(spec)` in `src/ui/tx.tsx` currently only applies `spec.apply` to sample data. Add a real path:
  build → sign with the wallet in use → send → confirm, then refresh the account reader.
- **Stellar:** build with `@stellar/stellar-base` `TransactionBuilder`, then prepare with `simulateTransaction`
  (footprint and fees), sign (Dynamic `signStellarXdr`, or WalletConnect), and submit with `sendTransaction` and poll
  `getTransaction`. Contract calls and arguments: port from
  `..\_ref\vanna-web-backend\apps\stellar\lib\` (stellar-utils.ts ContractService, margin and earn helpers).
- **Solana:** instructions for the Vanna program `H37YVBG3…` (margin, lend, farm `margin_execute`): port from
  `..\_ref\vanna-web-backend\apps\solana\lib\solana\` (exec.ts, margin.ts, lend.ts, tx.ts, broadcast.ts). Sign with
  Dynamic `signSolanaTransaction` (base64), or MWA.
- Start with one end-to-end flow: **Stellar Earn supply BLUSDC**. Verify it on test.vanna.finance, then expand.

### Step 5: Google and X
- Check whether Dynamic's native SDKs support social sign-in (Google, X) headless. If yes, add it to the module.
  If not, tell the user and hide those buttons. Don't fake it.

## Definition of done for each step
- `npx tsc --noEmit` clean, `npx expo lint` 0 errors.
- Tested on the phone, with what was and wasn't tested said plainly.
- Numbers match test.vanna.finance for the same wallet.

## Files that make up the wallet-flow UI (remove these if the owner rejects it)
- `src/app/sign-in.tsx`
- `src/state/wallets.ts`
- `src/screens/wallets/wallets.tsx`
- `src/components/wallet-logo.tsx`
- Hooks in `src/app/welcome.tsx`, `src/app/account.tsx` and `src/screens/portfolio/hero.tsx`.
  `..\_spikes\wallet-wiring\unwire.js` undoes those hooks (run it from `vanna_mobile_app` with node); `rewire.js` puts
  them back.
