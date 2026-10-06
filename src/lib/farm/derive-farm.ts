import type { CollateralSymbol, FarmAttribution, FarmHistoryAction, FarmHistoryEntry, FarmHistoryEvent, PoolSymbol } from "@/types/farm";
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

// `swapped`: the deposited stock was then swapped into a pool asset in the margin account, which is how a 1x deploy funds
// its Kamino supply.
type Pending = { stockDeposit?: HistoryLeg; borrow?: HistoryLeg; swapped?: boolean; at: number };

const swapsStockToPool = (chips: readonly HistoryChip[], stock: string) => chips.some((chip) => chip.type === "swap" && chip.from.asset === stock && isPool(chip.to.asset));

// A leg sent ahead holds only a stock deposit, only a pool borrow, or both together; anything else is not part of a deploy.
function remember(pending: Pending | null, item: MarginActivity): Pending | null {
  // A 1x deploy's swap leg: the stock deposited just before (or in this same transaction) becomes the pool asset.
  const fresh = pending !== null && item.at - pending.at <= PAIRING_WINDOW_SECONDS ? pending : null;
  const depositHere = legs(item.chips, "deposit").find((leg) => isStock(leg.asset));
  const stock = depositHere ?? fresh?.stockDeposit;
  if (stock && swapsStockToPool(item.chips, stock.asset) && legs(item.chips, "borrow").length === 0) return { stockDeposit: stock, swapped: true, at: item.at };
  const isLeg = (chip: HistoryChip) => (chip.type === "deposit" && isStock(chip.leg.asset)) || (chip.type === "borrow" && isPool(chip.leg.asset));
  if (item.chips.length === 0 || !item.chips.every(isLeg)) return pending;
  const stockDeposit = legs(item.chips, "deposit")[0];
  const borrow = legs(item.chips, "borrow")[0];
  if (!stockDeposit && !borrow) return pending;
  const current = pending !== null && item.at - pending.at <= PAIRING_WINDOW_SECONDS ? pending : { at: item.at };
  return { ...current, ...(stockDeposit ? { stockDeposit } : {}), ...(borrow ? { borrow } : {}), at: item.at };
}

// In the order a deploy runs: the stock in, the pool asset borrowed, then supplied to Kamino.
function deployActions(stockDeposit: HistoryLeg, borrow: HistoryLeg | undefined, poolDeposit: HistoryLeg | undefined): FarmHistoryAction[] {
  return [action("deposit", stockDeposit), ...(borrow ? [action("borrow", borrow)] : []), ...(poolDeposit ? [action("supply", poolDeposit)] : [])];
}

type Failure = { reason: string | null };

function historyEntry(item: MarginActivity, event: FarmHistoryEvent, stock: CollateralSymbol, pool: PoolSymbol, actions: FarmHistoryAction[], failure: Failure | null = null): FarmHistoryEntry {
  return {
    id: item.signature,
    event,
    status: failure === null ? "succeeded" : "failed",
    reason: failure?.reason ?? null,
    collateralSymbol: stock,
    poolSymbol: pool,
    occurredAt: item.at * 1000,
    signature: item.signature,
    actions,
  };
}

// A failed transaction is a Farm one when it is about a stock and a pool and has no swap (a swap makes it a perps order).
// What it tried to do is read from the events it logged before it failed.
function failedEntry(item: MarginActivity, reason: string | null): FarmHistoryEntry | null {
  if (item.chips.some((chip) => chip.type === "swap")) return null;
  const stockDeposit = legs(item.chips, "deposit").find((leg) => isStock(leg.asset));
  const stockWithdraw = legs(item.chips, "withdraw").find((leg) => isStock(leg.asset));
  const poolDeposit = legs(item.chips, "deposit").find((leg) => isPool(leg.asset));
  const borrow = legs(item.chips, "borrow").find((leg) => isPool(leg.asset));
  const repay = legs(item.chips, "repay").find((leg) => isPool(leg.asset));
  const failedWith = (event: FarmHistoryEvent, stock: CollateralSymbol, pool: PoolSymbol, actions: FarmHistoryAction[]) => historyEntry(item, event, stock, pool, actions, { reason });

  const funding = borrow ?? poolDeposit;
  if (stockDeposit && isStock(stockDeposit.asset) && funding && isPool(funding.asset)) {
    return failedWith("deploy", stockDeposit.asset, funding.asset, deployActions(stockDeposit, borrow, poolDeposit));
  }
  if (item.strategy !== "farm") return null;
  if (repay && isPool(repay.asset) && item.stock !== null && isStock(item.stock)) return failedWith("exit", item.stock, repay.asset, [action("repay", repay)]);
  if (stockWithdraw && isStock(stockWithdraw.asset)) return failedWith("return", stockWithdraw.asset, repay && isPool(repay.asset) ? repay.asset : "USDC", [action("withdraw", stockWithdraw)]);
  return null;
}

