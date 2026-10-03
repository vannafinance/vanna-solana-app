# Hand-off to the web team: history routes and Perps positions

From: Vanna Solana mobile app (Android). Checked against `https://devnet.solana.vanna.finance` and `https://rpc-devnet.solana.vanna.finance` on 2026-10-02. Repo: `vannafinance/Backend-Solana`, branch `devnet`.

## Summary

| # | Item | Status | Needed from the web team |
| --- | --- | --- | --- |
| 1 | `/api/solana/history` and `/api/solana/spot-history` return 502 | Broken on the hosted server, but the web page still works through a fallback (see below) | Fix or remove the indexed call; confirm the fallback window in production |
| 2 | Perps positions have no server route | Missing | Add `GET /api/perps/positions/{addr}` (draft below) so the phone does not re-derive them |
| 3 | `/.well-known/assetlinks.json` is a 404 | Missing | Host one static file (below) so every Android wallet can verify the mobile app |

The mobile app needs only these three. Everything else it reads already works (`/api/account/{addr}`, `/api/pools`, fork RPC).

**Correction to an earlier version of this note:** it said history failing blocks Perps positions and Net Earnings, and that Net Earnings `$0.00` is misleading. That was wrong. `historyWithFallback` in `lib/solana/history.ts` runs the indexed call and a direct RPC scan together and merges them, so the web Perps "Position History" and Swap History still show rows when the indexed call fails. The `$0.00` for the test wallet is probably correct (its SOL deposit was fully withdrawn, so deposited minus principal is not positive).

## 1. The indexed history call fails with "Method not found"

### Reproduce (no login needed)

```bash
curl -s "https://devnet.solana.vanna.finance/api/solana/history?kind=earn&address=2iyYKhNcD5fiPNphQQDq1KVqVVR3iXrwy6UFkYuhF98e"
# {"error":"Method not found"}   (HTTP 502)
```

The same happens for `kind=swap`, `kind=margin` and `/api/solana/spot-history?address=...`. In the browser these are the red `history?kind=earn...` and `spot-history?...` entries in the Network tab on `/portfolio`, and they retry repeatedly.

### What it affects (the web survives, with limits)

`historyWithFallback` merges the failing indexed rows with `recentRpcHistory`, which scans the newest signatures on the fork RPC: 200 when `IS_LOCAL_FORK_RPC` is true, only 8 otherwise. So:

- History older than that window is lost. Please confirm which value the deployed app uses; if it is 8, anyone with more than 8 recent transactions loses older rows, and earlier positions' entry price and PnL can go blank (your own comment in that function describes this).
- The failing request is retried repeatedly on every page load (visible in the Network tab), which adds load and noise.
- Net Earnings relies on the same history, so it can be wrong for wallets older than the window.

### Cause

`lib/solana/alchemy-history.ts` posts the JSON-RPC method `getTransactionsForAddress` to `ALCHEMY_SOLANA_RPC_URL`.

- That method exists only on Alchemy, and Alchemy indexes mainnet. Transactions sent to the fork exist nowhere else, so Alchemy could never return them even with a valid key. (Your own comment in `lib/solana/history.ts` says the same: "Alchemy never indexes a private fork".)
- The deployed secret returns exactly what the fork RPC returns for that method: `-32601 Method not found`. The route returns 503 "not configured" when the variable is missing, so it is set, to a URL without that method. The most likely value is the fork RPC itself. The secret value was not read; please check `alchemy-solana-rpc-url` (Secret Manager) on Cloud Run service `vanna-app-devnet`.
- The fork RPC supports `getSignaturesForAddress` and `getTransaction`/`getParsedTransaction`. Checked: margin account `GSPkK3pZG733J1ApZ38CdcNnGp2znuwu4y4yaWrLAXQS` returns 5 signatures, and one parsed transaction took about 1.3 s.

### Fix: replace the body of `fetchAlchemyTransactionsForAddress`

This gives the indexed call real depth again (the fallback only covers the newest 200). Keep the exported name so both routes and `decodeVannaHistory` keep working. `decodeVannaHistory` already accepts the standard parsed-transaction shape (`transaction`, `meta.logMessages`, `blockTime`).

