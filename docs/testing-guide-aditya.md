# Testing and bug-fix guide (Android app, 4 Oct 2026)

For Aditya. This covers how to install and test the current build, what to test in each section, what each error means, the known bugs with their causes and where to fix them, and how to report a bug so it can be reproduced.

Hackathon deadline: 8 Oct 2026.

## 1. What you are testing

- App: Vanna on Android (Expo SDK 57, React Native, package `finance.vanna.solana`).
- Code: branch `dev` on GitHub (`vannafinance/vanna-solana-app`). The APK is built from commit `157051f`.
- APK: `vanna-release-arm64-157051f.apk`. It is a release build for arm64 phones (almost every real phone), signed with the debug key. It does not install on the x86 emulator.
- Network: Vanna's **Solana mainnet fork** (Surfpool), not public Devnet. RPC `https://rpc-devnet.solana.vanna.finance`, web app `https://devnet.solana.vanna.finance`. Every token is fork-only test money.

The web app at `https://devnet.solana.vanna.finance` is the reference. When the phone and the web disagree about a number or a flow, the web is usually right.

## 2. Phone setup

1. Uninstall any older Vanna APK first (Settings, Apps, Vanna, Uninstall). An older signature or build can keep old data.
2. Install the APK (allow "install unknown apps" for your file manager or browser).
3. Install **Solflare** from the Play Store. Use Solflare for testing (see section 3 for why not Phantom or Backpack).
4. In Solflare, set the network to **Mainnet**. The fork is a copy of mainnet, so a Devnet or Testnet wallet refuses with "Network mismatch".
5. Open Vanna, Connect, pick Solflare, approve.
6. Get test money: **Profile, Test faucet**. One claim gives +100 SOL, +1,000 USDC, or +20 of each stock (TSLAx, GOOGLx, AAPLx, ANTHROPIC, OPENAI). Claim SOL first, because every transaction needs SOL for fees.
7. The first Perps or Farm action asks you to open a **margin account** (one approval). That is expected.

The wallet app shows **mainnet** balances, which are 0. That is normal. The Vanna app shows the fork balances.

## 3. Wallets: what to expect

| Wallet | Status on the fork | What you will see |
|---|---|---|
| **Solflare** | Works. Use this one. | "Unknown site" and "Simulation failed" banners on every approval. Expected: Solflare checks the transaction against real mainnet, where Vanna's fork accounts do not exist. Tap "I trust this site", then slide to approve. |
| **Phantom** | Mostly blocked. | "Request blocked: This dApp could be malicious", then "Are you sure? Failed to simulate". To get through you must tick **"I understand that I could lose all of my funds"** and then tap "Yes, confirm (unsafe)". If you tap without ticking, Phantom goes to its home screen, never answers, and the app shows "Cancelled in phantom-wallet. Nothing was sent." That is Phantom's policy for fork transactions, not an app bug. |
| **Backpack** | Does not connect. | "Identity verification failed". Backpack bug coral-xyz/backpack#4394, no fix on our side. |

**The Android wallet chooser.** If more than one wallet is installed, Android may ask "Open with Phantom / Solflare" on every approval. **Always pick the wallet you connected with.** Picking a different one causes "Your wallet refused this" (section 6.1).

**Approve quickly.** A fork transaction is valid for about 60 seconds. A slow approval gives "Request expired". Just try again.

## 4. What to test, section by section

For each step, write down: pass or fail, the message shown, the time, and the wallet used. After every action that should change balances, check the **History** tab of that section and the **Portfolio** numbers.

### 4.1 Farm (highest priority: most bugs were here)

Farm deposits a stock as collateral, borrows USDC or SOL against it, and supplies that into Kamino.