// Replays the Farm transactions of one margin account, oldest first. A stock's deposit and the pool asset borrowed in the
// same transaction, or in the transactions right before it, are what a position was opened with; returning the stock to the
// wallet closes it. The split between two stocks sharing one pool is only an estimate from this history, as on the web app.
// `failed` holds the transactions that landed but failed, with why when known: they are listed, marked failed, and change
// nothing, so they never open, close or pair with a position.
export function deriveFarm(activity: readonly MarginActivity[], failed: ReadonlyMap<string, string | null> = new Map()): FarmDerived {
  const open = new Map<string, FarmAttribution>();
  const poolOf = new Map<CollateralSymbol, PoolSymbol>();
  // The stock each pool's 1x deploy started from, so its exit, which repays nothing, can still be named.
  const plainOf = new Map<PoolSymbol, CollateralSymbol>();
  const entries: FarmHistoryEntry[] = [];
  const yieldKept: FarmDerived["yieldKept"] = [];
  let closedCount = 0;

  let pending: Pending | null = null;
  for (const item of [...activity].reverse()) {
    if (failed.has(item.signature)) {
      const attempt = failedEntry(item, failed.get(item.signature) ?? null);
      if (attempt !== null) entries.push(attempt);
      continue;
    }
    if (item.strategy !== "farm") {
      pending = remember(pending, item);
      continue;
    }
    const before = pending !== null && item.at - pending.at <= PAIRING_WINDOW_SECONDS ? pending : null;
    pending = null;
    const deposits = legs(item.chips, "deposit");
    const depositHere = deposits.find((leg) => isStock(leg.asset));
    const stockDeposit = depositHere ?? before?.stockDeposit;
    const poolDeposit = deposits.find((leg) => isPool(leg.asset));
    const borrow = legs(item.chips, "borrow").find((leg) => isPool(leg.asset)) ?? before?.borrow;
    const repay = legs(item.chips, "repay").find((leg) => isPool(leg.asset));
    const stockWithdraw = legs(item.chips, "withdraw").find((leg) => isStock(leg.asset));
    const poolWithdraw = legs(item.chips, "withdraw").find((leg) => isPool(leg.asset));
    const entry = (event: FarmHistoryEvent, stock: CollateralSymbol, pool: PoolSymbol, actions: FarmHistoryAction[]) => historyEntry(item, event, stock, pool, actions);

    // A 1x deploy: the stock was swapped into the pool asset and supplied with no loan. The position holds no stock, so no
    // stock is attributed to it (it shows as the pool part alone); the history still says what was deployed.
    const plain = stockDeposit && isStock(stockDeposit.asset) && poolDeposit && isPool(poolDeposit.asset) && !borrow && ((depositHere ? swapsStockToPool(item.chips, depositHere.asset) : false) || before?.swapped === true);
    if (plain && stockDeposit && isStock(stockDeposit.asset) && poolDeposit && isPool(poolDeposit.asset)) {
      plainOf.set(poolDeposit.asset, stockDeposit.asset);
      entries.push(entry("deploy", stockDeposit.asset, poolDeposit.asset, [action("deposit", stockDeposit), action("supply", poolDeposit)]));
    } else if (stockDeposit && isStock(stockDeposit.asset) && (borrow || poolDeposit)) {
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
      entries.push(entry("deploy", stockDeposit.asset, funding.asset, deployActions(stockDeposit, borrow, poolDeposit)));
    } else if (stockWithdraw && isStock(stockWithdraw.asset)) {
      const pool = poolOf.get(stockWithdraw.asset) ?? "USDC";
      for (const key of [...open.keys()]) if (key.startsWith(`${stockWithdraw.asset}-`)) open.delete(key);
      closedCount += 1;
      entries.push(entry("return", stockWithdraw.asset, pool, [action("withdraw", stockWithdraw)]));
    } else if (repay && isPool(repay.asset)) {
      const candidates = [...open.values()].filter((position) => position.pool === repay.asset);
      const stock = candidates[candidates.length - 1]?.stock ?? STOCKS.find((symbol) => poolOf.get(symbol) === repay.asset);
      if (stock === undefined) continue;
      const kept = poolWithdraw?.amount.raw ?? 0n;
      yieldKept.push({ pool: repay.asset, raw: kept });
      const redeemed = { asset: repay.asset, amount: { raw: repay.amount.raw + kept, decimals: repay.amount.decimals } };
      entries.push(entry("exit", stock, repay.asset, [action("redeem", redeemed), action("repay", repay)]));
    } else if (poolWithdraw && isPool(poolWithdraw.asset) && plainOf.has(poolWithdraw.asset)) {
      // Closing a 1x position repays nothing; what Kamino paid back goes straight to the wallet.
      const stock = plainOf.get(poolWithdraw.asset) as CollateralSymbol;
      closedCount += 1;
      entries.push(entry("exit", stock, poolWithdraw.asset, [action("redeem", poolWithdraw)]));
    }
  }

  return { attributions: [...open.values()], entries: entries.reverse(), closedCount, yieldKept };
}