```ts
import { Connection, PublicKey } from "@solana/web3.js";

const PAGE = 1000;
const CONCURRENCY = 8;

export async function fetchAlchemyTransactionsForAddress(address: string): Promise<unknown[]> {
  const rpcUrl = process.env.FORK_RPC_URL ?? process.env.NEXT_PUBLIC_SOLANA_RPC_URL;
  if (!rpcUrl) throw new Error("FORK_RPC_URL is not configured");
  const connection = new Connection(rpcUrl, "confirmed");
  const owner = new PublicKey(address);
  const max = Math.max(1, Math.min(Number(process.env.SOLANA_HISTORY_MAX_SIGNATURES ?? 2000) || 2000, 10000));

  const signatures: { signature: string; blockTime: number | null }[] = [];
  let before: string | undefined;
  while (signatures.length < max) {
    const page = await connection.getSignaturesForAddress(owner, { limit: Math.min(PAGE, max - signatures.length), before }, "confirmed");
    signatures.push(...page.filter((e) => !e.err).map((e) => ({ signature: e.signature, blockTime: e.blockTime })));
    if (page.length < PAGE) break;
    before = page[page.length - 1].signature;
  }

  const transactions: unknown[] = [];
  for (let i = 0; i < signatures.length; i += CONCURRENCY) {
    const batch = await Promise.all(
      signatures.slice(i, i + CONCURRENCY).map(async (item) => {
        const tx = await connection.getParsedTransaction(item.signature, { commitment: "confirmed", maxSupportedTransactionVersion: 0 });
        if (tx && item.blockTime) tx.blockTime = item.blockTime; // fork quirk below
        return tx;
      }),
    );
    for (const tx of batch) if (tx) transactions.push(tx);
  }
  return transactions;
}
```

### Fork quirks to keep (all verified on the fork, and already handled in `lib/solana/history.ts` `recentRpcHistory`)

- `getTransaction` returns a truncated `blockTime` (for example `1790679` instead of `1790679386`). Take the time from `getSignaturesForAddress`.
- Batched JSON-RPC requests are rejected, so use one `getParsedTransaction` call per signature (parallel, as above), not `getParsedTransactions`.
- `getSignaturesForAddress` on a margin account misses transactions that load the margin PDA through an Address Lookup Table. Scan the margin account's owner wallet for `margin` and `swap` kinds, as `recentRpcHistory` already does.
- `getTransactionsForAddress` and `getTokenLargestAccounts` / `getProgramAccounts` on the Token program are not available.

### Acceptance checks (known wallet, expected results once the indexed call is fixed)

```bash
A=2iyYKhNcD5fiPNphQQDq1KVqVVR3iXrwy6UFkYuhF98e
curl -s "https://devnet.solana.vanna.finance/api/solana/history?kind=earn&address=$A"
# expect 2 rows: supply 9.99 SOL (2026-09-29) and a SOL withdraw
curl -s "https://devnet.solana.vanna.finance/api/solana/spot-history?address=$A"
# expect 3 swaps: 42.1747 SOL -> 2.0485 OPENAI (3mX1Y2...), 18.7445 SOL -> 0.9233 OPENAI (5BDGHc...), 24.9938 SOL -> 2992.7251 USDC (4Wtsyu...)
```

These are the values the mobile app decoded directly from the fork, and they match what the web Spot History shows today.

## 2. Perps positions route (does not exist)

The web derives Long/Short rows in the browser with `listDerivedPositions(marginAccountAddress)` (`lib/solana/long-short.ts`), and `computeAverageOpenPrice` in the table component gives entry price. A phone cannot run Anchor reads or the attribution rules (which separate Farm from Perps using margin and swap history), so please expose them as JSON. `listDerivedPositions` calls `getSolanaMarginHistory` and `getSolanaSwapHistory`, which work through the fallback above, so this route is not blocked by item 1 (it is limited by the same window).

`app/api/perps/positions/[addr]/route.ts` (draft, modelled on `app/api/account/[addr]/route.ts`, not run against a live server):

