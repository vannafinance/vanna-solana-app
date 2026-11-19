import AsyncStorage from "@react-native-async-storage/async-storage";

/* What each transaction was worth in USD when this phone first saw it, per wallet. The chain's own history has amounts but no
   prices, and the fork's block clock is synthetic (no price API can give a price "at that time"), so Net P&L needs this:
   a row first seen in a session that already knew the wallet's history gets the live price at that moment (the app reads again a
   few seconds after every confirmed transaction); a row already there the first time this phone read the wallet has no known
   price (an empty entry) unless it is a stablecoin. Also the P&L snapshots that draw the chart. Public data only. */

export type PxLedger = {
  /** signature -> symbol -> USD price at first sight. An empty object = seen at the first read: price unknown. */
  px: Record<string, Record<string, number>>;
  /** [ms, account P&L in USD] */
  snaps: [number, number][];
};

const key = (owner: string) => `vanna.pxledger.v1.${owner}`;
const mem = new Map<string, PxLedger | "fresh">();

export async function loadLedger(owner: string): Promise<PxLedger | "fresh"> {
  const hit = mem.get(owner);
  if (hit) return hit;
  let out: PxLedger | "fresh" = "fresh";
  try {
    const raw = await AsyncStorage.getItem(key(owner));
    if (raw) out = JSON.parse(raw) as PxLedger;
  } catch {}
  mem.set(owner, out);
  return out;
}

export function saveLedger(owner: string, l: PxLedger) {
  mem.set(owner, l);
  AsyncStorage.setItem(key(owner), JSON.stringify(l)).catch(() => {});
}

/** Notes the rows of a fresh read. Returns the ledger (new when this phone never read the wallet before). */
export function observeRows(
  prev: PxLedger | "fresh",
  rows: { sig: string; sym?: string; toSym?: string }[],
  price: (s: string) => number,
): { ledger: PxLedger; added: boolean } {
  const first = prev === "fresh";
  const ledger: PxLedger = first ? { px: {}, snaps: [] } : prev;
  let added = first;
  for (const r of rows) {
    if (ledger.px[r.sig]) continue;
    added = true;
    const e: Record<string, number> = {};
    if (!first) for (const s of [r.sym, r.toSym]) if (s && price(s) > 0) e[s] = price(s);
    ledger.px[r.sig] = e;
  }
  return { ledger, added };
}

/** Adds a P&L point (at most one per 10 minutes unless `force`), keeping the last 200. */
export function addSnap(l: PxLedger, ms: number, pnl: number, force = false): boolean {
  const last = l.snaps[l.snaps.length - 1];
  if (!force && last && ms - last[0] < 10 * 60_000) return false;
  l.snaps.push([ms, Math.round(pnl * 100) / 100]);
  if (l.snaps.length > 200) l.snaps.splice(0, l.snaps.length - 200);
  return true;
}
