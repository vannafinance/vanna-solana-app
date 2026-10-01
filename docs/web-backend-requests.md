# Requests for the web backend (Backend-Solana)

Two things the mobile app needs from `vannafinance/Backend-Solana`, branch `devnet`. Checked against the hosted app on 2026-10-02.

## 1. History routes fail on the hosted server

| Call | Result |
| --- | --- |
| `GET /api/solana/history?kind=earn\|margin\|swap&address=...` | HTTP 502, `{"error":"Method not found"}` |
| `GET /api/solana/spot-history?address=...` | HTTP 502, same body |
| `getTransactionsForAddress` sent to `https://rpc-devnet.solana.vanna.finance` | `-32601 Method not found` |
| `getSignaturesForAddress` sent to the same RPC | works |

`lib/solana/alchemy-history.ts` calls `getTransactionsForAddress` on `ALCHEMY_SOLANA_RPC_URL`. The error text matches what the fork RPC itself returns, so the deployed `alchemy-solana-rpc-url` secret most likely points at the fork instead of an Alchemy endpoint. This is a hypothesis; the secret value was not read.

Everything that needs history is blocked until this is fixed: Net earnings, Earn/Margin/Swap history, and `listDerivedPositions` (it calls `getSolanaMarginHistory` and `getSolanaSwapHistory` to separate Farm from Perps positions).

### Fix: read history from the fork RPC

Alchemy only indexes mainnet, and these transactions exist only on the fork, so pointing the secret at a real Alchemy URL would return nothing for fork activity. The fork serves `getSignaturesForAddress` and `getTransaction` (jsonParsed, versioned), and `decodeVannaHistory` in `lib/solana/history.ts` already accepts that result shape. Replace the body of `lib/solana/alchemy-history.ts` (keep the export name so both routes keep working, or rename and update the two imports):

```ts
import { Connection, PublicKey } from "@solana/web3.js";

const PAGE = 1000;
const CONCURRENCY = 10;

// Fork history: list signatures, then fetch each parsed transaction. Newest first, failed transactions skipped.
export async function fetchAlchemyTransactionsForAddress(address: string): Promise<unknown[]> {
  const rpcUrl = process.env.FORK_RPC_URL ?? process.env.NEXT_PUBLIC_SOLANA_RPC_URL;
  if (!rpcUrl) throw new Error("FORK_RPC_URL is not configured");
  const connection = new Connection(rpcUrl, "confirmed");
  const owner = new PublicKey(address);
  const maxSignatures = Math.max(1, Math.min(Number(process.env.SOLANA_HISTORY_MAX_SIGNATURES ?? 2000) || 2000, 10000));

  const signatures: string[] = [];
  let before: string | undefined;
  while (signatures.length < maxSignatures) {
    const page = await connection.getSignaturesForAddress(owner, { limit: Math.min(PAGE, maxSignatures - signatures.length), before }, "confirmed");
    signatures.push(...page.filter((entry) => !entry.err).map((entry) => entry.signature));
    if (page.length < PAGE) break;
    before = page[page.length - 1].signature;
  }

  const transactions: unknown[] = [];
  for (let i = 0; i < signatures.length; i += CONCURRENCY) {
    const batch = await Promise.all(
      signatures.slice(i, i + CONCURRENCY).map((signature) =>
        connection.getParsedTransaction(signature, { commitment: "confirmed", maxSupportedTransactionVersion: 0 }),
      ),
    );
    for (const tx of batch) if (tx) transactions.push(tx);
  }
  return transactions;
}
```

Notes: keep the route's existing 15 s cache; the cap bounds cost (about 1.3 s per transaction call measured, ten in parallel); `getSignaturesForAddress` is newest first, so a very old history is cut at the cap rather than the newest rows. Test against `GSPkK3pZG733J1ApZ38CdcNnGp2znuwu4y4yaWrLAXQS` (5 signatures on the fork on 2026-10-02).

## 2. Perps positions route (draft)

The web derives Long/Short rows client-side with `listDerivedPositions(marginAccountAddress)`. A phone cannot run that, so expose it next to `/api/account`. Not run against a live server; it depends on request 1.

`app/api/perps/positions/[addr]/route.ts`:

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
    const marginAccountAddress = await MarginAccountService.discoverExistingAccount(addr);
    if (!marginAccountAddress) return NextResponse.json({ marginAccount: null, positions: [] }, { headers: { "Cache-Control": CACHE } });
    const positions = await listDerivedPositions(marginAccountAddress);
    return NextResponse.json({ marginAccount: marginAccountAddress, positions }, { headers: { "Cache-Control": CACHE } });
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

Response rows are `DerivedPosition` from `lib/long-short-math.ts`: `stock`, `side`, `stockQty`, `sizeUsd`, `collateralUsd`, `markPrice`, `liqPrice`. Entry price, PnL and liquidation price are computed in the table component from swap history (`computeAverageOpenPrice`); the route should return them too, or the phone cannot show PnL.
