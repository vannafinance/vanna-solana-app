import type { CollateralSymbol, FarmAttribution, FarmHistoryAction, FarmHistoryEntry, PoolSymbol } from "@/types/farm";
import type { HistoryChip, HistoryLeg, MarginActivity } from "@/types/margin-history";

const STOCKS: readonly CollateralSymbol[] = ["TSLAx", "GOOGLx", "AAPLx", "ANTHROPIC", "OPENAI"];
const POOLS: readonly PoolSymbol[] = ["USDC", "SOL"];

const isStock = (asset: string): asset is CollateralSymbol => STOCKS.some((stock) => stock === asset);
const isPool = (asset: string): asset is PoolSymbol => POOLS.some((pool) => pool === asset);

export type FarmDerived = {
  attributions: FarmAttribution[];
  entries: FarmHistoryEntry[];
  closedCount: number;
  // What each exit paid out beyond the debt it repaid: the yield the position kept.
  yieldKept: { pool: PoolSymbol; raw: bigint }[];
};

type Single = Exclude<HistoryChip, { type: "swap" }>;

function legs(chips: readonly HistoryChip[], type: Single["type"]): HistoryLeg[] {
  return chips.flatMap((chip) => (chip.type === type ? [chip.leg] : []));
}

const action = (kind: FarmHistoryAction["kind"], leg: HistoryLeg): FarmHistoryAction => ({ kind, symbol: leg.asset, amount: leg.amount });

// A deploy too big for one transaction is sent as several in a row, so the stock deposit and the borrow can sit in
// transactions of their own just before the one that supplies to Kamino. They belong to it when they come right before it.
const PAIRING_WINDOW_SECONDS = 600;

type Pending = { stockDeposit?: HistoryLeg; borrow?: HistoryLeg; at: number };

function remember(pending: Pending | null, item: MarginActivity): Pending | null {
  const only = (type: Single["type"], accept: (asset: string) => boolean) => {
    const found = item.chips.filter((chip): chip is Single => chip.type !== "swap" && chip.type === type);
    return found.length === item.chips.length && found.length > 0 && found.every((chip) => accept(chip.leg.asset)) ? found[0].leg : undefined;
  };
  const stockDeposit = only("deposit", isStock);
  const borrow = only("borrow", isPool);
  if (!stockDeposit && !borrow) return pending;
  const current = pending !== null && item.at - pending.at <= PAIRING_WINDOW_SECONDS ? pending : { at: item.at };
  return { ...current, ...(stockDeposit ? { stockDeposit } : {}), ...(borrow ? { borrow } : {}), at: item.at };
}

// Replays the Farm transactions of one margin account, oldest first. A stock's deposit and the pool asset borrowed in the
// same transaction, or in the transactions right before it, are what a position was opened with; returning the stock to the
// wallet closes it. The split between two stocks sharing one pool is only an estimate from this history, as on the web app.
export function deriveFarm(activity: readonly MarginActivity[]): FarmDerived {
  const open = new Map<string, FarmAttribution>();
  const poolOf = new Map<CollateralSymbol, PoolSymbol>();
  const entries: FarmHistoryEntry[] = [];
  const yieldKept: FarmDerived["yieldKept"] = [];
  let closedCount = 0;

  let pending: Pending | null = null;
  for (const item of [...activity].reverse()) {
    if (item.strategy !== "farm") {
      pending = remember(pending, item);
      continue;
    }
    const before = pending !== null && item.at - pending.at <= PAIRING_WINDOW_SECONDS ? pending : null;
    pending = null;
    const deposits = legs(item.chips, "deposit");
    const stockDeposit = deposits.find((leg) => isStock(leg.asset)) ?? before?.stockDeposit;
    const poolDeposit = deposits.find((leg) => isPool(leg.asset));
    const borrow = legs(item.chips, "borrow").find((leg) => isPool(leg.asset)) ?? before?.borrow;
    const repay = legs(item.chips, "repay").find((leg) => isPool(leg.asset));
    const stockWithdraw = legs(item.chips, "withdraw").find((leg) => isStock(leg.asset));
    const poolWithdraw = legs(item.chips, "withdraw").find((leg) => isPool(leg.asset));
    const entry = (stock: CollateralSymbol, pool: PoolSymbol, actions: FarmHistoryAction[]): FarmHistoryEntry => ({
      id: item.signature,
      collateralSymbol: stock,
      poolSymbol: pool,
      occurredAt: item.at * 1000,
      signature: item.signature,
      actions,
    });

    if (stockDeposit && isStock(stockDeposit.asset) && (borrow || poolDeposit)) {
      const funding = borrow ?? poolDeposit;
      if (!funding || !isPool(funding.asset)) continue;
      const key = `${stockDeposit.asset}-${funding.asset}`;
      const previous = open.get(key);
      open.set(key, {
        stock: stockDeposit.asset,
        pool: funding.asset,
        collateral: { raw: (previous?.collateral.raw ?? 0n) + stockDeposit.amount.raw, decimals: stockDeposit.amount.decimals },
        borrowed: { raw: (previous?.borrowed.raw ?? 0n) + (borrow?.amount.raw ?? 0n), decimals: funding.amount.decimals },
        openedAt: previous?.openedAt ?? item.at,
      });
      poolOf.set(stockDeposit.asset, funding.asset);
      entries.push(entry(stockDeposit.asset, funding.asset, [action("deposit", stockDeposit), ...(poolDeposit ? [action("deposit", poolDeposit)] : []), ...(borrow ? [action("borrow", borrow)] : [])]));
    } else if (stockWithdraw && isStock(stockWithdraw.asset)) {
      const pool = poolOf.get(stockWithdraw.asset) ?? "USDC";
      for (const key of [...open.keys()]) if (key.startsWith(`${stockWithdraw.asset}-`)) open.delete(key);
      closedCount += 1;
      entries.push(entry(stockWithdraw.asset, pool, [action("withdraw", stockWithdraw)]));
    } else if (repay && isPool(repay.asset)) {
      const candidates = [...open.values()].filter((position) => position.pool === repay.asset);
      const stock = candidates[candidates.length - 1]?.stock ?? STOCKS.find((symbol) => poolOf.get(symbol) === repay.asset);
      if (stock === undefined) continue;
      const kept = poolWithdraw?.amount.raw ?? 0n;
      yieldKept.push({ pool: repay.asset, raw: kept });
      const redeemed = { asset: repay.asset, amount: { raw: repay.amount.raw + kept, decimals: repay.amount.decimals } };
      entries.push(entry(stock, repay.asset, [action("redeem", redeemed), action("repay", repay)]));
    }
  }

  return { attributions: [...open.values()], entries: entries.reverse(), closedCount, yieldKept };
}