| # | Action | Expected |
|---|---|---|
| F1 | Deploy: pool USDC, stock TSLAx, about 1 TSLAx, leverage 2x, Deploy strategy, Confirm, approve | One wallet prompt. "Strategy deployed". The position appears under Positions with TSLAx → USDC. |
| F2 | Deploy again, same stock and pool | Adds to the same position. |
| F3 | Deploy with pool SOL and a different stock (GOOGLx) | Second position, GOOGLx → SOL. |
| F4 | Two stocks into the same pool (TSLAx and AAPLx, both into USDC) | Two separate positions, each with its own share. |
| F5 | Open a position, close **25%** | One prompt. "Position partly closed". Debt and supply drop by about a quarter. The stock stays in the position. |
| F6 | Close **50%**, then **75%** | Same as F5. |
| F7 | Close **100%** | **Two** prompts. Step 1 redeems and repays, and step 2 (automatic) returns the stock to the wallet. "Position closed". The position disappears and the wallet stock balance goes up. |
| F8 | 100% close on an account that **also has Perps positions open** | Same as F7. This used to fail at step 2 ("Step 2 of 2 did not go through"). It is fixed in this build, so please confirm. |
| F9 | If step 2 fails | The sheet offers "Try step 2 again". Tap it: the stock should come back without repeating step 1. |
| F10 | Positions tab shows a card "Kamino USDC position. Its stock could not be read from history. Tap to close the Kamino part." | Tap it and the close sheet opens with no stock row. Closing redeems and repays only; any stock stays in the margin account. In this build this card should be rare. If you see it, report the wallet address (section 7). |
| F11 | Farm, History tab | Every deploy and close is listed with the right stock, pool and amounts. |
| F12 | Open the account with many positions (3 or more Perps plus 2 Farm), then deploy and close | May need an extra prompt (a temporary lookup table). **Solflare refuses that extra one** (known issue, section 6.3). Report what happened. |

### 4.2 Earn

| # | Action | Expected |
|---|---|---|
| E1 | Earn, USDC vault, Supply 100 | One prompt, "Supplied". Positions shows it. |
| E2 | Supply SOL and one stock (for example AAPLx) | Same. SOL Max keeps 0.01 SOL back for fees. |
| E3 | Withdraw **25%**, **50%**, **Max** | One prompt each, "Withdrawn ... back in your wallet". |
| E4 | Earn, History | Each row on **one line**, amounts with two decimals (for example "Supplied 5.00 AAPLx"). Rows used to overlap; this build fixes that. History can lag about 30 seconds behind a new transaction. |

### 4.3 Trade (Perps and Swap)

| # | Action | Expected |
|---|---|---|
| P1 | Long TSLAx 2x with 50 USDC | One prompt (more on an account with many positions). Position appears with the right size. |
| P2 | Short TSLAx 2x | Same. |
| P3 | Add collateral to a position | One prompt, health goes up. |
| P4 | Close a position 50%, then 100% | One prompt each. USDC returns to the wallet; a small USDC cushion stays in margin by design. |
| P5 | Long ANTHROPIC or OPENAI with 40 USDC or more | Currently shows "Something went wrong". The real cause is that the pool liquidity is too thin (price impact over 5%). See bug B5. |
| S1 | Swap USDC to SOL, and SOL to USDC | One prompt. Balances and Swap History update. |

### 4.4 Portfolio and Profile

- Portfolio: wallet balance, margin account, health, positions list, Lender and Trader tabs. Compare the numbers with the web app for the same wallet.
- Lender history rows: one line each.
- Profile: wallet address, "Solana mainnet fork" label, faucet, Disconnect then Connect again.

## 5. What each error message means

| Message | Meaning | What to do |
|---|---|---|
| Your wallet refused this | The wallet would not authorize Vanna (section 6.1). Nothing was signed. | Pick the connected wallet in the chooser and retry. If it repeats, disconnect in Profile and connect again. Report it with a log. |
| Could not reach your wallet | The wallet app did not answer the local connection in time (cold start). | Open the wallet once, then retry. |
| Request cancelled / Cancelled in ... | You (or a back gesture) closed the wallet without approving. | Retry. |
| Request expired | It took longer than about 60 s to approve. | Retry faster. |
| Not enough SOL | Need SOL for fees and account rent. | Faucet SOL. |
| Order too large | The account holds so many positions that the transaction does not fit. | Close a position first. Report it. |
| Only the first step went through / Step 2 of 2 did not go through | Part of a multi-step action landed. | Use "Try again" / "Try step 2 again". It continues and does not repeat the part that landed. |
| Something went wrong | An error with no mapping yet. A small grey box under it shows the raw error. | Screenshot the grey box. That text is the bug. |

## 6. Known bugs, causes and where to fix them

### 6.1 "Your wallet refused this" (seen often on the phone)

It comes from the wallet library's error `authorization request failed (-1)`. Before every approval the app asks the wallet to re-authorize it (`reauthorize`), and the wallet said no. Three causes are known:

1. **Android opened a different wallet** than the one connected (the chooser). The other wallet does not know our login token and refuses. The library we use (`@wallet-ui/react-native-web3js`) does not remember which wallet app authorized, so Android asks every time.
   **Proper fix:** keep the `wallet_uri_base` returned by `authorize` and open later sessions with `transact(callback, { baseUri })` from `@solana-mobile/mobile-wallet-adapter-protocol-web3js`, so Android goes straight to the connected wallet. That means replacing `signTransactions` from the library with our own call in `src/hooks/use-wallet-signer.ts` (the store's `persist` is reachable through `useMobileWallet()`, which spreads its context).
2. **Phantom and Backpack check the app's identity** by fetching `https://devnet.solana.vanna.finance/.well-known/assetlinks.json` with a timeout of about 1 to 1.5 s. On a slow mobile network, or when the Cloud Run host is cold, that fails and the wallet refuses. Solflare does not do this check, which is one reason it works better. The fix is on the web side: `_MIN_INSTANCES: "1"` in the web app's `cloudbuild.yaml`, or serving that file from a CDN.
3. **Several wallet prompts in a row.** Each prompt is a new app switch and a new authorization, and each is another chance for causes 1 and 2. A 100% Farm close is two prompts, and on a busy account up to four.
   **Fix to build:** sign the exit and the stock return together in one prompt (`sendBatches` already supports several transactions in one `signAll`; the stock-return instructions have to be built before the exit lands, predicting the post-exit account state). Prove it with `scripts/farm-e2e.cjs` first.

The app already retries a refused authorization once by itself (`execute` in `use-wallet-signer.ts`, only before anything is signed).

### 6.2 Phantom blocks every fork transaction

See section 3. This is not fixable in the app. For the demo, use Solflare.

### 6.3 Solflare refuses the extra "lookup table" transaction

On an account with many positions, Perps and Farm transactions do not fit in 1232 bytes even with Kamino's mainnet lookup tables. The app then creates a temporary lookup table on the fork (`createTemporaryTable` in `src/lib/solana/lookup-tables.ts`, used by `sendBatches` when `allowForkTable` is set). Solflare cannot read a table that exists only on the fork and refuses the transaction ("Security verification failed"). Phantom and Backpack allow it after warnings. Options: keep accounts smaller in the demo, or split the work into more transactions without a fork table.

### 6.4 Positions or History a little behind

History is read from the fork, at most the **1000 newest** transactions of the wallet (`src/lib/solana/wallet-transactions.ts`). The web history routes cache for about 15 s. Anything older than 1000 transactions is not seen, so a very active wallet can lose track of an old Farm position's stock (it then shows as the tappable "could not be read" card, F10).

### 6.5 Price-impact error shows as "Something went wrong" (bug B5, easy fix)

`PriceImpactError` in `src/lib/solana/perps-errors.ts` has no case in `toTransactionError` (`src/lib/solana/transaction-errors.ts`), so the user sees the generic message although the error text is clear ("The best route moves the price 6.3%, so pool liquidity is too thin for this size. Try a smaller amount."). Add an `instanceof PriceImpactError` case that keeps that message, plus a test in `scripts/transactions.test.cjs`.

### 6.6 Fixed in this build, please confirm on the phone

- Farm 100% close step 2 (stock return) on accounts that also hold Perps positions (`withdrawStock` in `src/lib/solana/farm-transactions.ts`).
- Farm positions showing as "unplaced" and not tappable: a deploy sent as [deposit + borrow] then [Kamino supply] lost its stock (`remember` in `src/lib/farm/derive-farm.ts`). Unplaced positions can now be closed (yield only, as on the web app).
- History rows overlapping, and amounts with mixed decimals (`src/components/earn/earn-history-groups.tsx`, `src/components/home/lender-history-list.tsx`).
- Close sheet said "2 approvals" for a partial close.

## 7. How to report a bug

Send all of these:

1. Section and step number from section 4 (for example "F7").
2. Screenshot or screen recording, including the full error and the grey detail box if there is one.
3. Wallet app (Solflare, Phantom), and whether the Android chooser appeared and which app you picked.
4. **Wallet address** (Profile, copy). Positions and history can then be read straight from the fork.
5. Time of the attempt (with timezone).
6. If you can connect the phone to a PC with USB debugging, a log (next section). The wallet's own log line usually names the real cause.

### Recording a log from the phone

With USB debugging on and the phone connected:

```bash
adb logcat -c
```

```bash
adb logcat -v time > vanna-log.txt
```

Reproduce the bug, stop the second command with Ctrl+C, and send `vanna-log.txt`. The useful lines contain `SolanaMobileWalletAdapter`, `PhantomMWA`, `IdentityVerifier`, `ReactNativeJS` or `CancellationException`. For example `Local association cancelled by user` means the wallet was closed without an answer, `invoke reauthorize` followed by `Failed to invoke` with `-1` is the refusal in 6.1, and `DAL verification failed` is cause 2 of 6.1.

## 8. Fixing bugs: developer setup

### Run the app from source

```bash
git clone https://github.com/vannafinance/vanna-solana-app.git
```

```bash
npm install
```

The app needs a development build (Mobile Wallet Adapter does not work in Expo Go): `npx expo run:android` once, then Metro on port 8082:

```bash
npx expo start --dev-client --port 8082 --clear
```

```bash
adb reverse tcp:8082 tcp:8082
```

Then open `exp+vanna-solana-app://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8082` on the device. `EXPO_PUBLIC_*` values are baked in at bundle time, so restart Metro with `--clear` after editing `.env.local`.

### Test transactions without a phone

`scripts/farm-e2e.cjs` runs the app's own Farm and Perps code against the fork with a throwaway keypair (kept in your temp folder), signs locally instead of a wallet and sends real fork transactions. It prints PASS or FAIL per step, the mapped error, and how many wallet prompts each step would need on a phone.

```bash
node scripts/farm-e2e.cjs fund
```

```bash
node scripts/farm-e2e.cjs usdc
```

Scenarios: `fund` (faucet and margin account), `usdc` (deploy TSLAx to USDC, close 25, 50 and 100 percent, return stock), `sol` (GOOGLx to SOL), `split` (two stocks in one pool), `perps` (open several Perps longs), `heavy` (Farm closes on an account with Perps positions; run `split` and `perps` first). Always validate a change to a transaction builder this way before asking anyone to approve it in a wallet.

### Checks to run before every commit

```bash
npx tsc --noEmit
```

```bash
npx expo lint
```

```bash
npm run test:farm
```

```bash
npm run test:transactions
```

```bash
npm run check:data-layer
```

Also `npm run test:perps`, `test:portfolio`, `test:wallet`, `test:vault`, `test:review`.

### Code map

- `src/app/` routes only. `src/components/` UI. `src/theme/` colours and sizes.
- `src/hooks/` data and actions per screen. `src/lib/` pure logic and Solana code (`src/lib/solana/`: transaction builders, sending, errors). `src/components/` and `src/theme/` must not import `src/hooks/` or `src/lib/` (eslint and `check:data-layer` enforce it).
- Farm: `src/lib/solana/farm-transactions.ts` (deploy, exit, stock return), `src/hooks/use-farm-deploy.ts`, `use-farm-close.ts`, `use-farm-state.ts`, `src/lib/farm/derive-farm.ts` (which stock backs a position, from history).
- Sending: `src/lib/solana/send-batches.ts` (packs legs into as few transactions as fit, one prompt), `send-transaction.ts` (simulate, sign, send, confirm), `fresh-blockhash.ts`.
- Wallet: `src/hooks/use-wallet-signer.ts` (`execute`), `src/lib/solana/transaction-errors.ts` (every user-facing error message).
- Web app source for comparison: `vannafinance/Backend-Solana` (Farm: `lib/solana/carry-trade.ts`, `components/one-click/one-click-strategy.tsx`).

### Commit rules

Conventional commits (`fix(farm): ...`), imperative, lowercase. Work on `dev` or a feature branch. Money is `bigint` with explicit decimals, never `number`. No `any`, `ts-ignore`, `console.log`, emoji, or raw colours outside `src/theme/`. No AI attribution in commits or code. Never commit `.env*` (except `.env.example`), keystores or APKs.

## 9. Suggested order for the next days

1. Run section 4 on a phone with Solflare and report results (start with Farm F1 to F10).
2. Fix B5 (6.5): small, safe, a good first change.
3. One-prompt 100% Farm close (6.1, cause 3), proven with `scripts/farm-e2e.cjs` first.
4. Pin the connected wallet with `wallet_uri_base` (6.1, cause 1).
5. Ask the web team for `_MIN_INSTANCES: "1"` on devnet (6.1, cause 2).