```ts
import { NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";

import { MarginAccountService } from "@/lib/margin-utils";
import { listDerivedPositions } from "@/lib/solana/long-short";

export const runtime = "nodejs";

const CACHE = "private, no-store, max-age=0";

export async function GET(_req: Request, { params }: { params: Promise<{ addr: string }> }) {
  const { addr } = await params;
  try {
    new PublicKey(addr);
  } catch {
    return NextResponse.json({ error: "invalid_address" }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }

  try {
    const marginAccount = await MarginAccountService.discoverExistingAccount(addr);
    if (!marginAccount) return NextResponse.json({ marginAccount: null, positions: [] }, { headers: { "Cache-Control": CACHE } });
    const positions = await listDerivedPositions(marginAccount);
    return NextResponse.json({ marginAccount, positions }, { headers: { "Cache-Control": CACHE } });
  } catch (err) {
    const detail = err instanceof Error ? err.message : "positions failed";
    const throttled = /\b429\b|too many requests/i.test(detail);
    return NextResponse.json(
      { error: throttled ? "rpc_rate_limited" : "positions_failed", detail },
      { status: throttled ? 429 : 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
```

### Contract the mobile app will read

Each row is a `DerivedPosition` (`lib/long-short-math.ts`): `stock`, `side` (`long`|`short`), `stockQty`, `sizeUsd`, `collateralUsd`, `markPrice`, `liqPrice`. Please also include what the table computes in the component so the phone does not re-derive it:

| Extra field | Source on web | Used for |
| --- | --- | --- |
| `entryPrice` | `computeAverageOpenPrice(swapHistory, stock, side)` | Entry price, PnL |
| `pnlUsd`, `pnlPercent` | `PositionRow` formulas | Position PnL |
| `liqPrice` (filled) | isolated per-position estimate in `PositionRow` | Liquidation price |
| `openedAt` | first matching swap row timestamp | "Since Sep 22" |

Numbers can stay JSON numbers like `/api/account` (USD figures are numbers there too). Errors should keep the existing shape (`{ error }` with 400/429/502) so one client handles both routes.

## 3. Let Android wallets verify the mobile app (assetlinks.json)

When the mobile app asks a wallet to connect it names itself as `https://devnet.solana.vanna.finance`. A wallet that follows the Mobile Wallet Adapter identity rules fetches `https://devnet.solana.vanna.finance/.well-known/assetlinks.json` and checks that this site vouches for the app's package name and signing certificate. That file does not exist (HTTP 404), so:

- Backpack on Android refuses to connect ("Identity verification failed for the requesting app").
- Phantom shows a warning that the app could not be verified.
- Solflare and Seed Vault connect anyway.

Hosting the file is the same for every wallet, so no wallet-specific code is needed in the app.

Add `public/.well-known/assetlinks.json` to the Next.js app (served as `application/json`, no redirect):

```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "finance.vanna.solana",
      "sha256_cert_fingerprints": [
        "FA:C6:17:45:DC:09:03:78:6F:B9:ED:E6:2A:96:2B:39:9F:73:48:F0:BB:6F:89:9B:83:32:66:75:91:03:3B:9C"
      ]
    }
  }
]
```

The fingerprint above is the Android debug key that signs the hackathon APK. When the app is signed with a release keystore for the dApp Store, add that key's SHA-256 as a second entry in the same array.

Check it after deploying:

```bash
curl -si https://devnet.solana.vanna.finance/.well-known/assetlinks.json | head -5
# HTTP/2 200, content-type: application/json
curl -s "https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://devnet.solana.vanna.finance&relation=delegate_permission/common.handle_all_urls"
# lists the android_app statement for finance.vanna.solana
```

## What the mobile app already reads (no change needed)

| Data | Source | Notes |
| --- | --- | --- |
| Margin account balance, borrowed, net available, health, leverage | `GET /api/account/{wallet}` | Matches the web exactly for the test wallet |
| Pool APY, exchange rates, supply and borrow totals | `GET /api/pools` | |
| Wallet token balances | Fork RPC `getBalance`, `getParsedTokenAccountsByOwner` (Token and Token-2022) | |
| Prices | Pyth `PriceUpdateV2` accounts on the fork, read with `getMultipleAccountsInfo` | All seven assets present |
| Earn deposits | Lender share token accounts (`share_mint` PDA, then ATA) times the pool exchange rate | |

Test wallet used for every check above: `2iyYKhNcD5fiPNphQQDq1KVqVVR3iXrwy6UFkYuhF98e` (margin account `GSPkK3pZG733J1ApZ38CdcNnGp2znuwu4y4yaWrLAXQS`).
