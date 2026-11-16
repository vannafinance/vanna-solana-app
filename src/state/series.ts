import { ACTIVITY } from "@/sample/data";
import type { Chain } from "@/state/chain";

// Real history only: the Earn deposit curve is built from this wallet's own supply / withdraw rows (each with the time the chain
// confirmed it); anything the chain does not record yet is left out, and the chart says "No history yet".
const DAY = 86_400_000;
export const RANGE_MS = { "1W": 7 * DAY, "1M": 30 * DAY, "3M": 91 * DAY, All: Infinity } as const;
export type Range = keyof typeof RANGE_MS;

const d = (ms: number) => new Date(ms).toLocaleDateString("en-US", { month: "short", day: "numeric" });

/** Total supplied value over time: net tokens supplied after each event, priced at today's price, ending at `now` with the live value. */
export function supplySeries(chain: Chain, range: Range, price: (sym: string) => number, liveValue: number): { pts: number[]; x: string[] } {
  const rows = ACTIVITY[chain]
    .filter((r) => r.area === "Earn" && (r.action === "Supply" || r.action === "Withdraw") && r.ms && r.sym)
    .sort((a, b) => a.ms! - b.ms!);
  if (!rows.length) return { pts: [], x: ["", "", ""] };
  const now = Date.now();
  const from = range === "All" ? rows[0].ms! : Math.max(rows[0].ms!, now - RANGE_MS[range]);
  const qty: Record<string, number> = {};
  let before = 0;
  const pts: number[] = [];
  for (const r of rows) {
    const n = parseFloat(String(r.amt).replace(/[^0-9.]/g, "")) || 0;
    qty[r.sym!] = (qty[r.sym!] ?? 0) + (r.action === "Supply" ? n : -n);
    const v = Object.entries(qty).reduce((t, [s, q]) => t + q * price(s), 0);
    if (r.ms! < from) before = v;
    else pts.push(v);
  }
  const all = [before, ...pts, liveValue];
  if (all.length < 3 && before === 0 && !pts.length) return { pts: [], x: ["", "", ""] };
  return { pts: all, x: [d(from), d((from + now) / 2), d(now)] };
}
