import { formatShortDate } from "@/format/format-date";
import { type AssetSymbol, assets } from "@/lib/solana/assets";
import type { MarginSwapRecord } from "@/lib/solana/margin-activity";
import type { PerpsPosition, PerpsSymbol, Side } from "@/types/perps";

import { UNIT } from "./position-math";

const STOCKS: readonly PerpsSymbol[] = ["TSLAx", "GOOGLx", "AAPLx", "ANTHROPIC", "OPENAI"];
const USD_DUST = 1n;

type Balances = Partial<Record<AssetSymbol, bigint>>;

type Input = {
  collateral: Balances;
  debt: Balances;
  prices: Partial<Record<AssetSymbol, bigint>>;
  swaps: readonly MarginSwapRecord[];
};

export type DerivedPositions = {
  positions: PerpsPosition[];
  // Stocks held as a long or short whose entry could not be rebuilt from the account's own swap history.
  unresolved: PerpsSymbol[];
};

const decimalsOf = (symbol: AssetSymbol) => assets.find((asset) => asset.symbol === symbol)?.decimals ?? 0;
const dustOf = (symbol: AssetSymbol) => 10n ** BigInt(Math.max(decimalsOf(symbol) - 6, 0));
const scaleOf = (symbol: AssetSymbol) => 10n ** BigInt(decimalsOf(symbol));

// A long is stock collateral with USDC debt and no stock debt; a short is stock debt with USDC collateral and no stock
// collateral. A stock with both has no single sound reading and is skipped, as on the web app.
function sideOf(symbol: PerpsSymbol, collateral: Balances, debt: Balances): Side | null {
  const held = collateral[symbol] ?? 0n;
  const owed = debt[symbol] ?? 0n;
  const dust = dustOf(symbol);
  if (held > dust && owed <= dust) return "long";
  if (owed > dust && held <= dust) return "short";
  return null;
}

// The shared USDC pool (one debt for every long, one collateral balance for every short) is split back to each stock by
// what that stock's own opening transaction put into it: the USDC borrowed for a long, the USDC received for a short.
function weightOf(swaps: readonly MarginSwapRecord[], symbol: PerpsSymbol, side: Side): bigint {
  return swaps.reduce((sum, swap) => {
    if (side === "long" && swap.output === symbol && swap.borrowed?.asset === "USDC") return sum + swap.borrowed.amount;
    if (side === "short" && swap.borrowed?.asset === symbol && swap.output === "USDC") return sum + swap.amountOut;
    return sum;
  }, 0n);
}

function opening(swap: MarginSwapRecord, symbol: PerpsSymbol, side: Side): { usdc: bigint; tokens: bigint } | null {
  if (side === "long" && swap.input === "USDC" && swap.output === symbol) return { usdc: swap.amountIn, tokens: swap.amountOut };
  if (side === "short" && swap.input === symbol && swap.output === "USDC") return { usdc: swap.amountOut, tokens: swap.amountIn };
  return null;
}

// Volume weighted average over every swap in the opening direction, so a position that was opened, partly closed and
// reopened shows a blended entry, as on the web app. Null when history does not reach back to an opening swap.
function averageEntry(swaps: readonly MarginSwapRecord[], symbol: PerpsSymbol, side: Side): { price: bigint; openedAt: number } | null {
  let usdc = 0n;
  let tokens = 0n;
  let openedAt = Number.POSITIVE_INFINITY;
  for (const swap of swaps) {
    const open = opening(swap, symbol, side);
    if (!open) continue;
    usdc += open.usdc;
    tokens += open.tokens;
    openedAt = Math.min(openedAt, swap.blockTime);
  }
  return tokens > dustOf(symbol) ? { price: (usdc * scaleOf(symbol)) / tokens, openedAt } : null;
}

export function derivePositions({ collateral, debt, prices, swaps }: Input): DerivedPositions {
  const sides = STOCKS.flatMap((symbol) => {
    const side = sideOf(symbol, collateral, debt);
    return side === null ? [] : [{ symbol, side }];
  });
  const longs = sides.filter((entry) => entry.side === "long");
  const shorts = sides.filter((entry) => entry.side === "short");
  const totalWeight = (group: typeof sides, side: Side) => group.reduce((sum, entry) => sum + weightOf(swaps, entry.symbol, side), 0n);
  const longWeight = totalWeight(longs, "long");
  const shortWeight = totalWeight(shorts, "short");
  const usdcDebt = debt.USDC ?? 0n;
  const usdcCollateral = collateral.USDC ?? 0n;

  const positions: PerpsPosition[] = [];
  const unresolved: PerpsSymbol[] = [];

  for (const { symbol, side } of sides) {
    const price = prices[symbol];
    if (price === undefined) {
      unresolved.push(symbol);
      continue;
    }
    const scale = scaleOf(symbol);
    const own = weightOf(swaps, symbol, side);
    const group = side === "long" ? longs : shorts;
    const total = side === "long" ? longWeight : shortWeight;
    const share = (amount: bigint) => (total > 0n ? (amount * own) / total : amount / BigInt(group.length));

    let tokensRaw: bigint;
    let equity: bigint;
    let notional: bigint;
    if (side === "long") {
      if (usdcDebt <= USD_DUST) continue;
      tokensRaw = collateral[symbol] ?? 0n;
      const size = (tokensRaw * price) / scale;
      equity = size - share(usdcDebt);
      notional = size;
    } else {
      if (usdcCollateral <= USD_DUST) continue;
      tokensRaw = debt[symbol] ?? 0n;
      const owedUsd = (tokensRaw * price) / scale;
      equity = share(usdcCollateral) - owedUsd;
      notional = owedUsd + equity;
    }

    const entry = averageEntry(swaps, symbol, side);
    if (entry === null) {
      unresolved.push(symbol);
      continue;
    }
    const leverage = equity > 0n ? Math.max(1, Math.round((Number(notional) / Number(equity)) * 10) / 10) : 1;
    positions.push({
      id: `${symbol}-${side}`,
      symbol,
      side,
      leverage,
      openedOn: formatShortDate(entry.openedAt),
      entryPrice: entry.price,
      tokens: (tokensRaw * UNIT) / scale,
      collateral: equity,
    });
  }
  return { positions, unresolved };
}
