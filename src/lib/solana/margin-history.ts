import { PublicKey } from "@solana/web3.js";

import type { HistoryChip, HistoryLeg, HistoryStrategy, MarginActivity } from "@/types/margin-history";

import { type AssetInfo, assetByMint, assets } from "./assets";
import { decodeMarginEvents } from "./margin-events";
import { liteStrategyAddress, reserveAddress } from "./program-accounts";
import type { WalletTransaction } from "./wallet-transactions";

const STOCKS = new Set(["TSLAx", "GOOGLx", "AAPLx", "ANTHROPIC", "OPENAI"]);

const reserveAssets = new Map<string, AssetInfo>(assets.map((asset) => [reserveAddress(new PublicKey(asset.mint)).toBase58(), asset]));
const strategyAssets = new Map<string, AssetInfo>(assets.map((asset) => [liteStrategyAddress(new PublicKey(asset.mint)).toBase58(), asset]));

// Reading order inside one transaction: how every open and close flow sequences its instructions.
const ORDER: Record<HistoryChip["type"], number> = { deposit: 0, borrow: 1, swap: 2, repay: 3, withdraw: 4 };

const leg = (asset: AssetInfo | undefined, raw: bigint): HistoryLeg | null => (asset === undefined ? null : { asset: asset.symbol, amount: { raw, decimals: asset.decimals } });

type Single = Exclude<HistoryChip, { type: "swap" }>["type"];

function single(type: Single, asset: AssetInfo | undefined, raw: bigint): HistoryChip[] {
  const moved = leg(asset, raw);
  return moved === null || raw <= 0n ? [] : [{ type, leg: moved }];
}

// A Farm transaction is the only one that emits a Kamino event; a perps open or close always swaps; a stock withdrawn
// with no swap and no Kamino event can only be Farm's trailing return of collateral. Anything else has no signal.
function classify(hasLite: boolean, hasSwap: boolean, hasBareStockWithdraw: boolean): HistoryStrategy {
  if (hasLite || (!hasSwap && hasBareStockWithdraw)) return "farm";
  return hasSwap ? "perps" : "unclassified";
}

type Subject = { stock: string; title: string };

// Which position a transaction belongs to. A borrow of USDC means the total was swapped into the stock (a long) and a
// borrow of the stock means it was swapped to USDC (a short); a close has no borrow, so the swap names the stock instead.
export function deriveActivitySubject(chips: readonly HistoryChip[]): Subject | null {
  const swap = chips.find((chip) => chip.type === "swap");
  const borrow = chips.find((chip) => chip.type === "borrow");
  const borrowed = borrow?.type === "borrow" ? borrow.leg.asset : undefined;
  const perps = (stock: string, side: "Long" | "Short"): Subject => ({ stock, title: `${stock}-USDC ${side}` });
  if (borrowed === "USDC" && swap?.type === "swap" && STOCKS.has(swap.to.asset)) return perps(swap.to.asset, "Long");
  if (borrowed !== undefined && STOCKS.has(borrowed)) return perps(borrowed, "Short");
  if (swap?.type === "swap" && STOCKS.has(swap.from.asset)) return perps(swap.from.asset, "Long");
  if (swap?.type === "swap" && STOCKS.has(swap.to.asset)) return perps(swap.to.asset, "Short");

  const moved = chips.find((chip) => (chip.type === "deposit" || chip.type === "withdraw") && STOCKS.has(chip.leg.asset));
  if (moved?.type === "deposit" || moved?.type === "withdraw") {
    const repay = chips.find((chip) => chip.type === "repay");
    return { stock: moved.leg.asset, title: `${moved.leg.asset}-${borrowed ?? (repay?.type === "repay" ? repay.leg.asset : "USDC")} Farm` };
  }
  return null;
}

// Newest first. Only events of this margin account are used, so another account's activity in the same transaction
// never shows up.
export function marginActivityFrom(transactions: readonly WalletTransaction[], margin: string): MarginActivity[] {
  return transactions
    .flatMap(({ signature, blockTime, tx }) => {
      const events = decodeMarginEvents(tx.meta?.logMessages ?? []);
      const own = <T extends { margin: string }>(list: readonly T[]) => list.filter((event) => event.margin === margin);
      const chips: HistoryChip[] = [];

      for (const event of own(events.deposits)) chips.push(...single("deposit", assetByMint.get(event.mint), event.amount));
      for (const event of own(events.borrows)) chips.push(...single("borrow", reserveAssets.get(event.reserve), event.assets));
      for (const event of own(events.swaps)) {
        const from = leg(assetByMint.get(event.inputMint), event.amountIn);
        const to = leg(assetByMint.get(event.outputMint), event.amountOut);
        if (from !== null && to !== null) chips.push({ type: "swap", from, to });
      }
      for (const event of own(events.repayments)) chips.push(...single("repay", reserveAssets.get(event.reserve), event.assets));
      for (const event of own(events.withdrawals)) chips.push(...single("withdraw", assetByMint.get(event.mint), event.amount));

      const liteOpened = own(events.liteOpened);
      const liteClosed = own(events.liteClosed);
      for (const event of liteOpened) chips.push(...single("deposit", strategyAssets.get(event.strategy), event.equity));
      for (const event of liteClosed) {
        chips.push(...single("repay", strategyAssets.get(event.strategy), event.debtRepaid), ...single("withdraw", strategyAssets.get(event.strategy), event.residual));
      }

      if (chips.length === 0) return [];
      const hasSwap = chips.some((chip) => chip.type === "swap");
      const hasBareStockWithdraw = chips.some((chip) => chip.type === "withdraw" && STOCKS.has(chip.leg.asset));
      const ordered = chips.slice().sort((a, b) => ORDER[a.type] - ORDER[b.type]);
      const subject = deriveActivitySubject(ordered);
      return [{ signature, at: blockTime, strategy: classify(liteOpened.length + liteClosed.length > 0, hasSwap, hasBareStockWithdraw), title: subject?.title ?? null, stock: subject?.stock ?? null, chips: ordered }];
    })
    .sort((a, b) => b.at - a.at)
    .map(withSideFromOpeningLeg);
}

// An order on an account with several positions is sent as several transactions: the borrow first, the swap after. The swap
// alone cannot say whether it opened a long or a short (buying the stock could also be closing a short), so a swap that
// follows, within a few minutes, a borrow of the same position takes its side from that borrow.
const OPENING_WINDOW_SECONDS = 300;

function withSideFromOpeningLeg(entry: MarginActivity, index: number, newestFirst: readonly MarginActivity[]): MarginActivity {
  const swap = entry.chips.find((chip) => chip.type === "swap");
  if (swap?.type !== "swap" || entry.chips.some((chip) => chip.type === "borrow")) return entry;
  const stock = STOCKS.has(swap.to.asset) ? swap.to.asset : STOCKS.has(swap.from.asset) ? swap.from.asset : null;
  if (stock === null) return entry;
  const opening = newestFirst.slice(index + 1).find((older) => entry.at - older.at <= OPENING_WINDOW_SECONDS && older.chips.some((chip) => chip.type === "borrow") && !older.chips.some((chip) => chip.type === "swap"));
  const borrow = opening?.chips.find((chip) => chip.type === "borrow");
  if (borrow?.type !== "borrow") return entry;
  const side = borrow.leg.asset === "USDC" && swap.to.asset === stock ? "Long" : borrow.leg.asset === stock && swap.from.asset === stock ? "Short" : null;
  return side === null ? entry : { ...entry, title: `${stock}-USDC ${side}`, stock };
}
