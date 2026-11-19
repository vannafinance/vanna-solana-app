import type { PerpHist } from "@/sample/data";

import { fetchPerpAssetMap, readPhoenixExchange, ticksToUsd } from "./actions";
import { type ChainRow, when } from "./history";

/**
 * The wallet's Phoenix orders as Perps History rows, read from the chain: each order's transaction carries the market (its account),
 * the side, the size in lots and whether it only reduces a position. The leverage, the fill price and the realized P&L are not in the
 * order, so those stay empty (shown as "-"); the size is valued at the order's limit price, which is within the slippage of the fill.
 * Rows the app saved itself (with the exact numbers) win: see mergeChainPerpHist in state/activity-store.ts.
 */
export async function perpHistFromChain(rows: ChainRow[]): Promise<PerpHist[]> {
  const orders = rows.filter((r) => r.type === "perp-order" && r.order);
  if (!orders.length) return [];
  const markets = await fetchPerpAssetMap((await readPhoenixExchange()).perpAssetMap);
  const out: PerpHist[] = [];
  if (__DEV__) console.log(`[perp-hist] ${rows.length} chain rows, ${orders.length} orders, markets: ${markets.map((x) => x.symbol + ":" + x.spline.slice(0, 6) + "/" + x.orderbook.slice(0, 6)).join(" ")}`);
  for (const r of orders) {
    const o = r.order!;
    const m = markets.find((x) => x.spline === o.spline || x.orderbook === o.spline);
    if (__DEV__) console.log(`[perp-hist] order ${r.sig.slice(0, 8)} spline=${o.spline.slice(0, 6)} -> ${m?.symbol ?? "no market"}`);
    if (!m) continue;
    const qty = Number(BigInt(o.lots)) / 10 ** m.lotDecimals;
    const limit = o.ticks ? ticksToUsd(m, BigInt(o.ticks)) : undefined;
    const buy = o.side === 0;
    const open = !o.reduceOnly;
    // Opening: a buy is a long, a sell is a short. Reducing: a sell closes a long, a buy closes a short.
    const side = open ? (buy ? "long" : "short") : buy ? "short" : "long";
    out.push({ t: when(r.ms), a: open ? "Open / increase" : "Close / reduce", k: m.symbol, side, size: limit ? qty * limit : null, usdc: null, qty, ms: r.ms, hash: r.sig });
  }
  return out;
}
