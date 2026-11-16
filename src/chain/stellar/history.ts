import { Address, scValToNative, xdr } from "@stellar/stellar-base";

import type { Activity } from "@/sample/data";

import { EARN_POOLS } from "./config";
import { rpc } from "./submit";

// Recent Earn supply / withdraw for one wallet, read from the pools' own events (apps/stellar/lib/earn-history-rpc.ts):
// each credit-layer Reserve emits supplied / redeemed with the lender as the second topic. The RPC node only keeps recent
// ledgers, so this fills in what the phone has not already saved; saved rows win when both name the same transaction.
const WAD = 10n ** 18n;
const wad = (raw: unknown) => {
  try {
    const b = BigInt(String(raw));
    return Number(b / WAD) + Number(b % WAD) / 1e18;
  } catch {
    return 0;
  }
};
const topic = (a: string) => xdr.ScVal.scvAddress(new Address(a).toScAddress()).toXDR("base64");
const stamp = (ms: number) => {
  const d = new Date(ms);
  return `${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}, ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

type Ev = { topic: string[]; value: string; txHash: string; ledgerClosedAt: string };

export async function fetchStellarEarnHistory(owner: string): Promise<Activity[]> {
  try {
    const latest = await rpc<{ sequence: number }>("getLatestLedger", {});
    const startLedger = Math.max(1, latest.sequence - 9000);
    const out: Activity[] = [];
    await Promise.all(
      Object.entries(EARN_POOLS).map(async ([sym, c]) => {
        try {
          const r = await rpc<{ events?: Ev[] }>("getEvents", {
            startLedger,
            filters: [{ type: "contract", contractIds: [c.pool], topics: [["*", topic(owner)]] }],
            pagination: { limit: 100 },
          });
          for (const e of r.events ?? []) {
            const name = scValToNative(xdr.ScVal.fromXDR(e.topic[0], "base64")) as string;
            if (name !== "supplied" && name !== "redeemed") continue;
            const d = (scValToNative(xdr.ScVal.fromXDR(e.value, "base64")) ?? {}) as Record<string, unknown>;
            const supply = name === "supplied";
            const x = wad(d.assets); // LenderEvent { lender, assets WAD, shares WAD }: `assets` is the underlying moved
            out.push({
              t: stamp(new Date(e.ledgerClosedAt).getTime()),
              area: "Earn",
              action: supply ? "Supply" : "Withdraw",
              detail: `${sym} pool`,
              amt: `${supply ? "+" : "−"}${x.toLocaleString("en-US", { maximumFractionDigits: 4 })} ${sym}`,
              usd: x,
              tx: `${e.txHash.slice(0, 4)}…${e.txHash.slice(-4)}`,
              hash: e.txHash,
              ms: new Date(e.ledgerClosedAt).getTime(),
              chain: "stellar",
              sym,
            });
          }
        } catch {}
      }),
    );
    return out;
  } catch {
    return [];
  }
}
