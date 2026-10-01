import { assets } from "@/lib/solana/assets";
import type { AssetSymbol } from "@/lib/solana/assets";
import type { EarnEvent } from "@/lib/solana/earn-history";
import type { OraclePrices } from "@/lib/solana/oracle-prices";
import type { OverviewMode, OverviewRange, UsdPoint } from "@/types/earn";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const POINTS = 40;

const WINDOW_MS: Record<Exclude<OverviewRange, "All">, number> = { "1W": 7 * DAY, "1M": 30 * DAY, "3M": 91 * DAY };
const decimalsOf = new Map(assets.map((asset) => [asset.symbol, asset.decimals]));

// An event is applied oldest first. A withdrawal of unknown size resets that asset to what is deposited today:
// it is the only amount we can state after it.
function principalUsdAt(events: readonly EarnEvent[], prices: OraclePrices, current: ReadonlyMap<AssetSymbol, bigint>, at: number): bigint {
  const byAsset = new Map<AssetSymbol, bigint>();
  for (const event of [...events].sort((a, b) => a.timestamp - b.timestamp)) {
    if (event.timestamp > at) break;
    if (event.amount === null) byAsset.set(event.symbol, current.get(event.symbol) ?? 0n);
    else byAsset.set(event.symbol, (byAsset.get(event.symbol) ?? 0n) + (event.kind === "supply" ? event.amount : -event.amount));
  }
  let total = 0n;
  for (const [symbol, raw] of byAsset) {
    const price = prices[symbol];
    if (price !== undefined && raw > 0n) total += (raw * price) / 10n ** BigInt(decimalsOf.get(symbol) ?? 0);
  }
  return total;
}

// Deposit mode follows net principal over time, valued at today's prices (history has no past prices) and ending
// at the current value. Earnings are only known as of now, so that mode is a flat line at the current figure.
export function buildOverviewSeries(
  events: readonly EarnEvent[],
  prices: OraclePrices,
  current: ReadonlyMap<AssetSymbol, bigint>,
  mode: OverviewMode,
  range: OverviewRange,
  now: number,
  currentValue: bigint,
): { points: UsdPoint[]; stepMs: number; now: number } {
  const first = events.length === 0 ? now : Math.min(...events.map((event) => event.timestamp));
  const span = range === "All" ? Math.max(now - first + 2 * DAY, 7 * DAY) : WINDOW_MS[range];
  const stepMs = Math.max(Math.floor(span / POINTS), HOUR);
  const start = now - span;

  const points: UsdPoint[] = [];
  for (let at = start; at < now; at += stepMs) points.push({ at, usd: mode === "deposit" ? principalUsdAt(events, prices, current, at) : currentValue });
  points.push({ at: now, usd: currentValue });
  return { points, stepMs, now };
}
